import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FixedHeadTable from "../components/FixedHeadTable";
import { openCenteredWindow } from "../utils/popup";
import ClaimSelectModal from "./estimate/ClaimSelectModal";
import CheckBox from "../components/CheckBox";
import { useAlert } from "../alerts";
import { useLoading } from "../loading/useLoading";
import { useEstimate } from "../hooks/useEstimate";
import { useTbCode } from "../hooks/useTbCode";
import { getComcode } from "../api/config";

/**
 * 보험 견적일지 (UI 샘플)
 * - Row Action: 행 선택 시 화면 하단 슬라이드업
 * - 분할바: "견적상세" 바로 위 (드래그로 상세 영역 높이 조절)
 * - 테이블 컬럼은 그대로(예시로만 렌더). 실제 컬럼/데이터는 그대로 꽂으면 됨.
 */

import { ymd, monthRange, addMonths } from "../utils/dateUtils";


const SS_KEY = "insurance_estimate_state";
const SS_FILTER_KEY = "insurance_estimate_filter";

function loadSavedState() {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY)); } catch { return null; }
}
function loadSavedFilter() {
  try { return JSON.parse(sessionStorage.getItem(SS_FILTER_KEY)); } catch { return null; }
}
function clearSavedState() {
  try { sessionStorage.removeItem(SS_KEY); } catch { /* empty */ }
}

