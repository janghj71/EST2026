import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Pencil, Trash2, ArrowRightLeft, Camera, MessageSquare,
  Mail, Printer, StickyNote, Wallet,
  Send, User, History, FileText, ChevronRight,
} from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import { openCenteredWindow } from "../utils/popup";
import ClaimSelectModal from "./estimate/ClaimSelectModal";
import CheckBox from "../components/CheckBox";
import { useAlert } from "../alerts";
import { useLoading } from "../loading/useLoading";
import { useEstimate } from "../hooks/useEstimate";
import { useTbCode } from "../hooks/useTbCode";
import { getComcode, getUserid } from "../api/config";
import { useEstToReq } from "../hooks/useEstToReq";
import { useNewEstimate } from "../hooks/useNewEstimate";
import { useEstimateDelete } from "../hooks/useEstimateDelete";

/**
 * 보험 견적일지 (UI 샘플)
 * - Row Action: 행 선택 시 화면 하단 슬라이드업
 * - 분할바: "견적상세" 바로 위 (드래그로 상세 영역 높이 조절)
 * - 테이블 컬럼은 그대로(예시로만 렌더). 실제 컬럼/데이터는 그대로 꽂으면 됨.
 */

import { ymd, monthRange, addMonths } from "../utils/dateUtils";