export default function InsuranceEstimate() {
  const navigate = useNavigate();
  const { error, info, warning, confirm } = useAlert();
  const { withLoading } = useLoading();
  const {
    estimates, estLoading, estError, fetchEstimates, fetchByText,
    claims, claimLoading, claimError, fetchClaims,
    details, detailLoading, detailError, fetchDetails,
    unlockEstimate,
    requestEstimate,
    closeEstimate,
  } = useEstimate();

  const { codes: sortCodes } = useTbCode('IDX01');

  const workBodyElRef = useRef(null);      // FixedHeadTable 바디 DOM
  const workScrollPosRef = useRef({ top: 0, left: 0 });      // 닫기 전 scrollTop 저장
  const photoWinRef = useRef(null);
  const smsWinRef = useRef(null);
  const memoWinRef = useRef(null);
  const depositWinRef = useRef(null);
  const claimWinRef = useRef(null);
  const customerWinRef = useRef(null);
  const mailHistWinRef = useRef(null);

  const childWinsRef = useRef(new Set());

  const registerChildWin = (w) => {
    if (!w) return;
    childWinsRef.current.add(w);

    // 닫힌 창은 정리
    try {
      if (w.closed) childWinsRef.current.delete(w);
    } catch { /* empty */ }
  };

  const closeAllChildWins = () => {
    childWinsRef.current.forEach((w) => {
      try {
        if (w && !w.closed) w.close();
      } catch { /* empty */ }
    });
    childWinsRef.current.clear();
  };

  const openEstimateEdit = (row, mode = "edit") => {
    const est_serial = row?.est_serial || "0000000000";
    // 수정 화면 이동 전 현재 상태를 sessionStorage에 저장 → 돌아올 때 복원
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({
        dateFrom, dateTo, searchText,
        chkEstimate, chkWork, chkClosed, sortKey,
        selectedSerial: row?.est_serial ?? null,
      }));
    } catch { /* empty */ }
    navigate(`/estimate-edit/${encodeURIComponent(est_serial)}`, {
      state: {
        mode, // "new" | "edit"
        ctx: {
          est_serial,
          carno: row?.carno || "",
        },
      },
    });
  };

  // ====== 검색/조회 ======
  // 수정 화면에서 돌아올 때 sessionStorage 복원 (우선순위: _saved > _filter > 기본값)
  const _saved = loadSavedState();
  const _filter = loadSavedFilter();
  const [dateFrom, setDateFrom] = useState(() => _saved?.dateFrom ?? _filter?.dateFrom ?? monthRange(new Date()).from);
  const [dateTo, setDateTo] = useState(() => _saved?.dateTo ?? _filter?.dateTo ?? monthRange(new Date()).to);
  const [searchText, setSearchText] = useState(() => _saved?.searchText ?? _filter?.searchText ?? "");
  const [chkEstimate, setChkEstimate] = useState(() => _saved?.chkEstimate ?? _filter?.chkEstimate ?? true);
  const [chkWork, setChkWork] = useState(() => _saved?.chkWork ?? _filter?.chkWork ?? true);
  const [chkClosed, setChkClosed] = useState(() => _saved?.chkClosed ?? _filter?.chkClosed ?? false);
  const [sortKey, setSortKey] = useState(() => _saved?.sortKey ?? _filter?.sortKey ?? "inday desc");
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(_saved?.dateFrom ?? _filter?.dateFrom ?? Date.now()));
  // 복원 후 바로 삭제 (새 조회 시엔 저장 안 된 상태)
  const _restoredSerial = _saved?.selectedSerial ?? null;
  clearSavedState();

  // ====== 선택/상세 ======
  const [selectedRaw, setSelected] = useState(null);
  const [selectedClaimRaw, setSelectedClaim] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ====== 분할바 (견적상세 바로 위) ======
  const [detailHeight, setDetailHeight] = useState(260);
  const splitDragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  // sortCodes 미로드 시엔 raw sortKey, 로드 후 목록에 없으면 첫 항목으로 폴백
  const effectiveSortKey = useMemo(() => {
    if (!sortCodes.length) return sortKey;
    return sortCodes.some(c => c.def_value === sortKey) ? sortKey : sortCodes[0].def_value;
  }, [sortKey, sortCodes]);

  // 보험견적일지: 보험건(seccode=12) + 체크박스 필터 + 정렬
  const insuranceEstimates = useMemo(() => {
    const byInsurance = estimates.filter((row) => String(row?.seccode ?? "") === "12");
    const filtered = (!chkEstimate && !chkWork && !chkClosed)
      ? byInsurance
      : byInsurance.filter((row) => {
          const typeMatch =
            (!chkEstimate && !chkWork) ||
            (chkEstimate && row.seccodename === '견적_보험') ||
            (chkWork     && row.seccodename === '작업_보험');
          const closedMatch = !chkClosed || (row.workend != null && row.workend !== '');
          return typeMatch && closedMatch;
        });
    const arr = [...filtered];
    if (effectiveSortKey) {
      if (effectiveSortKey.includes(';')) {
        const fields = effectiveSortKey.split(';').map(f => f.trim());
        arr.sort((a, b) => {
          const A = fields.map(f => String(a[f] ?? '')).join('-');
          const B = fields.map(f => String(b[f] ?? '')).join('-');
          return A.localeCompare(B, 'ko');
        });
      } else {
        const parts = effectiveSortKey.trim().split(/\s+/);
        const field = parts[0];
        const desc = parts[1]?.toLowerCase() === 'desc';
        arr.sort((a, b) => {
          const aVal = String(a[field] ?? '');
          const bVal = String(b[field] ?? '');
          const cmp = aVal.localeCompare(bVal, 'ko');
          return desc ? -cmp : cmp;
        });
      }
    }
    return arr;
  }, [estimates, chkEstimate, chkWork, chkClosed, effectiveSortKey]);

  // 파생 selected: 필터 후 목록에 없으면 null
  const selected = useMemo(
    () => selectedRaw && insuranceEstimates.some(r => r.est_serial === selectedRaw.est_serial)
      ? selectedRaw : null,
    [selectedRaw, insuranceEstimates]
  );

  // 파생 selectedClaim: claims 갱신 시 첫 항목 자동 선택
  const selectedClaim = useMemo(() => {
    if (!claims.length) return null;
    if (selectedClaimRaw && claims.some(c => c.estbo_seqno === selectedClaimRaw.estbo_seqno))
      return selectedClaimRaw;
    return claims[0];
  }, [selectedClaimRaw, claims]);

  // ====== Row Action Bar ======
  const [printOpen, setPrintOpen] = useState(false);


  // 조회 조건 변경 시 sessionStorage에 저장 (F5 복원용)
  useEffect(() => {
    try {
      sessionStorage.setItem(SS_FILTER_KEY, JSON.stringify({ dateFrom, dateTo, searchText, chkEstimate, chkWork, chkClosed, sortKey }));
    } catch {}
  }, [dateFrom, dateTo, searchText, chkEstimate, chkWork, chkClosed, sortKey]);

  // ====== 조회 에러 → 메시지 표시 ======
  useEffect(() => {
    const msg = estError?.message || claimError?.message || detailError?.message;
    if (msg) warning(msg);
  }, [estError, claimError, detailError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ====== 초기 조회 (금월 or 복원된 날짜) ======
  useEffect(() => {
    fetchEstimates(dateFrom, dateTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ====== 수정 화면에서 복귀 시 선택 행 자동 복원 ======
  const restoredSerialRef = useRef(_restoredSerial);
  useEffect(() => {
    const serial = restoredSerialRef.current;
    if (!serial || !estimates.length) return;
    const found = estimates.find((r) => r.est_serial === serial);
    if (found) {
      setSelected(found);
      restoredSerialRef.current = null; // 복원 1회만
    }
  }, [estimates]);

  const claimColumns = useMemo(
    () => [
      { key: "bocomname", title: "보험사", width: "12%", align: "left" },
      { key: "regno", title: "접수번호", width: "10%", align: "left" },
      { key: "dambo", title: "담보", width: "6%", align: "left" },
      { key: "misrate", title: "과실율", width: "5%", align: "left" },
      { key: "insura_exemp", title: "면책금", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "endpaysum", title: "공임계", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "endpartsum", title: "부품계", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "boman_nm", title: "담당자", width: "6%", align: "left" },
      { key: "bomanhp", title: "담당HP", width: "9%", align: "left" },
      { key: "bomanfax", title: "담당FAX", width: "9%", align: "left" },
      { key: "reqtotal", title: "청구액", width: "8%", align: "right", render: (v) => fmt(v) },
      { key: "incom", title: "입금액", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "inday", title: "입금일자", width: "7%", align: "left", render: (v) => v || "-" },
    ],
    []
  );

  const workColumns = useMemo(
    () => [
      { key: "paykindname", title: "구분", width: "7%", align: "left" },
      { key: "payname", title: "작업내용", width: "25%", align: "left" },
      { key: "workcodename", title: "작업", width: "8%", align: "left" },
      { key: "qty", title: "시간", width: "8%", align: "right" },
      { key: "paysum", title: "공임액", width: "10%", align: "right", render: (v) => fmt(v) },
      { key: "partsum", title: "부품액", width: "10%", align: "right", render: (v) => fmt(v) },
      { key: "part_makercode", title: "부품코드", width: "14%", align: "left" },
      { key: "ts_payno", title: "국토부", width: "8%", align: "left" },
      { key: "statename", title: "상태", width: "10%", align: "left" },
    ],
    []
  );
  

  // ====== 분할바 드래그 핸들러 ======
  useEffect(() => {
    const onMove = (e) => {
      if (!splitDragging.current) return;
      const dy = startY.current - e.clientY; // 위로 드래그하면 증가
      const next = Math.min(800, Math.max(160, startH.current + dy));
      setDetailHeight(next);
    };

    const onUp = () => {
      splitDragging.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onSplitDown = (e) => {
    splitDragging.current = true;
    startY.current = e.clientY;
    startH.current = detailHeight;
  };

  // ====== Row Action 동작 (샘플) ======
  const requireSelected = async () => {
    if (!selected) {
      // alert("견적을 선택하세요.");
      await info("저장이 완료되었습니다.");
      return false;
    }
    return true;
  };

  const onNew = () => {
    //신규: 화면만 코딩이니 임시 est_serial로 진입
    openEstimateEdit(null, "new");
  };
  const onExcel = () => alert("엑셀내보내기");

  const onModify = () => {
    if (!requireSelected()) return;
    openEstimateEdit(selected, "edit");
  };
  const onDelete = () => requireSelected() && alert(`견적삭제: ${selected.est_serial}`);
  const onClose = () => { if (selected) handleCloseEst(selected); };
  
  const openPhotoViewer = () => {
    const estId = selected?.est_serial || "";
    const carNo = selected?.carno || "";
    
    const url =
    `/photo-viewer?est_serial=${encodeURIComponent(estId)}` +
    `&carno=${encodeURIComponent(carNo)}`;

    // 1) 이미 열려있는 창이면: 재사용 + estId만 갱신
    if (photoWinRef.current && !photoWinRef.current.closed) {
      try {
        photoWinRef.current.focus();
        photoWinRef.current.postMessage(
          { type: "PHOTO_VIEWER_SET_CTX", payload: { est_serial:estId, carno:carNo } },
          window.location.origin
        );
        registerChildWin(photoWinRef.current);
        return;
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // 핸들이 꼬였으면 새로 열기
        photoWinRef.current = null;
      }
    }

    // 2) 없거나 닫혔으면: 새로 열기 (name 고정 = 중복 방지)
    const win = openCenteredWindow(url, "photoViewer", 1200, 800, {
      scrollbars: "yes",
      resizable: "yes",
    });
    photoWinRef.current = win;
    registerChildWin(win);
  };

  // const onSms = () => requireSelected() && alert(`문자발송: ${selected.est_serial}`);
  const openSmsPopup = () => {
    const est_serial = selected?.est_serial || "";       // 실제 est_serial 키로 교체
    const carno = selected?.carno || "";
    const hp = [selected?.hp0, selected?.hp1, selected?.hp2].filter(Boolean).join("");
    const isest =
      selected?.isest === "1" || selected?.isest === "0"
        ? selected.isest
        : (selected?.isestname === "견적" ? "1" : "0");
    const inday = selected?.inday || "";
  
    const url =
      `/estsmsend?est_serial=${encodeURIComponent(est_serial)}` +
      `&carno=${encodeURIComponent(carno)}` +
      `&hp=${encodeURIComponent(hp)}` +
      `&isest=${encodeURIComponent(isest)}` +
      `&inday=${encodeURIComponent(inday)}`;
  
    // 이미 열려있으면 재사용 + ctx만 갱신
    if (smsWinRef.current && !smsWinRef.current.closed) {
      try {
        smsWinRef.current.focus();
        smsWinRef.current.postMessage(
          {
            type: "SMS_SEND_SET_CTX",
            payload: { est_serial, carno, hp, isest, inday },
          },
          window.location.origin
        );
        registerChildWin(smsWinRef.current);
        return;
      } catch {
        smsWinRef.current = null;
      }
    }
  
    const win = openCenteredWindow(url, "smsSend", 640, 760, {
      scrollbars: "yes",
      resizable: "yes",
    });
    smsWinRef.current = win;
    registerChildWin(win);
  };
  
  const openMemoPopup = () => {
    const est_serial = selected?.est_serial || "";
    const carno = selected?.carno || "";
  
    const url =
      `/estimate-memo?est_serial=${encodeURIComponent(est_serial)}` +
      `&carno=${encodeURIComponent(carno)}`;
  
    // 이미 열려있으면 재사용 + ctx 갱신
    if (memoWinRef.current && !memoWinRef.current.closed) {
      try {
        memoWinRef.current.focus();
        memoWinRef.current.postMessage(
          { type: "ESTIMATE_MEMO_SET_CTX", payload: { est_serial, carno } },
          window.location.origin
        );
        registerChildWin(memoWinRef.current);
        return;
      } catch {
        memoWinRef.current = null;
      }
    }
  
    // 없거나 닫혔으면 새로 열기
    const win = openCenteredWindow(url, "estimateMemo", 900, 820, {
      scrollbars: "yes",
      resizable: "yes",
    });
    memoWinRef.current = win;
    registerChildWin(win);
  };

  const [claimSelectOpen, setClaimSelectOpen] = useState(false);
  const [claimSelectKind, setClaimSelectKind] = useState("estimate");
  const [mailOpen, setMailOpen] = useState(false);

  const openMailClaimSend = useCallback(() => {
    const payload = {
      est_serial: selected?.est_serial ?? "",
      carno:      selected?.carno      ?? "",
      comcode:    getComcode(),
      claims:     claims,
      isest:      selected?.isest      ?? "",
    };

    if (claimWinRef.current && !claimWinRef.current.closed) {
      try {
        claimWinRef.current.focus();
        claimWinRef.current.postMessage(
          { type: "EST_CLAIM_SEND_SET_CTX", payload },
          window.location.origin
        );
        return;
      } catch {
        claimWinRef.current = null;
      }
    }

    const win = openCenteredWindow("/est-claim-send", "estClaimSend", 750, 1000, {
      postMessage: { type: "EST_CLAIM_SEND_SET_CTX", payload },
    });
    claimWinRef.current = win;
    registerChildWin(win);
  }, [selected, claims]);

  const openCustomerMailSend = useCallback(() => {
    const payload = {
      est_serial:  selected?.est_serial  ?? "",
      carno:       selected?.carno       ?? "",
      comcode:     getComcode(),
      isest:       selected?.isest       ?? "",
      estbo_seqno: selectedClaim?.estbo_seqno ?? "",
      email_acc:   selected?.email_acc   ?? "",
      email_smtp:  selected?.email_smtp  ?? "",
    };

    if (customerWinRef.current && !customerWinRef.current.closed) {
      try {
        customerWinRef.current.focus();
        customerWinRef.current.postMessage(
          { type: "EST_CUSTOMER_SEND_SET_CTX", payload },
          window.location.origin
        );
        return;
      } catch {
        customerWinRef.current = null;
      }
    }

    const win = openCenteredWindow("/est-customer-send", "estCustomerSend", 750, 1000, {
      postMessage: { type: "EST_CUSTOMER_SEND_SET_CTX", payload },
    });
    customerWinRef.current = win;
    registerChildWin(win);
  }, [selected, selectedClaim]);

  const openMailHistoryPage = useCallback(() => {
    if (mailHistWinRef.current && !mailHistWinRef.current.closed) {
      try { mailHistWinRef.current.focus(); return; } catch { mailHistWinRef.current = null; }
    }
    const win = openCenteredWindow("/mail-history", "mailHistory", 1100, 800, {
      scrollbars: "yes", resizable: "yes",
    });
    mailHistWinRef.current = win;
    registerChildWin(win);
  }, []);

  const openInspectionPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/inspection-estimate` +
      `?est_serial=${encodeURIComponent(selected?.est_serial ?? "")}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    const win = openCenteredWindow(url, "inspectionEstimatePrint", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
    registerChildWin(win);
  }, [selected?.est_serial]);

  const openInspectionStatementPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/inspection-statement` +
      `?est_serial=${encodeURIComponent(selected?.est_serial ?? "")}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    const win = openCenteredWindow(url, "inspectionStatementPrint", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
    registerChildWin(win);
  }, [selected?.est_serial]);

  const openInsuranceClaimPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/insurance-claim` +
      `?est_serial=${encodeURIComponent(selected?.est_serial ?? "")}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    const win = openCenteredWindow(url, "insuranceClaimPrint", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
    registerChildWin(win);
  }, [selected?.est_serial]);

  const openPrivacyConsentPrint = useCallback(() => {
    if (!selected) return;
    const payload = {
      est_serial:  selected.est_serial,
      accday:      selected.accday,
      carno:       selected.carno,
      custom_name: selected.custom_name,
      hp0:         selected.hp0,
      hp1:         selected.hp1,
      hp2:         selected.hp2,
      email_acc:   selected.email_acc,
      email_smtp:  selected.email_smtp,
      claims,
    };
    sessionStorage.setItem("privacyConsentCtx", JSON.stringify(payload));
    const win = openCenteredWindow("/print/privacy-consent", "privacyConsent", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
    registerChildWin(win);
  }, [selected, claims]);

  const onPrint = useCallback((kind) => {
    if (!selected) return;
    if (kind === "개인정보 활용동의") {
      openPrivacyConsentPrint();
      return;
    }
    if (claims.length === 0) return;
    if (kind === "점검정비 견적서") {
      if (claims.length === 1) {
        openInspectionPrint(claims[0].estbo_seqno);
      } else {
        setClaimSelectKind("estimate");
        setClaimSelectOpen(true);
      }
      return;
    }
    if (kind === "점검정비 명세서") {
      if (claims.length === 1) {
        openInspectionStatementPrint(claims[0].estbo_seqno);
      } else {
        setClaimSelectKind("statement");
        setClaimSelectOpen(true);
      }
      return;
    }
    if (kind === "수리비 청구서") {
      if (claims.length === 1) {
        openInsuranceClaimPrint(claims[0].estbo_seqno);
      } else {
        setClaimSelectKind("insurance");
        setClaimSelectOpen(true);
      }
      return;
    }
  }, [selected, claims, openInspectionPrint, openInspectionStatementPrint, openInsuranceClaimPrint, openPrivacyConsentPrint, setClaimSelectKind, setClaimSelectOpen]);

  // ====== 수정잠금 해제 ======
  const handleUnlock = useCallback(async (row) => {
    try {
      await withLoading(async () => {
        await unlockEstimate(row.est_serial);
        await fetchEstimates(dateFrom, dateTo);
      }, "처리 중...");
    } catch (err) {
      error(err?.message ?? "잠금 해제 실패");
    }
  }, [unlockEstimate, fetchEstimates, dateFrom, dateTo, withLoading, error]);

  // ====== 견적청구 / 견적종결 ======
  const [outdayModal, setOutdayModal] = useState(null);
  // { type: 'request'|'close', row }

  const handleRequest = useCallback(async (row) => {
    const needsDate = String(row.isest) !== "1" && !row.outday;
    if (needsDate) { setOutdayModal({ type: "request", row }); return; }
    try {
      await withLoading(async () => {
        await requestEstimate(row.est_serial, row.outday ?? "");
        await fetchEstimates(dateFrom, dateTo);
      }, "처리 중...");
    } catch (err) { error(err?.message ?? "견적청구 실패"); }
  }, [requestEstimate, fetchEstimates, dateFrom, dateTo, withLoading, error, setOutdayModal]);

  const handleCloseEst = useCallback(async (row) => {
    const ok = await confirm("견적을 종결하시겠습니까?", "견적종결");
    if (!ok) return;
    if (!row.outday) { setOutdayModal({ type: "close", row }); return; }
    try {
      await withLoading(async () => {
        await closeEstimate(row.est_serial, row.outday);
        await fetchEstimates(dateFrom, dateTo);
      }, "처리 중...");
    } catch (err) { error(err?.message ?? "견적종결 실패"); }
  }, [closeEstimate, fetchEstimates, dateFrom, dateTo, withLoading, error, confirm, setOutdayModal]);

  const handleOutdayConfirm = useCallback(async (outday) => {
    const { type, row } = outdayModal;
    setOutdayModal(null);
    try {
      await withLoading(async () => {
        if (type === "request") await requestEstimate(row.est_serial, outday);
        else                    await closeEstimate(row.est_serial, outday);
        await fetchEstimates(dateFrom, dateTo);
      }, "처리 중...");
    } catch (err) { error(err?.message ?? "처리 실패"); }
  }, [outdayModal, requestEstimate, closeEstimate, fetchEstimates, dateFrom, dateTo, withLoading, error, setOutdayModal]);

  const estimateColumns = useMemo(
    () => [
      { key: "seccodename", title: "구분", width: "7%", align: "left" },
      { key: "carno", title: "차량번호", width: "9%", align: "left" },
      { key: "carname", title: "차량명", width: "12%", align: "left" },
      { key: "custom_name", title: "고객명", width: "9%", align: "left" },
      { key: "hp0", title: "연락처", width: "10%", align: "left", render: (_v, row) => [row.hp0, row.hp1, row.hp2].filter(Boolean).join('-') || "-" },
      { key: "bocomname", title: "보험사", width: "12%", align: "left" },
      { key: "saletotal", title: "견적금액", width: "9%", align: "right", render: (v) => fmt(v) },
      { key: "inday", title: "입고일자", width: "9%", align: "left" },
      { key: "outday", title: "출고일자", width: "9%", align: "left", render: (v) => v || "-" },
      { key: "preoutdate", title: "출고예정일시", width: "12%", align: "left" },
      { key: "statename", title: "상태", width: "8%", align: "left", render: (v, row) => <StatusBadge value={v} row={row} onUnlock={handleUnlock} onRequest={handleRequest} onCloseEst={handleCloseEst} /> },
    ],
    [handleUnlock, handleRequest, handleCloseEst]
  );

  // ====== 조회 버튼 ======
  const onSearch = useCallback(async () => {
    setSelected(null);
    await fetchEstimates(dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchEstimates]);

  // ====== 텍스트 검색 버튼 ======
  const onSearchByText = useCallback(async () => {
    if (!searchText.trim()) return;
    setSelected(null);
    await withLoading(() => fetchByText(searchText.trim()), '검색 중...');
  }, [searchText, fetchByText, withLoading, setSelected]);

  // 견적 선택 시 → 청구보험 조회 (selectedClaim 초기화는 setSelectedClaim(null) in row click)
  useEffect(() => {
    if (selected?.est_serial) {
      fetchClaims(selected.est_serial);
    }
  }, [selected?.est_serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // 청구보험 선택 시 → 견적상세 조회
  useEffect(() => {
    if (selectedClaim?.estbo_seqno && selected?.est_serial) {
      fetchDetails(selected.est_serial, selectedClaim.estbo_seqno);
    }
  }, [selectedClaim?.estbo_seqno]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const saveWorkScroll = () => {
    const el = workBodyElRef.current;
    if (!el) return;
    workScrollPosRef.current = { top: el.scrollTop || 0, left: el.scrollLeft || 0 };
  };
  
  const restoreWorkScroll = () => {
    const el = workBodyElRef.current;
    if (!el) return;
  
    const { top, left } = workScrollPosRef.current || { top: 0, left: 0 };
    el.scrollTop = top;
    el.scrollLeft = left;
  };

  const openDepositPopup = () => {
    if (!requireSelected()) return;

    const est_serial = selected?.est_serial || "";
    const carno = selected?.carno || "";

    sessionStorage.setItem(
      "depositCtx",
      JSON.stringify({
        est_serial,
        carno,
        claims: claims.slice(0, 2),
      })
    );

    const url =
      `/estimate-deposit?est_serial=${encodeURIComponent(est_serial)}` +
      `&carno=${encodeURIComponent(carno)}`;

    // 이미 열려있으면 재사용 + ctx 갱신
    if (depositWinRef.current && !depositWinRef.current.closed) {
      try {
        depositWinRef.current.focus();
        depositWinRef.current.postMessage(
          {
            type: "ESTIMATE_DEPOSIT_SET_CTX",
            payload: {
              est_serial,
              carno,
              claims: claims.slice(0, 2), // 핵심
            },
          },
          window.location.origin
        );
        registerChildWin(depositWinRef.current);
        return;
      } catch {
        depositWinRef.current = null;
      }
    }

    const win = openCenteredWindow(url, "estimateDeposit", 900, 620, {
      scrollbars: "yes",
      resizable: "yes",
    });

    const payload = {
      est_serial,
      carno,
      claims: claims.slice(0, 2),
    };

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "ESTIMATE_DEPOSIT_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */ }
    }, 200);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "ESTIMATE_DEPOSIT_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */ }
    }, 700);

    depositWinRef.current = win;
    registerChildWin(win);
  };


  useEffect(() => {
    const w = smsWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.est_serial || "",
      carno: selected?.carno || "",
      hp: [selected?.hp0, selected?.hp1, selected?.hp2].filter(Boolean).join(""),
      isest:
        selected?.isest === "1" || selected?.isest === "0"
          ? selected.isest
          : (selected?.isestname === "견적" ? "1" : "0"),
      inday: selected?.inday || "",
    };
  
    try {
      w.postMessage(
        { type: "SMS_SEND_SET_CTX", payload },  window.location.origin);
    } catch { /* empty */ }
  }, [selected]);

  useEffect(() => {
    const w = photoWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.est_serial || "",
      carno: selected?.carno || "",
    };
  
    try {
      w.postMessage(
        { type: "PHOTO_VIEWER_SET_CTX", payload },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [selected]);
    
  useEffect(() => {
    const w = memoWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.est_serial || "",
      carno: selected?.carno || "",
    };
  
    try {
      w.postMessage(
        { type: "ESTIMATE_MEMO_SET_CTX", payload },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [selected?.est_serial, selected?.carno]);

  useEffect(() => {
    const w = depositWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.est_serial || "",
      carno: selected?.carno || "",
      claims: claims.slice(0, 2),
    };
  
    try {
      w.postMessage(
        { type: "ESTIMATE_DEPOSIT_SET_CTX", payload },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [selected?.est_serial, selected?.carno, claims]);
  
  useEffect(() => {
    if (!detailOpen) return;
    
    // 열릴 때: 렌더 완료 후 복원(세로/가로)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreWorkScroll();
      });
    });  
  }, [detailOpen]);

  // 새 견적 선택 시: 상세 스크롤은 항상 TOP으로
  useEffect(() => {
    // 선택 해제(null)면 그냥 초기화만
    workScrollPosRef.current = { top: 0, left: 0 };

    // 상세가 열려 있고 DOM이 살아있으면 즉시/렌더 후 스크롤을 0으로
    if (!detailOpen) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = workBodyElRef.current;
        if (!el) return;
        el.scrollTop = 0;
        el.scrollLeft = 0; // 가로도 같이 초기화(원치 않으면 제거)
      });
    });
  }, [selected?.est_serial, detailOpen]);

  // 팝업(인쇄/청구 등)에서 마스터 변경 시 목록 재조회
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type !== "EST_MASTER_REFRESH") return;
      fetchEstimates(dateFrom, dateTo);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dateFrom, dateTo, fetchEstimates]);

  useEffect(() => {
    const onBeforeUnload = () => closeAllChildWins();
    const onUnload = () => closeAllChildWins();

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unload", onUnload);

    return () => {
      // 라우트 이동/언마운트 시에도 자식 정리
      closeAllChildWins();
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("unload", onUnload);
    };
  }, []);

  
  return (
    // <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
    <div className="bg-zinc-50 flex flex-col min-h-0 h-full overflow-hidden">

      {/* 1) 타이틀 */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">보험 견적일지</div>
              <div className="text-xs text-zinc-500">견적 · 청구 · 작업 내역을 한 화면에서 관리</div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              onClick={() => alert("[보험견적] 퀵버튼")}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              보험견적
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full px-4 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* 2) Global Action (신규견적, 엑셀만 상단 고정) */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={onNew}
            >
              + 신규견적
            </button>
            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onExcel}
            >
              엑셀내보내기
            </button>
          </div>

        </div>

        {/* 3) 조회/검색 */}
        <div className="mb-3 rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-zinc-800">입고일자</div>

              <DateInput
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                }}
              />
              <span className="text-zinc-400">~</span>

              <div className="flex items-center gap-2">
                <DateInput
                  value={dateTo}
                  onChange={(v) => {
                    setDateTo(v);
                    setMonthAnchor(new Date(v));
                  }}
                />

                {/* 전달 / 금월 / < > */}
                <div className="flex items-center gap-1">
                  <MiniBtn
                    onClick={() => {
                      const d = addMonths(monthAnchor, -1);
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(d);
                    }}
                  >
                    전월
                  </MiniBtn>

                  <MiniBtn
                    onClick={() => {
                      const d = new Date(); // 금월
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
                    }}
                  >
                    금월
                  </MiniBtn>

                  <MiniBtn
                    title="-1개월"
                    onClick={() => {
                      const d = addMonths(monthAnchor, -1);
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(d);
                    }}
                  >
                    {"<"}
                  </MiniBtn>

                  <MiniBtn
                    title="+1개월"
                    onClick={() => {
                      const d = addMonths(monthAnchor, +1);
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(d);
                    }}
                  >
                    {">"}
                  </MiniBtn>
                </div>
              </div>

              <button
                className="ml-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={() => withLoading(onSearch, '조회 중...')}
              >
                조회
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearchByText()}
                  placeholder="검색내용"
                  className="w-[280px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={onSearchByText}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  검색
                </button>
              </div>

              <CheckBox label="견적" checked={chkEstimate} onChange={setChkEstimate} />
              <CheckBox label="작업" checked={chkWork} onChange={setChkWork} />
              <CheckBox label="종결" checked={chkClosed} onChange={setChkClosed} />

              <div className="ml-auto">
                <select
                  className="select-base" 
                  value={effectiveSortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                >
                  {sortCodes.map(c => (
                    <option key={c.value} value={c.def_value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 아래부터: 리스트(상단) + 분할바 + 상세(하단) ===== */}
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
          {/* 상단: 견적/청구 목록 영역 (detailHeight가 커지면 자동으로 줄어듦) */}
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden gap-3">

            {/* 4) 견적목록 */}
            <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0 flex-1">
              <div className="border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">견적목록</div>
                  <div className="text-xs text-zinc-500">{insuranceEstimates.length}건</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <FixedHeadTable
                  columns={estimateColumns}
                  rows={insuranceEstimates}
                  rowKey={(r) => r.est_serial}
                  selectedKey={selected?.est_serial}
                  onRowClick={(r) => { setSelected(r); setSelectedClaim(null); setPrintOpen(false); setMailOpen(false); }}
                  // 선택 행 아래에 인라인 액션 표시 (기존 UX 그대로)
                  expandedKey={selected?.est_serial}
                  expandedRowRender={() => (
                    <InlineActions
                      onModify={onModify}
                      onDelete={onDelete}
                      onClose={onClose}
                      onPhoto={openPhotoViewer}
                      onSms={openSmsPopup}
                      onMemo={openMemoPopup}
                      onDeposit={openDepositPopup}
                      printOpen={printOpen}
                      setPrintOpen={setPrintOpen}
                      onPrint={onPrint}
                      mailOpen={mailOpen}
                      setMailOpen={setMailOpen}
                      onMailClaim={openMailClaimSend}
                      onCustomerSend={openCustomerMailSend}
                      onMailHistory={openMailHistoryPage}
                      isest={selected?.isest}
                    />
                  )}
                  // 카드 안에서 바디만 스크롤
                  height="100%"
                  bodyClassName="min-h-0 flex-1"
                  rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
                  rowHoverClass="hover:!bg-gray-50"
                  gutterSelectedClass="!bg-blue-100"
                  gutterHoverClass="!bg-gray-50"
                />
              </div>


            </div>

            {/* 5) 청구보험목록 (높이 제한해서 상단 영역 내에서 자연스럽게) */}
            <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0"
                style={{ height: 160 }}>
              <div className="border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">청구보험 목록</div>
                  <div className="text-xs text-zinc-500">{selected ? "선택 견적 기준" : "견적을 선택하세요"}</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <FixedHeadTable
                  columns={claimColumns}
                  rows={selected ? claims : []}
                  rowKey={(r, idx) => r.estbo_seqno || idx}
                  selectedKey={selectedClaim?.estbo_seqno}
                  onRowClick={(r) => setSelectedClaim(r)}
                  emptyText={selected ? "청구 내역이 없습니다." : "견적을 선택하면 청구보험 목록이 표시됩니다."}
                  headerClassName=""
                  bodyClassName="min-h-0 flex-1"
                  height="100%"
                  rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
                  rowHoverClass="hover:!bg-gray-50"
                />

              </div>
            </div>
          </div>

          {/* 6) 분할바: 하단 상세 패널 높이 조절 (상단 목록이 줄어듦) */}
          <div
            className={[
              "group border border-zinc-200 bg-zinc-50 px-4 py-2",
              detailOpen ? "cursor-row-resize" : "",
            ].join(" ")}
            title={detailOpen ? "드래그해서 상세 영역 높이 조절" : "상세를 펼친 뒤 드래그 가능"}
          >
            <div className="flex items-center justify-between">
              {/* 가운데 핸들(드래그 영역) */}
              <div
                onMouseDown={detailOpen ? onSplitDown : undefined}
                className={[
                  "flex-1 flex items-center justify-center gap-2 text-xs text-zinc-500",
                  detailOpen ? "cursor-row-resize" : "cursor-not-allowed opacity-60",
                ].join(" ")}
              >
                <span className="h-1 w-10 rounded-full bg-zinc-300 group-hover:bg-zinc-400" />
                <span>분할바</span>
                <span className="h-1 w-10 rounded-full bg-zinc-300 group-hover:bg-zinc-400" />
              </div>

              {/* 항상 보이는 상세 토글 버튼 */}
              <button
                className="ml-3 rounded-md bg-sky-200 px-3 py-1.5 text-sm text-blue font-semibold hover:bg-sky-100"
                onClick={() => {
                  // 닫는 순간에는 언마운트 되기 전에 저장해야 안전
                  if (detailOpen) saveWorkScroll();
                  setDetailOpen((v) => !v);
                }}
                type="button"
              >
                {detailOpen ? "견적상세 접기" : "견적상세 열기"}
              </button>
            </div>
          </div>


          {/* 7) 견적상세 패널 (detailHeight가 커지면 상단 리스트가 줄어듦) */}
          <div
            className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col"
            style={{ height: detailOpen ? detailHeight : 52 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div className="text-sm font-semibold text-zinc-900">견적상세</div>
            </div>


            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
              {!detailOpen ? (
                <div className="px-4 py-4 text-sm text-zinc-500">
                  기본은 접힘 상태입니다. <b>상세작업 보기</b>를 눌러 펼치세요.
                </div>
              ) : !selected ? (
                <div className="px-4 py-10 text-center text-zinc-500">
                  견적을 선택하면 상세가 표시됩니다.
                </div>
              ) : (
                <FixedHeadTable
                  columns={workColumns}
                  rows={details}
                  rowKey={(r, idx) => r.estb_orgseqno || idx}
                  height="100%"
                  bodyClassName="min-h-0 flex-1"
                  bodyScrollRef={workBodyElRef}
                />
              )}
            </div>
          </div>
        </div>

      </div>

      <ClaimSelectModal
        open={claimSelectOpen}
        onClose={() => setClaimSelectOpen(false)}
        claims={claims}
        onSelect={(estbo_seqno) => {
          setClaimSelectOpen(false);
          if (claimSelectKind === "statement") {
            openInspectionStatementPrint(estbo_seqno);
          } else if (claimSelectKind === "insurance") {
            openInsuranceClaimPrint(estbo_seqno);
          } else {
            openInspectionPrint(estbo_seqno);
          }
        }}
      />

      <OutdayModal
        key={String(!!outdayModal)}
        open={!!outdayModal}
        title={outdayModal?.type === "request" ? "견적청구 - 출고일자 입력" : "견적종결 - 출고일자 입력"}
        onConfirm={handleOutdayConfirm}
        onClose={() => setOutdayModal(null)}
      />

    </div>
  );
}

/* =================== UI Components =================== */
function InlineActions({
  onModify,
  onDelete,
  onClose,
  onPhoto,
  onSms,
  onMemo,
  onDeposit,
  printOpen,
  setPrintOpen,
  onPrint,
  mailOpen,
  setMailOpen,
  onMailClaim,
  onCustomerSend,
  onMailHistory,
  isest,
}) {
  const printItems = String(isest) === "1"
    ? [
        { label: "점검정비 견적서" },
        { label: "개인정보 활용동의" },
      ]
    : [
        { label: "작업지시서" },
        { label: "수리비 청구서" },
        { label: "점검정비 명세서" },
        { label: "개인정보 활용동의" },
      ];

  const customerMailLabel = String(isest) === "1"
    ? "점검정비 견적서 - 고객용"
    : "점검정비 명세서 - 고객용";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SmallBtn onClick={onModify}>수정</SmallBtn>
      <SmallBtn onClick={onDelete}>삭제</SmallBtn>
      <SmallBtn onClick={onClose}>종결</SmallBtn>
      <span className="mx-1 h-5 w-px bg-zinc-200" />

      <SmallBtn onClick={onPhoto}>사진</SmallBtn>
      <SmallBtn onClick={onSms}>문자</SmallBtn>

      <div className="relative">
        <SmallBtn onClick={() => { setMailOpen(!mailOpen); setPrintOpen(false); }}>메일 ▾</SmallBtn>
        {mailOpen && (
          <div className="absolute left-0 top-9 w-52 flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg z-10">
            <MenuItem onClick={() => { setMailOpen(false); onMailClaim?.(); }}>
              견적청구 - 보험사
            </MenuItem>
            <MenuItem onClick={() => { setMailOpen(false); onCustomerSend?.(); }}>
              {customerMailLabel}
            </MenuItem>
            <MenuItem onClick={() => { setMailOpen(false); onMailHistory?.(); }}>
              발송메일 조회
            </MenuItem>
          </div>
        )}
      </div>

      <div className="relative">
        <SmallBtn onClick={() => { setPrintOpen(!printOpen); setMailOpen(false); }}>인쇄 ▾</SmallBtn>
        {printOpen && (
          <div className="absolute left-0 top-9 w-48 flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg z-10">
            {printItems.map((item) => (
              <MenuItem key={item.label} onClick={() => { setPrintOpen(false); onPrint(item.label); }}>
                {item.label}
              </MenuItem>
            ))}
          </div>
        )}
      </div>
      <SmallBtn onClick={onMemo}>메모</SmallBtn>
      <SmallBtn onClick={onDeposit}>입금</SmallBtn>
    </div>
  );
}


function SmallBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-200"
    >
      {children}
    </button>
  );
}


function Btn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 active:translate-y-[1px]"
    >
      {children}
    </button>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none hover:bg-zinc-50 focus:border-zinc-400"
    />
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "rounded-md border px-3 py-2 text-sm font-semibold",
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StatusBadge({ value, row, onUnlock, onRequest, onCloseEst }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef(null);

  const isLocked   = Boolean(row?.est_print || row?.reqday || row?.workend);
  const canRequest = !row?.reqday;
  const canClose   = !row?.workend;
  const hasMenu    = isLocked || canRequest || canClose;

  const cls =
    value === "종결"
      ? "bg-emerald-100 text-emerald-800"
      : value === "작업"
      ? "bg-sky-100 text-sky-800"
      : "bg-zinc-100 text-zinc-700";

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!badgeRef.current?.contains(e.target)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const handleBadgeClick = () => {
    if (!hasMenu) return;
    if (open) { setOpen(false); return; }
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  const pick = (fn, arg) => { setOpen(false); fn?.(arg); };

  return (
    <span ref={badgeRef} className="inline-flex">
      <span
        className={[
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
          cls,
          hasMenu ? "cursor-pointer hover:brightness-95" : "",
        ].join(" ")}
        onClick={handleBadgeClick}
      >
        {value}
      </span>
      {open && hasMenu && (
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[9999] min-w-[120px] rounded-md border border-zinc-200 bg-white shadow-lg py-1 flex flex-col"
        >
          {canRequest && (
            <button type="button" className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100"
              onClick={() => pick(onRequest, row)}>견적청구</button>
          )}
          {canClose && (
            <button type="button" className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100"
              onClick={() => pick(onCloseEst, row)}>견적종결</button>
          )}
          {isLocked && (
            <button type="button" className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100"
              onClick={() => pick(onUnlock, row)}>수정잠금 해제</button>
          )}
        </div>
      )}
    </span>
  );
}

function OutdayModal({ open, title, onConfirm, onClose }) {
  const [date, setDate] = useState(() => ymd(new Date()));
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
      <div className="w-[320px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden">
        <header className="flex items-center border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
        </header>
        <div className="px-4 py-4 flex items-center gap-3">
          <label className="text-sm text-zinc-700 whitespace-nowrap">출고일자</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3">
          <button type="button" onClick={onClose}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
            취소
          </button>
          <button type="button" disabled={!date} onClick={() => onConfirm(date)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function MiniBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