function loadSavedState(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function loadSavedFilter(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function clearSavedState(key) {
  try { sessionStorage.removeItem(key); } catch { /* empty */ }
}

export default function InsuranceEstimate({ seccode = "12" }) {
  const isInsurance = seccode === "12";
  const SS_KEY        = isInsurance ? "insurance_estimate_state"  : "general_estimate_state";
  const SS_FILTER_KEY = isInsurance ? "insurance_estimate_filter" : "general_estimate_filter";

  const navigate = useNavigate();
  const location = useLocation();
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

  const { estToReq } = useEstToReq();
  const { createEstimate } = useNewEstimate();
  const { deleteEstimate } = useEstimateDelete();

  const { codes: sortCodes } = useTbCode('IDX01');

  const workBodyElRef = useRef(null);           // 견적상세 테이블 바디 DOM
  const estimateListBodyRef = useRef(null);     // 견적목록 테이블 바디 DOM (스크롤 복원용)
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

  // ====== 검색/조회 ======
  // _filter: 날짜·필터 복원용 (SS_FILTER_KEY, 삭제 안 함)
  const _filter = loadSavedFilter(SS_FILTER_KEY);

  // React 19: 렌더 중 ref 접근 금지 → useLayoutEffect 로 이동
  // StrictMode 이중 실행 방지: sentinel(undefined) 체크로 최초 1회만 실행
  const restoredSerialRef = useRef(/** @type {string|null|undefined} */(undefined));
  const restoredScrollRef = useRef(0);
  useLayoutEffect(() => {
    if (restoredSerialRef.current !== undefined) return; // 이미 초기화됨
    const _saved = loadSavedState(SS_KEY);
    clearSavedState(SS_KEY);
    restoredSerialRef.current = _saved?.selectedSerial ?? null;
    restoredScrollRef.current = _saved?.scrollTop ?? 0;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [dateFrom, setDateFrom] = useState(() => _filter?.dateFrom ?? monthRange(new Date()).from);
  const [dateTo, setDateTo] = useState(() => _filter?.dateTo ?? monthRange(new Date()).to);
  const [searchText, setSearchText] = useState(() => _filter?.searchText ?? "");
  const [chkEstimate, setChkEstimate] = useState(() => _filter?.chkEstimate ?? true);
  const [chkWork, setChkWork] = useState(() => _filter?.chkWork ?? true);
  const [chkClosed, setChkClosed] = useState(() => _filter?.chkClosed ?? false);
  const [sortKey, setSortKey] = useState(() => _filter?.sortKey ?? "inday desc");
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(_filter?.dateFrom ?? Date.now()));

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

  // 견적일지: seccode 필터 + 체크박스 필터 + 정렬
  const suffix = isInsurance ? "_보험" : "_일반";
  const insuranceEstimates = useMemo(() => {
    const byInsurance = estimates.filter((row) => String(row?.seccode ?? "") === seccode);
    const filtered = (!chkEstimate && !chkWork && !chkClosed)
      ? byInsurance
      : byInsurance.filter((row) => {
          const typeMatch =
            (!chkEstimate && !chkWork) ||
            (chkEstimate && row.seccodename === `견적${suffix}`) ||
            (chkWork     && row.seccodename === `작업${suffix}`);
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
  }, [estimates, chkEstimate, chkWork, chkClosed, effectiveSortKey, seccode, suffix]);

  // 파생 selected: 목록이 새로 고쳐지면 최신 Row 데이터를 반환
  // (selectedRaw 를 그대로 반환하면 fetchEstimates 후에도 구버전 est_print 등이 남아 오동작)
  const selected = useMemo(
    () => {
      if (!selectedRaw) return null;
      return insuranceEstimates.find(r => r.est_serial === selectedRaw.est_serial) ?? null;
    },
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
  const [contextMenu, setContextMenu] = useState(null);  // { x, y, row } | null

  // ====== 신규견적 수가 선택 모달 ======
  const [newEstModalOpen, setNewEstModalOpen]   = useState(false);
  const [selectedYear,    setSelectedYear]      = useState("2018");

  const openEstimateEdit = useCallback((row, mode = "edit") => {
    const est_serial = row?.est_serial || "0000000000";
    // 수정 화면 이동 전 현재 상태를 sessionStorage에 저장 → 돌아올 때 복원
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({
        dateFrom, dateTo, searchText,
        chkEstimate, chkWork, chkClosed, sortKey,
        selectedSerial: row?.est_serial ?? null,
        scrollTop: estimateListBodyRef.current?.scrollTop ?? 0,
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
  }, [SS_KEY, dateFrom, dateTo, searchText, chkEstimate, chkWork, chkClosed, sortKey, navigate]);


  // 조회 조건 변경 시 sessionStorage에 저장 (F5 복원용)
  useEffect(() => {
    try {
      sessionStorage.setItem(SS_FILTER_KEY, JSON.stringify({ dateFrom, dateTo, searchText, chkEstimate, chkWork, chkClosed, sortKey })); // eslint-disable-line react-hooks/exhaustive-deps
    } catch { /* empty */ }
  }, [dateFrom, dateTo, searchText, chkEstimate, chkWork, chkClosed, sortKey]);

  // ====== 조회 에러 → 메시지 표시 ======
  useEffect(() => {
    const msg = estError?.message || claimError?.message || detailError?.message;
    if (msg) warning(msg);
  }, [estError, claimError, detailError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ====== 초기 조회 (금월 or 복원된 날짜, 또는 대시보드에서 특정 건 이동) ======
  useEffect(() => {
    const { selectedSerial, inday } = location.state ?? {};
    if (selectedSerial && inday) {
      const toDate   = new Date(inday);
      const fromDate = new Date(inday);
      fromDate.setDate(fromDate.getDate() - 30);
      const from = ymd(fromDate);
      const to   = ymd(toDate);
      setDateFrom(from);
      setDateTo(to);
      restoredSerialRef.current = selectedSerial;
      fetchEstimates(from, to);
    } else {
      fetchEstimates(dateFrom, dateTo);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ====== 수정 화면에서 복귀 시 선택 행 + 스크롤 위치 자동 복원 ======
  useEffect(() => {
    const serial = restoredSerialRef.current;
    if (!serial || !estimates.length) return;
    const found = estimates.find((r) => r.est_serial === serial);
    if (found) {
      // 스크롤 위치를 먼저 복원 → FixedHeadTable A안 effect(double-rAF)가
      // 복원된 위치 기준으로 잘림 여부를 판단하도록 선행 처리
      const el = estimateListBodyRef.current;
      if (el) el.scrollTop = restoredScrollRef.current;

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
    setSelectedYear("2018");
    setNewEstModalOpen(true);
  };

  const onNewRef = useRef(onNew);
  useEffect(() => { onNewRef.current = onNew; });

  useEffect(() => {
    if (!location.state?.openNew) return;
    onNewRef.current();
    navigate(location.pathname, { replace: true, state: {} });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewEstConfirm = useCallback(async () => {
    setNewEstModalOpen(false);
    const paykind = selectedYear === "2018" ? "3" : "1";
    const pntkind = selectedYear === "2018" ? "3" : "1";
    try {
      await withLoading(async () => {
        const res = await createEstimate({
          seccode,
          paykind,
          pntkind,
          userid:  getUserid(),
        });
        const newserial = res?.newserial ?? res?.dataset?.[0]?.newserial;
        await fetchEstimates(dateFrom, dateTo);
        if (newserial) {
          openEstimateEdit({ est_serial: newserial });
        }
      }, "신규 견적 생성 중...");
    } catch (err) { error(err?.message ?? "신규 견적 생성 실패"); }
  }, [selectedYear, seccode, createEstimate, fetchEstimates, dateFrom, dateTo, openEstimateEdit, withLoading, error]);
  const onExcel = () => alert("엑셀내보내기");

  const onModify = () => {
    if (!requireSelected()) return;
    openEstimateEdit(selected, "edit");
  };
  const onDelete = useCallback(async () => {
    if (!selected) return;
    const row = selected;

    // ── 삭제 불가 조건 ──
    if (row.workend && row.workend !== "") {
      await warning(`${row.workend} 일시에 종결하셨습니다.\n삭제가 불가합니다.`);
      return;
    }
    if (row.reqday && row.reqday !== "") {
      await warning(`${row.reqday} 일에 청구하셨습니다.\n삭제가 불가합니다.`);
      return;
    }
    if (String(row.est_print) === "1") {
      await warning("견적서를 발행 하셨습니다.\n삭제가 불가합니다.");
      return;
    }

    const ok = await confirm("견적을 삭제하시겠습니까?", "견적삭제");
    if (!ok) return;

    try {
      await withLoading(async () => {
        await deleteEstimate({ est_serial: row.est_serial, userid: getUserid() });
        setSelected(null);
        await fetchEstimates(dateFrom, dateTo);
      }, "삭제 중...");
    } catch (err) {
      error(err?.message ?? "삭제 실패");
    }
  }, [selected, deleteEstimate, fetchEstimates, dateFrom, dateTo, withLoading, warning, error, confirm]);
  
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

  const openGeneralRepairClaimPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/general-repair-claim` +
      `?est_serial=${encodeURIComponent(selected?.est_serial ?? "")}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    const win = openCenteredWindow(url, "generalRepairClaimPrint", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
    registerChildWin(win);
  }, [selected?.est_serial]);

  const openWorkOrderPrint = useCallback(() => {
    const url = `/print/work-order?est_serial=${encodeURIComponent(selected?.est_serial ?? "")}`;
    const win = openCenteredWindow(url, "workOrderPrint", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
    registerChildWin(win);
  }, [selected?.est_serial]);

  const openPrivacyConsentPrint = useCallback(() => {
    if (!selected) return;
    const payload = {
      est_serial:  selected.est_serial,
      seccode:     selected.seccode,
      accday:      selected.accday,
      inday:       selected.inday,
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
    if (kind === "작업지시서") {
      openWorkOrderPrint();
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
      const openFn = isInsurance ? openInsuranceClaimPrint : openGeneralRepairClaimPrint;
      if (claims.length === 1) {
        openFn(claims[0].estbo_seqno);
      } else {
        setClaimSelectKind("insurance");
        setClaimSelectOpen(true);
      }
      return;
    }
  }, [selected, claims, isInsurance, openInspectionPrint, openInspectionStatementPrint, openInsuranceClaimPrint, openGeneralRepairClaimPrint, openWorkOrderPrint, openPrivacyConsentPrint, setClaimSelectKind, setClaimSelectOpen]);

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

  // ====== 작업전환 (견적 → 작업 copy) ======
  const handleEstToReq = useCallback(async (row) => {
    const ok = await confirm("견적을 작업으로 전환하시겠습니까?", "작업전환");
    if (!ok) return;
    try {
      await withLoading(async () => {
        const res = await estToReq({
          est_serial: row.est_serial,
          update_id:  getUserid(),
        });
        const newserial = res?.newserial ?? res?.dataset?.[0]?.newserial;
        await fetchEstimates(dateFrom, dateTo);
        if (newserial) {
          // 새 Row 찾아서 선택 → 수정 화면으로 이동
          openEstimateEdit({ est_serial: newserial });
        }
      }, "작업전환 중...");
    } catch (err) { error(err?.message ?? "작업전환 실패"); }
  }, [estToReq, fetchEstimates, dateFrom, dateTo, withLoading, error, confirm, openEstimateEdit]);

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
      {
        key: "seccodename", title: "구분", width: "7%", align: "left",
        render: (v) => {
          if (v === "작업_보험" || v === "작업_일반") {
            const idx = v.indexOf("_");
            return (
              <>
                <span className="text-violet-600 font-semibold">{v.slice(0, idx)}</span>
                {v.slice(idx)}
              </>
            );
          }
          return v;
        },
      },
      { key: "carno", title: "차량번호", width: "9%", align: "left" },
      { key: "carname", title: "차량명", width: isInsurance ? "12%" : "12%", align: "left" },
      { key: "custom_name", title: "고객명", width: "9%", align: "left" },
      { key: "hp0", title: "연락처", width: "10%", align: "left", render: (_v, row) => [row.hp0, row.hp1, row.hp2].filter(Boolean).join('-') || "-" },
      isInsurance
        ? { key: "bocomname", title: "보험사", width: "12%", align: "left" }
        : { key: "vinno", title: "차대번호", width: "13%", align: "left", className: "font-mono" },
      { key: "saletotal", title: "견적금액", width: "9%", align: "right", render: (v) => fmt(v) },
      { key: "inday", title: "입고일자", width: isInsurance ? "9%" : "9%", align: "left" },
      { key: "outday", title: "출고일자", width:isInsurance ? "9%" : "9%", align: "left", render: (v) => v || "-" },
      { key: "preoutdate", title: "출고예정일시", width: isInsurance ? "12%" : "12%", align: "left" },
      { key: "statename", title: "상태", width: "8%", align: "left", render: (v, row) => <StatusBadge value={v} row={row} onUnlock={handleUnlock} onRequest={handleRequest} onCloseEst={handleCloseEst} /> },
    ],
    [handleUnlock, handleRequest, handleCloseEst, isInsurance]
  );

  // ====== 조회 버튼 ======
  const onSearch = useCallback(async () => {
    setSelected(null);
    setSearchText("");
    await fetchEstimates(dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchEstimates, setSearchText]);

  // ====== 텍스트 검색 버튼 ======
  const onSearchByText = useCallback(async () => {
    if (!searchText.trim()) return;
    setSelected(null);
    await fetchByText(searchText.trim());
  }, [searchText, fetchByText, setSelected]);

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

  // 입금 저장 완료 시 청구보험 목록 리프레시
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type !== "ESTIMATE_DEPOSIT_SAVED") return;
      const { est_serial } = ev.data.payload ?? {};
      if (est_serial) fetchClaims(est_serial);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fetchClaims]);

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
              <div className="text-lg font-semibold text-zinc-900">{isInsurance ? "보험 견적일지" : "일반 견적일지"}</div>
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
                onClick={onSearch}
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
              <div className="border-b border-zinc-100 px-4 h-11 shrink-0 flex items-center gap-3">
                <div className="text-sm font-semibold text-zinc-900">견적목록</div>
                <div className="text-xs text-zinc-500">{insuranceEstimates.length}건</div>
                {selected && (
                  <div className="ml-auto">
                    <InlineActions
                      onModify={onModify}
                      onDelete={onDelete}
                      onEstToReq={() => handleEstToReq(selected)}
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
                      isInsurance={isInsurance}
                    />
                  </div>
                )}
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <TableLoadingOverlay loading={estLoading} />
                <FixedHeadTable
                  columns={estimateColumns}
                  rows={insuranceEstimates}
                  rowKey={(r) => r.est_serial}
                  selectedKey={selected?.est_serial}
                  bodyScrollRef={estimateListBodyRef}
                  onRowClick={(r) => { setSelected(r); setSelectedClaim(null); setPrintOpen(false); setMailOpen(false); }}
                  onRowDoubleClick={(r) => { setSelected(r); openEstimateEdit(r, "edit"); }}
                  getRowProps={(r) => ({
                    onContextMenu: (e) => {
                      e.preventDefault();
                      setSelected(r);
                      setSelectedClaim(null);
                      setPrintOpen(false);
                      setMailOpen(false);
                      setContextMenu({ x: e.clientX, y: e.clientY, row: r });
                    },
                  })}
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

            {/* 5) 청구보험목록 — 보험건만 표시 */}
            {isInsurance && (
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
            )}
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
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-zinc-900">견적상세</div>
                {selected?.carno && (
                  <div className="text-sm font-semibold text-blue-600">{selected.carno}</div>
                )}
              </div>
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
            if (isInsurance) openInsuranceClaimPrint(estbo_seqno);
            else openGeneralRepairClaimPrint(estbo_seqno);
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

      {/* ── 신규견적 수가 선택 모달 ── */}
      {newEstModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden">
            {/* 헤더 */}
            <header className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <span className="text-base font-semibold text-zinc-900">작업시간 선택</span>
              <button
                type="button"
                onClick={() => setNewEstModalOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-200 text-zinc-500"
              >✕</button>
            </header>

            {/* 본문 — 라디오 */}
            <div className="px-4 py-5 flex flex-col gap-4">
              {[
                { year: "2018", label: "2018년 수가" },
                { year: "2005", label: "2005년 수가" },
              ].map(({ year, label }) => (
                <label key={year} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="pricingYear"
                    value={year}
                    checked={selectedYear === year}
                    onChange={() => setSelectedYear(year)}
                    className="w-5 h-5 cursor-pointer accent-zinc-900"
                  />
                  <span className="text-xl text-zinc-800">{label}</span>
                </label>
              ))}
            </div>

            {/* 푸터 */}
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setNewEstModalOpen(false)}
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >취소</button>
              <button
                type="button"
                onClick={handleNewEstConfirm}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          row={contextMenu.row}
          onClose={() => setContextMenu(null)}
          onModify={onModify}
          onDelete={onDelete}
          onEstToReq={() => handleEstToReq(contextMenu.row)}
          onPhoto={openPhotoViewer}
          onSms={openSmsPopup}
          onMemo={openMemoPopup}
          onDeposit={openDepositPopup}
          onPrint={onPrint}
          onMailClaim={openMailClaimSend}
          onCustomerSend={openCustomerMailSend}
          onMailHistory={openMailHistoryPage}
          isInsurance={isInsurance}
        />
      )}

    </div>
  );
}

/* =================== UI Components =================== */
function InlineActions({
  onModify,
  onDelete,
  onEstToReq,
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
  isInsurance = true,
}) {
  const mailBtnRef  = useRef(null);
  const printBtnRef = useRef(null);
  const [mailPos,  setMailPos]  = useState(null);
  const [printPos, setPrintPos] = useState(null);

  // 버튼 위치를 보고 fixed 좌표 계산. 아래 공간이 부족하면 위로 띄움.
  const calcPos = (btnRef, menuHeight, menuWidth) => {
    if (!btnRef.current) return null;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < menuHeight + 8;
    const top  = dropUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8;
    }
    return { top, left };
  };

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

  const MAIL_MENU_W = 208;   // w-52
  const PRINT_MENU_W = 192;  // w-48
  const ITEM_H = 38;         // 메뉴 1행 높이 추정
  const mailMenuH  = 3 * ITEM_H + 8;
  const printMenuH = printItems.length * ITEM_H + 8;

  const handleMailToggle = () => {
    if (mailOpen) {
      setMailOpen(false);
      return;
    }
    setMailPos(calcPos(mailBtnRef, mailMenuH, MAIL_MENU_W));
    setMailOpen(true);
    setPrintOpen(false);
  };

  const handlePrintToggle = () => {
    if (printOpen) {
      setPrintOpen(false);
      return;
    }
    setPrintPos(calcPos(printBtnRef, printMenuH, PRINT_MENU_W));
    setPrintOpen(true);
    setMailOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 select-none">
      <SmallBtn onClick={onModify}>수정</SmallBtn>
      <SmallBtn onClick={onDelete}>삭제</SmallBtn>
      {String(isest) === "1" && (
        <SmallBtn onClick={onEstToReq}>작업전환</SmallBtn>
      )}
      <span className="mx-1 h-5 w-px bg-zinc-200" />

      <SmallBtn onClick={onPhoto}>사진</SmallBtn>
      <SmallBtn onClick={onSms}>문자</SmallBtn>

      <div ref={mailBtnRef}>
        <SmallBtn onClick={handleMailToggle}>메일 ▾</SmallBtn>
      </div>
      {mailOpen && mailPos && createPortal(
        <div
          className="fixed z-[1200] w-52 flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg"
          style={{ top: mailPos.top, left: mailPos.left }}
        >
          {isInsurance && (
            <MenuItem onClick={() => { setMailOpen(false); onMailClaim?.(); }}>
              견적청구 - 보험사
            </MenuItem>
          )}
          <MenuItem onClick={() => { setMailOpen(false); onCustomerSend?.(); }}>
            {customerMailLabel}
          </MenuItem>
          <MenuItem onClick={() => { setMailOpen(false); onMailHistory?.(); }}>
            발송메일 조회
          </MenuItem>
        </div>,
        document.body
      )}

      <div ref={printBtnRef}>
        <SmallBtn onClick={handlePrintToggle}>인쇄 ▾</SmallBtn>
      </div>
      {printOpen && printPos && createPortal(
        <div
          className="fixed z-[1200] w-48 flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg"
          style={{ top: printPos.top, left: printPos.left }}
        >
          {printItems.map((item) => (
            <MenuItem key={item.label} onClick={() => { setPrintOpen(false); onPrint(item.label); }}>
              {item.label}
            </MenuItem>
          ))}
        </div>,
        document.body
      )}

      <SmallBtn onClick={onMemo}>메모</SmallBtn>
      <SmallBtn onClick={onDeposit}>입금</SmallBtn>
    </div>
  );
}


/**
 * 우클릭 컨텍스트 메뉴.
 * 화면 가장자리 자동 보정 + portal 렌더 + 외부 클릭/Esc로 닫힘.
 * 메일/인쇄는 호버 시 우측 서브메뉴로 펼쳐짐.
 */
function RowContextMenu({
  x, y, row, onClose,
  onModify, onDelete, onEstToReq,
  onPhoto, onSms, onMemo, onDeposit,
  onPrint,
  onMailClaim, onCustomerSend, onMailHistory,
  isInsurance = true,
}) {
  const isest = String(row?.isest);
  const menuRef = useRef(null);
  const [openSub, setOpenSub] = useState(null);  // "mail" | "print" | null

  // 화면 밖으로 나가지 않도록 보정 — setState 없이 DOM 직접 조작 (re-render 없음)
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top  = y;
    if (left + rect.width  > window.innerWidth)  left = Math.max(8, window.innerWidth  - rect.width  - 8);
    if (top  + rect.height > window.innerHeight) top  = Math.max(8, window.innerHeight - rect.height - 8);
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
  }, [x, y]);

  // 외부 클릭 / Esc / 스크롤 시 닫기
  useEffect(() => {
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    const onScroll = () => onClose?.();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  const fire = (fn) => () => { onClose?.(); fn?.(); };
  const closeSub = () => setOpenSub(null);

  const printItems = isest === "1"
    ? ["점검정비 견적서", "개인정보 활용동의"]
    : ["작업지시서", "수리비 청구서", "점검정비 명세서", "개인정보 활용동의"];
  const customerMailLabel = isest === "1"
    ? "점검정비 견적서 - 고객용"
    : "점검정비 명세서 - 고객용";

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[1200] w-56 rounded-md border border-zinc-200 bg-white shadow-xl py-1 select-none"
      style={{ left: x, top: y }}
    >
      <CtxItem icon={Pencil}        onClick={fire(onModify)}   onMouseEnter={closeSub}>수정</CtxItem>
      <CtxItem icon={Trash2}        onClick={fire(onDelete)}   onMouseEnter={closeSub}>삭제</CtxItem>
      {isest === "1" && (
        <CtxItem icon={ArrowRightLeft} onClick={fire(onEstToReq)} onMouseEnter={closeSub}>작업전환</CtxItem>
      )}
      <CtxDivider />
      <CtxItem icon={Camera}        onClick={fire(onPhoto)}    onMouseEnter={closeSub}>사진</CtxItem>
      <CtxItem icon={MessageSquare} onClick={fire(onSms)}      onMouseEnter={closeSub}>문자</CtxItem>
      <CtxDivider />

      <CtxSubmenu
        icon={Mail}
        label="메일"
        isOpen={openSub === "mail"}
        onOpen={() => setOpenSub("mail")}
      >
        {isInsurance && <CtxItem icon={Send} onClick={fire(onMailClaim)}>견적청구 - 보험사</CtxItem>}
        <CtxItem icon={User}    onClick={fire(onCustomerSend)}>{customerMailLabel}</CtxItem>
        <CtxItem icon={History} onClick={fire(onMailHistory)}>발송메일 조회</CtxItem>
      </CtxSubmenu>

      <CtxSubmenu
        icon={Printer}
        label="인쇄"
        isOpen={openSub === "print"}
        onOpen={() => setOpenSub("print")}
      >
        {printItems.map((label) => (
          <CtxItem key={label} icon={FileText} onClick={fire(() => onPrint?.(label))}>{label}</CtxItem>
        ))}
      </CtxSubmenu>

      <CtxDivider />
      <CtxItem icon={StickyNote} onClick={fire(onMemo)}    onMouseEnter={closeSub}>메모</CtxItem>
      <CtxItem icon={Wallet}     onClick={fire(onDeposit)} onMouseEnter={closeSub}>입금</CtxItem>
    </div>,
    document.body
  );
}

function CtxItem({ icon: Icon, children, onClick, hasArrow, onMouseEnter }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="flex w-full items-center gap-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 px-3 py-1.5"
    >
      {Icon && <Icon className="h-4 w-4 text-zinc-500 shrink-0" />}
      <span className="flex-1 truncate">{children}</span>
      {hasArrow && <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
    </button>
  );
}

function CtxSubmenu({ icon, label, isOpen, onOpen, children }) {
  const itemRef   = useRef(null);
  const submenuRef = useRef(null);

  // 서브메뉴 방향 보정 — setState 없이 DOM 직접 조작 (re-render 없음)
  useLayoutEffect(() => {
    if (!isOpen || !itemRef.current || !submenuRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const submenuWidth = 224; // w-56
    const goLeft = window.innerWidth - rect.right < submenuWidth + 16;
    const el = submenuRef.current;
    if (goLeft) {
      el.style.left  = "auto";
      el.style.right = "100%";
      el.style.marginLeft  = "";
      el.style.marginRight = "0.25rem";
    } else {
      el.style.left  = "100%";
      el.style.right = "auto";
      el.style.marginLeft  = "0.25rem";
      el.style.marginRight = "";
    }
  }, [isOpen]);

  return (
    <div ref={itemRef} className="relative" onMouseEnter={onOpen}>
      <CtxItem icon={icon} hasArrow>{label}</CtxItem>
      {isOpen && (
        <div
          ref={submenuRef}
          className="absolute top-0 w-56 rounded-md border border-zinc-200 bg-white shadow-xl py-1 z-10"
          style={{ left: "100%", marginLeft: "0.25rem" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function CtxDivider() {
  return <div className="my-1 h-px bg-zinc-100" />;
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
    value === "견적종결"
      ? "bg-emerald-100 text-emerald-800"
      : value === "견적청구"
      ? "bg-orange-100 text-orange-800"
      : value === "견적서발행"
      ? "bg-blue-100 text-blue-800"
      : value === "종결"
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

  // 훅 호출 완료 후 early return — 빈 값이면 뱃지 숨김
  if (!value) return null;

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

