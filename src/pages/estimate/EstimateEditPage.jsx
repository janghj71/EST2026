// src/pages/estimate/EstimateEditPage.jsx
import React, { useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAlert } from "../../alerts";

import EstimateHeaderBar from "./EstimateHeaderBar";
import EstimateReception from "./EstimateReception";
import EstimateSidePanel from "./EstimateSidePanel";
import EstimateItemsTable from "./EstimateItemsTable";

import AlertModal from "../../components/AlertModal";
import ClaimSelectModal from "./ClaimSelectModal";
import { ArrowLeft } from "lucide-react";
import { openCenteredWindow } from "../../utils/popup";
// import { formatNumber } from "../../utils/numberFormat";
import { useEstimate } from "../../hooks/useEstimate";
import { useMasterEstimateSave } from "../../hooks/useMasterEstimateSave";
import { useEstimateClaimSave } from "../../hooks/useEstimateClaimSave";
import { useEstimateDetailSave } from "../../hooks/useEstimateDetailSave";
import { useEstimateDetailDelete } from "../../hooks/useEstimateDetailDelete";
import { useEstimateClaims } from "../../hooks/useEstimateClaims";
import { useLoading } from "../../loading/useLoading";
import { getUserid, getComcode } from "../../api/config";
import { useTbCode } from "../../hooks/useTbCode";
import { useLaborSettings } from "../../hooks/useLaborSettings";
import { useCodepayHour } from "../../hooks/useLaborItems";

// 모듈 스코프 단조 증가 카운터 — 동일 ms 내 연속 호출 시에도 고유 임시 ID 보장
let _tempRowSeq = 0;
const newTempId = () => `_new_${++_tempRowSeq}`;

// 도장 solvent × coatKind → 필드명 매핑 (PaintItemsPopup.getPaintMH 와 동일)
const PAINT_FIELD_MAP = {
  oil: {
    swap:    { h: "oilpnt_h",    m: "oilpnt_m"    },
    outer:   { h: "oilpnt_hb",   m: "oilpnt_mb"   },
    surface: { h: "oilextr21_h", m: "oilextr21_m"  },
    front:   { h: "oilextr22_h", m: "oilextr22_m"  },
  },
  pnt: {
    swap:    { h: "pnt_h",    m: "pnt_m"    },
    outer:   { h: "pnt_hb",   m: "pnt_mb"   },
    surface: { h: "extr21_h", m: "extr21_m"  },
    front:   { h: "extr22_h", m: "extr22_m"  },
  },
};
const COAT_STATE_MAP = { swap: "1", outer: "3", surface: "2", front: "5" };

export default function EstimateEditPage() {
  const navigate = useNavigate();
  const { est_serial } = useParams();

  const { fetchMasterById, fetchDetails, fetchOverlap } = useEstimate();
  const { save, saving } = useMasterEstimateSave();
  const { saveClaim } = useEstimateClaimSave();
  const { fetchClaims } = useEstimateClaims();
  const { error: alertError, info: alertInfo } = useAlert();
  const { withLoading } = useLoading();

  const [master, setMaster] = useState({});
  const [rows, setRows] = useState([]);
  const [workTimes, setWorkTimes] = useState([]);
  const { fetchCodepayHour } = useCodepayHour();

  const { saveDetail, saveAllDetails, saveSingleDetail } = useEstimateDetailSave(setRows);

  // est_serial 변경 시 접수 데이터 조회
  // refetch는 raw JSON 반환 → dataset[0] 직접 추출
  useEffect(() => {
    if (!est_serial) return;
    fetchMasterById(est_serial)
      .then((json) => {
        const row = json?.dataset?.[0];
        if (!row) return;
        setMaster((prev) => ({ ...prev, ...row }));
      })
      .catch(() => {});
  }, [est_serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // est_serial 변경 시 견적상세 조회
  useEffect(() => {
    if (!est_serial) return;
    withLoading(async () => {
      const json = await fetchDetails(est_serial);
      setRows(json?.dataset ?? []);
    });
  }, [est_serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // est_serial 변경 시 청구처(claims) 미리 로드 → calcPaysum 에서 사용
  useEffect(() => {
    if (!est_serial) return;
    fetchClaims(est_serial).then((json) => {
      const rows = json?.dataset ?? [];
      setMaster((m) => ({ ...m, claims: rows }));
    }).catch(() => {});
  }, [est_serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // 작업/시간 목록 fetch — [작업] 컬럼 팝업 workcode 비활성화에 사용
  useEffect(() => {
    const carcode  = master?.est_codecar || "";
    const ocarcode = master?.codecar     || "";
    const paykind  = master?.paykind     || "";
    const paint    = master?.paint       || "";
    const outday   = master?.outday      || "";
    if (!carcode && !ocarcode) return;
    fetchCodepayHour({ carcode, ocarcode, paykind, outday })
      .then((json) => { if (json?.result === "OK") setWorkTimes(json.dataset ?? []); })
      .catch(() => {});
  }, [master?.est_codecar, master?.codecar, master?.paykind, master?.paint, master?.outday]); // eslint-disable-line react-hooks/exhaustive-deps

  // EstimateSidePanel 탭/열림 상태
  const [sideActive, setSideActive] = useState("labor");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [settleRefreshKey, setSettleRefreshKey] = useState(0);
  // 청구처 변경 여부 (변경 시에만 저장)
  const claimDirtyRef = useRef(false);

  // saveDetail 연속 호출 시 abort 방지용 직렬 큐
  const saveQueueRef = useRef(Promise.resolve());

  // 범퍼 도장 자동 추가행용 WRK34 공통코드 (subcode='9')
  const { codes: wrk34Codes } = useTbCode("WRK34");
  const wrk34CodesRef = useRef(wrk34Codes);

  // 도장 컬러매칭/가열건조비 금액 설정
  const { form: laborSettings } = useLaborSettings();
  const laborSettingsRef = useRef(laborSettings);

  // 최신 master/rows를 stale closure 없이 접근하기 위한 ref
  const masterRef = useRef(master);
  const rowsRef = useRef(rows);
  const saveRef = useRef(save);
  const saveClaimRef = useRef(saveClaim);
  const sidePanelOpenRef = useRef(sidePanelOpen);
  const sideActiveRef = useRef(sideActive);
  const [selectedOrgSeq, setSelectedOrgSeq] = useState(null);
  const [selectedOrgSeqs, setSelectedOrgSeqs] = useState(new Set());
  const selectedOrgSeqRef = useRef(null);

  // render phase 외부(commit 후)에서 ref 동기화 — "Cannot access refs during render" 방지
  useLayoutEffect(() => {
    wrk34CodesRef.current      = wrk34Codes;
    masterRef.current          = master;
    rowsRef.current            = rows;
    laborSettingsRef.current   = laborSettings;
    selectedOrgSeqRef.current  = selectedOrgSeq;
    saveRef.current            = save;
    saveClaimRef.current       = saveClaim;
    sidePanelOpenRef.current   = sidePanelOpen;
    sideActiveRef.current      = sideActive;
  });

  // 청구처 M/H 단가 변경(blur) 시 견적내역 paysum 일괄 재계산
  const recalcPaysum = useCallback(() => {
    const claim0 = masterRef.current?.claims?.[0];
    if (!claim0) return;
    setRows((prev) =>
      prev.map((r) => {
        if (!r.workcode || !r.qty) return r;
        if (r.subpayno === "99991") return r;  // 가열건조비: paysum 고정값 유지
        const qty = parseFloat(r.qty);
        if (isNaN(qty)) return r;
        let rate = null;
        if ("SB".includes(r.workcode))          rate = parseFloat(claim0.bpay);
        else if (r.workcode === "P")            rate = parseFloat(claim0.ppay);
        else if ("RXOA".includes(r.workcode))   rate = parseFloat(claim0.xpay);
        if (rate == null || isNaN(rate)) return r;
        return { ...r, paysum: String(Math.round(rate * qty)) };
      })
    );
  }, [setRows]);

  // 도장 컬러매칭(99990) / 가열건조비(99991) 자동 추가 행 생성
  const buildSpecialRows = useCallback((currentRows, paintSolvent) => {
    const mst      = masterRef.current ?? {};
    const ls       = laborSettingsRef.current ?? {};
    const paykind  = String(mst.paykind ?? "");
    const comcode  = mst.comcode   ?? getComcode();
    const estSerial= mst.est_serial ?? "";
    const solvent  = paintSolvent === "oil" ? "oil" : "pnt";
    const result   = [];

    // 도장 컬러매칭: paykind='3' 이고 99990 미존재
    if (paykind === "3" && !currentRows.some((r) => r.subpayno === "99990")) {
      const qty     = String(ls.pntcolormix  ?? "0");
      const partsum = solvent === "oil"
        ? String(ls.pntmix_m_oil ?? "0")
        : String(ls.pntmix_m     ?? "0");
      const ppay    = parseFloat(mst.claims?.[0]?.ppay ?? "0");
      const paysum  = String(Math.round(ppay * parseFloat(qty || "0")));
      result.push({
        comcode, est_serial: estSerial, estb_orgseqno: newTempId(),
        paykind: "4", payno: "", subpayno: "99990",
        payname: "도장 컬러매칭", workcode: "P", workcodename: "도장",
        price: "", qty, oqty: qty,
        partsum, paysum, part_makercode: "",
        state: "", statename: "", pnt_extr: "",
        pnt_hour: qty, pnt_part: "0", pnt_m: solvent === "oil" ? "1" : "2",
        pntcot: "", ts_payno: "", update_id: getUserid(),
        paykindname: "#공임", b_level: "0.00", b_area: "0",
        pnt_reduce: "0", body_panel: "", pay_orderno: "",
      });
    }

    // 가열건조비: paykind='3' or '1', req_pnt_drypay='1', 99991 미존재
    if (
      (paykind === "3" || paykind === "1") &&
      mst.req_pnt_drypay === "1" &&
      !currentRows.some((r) => r.subpayno === "99991")
    ) {
      result.push({
        comcode, est_serial: estSerial, estb_orgseqno: newTempId(),
        paykind: "4", payno: "", subpayno: "99991",
        payname: "가열건조비", workcode: "P", workcodename: "도장",
        price: "", qty: "1", oqty: "1",
        partsum: "0", paysum: String(mst.pnt_drypay ?? "0"),
        part_makercode: "", state: "", statename: "", pnt_extr: "",
        pnt_hour: "0", pnt_part: "0", pnt_m: "",
        pntcot: "", ts_payno: "", update_id: getUserid(),
        paykindname: "#공임", b_level: "0.00", b_area: "0",
        pnt_reduce: "0", body_panel: "", pay_orderno: "",
      });
    }

    return result;
  }, []); // refs만 사용하므로 deps 불필요

  const [sortMode, setSortMode] = useState("block");
  // const [laborOpen, setLaborOpen] = useState(false);

  const { deleteBySeqs, deleteAll } = useEstimateDetailDelete();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // null | { type:"all" } | { type:"selected", orgSeqs:string[] }
  const [claimSelectOpen, setClaimSelectOpen] = useState(false);
  const [claimSelectKind, setClaimSelectKind] = useState("estimate");

  const laborWinRef = useRef(null);
  const [laborWinOpen, setLaborWinOpen] = useState(false);
  const paintWinRef = useRef(null);
  const [paintWinOpen, setPaintWinOpen] = useState(false);
  const chemicalWinRef = useRef(null);
  const partLookupWinRef = useRef(null);
  const photoWinRef = useRef(null);

  const isLocked = Boolean(master?.workend || master?.reqday || master?.est_print);

  const childWinsRef = useRef(new Set());
  
  
  const registerChildWin = (w) => {
    if (!w) return;
    childWinsRef.current.add(w);
    try { if (w.closed) childWinsRef.current.delete(w); } catch {}
  };
  
  const closeAllChildWins = () => {
    childWinsRef.current.forEach((w) => {
      try { if (w && !w.closed) w.close(); } catch {}
    });
    childWinsRef.current.clear();
  };

  // Lock 시 팝업 닫기
  useEffect(() => {
    if (!isLocked) return;
    [laborWinRef, paintWinRef, chemicalWinRef, partLookupWinRef].forEach((ref) => {
      try { if (ref.current && !ref.current.closed) ref.current.close(); } catch {}
      ref.current = null;
    });
    setLaborWinOpen(false);
    setPaintWinOpen(false);
  }, [isLocked]);

  // 메일청구 완료 → 마스터 리프레시
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type !== "EST_MASTER_REFRESH") return;
      const serial = ev.data?.payload?.est_serial ?? est_serial;
      fetchMasterById(serial)
        .then((json) => {
          const row = json?.dataset?.[0];
          if (row) setMaster((prev) => ({ ...prev, ...row }));
        })
        .catch(() => {});
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [est_serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // 공임항목 팝업 닫힘 감지 (500ms 폴링)
  useEffect(() => {
    if (!laborWinOpen) return;
    const id = setInterval(() => {
      try {
        if (laborWinRef.current?.closed) setLaborWinOpen(false);
      } catch { setLaborWinOpen(false); }
    }, 500);
    return () => clearInterval(id);
  }, [laborWinOpen]);

  // 견적내역 rows 변경 시 공임팝업에 기존 항목(paykind 1/2) payno 목록 전달
  useEffect(() => {
    if (!laborWinOpen || !laborWinRef.current || laborWinRef.current.closed) return;
    const filtered = rows.filter((r) => String(r.paykind) === "1" || String(r.paykind) === "2");
    const existingPaynos = filtered.map((r) => r.payno);
    const existingRowsData = filtered.map((r) => ({ payno: r.payno, workcode: r.workcode ?? "" }));
    try {
      laborWinRef.current.postMessage(
        { type: "LABOR_ITEMS_EXISTING_ROWS", payload: { existing_paynos: existingPaynos, existing_rows: existingRowsData } },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [rows, laborWinOpen]);

  // 도장항목 팝업 닫힘 감지 (500ms 폴링)
  useEffect(() => {
    if (!paintWinOpen) return;
    const id = setInterval(() => {
      try {
        if (paintWinRef.current?.closed) setPaintWinOpen(false);
      } catch { setPaintWinOpen(false); }
    }, 500);
    return () => clearInterval(id);
  }, [paintWinOpen]);

  // 견적내역 rows 변경 시 도장팝업에 기존 항목(paykind=6) payno 목록 전달
  useEffect(() => {
    if (!paintWinOpen || !paintWinRef.current || paintWinRef.current.closed) return;
    const existingPaynos = rowsRef.current
      .filter((r) => String(r.paykind) === "6")
      .map((r) => r.payno);
    try {
      paintWinRef.current.postMessage(
        { type: "PAINT_ITEMS_EXISTING_ROWS", payload: { existing_paynos: existingPaynos } },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [rows, paintWinOpen]);
  
  const openPhotoViewerPopup = useCallback(() => {
    const estId = est_serial || "";
    const carNo = master?.carno || "";
    const url =
      `/photo-viewer?est_serial=${encodeURIComponent(estId)}` +
      `&carno=${encodeURIComponent(carNo)}`;

    // 이미 열려있으면 재사용 + ctx만 갱신
    if (photoWinRef.current && !photoWinRef.current.closed) {
      try {
        photoWinRef.current.focus();
        photoWinRef.current.postMessage(
          { type: "PHOTO_VIEWER_SET_CTX", payload: { est_serial: estId, carno: carNo } },
          window.location.origin
        );
        registerChildWin(photoWinRef.current);
        return;
      } catch {
        photoWinRef.current = null;
      }
    }

    // 없거나 닫혔으면 새로 열기 (window name 고정 → 브라우저 레벨 중복 방지)
    const win = openCenteredWindow(url, "photoViewer", 1200, 800, {
      scrollbars: "yes",
      resizable: "yes",
    });
    photoWinRef.current = win;
    registerChildWin(win);
  }, [est_serial, master]);

  const openInspectionPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/inspection-estimate` +
      `?est_serial=${encodeURIComponent(est_serial)}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    openCenteredWindow(url, "inspectionEstimatePrint", 900, 1200, {
      scrollbars: "yes",
      resizable: "yes",
    });
  }, [est_serial]);

  const openInspectionStatementPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/inspection-statement` +
      `?est_serial=${encodeURIComponent(est_serial)}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    openCenteredWindow(url, "inspectionStatementPrint", 900, 1200, {
      scrollbars: "yes",
      resizable: "yes",
    });
  }, [est_serial]);

  const openInsuranceClaimPrint = useCallback((estbo_seqno) => {
    const url =
      `/print/insurance-claim` +
      `?est_serial=${encodeURIComponent(est_serial)}` +
      `&estbo_seqno=${encodeURIComponent(estbo_seqno ?? "")}`;
    openCenteredWindow(url, "insuranceClaimPrint", 900, 1200, {
      scrollbars: "yes",
      resizable: "yes",
    });
  }, [est_serial]);

  const openPrivacyConsentPrint = useCallback(() => {
    if (!master) return;
    const payload = {
      est_serial:  master.est_serial,
      accday:      master.accday,
      carno:       master.carno,
      custom_name: master.custom_name,
      hp0:         master.hp0,
      hp1:         master.hp1,
      hp2:         master.hp2,
      email_acc:   master.email_acc,
      email_smtp:  master.email_smtp,
      claims:      master.claims ?? [],
    };
    sessionStorage.setItem("privacyConsentCtx", JSON.stringify(payload));
    openCenteredWindow("/print/privacy-consent", "privacyConsent", 900, 1200, {
      scrollbars: "yes", resizable: "yes",
    });
  }, [master]);

  const handlePrint = useCallback((label) => {
    if (label === "개인정보 활용동의") {
      openPrivacyConsentPrint();
      return;
    }
    const claimList = master?.claims ?? [];
    if (claimList.length === 0) return;
    if (label === "점검정비 견적서") {
      if (claimList.length === 1) {
        openInspectionPrint(claimList[0].estbo_seqno);
      } else {
        setClaimSelectKind("estimate");
        setClaimSelectOpen(true);
      }
      return;
    }
    if (label === "점검정비 명세서") {
      if (claimList.length === 1) {
        openInspectionStatementPrint(claimList[0].estbo_seqno);
      } else {
        setClaimSelectKind("statement");
        setClaimSelectOpen(true);
      }
      return;
    }
    if (label === "수리비 청구서") {
      if (claimList.length === 1) {
        openInsuranceClaimPrint(claimList[0].estbo_seqno);
      } else {
        setClaimSelectKind("insurance");
        setClaimSelectOpen(true);
      }
      return;
    }
  }, [master, openInspectionPrint, openInspectionStatementPrint, openInsuranceClaimPrint, openPrivacyConsentPrint]);

  const openLaborItemsPopup = async () => {
    await saveClaimIfActive();
    const estSerial   = est_serial || "";
    const carno       = master?.carno       || "";
    const codecar     = master?.codecar     || "";
    const est_codecar = master?.est_codecar || "";
    const carname     = master?.carname     || "";
    const paykind     = master?.paykind     || "";
    const paint       = master?.paint       || "";
    const outday      = master?.outday      || "";
    const carkind     = master?.carkind     || "";
    const pntkind     = master?.pntkind     || "";
    const pntcot_code = master?.pntcot_code || "";
    const pnt_m       = master?.pnt_m       || "";
    const modelcode   = master?.modelcode   || "";

    const url =
      `/labor-items?est_serial=${encodeURIComponent(estSerial)}` +
      `&carno=${encodeURIComponent(carno)}` +
      `&codecar=${encodeURIComponent(codecar)}` +
      `&est_codecar=${encodeURIComponent(est_codecar)}` +
      `&carname=${encodeURIComponent(carname)}` +
      `&paykind=${encodeURIComponent(paykind)}` +
      `&paint=${encodeURIComponent(paint)}` +
      `&outday=${encodeURIComponent(outday)}` +
      `&carkind=${encodeURIComponent(carkind)}` +
      `&pntkind=${encodeURIComponent(pntkind)}` +
      `&pntcot_code=${encodeURIComponent(pntcot_code)}` +
      `&pnt_m=${encodeURIComponent(pnt_m)}` +
      `&modelcode=${encodeURIComponent(modelcode)}`;

    const payload = { est_serial: estSerial, carno, codecar, est_codecar, carname,
                      paykind, paint, outday, carkind, pntkind, pntcot_code, pnt_m, modelcode };

    const getExistingPaynos = () => {
      const filtered = rowsRef.current.filter((r) => String(r.paykind) === "1" || String(r.paykind) === "2");
      return {
        existing_paynos: filtered.map((r) => r.payno),
        existing_rows:   filtered.map((r) => ({ payno: r.payno, workcode: r.workcode ?? "" })),
      };
    };

    const sendExistingRows = (win) => {
      try {
        if (win && !win.closed) {
          win.postMessage(
            { type: "LABOR_ITEMS_EXISTING_ROWS", payload: getExistingPaynos() },
            window.location.origin
          );
        }
      } catch { /* empty */ }
    };

    // 이미 열려 있으면 재사용 + ctx만 갱신
    if (laborWinRef.current && !laborWinRef.current.closed) {
      try {
        laborWinRef.current.focus();
        laborWinRef.current.postMessage({ type: "LABOR_ITEMS_SET_CTX", payload }, window.location.origin);
        sendExistingRows(laborWinRef.current);
        registerChildWin(laborWinRef.current);
        setLaborWinOpen(true);
        return;
      } catch {
        laborWinRef.current = null;
      }
    }

    const win = openCenteredWindow(url, "laborItems", 1000, 1300, {
      scrollbars: "yes",
      resizable: "yes",
    });

    laborWinRef.current = win;
    registerChildWin(win);
    setLaborWinOpen(true);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "LABOR_ITEMS_SET_CTX", payload }, window.location.origin);
          sendExistingRows(win);
        }
      } catch { /* empty */ }
    }, 200);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "LABOR_ITEMS_SET_CTX", payload }, window.location.origin);
          sendExistingRows(win);
        }
      } catch { /* empty */ }
    }, 700);
  };
  
  const openPaintItemsPopup = async () => {
    await saveClaimIfActive();
    const estSerial = est_serial || "";
    const carno = master?.carno || "";
    const pntcot_code = master?.pntcot_code || "";
    const pnt_m = master?.pnt_m || "";
    const paint   = master?.paint   || "";
    const pntkind = master?.pntkind || "";
    const codecar = master?.codecar || "";

    // 선택 Row의 주체(paykind='1') workcode: 교환(X) vs 판금/수리(B/S) 판별용
    let workcode = "";
    const _selRow = rows.find((r) => r.estb_orgseqno === selectedOrgSeq);
    if (_selRow) {
      if (String(_selRow.paykind) === "1") {
        workcode = _selRow.workcode || "";
      } else {
        const _workRow = rows.find(
          (r) => String(r.paykind) === "1" && String(r.payno) === String(_selRow.payno)
        );
        workcode = _workRow?.workcode || "";
      }
    }

    const safePntM = pnt_m === 1 || pnt_m === 2 ? pnt_m : 2;

    const url =
      `/paint-items?est_serial=${encodeURIComponent(estSerial)}` +
      `&carno=${encodeURIComponent(carno)}` +
      `&pntcot_code=${encodeURIComponent(pntcot_code)}` +
      `&pnt_m=${encodeURIComponent(safePntM)}` +
      `&paint=${encodeURIComponent(paint)}` +
      `&pntkind=${encodeURIComponent(pntkind)}` +
      `&codecar=${encodeURIComponent(codecar)}` +
      `&workcode=${encodeURIComponent(workcode)}`;

    const payload = {
      est_serial: estSerial,
      carno,
      pntcot_code,
      pnt_m: safePntM,
      paint,
      pntkind,
      codecar,
      workcode,
    };

    const getPaintExistingPaynos = () =>
      rowsRef.current
        .filter((r) => String(r.paykind) === "6")
        .map((r) => r.payno);

    const sendPaintExistingRows = (win) => {
      try {
        if (win && !win.closed) {
          win.postMessage(
            { type: "PAINT_ITEMS_EXISTING_ROWS", payload: { existing_paynos: getPaintExistingPaynos() } },
            window.location.origin
          );
        }
      } catch { /* empty */ }
    };

    // 이미 열려 있으면 재사용 + ctx만 갱신
    if (paintWinRef.current && !paintWinRef.current.closed) {
      try {
        paintWinRef.current.focus();
        paintWinRef.current.postMessage({ type: "PAINT_ITEMS_SET_CTX", payload }, window.location.origin);
        sendPaintExistingRows(paintWinRef.current);
        registerChildWin(paintWinRef.current);
        setPaintWinOpen(true);
        return;
      } catch {
        paintWinRef.current = null;
      }
    }

    const win = openCenteredWindow(url, "paintItems", 1100, 900, {
      scrollbars: "yes",
      resizable: "yes",
    });

    paintWinRef.current = win;
    registerChildWin(win);
    setPaintWinOpen(true);

    // 2회 전송(팝업 초기 렌더 타이밍 대비)
    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "PAINT_ITEMS_SET_CTX", payload }, window.location.origin);
          sendPaintExistingRows(win);
        }
      } catch { /* empty */ }
    }, 200);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "PAINT_ITEMS_SET_CTX", payload }, window.location.origin);
          sendPaintExistingRows(win);
        }
      } catch { /* empty */ }
    }, 700);
  };

  const openChemicalItemsPopup = async () => {
    await saveClaimIfActive();
    const estSerial = est_serial || "";
    const carno = master?.carno || "";

    // ChemicalItemsPage(기존)를 팝업 라우트로 분리했다는 전제
    const url =
      `/chemical-items?est_serial=${encodeURIComponent(estSerial)}` +
      `&carno=${encodeURIComponent(carno)}`;

    const payload = { est_serial: estSerial, carno };

    // 이미 열려 있으면 재사용 + ctx만 갱신
    if (chemicalWinRef.current && !chemicalWinRef.current.closed) {
      try {
        chemicalWinRef.current.focus();
        chemicalWinRef.current.postMessage(
          { type: "CHEM_ITEMS_SET_CTX", payload },
          window.location.origin
        );
        registerChildWin(chemicalWinRef.current);
        return;
      } catch {
        chemicalWinRef.current = null;
      }
    }

    const win = openCenteredWindow(url, "chemicalItems", 1060, 900, {
      scrollbars: "yes",
      resizable: "yes",
    });

    chemicalWinRef.current = win;
    registerChildWin(win);

    // 2회 전송(팝업 초기 렌더 타이밍 대비)
    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "CHEM_ITEMS_SET_CTX", payload }, window.location.origin);
        }
      } catch {
        /* empty */
      }
    }, 200);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "CHEM_ITEMS_SET_CTX", payload }, window.location.origin);
        }
      } catch {
        /* empty */
      }
    }, 700);
  };

  const openPartLookupPopup = async () => {
    await saveClaimIfActive();
    const estSerial = est_serial || "";
    const carno   = master?.carno    || "";
    const comcode = master?.comcode  || getComcode();
    const codecar = master?.codecar  || "";

    const url =
      `/part-lookup?est_serial=${encodeURIComponent(estSerial)}` +
      `&carno=${encodeURIComponent(carno)}` +
      `&comcode=${encodeURIComponent(comcode)}` +
      `&codecar=${encodeURIComponent(codecar)}`;

    const payload = { est_serial: estSerial, carno, comcode, codecar };
  
    // 이미 열려 있으면 재사용 + ctx만 갱신
    if (partLookupWinRef.current && !partLookupWinRef.current.closed) {
      try {
        partLookupWinRef.current.focus();
        partLookupWinRef.current.postMessage(
          { type: "PART_LOOKUP_SET_CTX", payload },
          window.location.origin
        );
        registerChildWin(partLookupWinRef.current);
        return;
      } catch {
        partLookupWinRef.current = null;
      }
    }
  
    const win = openCenteredWindow(url, "partLookup", 700, 900, {
      scrollbars: "yes",
      resizable: "yes",
    });
  
    partLookupWinRef.current = win;
    registerChildWin(win);
  
    // 2회 전송(팝업 초기 렌더 타이밍 대비)
    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "PART_LOOKUP_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */}
    }, 200);
  
    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "PART_LOOKUP_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */ }
    }, 700);
  };
  

  const onMsgHandlerRef = useRef(null);

  useEffect(() => {
    onMsgHandlerRef.current = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (
        type !== "LABOR_ITEMS_PICK" &&
        type !== "PAINT_ITEMS_PICK" &&
        type !== "PAINT_ITEMS_BATCH" &&
        type !== "PAINT_MASKING_PICK" &&
        type !== "PAINT_COLOR_MATCH_ADD" &&
        type !== "CHEM_ITEMS_PICK" &&
        type !== "PART_LOOKUP_PICK"
      ) return;

      if (type === "LABOR_ITEMS_PICK" && payload?.type === "workTime") {
        const {
          payno, payname, paykind: itemPaykind, subpayno,
          ts_payno, orderno, workcode, workname, hour, partsum,
        } = payload;

        const currentRows = rowsRef.current;

        // 1. 중복 체크: payno + workcode 조합이 이미 존재하면 스킵
        if (currentRows.some((r) => r.payno === payno && r.workcode === workcode)) return;

        // 1-1. X↔B/S 공존 방지 (paykind='1' 한정)
        if (String(itemPaykind) === "1") {
          const sameP1 = currentRows.filter(
            (r) => String(r.payno) === String(payno) && String(r.paykind) === "1"
          );
          if (workcode === "X" && sameP1.some((r) => r.workcode === "B" || r.workcode === "S")) {
            alertInfo("판금/수리 작업이 있어 교환을 추가할 수 없습니다.");
            return;
          }
          if ((workcode === "B" || workcode === "S") && sameP1.some((r) => r.workcode === "X")) {
            alertInfo("교환 작업이 있어 판금/수리를 추가할 수 없습니다.");
            return;
          }
        }

        // 2. 삽입 위치: pay_orderno 순서 + workcode rank 보조
        //    탈착(R)→교환(X)→판금(B)→수리(S)→조정(A)→오버홀(O)→도장(P)
        const WC_RANK = { R: 0, X: 1, B: 2, S: 3, A: 4, O: 5, P: 6 };
        const newOrderno = String(orderno ?? "");
        const newRank = WC_RANK[workcode] ?? 99;

        let insertIdx = currentRows.length;
        let anchorIdx = -1;
        for (let i = currentRows.length - 1; i >= 0; i--) {
          const r = currentRows[i];
          const rOrderno = String(r.pay_orderno ?? "");
          const rRank = WC_RANK[r.workcode] ?? 99;
          if (
            rOrderno &&
            (rOrderno < newOrderno ||
              (rOrderno === newOrderno && rRank <= newRank))
          ) {
            anchorIdx = i;
            insertIdx = i + 1;
            break;
          }
          if (i === 0) insertIdx = 0;
        }

        // anchor를 찾은 경우에만 fallback 수행:
        // 계산된 삽입 위치 뒤에서 pay_orderno가 빈 동일 payno(=anchor payno) 연속 구간을 함께 건너뛴다.
        if (anchorIdx >= 0) {
          const anchorPayno = String(currentRows[anchorIdx]?.payno ?? "");
          while (insertIdx < currentRows.length) {
            const r = currentRows[insertIdx];
            const rOrderno = String(r?.pay_orderno ?? "");
            const rPayno = String(r?.payno ?? "");
            if (rOrderno !== "" || rPayno !== anchorPayno) break;
            insertIdx += 1;
          }
        }

        // 도장컬러매칭(99990)/가열건조비(99991)보다 앞에 인서트
        { const _si = currentRows.findIndex((r) => r.subpayno === "99990" || r.subpayno === "99991");
          if (_si !== -1 && insertIdx > _si) insertIdx = _si; }

        // 3. 새 row 생성 — 임시 ID로 key 중복 방지
        const comcode = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";
        const pkStr = String(itemPaykind || "4");
        const pkLabel = { "1": "주체", "3": "부품", "4": "#공임", "5": "#부품", "6": "도장" }[pkStr] ?? "";

        // paysum 즉시 계산 — 연속 postMessage 시 recalcPaysum 타이밍 덮어쓰기 방지
        const _wt_claim0 = masterRef.current?.claims?.[0];
        const _wt_qty    = parseFloat(hour ?? "0");
        let   _wt_paysum = "0";
        if (_wt_claim0 && !isNaN(_wt_qty)) {
          let _wt_rate = null;
          if ("SB".includes(workcode))        _wt_rate = parseFloat(_wt_claim0.bpay);
          else if (workcode === "P")          _wt_rate = parseFloat(_wt_claim0.ppay);
          else if ("RXOA".includes(workcode)) _wt_rate = parseFloat(_wt_claim0.xpay);
          if (_wt_rate != null && !isNaN(_wt_rate)) _wt_paysum = String(Math.round(_wt_rate * _wt_qty));
        }

        const newRow = {
          comcode,
          est_serial:     estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        pkStr,
          payno,
          subpayno:       subpayno ?? "",
          payname,
          workcode,
          workcodename:   workname ?? "",
          price:          "",
          qty:            String(hour ?? "0"),
          oqty:           String(hour ?? "0"),
          partsum:        String(partsum ?? 0),
          paysum:         _wt_paysum,
          part_makercode: "",
          state:          "",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       "",
          pnt_part:       "0",
          pnt_m:          "",
          pntcot:         "",
          ts_payno:       ts_payno ?? "",
          update_id:      getUserid(),
          paykindname:    pkLabel,
          b_level:        "0.00",
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     "",
          pay_orderno:    String(orderno ?? ""),
        };

        // 4. state 반영 + seqno 재부여
        const combined = [
          ...currentRows.slice(0, insertIdx),
          newRow,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;   // 연속 메시지 처리 시 stale ref 방지
        setRows(combined);
        setSelectedOrgSeq(newRow.estb_orgseqno);
        recalcPaysum();

        // 5. 서버 저장 — toApiRow에서 "_new_" prefix → null 변환
        //    응답 newserial로 estb_orgseqno 교체 (saveDetail 내부)
        const _row = newRow;  // closure 캡처
        const _tempId = newRow.estb_orgseqno;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const result = await saveDetail(_row);
          if (result?.newserial) {
            setSelectedOrgSeq((prev) => prev === _tempId ? result.newserial : prev);
          }
        });
        return;
      }

      if (type === "LABOR_ITEMS_PICK" && payload?.type === "paint") {
        const {
          payno, payname, paykind, orderno, ts_payno,
          workname, pnt_m, pnt_hour, pnt_part, pntcot,
          body_panel, subpayno, b_level,
          paintSolvent, rawPaint,
        } = payload;
        let { hour, partsum, state } = payload;

        const currentRows = rowsRef.current;

        // 1. 중복 체크: payno + workcode='P'
        if (currentRows.some((r) => r.payno === payno && r.workcode === "P")) return;

        // 2. 견적내역 동일 payno workcode 로 coatKind/hour/partsum/state 자동 결정
        //    - workcode='X'        → 무조건 swap(교환도장) 으로 override
        //    - workcode in('B','S') + 표면/전면판금 선택 → 선택값 그대로 인서트
        //    - workcode in('B','S') + 교환/외측판금 선택 → outer(외측판금) 으로 override
        if (rawPaint && paintSolvent) {
          const solvent  = paintSolvent === "oil" ? "oil" : "pnt";
          const sameRows = currentRows.filter((r) => String(r.payno) === String(payno));
          const hasX  = sameRows.some((r) => r.workcode === "X");
          const hasBS = sameRows.some((r) => r.workcode === "B" || r.workcode === "S");
          const isFixedCoat = state === "2" || state === "5"; // 표면판금·전면판금

          let coatKind = null;
          if (hasX) {
            // workcode='X' → 항상 교환도장
            coatKind = "swap";
          } else if (hasBS && !isFixedCoat) {
            // workcode in('B','S') + 교환/외측 선택 → 외측판금
            coatKind = "outer";
          }
          // hasBS && isFixedCoat → 그대로 (coatKind=null → override 없음)

          if (coatKind) {
            const fields = PAINT_FIELD_MAP[solvent]?.[coatKind];
            if (fields) {
              hour    = Number(rawPaint[fields.h] ?? 0);
              partsum = Number(rawPaint[fields.m] ?? 0);
              state   = COAT_STATE_MAP[coatKind] ?? state;
            }
          }
        }

        // 2. 삽입 위치: 같은 payno를 가진 마지막 row 다음
        let insertIdx = currentRows.length;
        for (let i = currentRows.length - 1; i >= 0; i--) {
          if (String(currentRows[i].payno) === String(payno)) {
            insertIdx = i + 1;
            break;
          }
        }

        // 도장컬러매칭(99990)/가열건조비(99991)보다 앞에 인서트
        { const _si = currentRows.findIndex((r) => r.subpayno === "99990" || r.subpayno === "99991");
          if (_si !== -1 && insertIdx > _si) insertIdx = _si; }

        // 3. 새 row 생성
        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";
        const pkStr     = String(paykind || "6");
        const pkLabel   = { "1": "주체", "3": "부품", "4": "#공임", "5": "#부품", "6": "도장" }[pkStr] ?? "";

        // paysum 즉시 계산 (도장행: ppay × hour)
        const _pnt_claim0 = masterRef.current?.claims?.[0];
        const _pnt_qty    = parseFloat(hour ?? "0");
        let   _pnt_paysum = "0";
        if (_pnt_claim0 && !isNaN(_pnt_qty)) {
          const _pnt_rate = parseFloat(_pnt_claim0.ppay);
          if (!isNaN(_pnt_rate)) _pnt_paysum = String(Math.round(_pnt_rate * _pnt_qty));
        }

        const newRow = {
          comcode,
          est_serial:     estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        pkStr,
          payno,
          subpayno:       subpayno ?? "",
          payname,
          workcode:       "P",
          workcodename:   workname ?? "도장",
          price:          "",
          qty:            String(hour ?? "0"),
          oqty:           String(hour ?? "0"),
          partsum:        String(partsum ?? "0"),
          paysum:         _pnt_paysum,
          part_makercode: "",
          state:          state ?? "",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       String(pnt_hour ?? "0"),
          pnt_part:       String(pnt_part ?? "0"),
          pnt_m:          String(pnt_m ?? ""),
          pntcot:         String(pntcot ?? ""),
          ts_payno:       ts_payno ?? "",
          update_id:      getUserid(),
          paykindname:    pkLabel,
          b_level:        String(b_level ?? "0.00"),
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     body_panel ?? "",
          pay_orderno:    String(orderno ?? ""),
        };

        // 4. 범퍼 자동 추가 행: payname에 '범퍼' 포함 AND state='1' AND WRK34/9 항목 존재
        let extraRow = null;
        if (String(payname).includes("범퍼") && state === "1") {
          const tbEntry = (wrk34CodesRef.current ?? []).find((c) => c.value === "9");
          if (tbEntry) {
            const qty        = String(Number(tbEntry.def_value ?? 0) / 100);
            const _ex_qty    = parseFloat(qty);
            const _ex_ppay   = parseFloat(_pnt_claim0?.ppay ?? "0");
            const _ex_paysum = (_pnt_claim0 && !isNaN(_ex_qty) && !isNaN(_ex_ppay))
              ? String(Math.round(_ex_ppay * _ex_qty))
              : "0";
            extraRow = {
              comcode,
              est_serial:     estSerial,
              estb_orgseqno:  newTempId(),
              estb_seqno:     String(insertIdx + 2).padStart(3, "0"),
              paykind:        "6",
              payno,
              subpayno:       "",
              payname:        String(payname) + " " + tbEntry.label,
              workcode:       "P",
              workcodename:   "도장",
              price:          "",
              qty,
              oqty:           qty,
              partsum:        "0",
              paysum:         _ex_paysum,
              part_makercode: "",
              state:          state ?? "",
              statename:      "",
              pnt_extr:       "9",
              pnt_hour:       "0",
              pnt_part:       "0",
              pnt_m:          String(pnt_m ?? ""),
              pntcot:         String(pntcot ?? ""),
              ts_payno:       ts_payno ?? "",
              update_id:      getUserid(),
              paykindname:    "도장",
              b_level:        "0.00",
              b_area:         "0",
              pnt_reduce:     "0",
              body_panel:     body_panel ?? "",
              pay_orderno:    String(orderno ?? ""),
            };
          }
        }

        // 5. state 반영
        const toInsert = extraRow ? [newRow, extraRow] : [newRow];
        const combined = [
          ...currentRows.slice(0, insertIdx),
          ...toInsert,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;
        setRows(combined);
        setSelectedOrgSeq(newRow.estb_orgseqno);
        recalcPaysum();

        // 6. 서버 저장 (직렬 큐)
        const _row = newRow;
        const _tempId = newRow.estb_orgseqno;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const result = await saveDetail(_row);
          if (result?.newserial) {
            setSelectedOrgSeq((prev) => prev === _tempId ? result.newserial : prev);
          }
        });
        if (extraRow) {
          const _extra = extraRow;
          saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_extra));
        }

        // 7. 도장 컬러매칭 / 가열건조비 자동 추가
        const specialRows = buildSpecialRows(rowsRef.current, paintSolvent ?? "pnt");
        if (specialRows.length > 0) {
          // 현재 전체 rows의 max seqno 계산 → 특수행에 max+1, max+2 부여
          const maxSeq = rowsRef.current.reduce(
            (m, r) => Math.max(m, parseInt(r.estb_seqno || "0", 10)), 0
          );
          const seqAssigned = specialRows.map((sr, i) => ({
            ...sr,
            estb_seqno: String(maxSeq + 1 + i).padStart(3, "0"),
          }));
          const withSpecial = [...rowsRef.current, ...seqAssigned];
          rowsRef.current = withSpecial;
          setRows(withSpecial);
          for (const sr of seqAssigned) {
            const _sr = sr;
            saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_sr));
          }
        }
        return;
      }

      if (type === "PAINT_ITEMS_PICK") {
        const { paintSolvent, selectedKind, ...paintRow } = payload;
        const payno   = paintRow.payno;
        const payname = paintRow.payname;

        const currentRows = rowsRef.current;

        // 1. 중복 체크
        if (currentRows.some((r) => r.payno === payno && r.workcode === "P")) return;

        // 2. coatKind 결정
        //    - 교환(X) Row 존재 시 → swap 강제
        //    - 판금/수리(B/S) Row 존재 시 → swap 선택이면 outer 로 변환
        //    - 그 외 → 팝업에서 선택한 kind 사용
        const sameRows = currentRows.filter((r) => String(r.payno) === String(payno));
        let coatKind = selectedKind ?? "swap";
        if (sameRows.some((r) => r.workcode === "X")) {
          coatKind = "swap";
        } else if (sameRows.some((r) => r.workcode === "B" || r.workcode === "S")) {
          if (coatKind === "swap") coatKind = "outer";
        }

        // 3. solvent × coatKind → hour / partsum
        const solvent = paintSolvent === "oil" ? "oil" : "pnt";
        const fields  = PAINT_FIELD_MAP[solvent]?.[coatKind] ?? PAINT_FIELD_MAP.pnt.swap;
        const hour    = Number(paintRow[fields.h] ?? 0);
        const partsum = Number(paintRow[fields.m] ?? 0);
        const state   = COAT_STATE_MAP[coatKind] ?? "";
        const pntM    = solvent === "oil" ? "1" : "2";

        // pnt_hour / pnt_part: 항상 outer 기준
        const pntHourField = solvent === "oil" ? "oilpnt_hb" : "pnt_hb";
        const pntPartField = solvent === "oil" ? "oilpnt_mb" : "pnt_mb";
        const pntHour = Number(paintRow[pntHourField] ?? 0);
        const pntPart = Number(paintRow[pntPartField] ?? 0);

        // 4. 삽입 위치
        // subseq='2' 는 부모(subseq='1', 같은 category) payno 기준으로 위치 결정
        const _insertPno = paintRow.insertPayno || payno;
        let insertIdx = currentRows.length;
        for (let i = currentRows.length - 1; i >= 0; i--) {
          if (String(currentRows[i].payno) === String(_insertPno)) { insertIdx = i + 1; break; }
        }

        // ts_payno 조회: 견적내역에서 payno 일치 & paykind='1' 인 행
        const tsPaynoRow = currentRows.find(
          (r) => String(r.payno) === String(payno) && String(r.paykind) === "1"
        );
        const resolvedTsPayno = tsPaynoRow?.ts_payno ?? "";

        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";

        // paysum 즉시 계산 (도장행: ppay × hour)
        const _pnt2_claim0 = masterRef.current?.claims?.[0];
        const _pnt2_qty    = parseFloat(hour ?? "0");
        const _pnt2_ppay   = parseFloat(_pnt2_claim0?.ppay ?? "0");
        const _pnt2_paysum = (_pnt2_claim0 && !isNaN(_pnt2_qty) && !isNaN(_pnt2_ppay))
          ? String(Math.round(_pnt2_ppay * _pnt2_qty))
          : "0";

        const newRow = {
          comcode,
          est_serial:     estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        "6",
          payno,
          subpayno:       String(paintRow.subpayno ?? ""),
          payname,
          workcode:       "P",
          workcodename:   "도장",
          price:          "",
          qty:            String(hour),
          oqty:           String(hour),
          partsum:        String(partsum),
          paysum:         _pnt2_paysum,
          part_makercode: "",
          state,
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       String(pntHour),
          pnt_part:       String(pntPart),
          pnt_m:          pntM,
          pntcot:         String(paintRow.pntcot ?? ""),
          ts_payno:       resolvedTsPayno,
          update_id:      getUserid(),
          paykindname:    "도장",
          b_level:        String(paintRow.b_level ?? "0.00"),
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     String(paintRow.body_panel ?? ""),
          pay_orderno:    "",
        };

        // 5. 범퍼 자동 추가행: payname에 '범퍼' 포함 AND state='1'
        //    단, subseq='2' 인 행은 이미 부가항목이므로 자동 추가 제외
        let extraRow = null;
        const isSubseq2 = String(paintRow.subseq ?? "") === "2";
        if (String(payname).includes("범퍼") && state === "1" && !isSubseq2) {
          const tbEntry = (wrk34CodesRef.current ?? []).find((c) => c.value === "9");
          if (tbEntry) {
            const qty        = String(Number(tbEntry.def_value ?? 0) / 100);
            const _ex2_claim0 = masterRef.current?.claims?.[0];
            const _ex2_qty    = parseFloat(qty);
            const _ex2_ppay   = parseFloat(_ex2_claim0?.ppay ?? "0");
            const _ex2_paysum = (_ex2_claim0 && !isNaN(_ex2_qty) && !isNaN(_ex2_ppay))
              ? String(Math.round(_ex2_ppay * _ex2_qty))
              : "0";
            extraRow = {
              comcode,
              est_serial:     estSerial,
              estb_orgseqno:  newTempId(),
              estb_seqno:     String(insertIdx + 2).padStart(3, "0"),
              paykind:        "6",
              payno,
              subpayno:       "",
              payname:        String(payname) + " " + tbEntry.label,
              workcode:       "P",
              workcodename:   "도장",
              price:          "",
              qty,
              oqty:           qty,
              partsum:        "0",
              paysum:         _ex2_paysum,
              part_makercode: "",
              state,
              statename:      "",
              pnt_extr:       "9",
              pnt_hour:       "0",
              pnt_part:       "0",
              pnt_m:          pntM,
              pntcot:         String(paintRow.pntcot ?? ""),
              ts_payno:       resolvedTsPayno,
              update_id:      getUserid(),
              paykindname:    "도장",
              b_level:        "0.00",
              b_area:         "0",
              pnt_reduce:     "0",
              body_panel:     String(paintRow.body_panel ?? ""),
              pay_orderno:    "",
            };
          }
        }

        // 6. rows 업데이트 + 저장
        const toInsert = extraRow ? [newRow, extraRow] : [newRow];
        const combined = [
          ...currentRows.slice(0, insertIdx),
          ...toInsert,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;
        setRows(combined);
        setSelectedOrgSeq(newRow.estb_orgseqno);
        recalcPaysum();

        const _row = newRow;
        const _tempId = newRow.estb_orgseqno;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const result = await saveDetail(_row);
          if (result?.newserial) {
            setSelectedOrgSeq((prev) => prev === _tempId ? result.newserial : prev);
          }
        });
        if (extraRow) {
          const _extra = extraRow;
          saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_extra));
        }

        // 도장 컬러매칭 / 가열건조비 자동 추가
        const specialRowsPaint = buildSpecialRows(rowsRef.current, solvent);
        if (specialRowsPaint.length > 0) {
          const maxSeqPaint = rowsRef.current.reduce(
            (m, r) => Math.max(m, parseInt(r.estb_seqno || "0", 10)), 0
          );
          const seqAssignedPaint = specialRowsPaint.map((sr, i) => ({
            ...sr,
            estb_seqno: String(maxSeqPaint + 1 + i).padStart(3, "0"),
          }));
          const withSpecialPaint = [...rowsRef.current, ...seqAssignedPaint];
          rowsRef.current = withSpecialPaint;
          setRows(withSpecialPaint);
          for (const sr of seqAssignedPaint) {
            const _sr = sr;
            saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_sr));
          }
        }
        return;
      }

      if (type === "LABOR_ITEMS_PICK" && payload?.type === "part") {
        const { payno, subpayno, payname, part_makercode, state: partState, partsum, qty, ts_payno } = payload;

        const currentRows = rowsRef.current;

        // 중복 체크: payno + subpayno + part_makercode 조합이 이미 존재하면 스킵
        if (currentRows.some((r) =>
          String(r.payno)          === String(payno)          &&
          String(r.subpayno ?? "") === String(subpayno ?? "") &&
          String(r.part_makercode ?? "") === String(part_makercode ?? "")
        )) return;

        // 삽입 위치: 같은 payno 중 paykind='6' 또는 workcode='P' 인 첫 row 직전
        //           해당 row 없으면 같은 payno 마지막 row 다음, 없으면 맨 끝
        let insertIdx = currentRows.length;
        let paintIdx = -1;
        let lastSamePaynoIdx = -1;
        for (let i = 0; i < currentRows.length; i++) {
          const r = currentRows[i];
          if (String(r.payno) !== String(payno)) continue;
          lastSamePaynoIdx = i;
          if (paintIdx === -1 && (String(r.paykind) === "6" || r.workcode === "P")) {
            paintIdx = i;
          }
        }
        if (paintIdx !== -1) {
          insertIdx = paintIdx;
        } else if (lastSamePaynoIdx !== -1) {
          insertIdx = lastSamePaynoIdx + 1;
        }

        // 도장컬러매칭(99990)/가열건조비(99991)보다 앞에 인서트
        { const _si = currentRows.findIndex((r) => r.subpayno === "99990" || r.subpayno === "99991");
          if (_si !== -1 && insertIdx > _si) insertIdx = _si; }

        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";

        const newRow = {
          comcode,
          est_serial:     estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        "3",
          payno:          payno ?? "",
          subpayno:       subpayno ?? "",
          payname:        payname ?? "",
          workcode:       "",
          workcodename:   "",
          price:          "",
          qty:            String(qty ?? "1"),
          oqty:           String(qty ?? "1"),
          partsum:        String(partsum ?? "0"),
          paysum:         "0",
          part_makercode: part_makercode ?? "",
          state:          partState ?? "",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       "",
          pnt_part:       "0",
          pnt_m:          "",
          pntcot:         "",
          ts_payno:       ts_payno ?? "",
          update_id:      getUserid(),
          paykindname:    "부품",
          b_level:        "0.00",
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     "",
          pay_orderno:    "",
        };

        const combined = [
          ...currentRows.slice(0, insertIdx),
          newRow,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;
        setRows(combined);
        setSelectedOrgSeq(newRow.estb_orgseqno);

        const _row = newRow;
        const _tempId = newRow.estb_orgseqno;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const result = await saveDetail(_row);
          if (result?.newserial) {
            setSelectedOrgSeq((prev) => prev === _tempId ? result.newserial : prev);
          }
        });
        return;
      }

      if (type === "PAINT_ITEMS_BATCH") {
        const { paints: paintMaster, paintSolvent } = payload;
        const currentRows = rowsRef.current;

        // 이미 도장행(paykind='6', workcode='P')이 있는 payno 집합
        const paintedPaynos = new Set(
          currentRows
            .filter((r) => String(r.paykind) === "6" && String(r.workcode) === "P")
            .map((r) => String(r.payno))
        );

        // 대상: paykind in ('1','2'), workcode in ('X','B','S'), 도장행 없는 것
        const targetRows = currentRows.filter(
          (r) =>
            ["1", "2"].includes(String(r.paykind)) &&
            ["X", "B", "S"].includes(String(r.workcode)) &&
            !paintedPaynos.has(String(r.payno))
        );

        if (targetRows.length === 0) return;

        const solvent   = paintSolvent === "oil" ? "oil" : "pnt";
        const pntM      = solvent === "oil" ? "1" : "2";
        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";

        const newRows = [];
        for (const targetRow of targetRows) {
          const payno    = String(targetRow.payno);
          const coatKind = targetRow.workcode === "X" ? "swap" : "outer";

          // paint master에서 payno 매칭
          const paintRow = paintMaster.find((p) => String(p.payno) === payno);
          if (!paintRow) continue;

          const fields  = PAINT_FIELD_MAP[solvent]?.[coatKind] ?? PAINT_FIELD_MAP.pnt.swap;
          const hour    = Number(paintRow[fields.h] ?? 0);
          const partsum = Number(paintRow[fields.m] ?? 0);
          const state   = COAT_STATE_MAP[coatKind] ?? "";

          const pntHourField = solvent === "oil" ? "oilpnt_hb" : "pnt_hb";
          const pntPartField = solvent === "oil" ? "oilpnt_mb" : "pnt_mb";
          const pntHour = Number(paintRow[pntHourField] ?? 0);
          const pntPart = Number(paintRow[pntPartField] ?? 0);

          // ts_payno: paykind='1' 행에서 조회
          const tsPaynoRow = currentRows.find(
            (r) => String(r.payno) === payno && String(r.paykind) === "1"
          );
          const resolvedTsPayno = tsPaynoRow?.ts_payno ?? "";

          // paysum 즉시 계산 (도장행: ppay × hour)
          const _pnt3_claim0 = masterRef.current?.claims?.[0];
          const _pnt3_qty    = parseFloat(hour ?? "0");
          const _pnt3_ppay   = parseFloat(_pnt3_claim0?.ppay ?? "0");
          const _pnt3_paysum = (_pnt3_claim0 && !isNaN(_pnt3_qty) && !isNaN(_pnt3_ppay))
            ? String(Math.round(_pnt3_ppay * _pnt3_qty))
            : "0";

          newRows.push({
            comcode,
            est_serial:     estSerial,
            estb_orgseqno:  newTempId(),
            estb_seqno:     "000",
            paykind:        "6",
            payno,
            subpayno:       "",
            payname:        String(paintRow.payname ?? ""),
            workcode:       "P",
            workcodename:   "도장",
            price:          "",
            qty:            String(hour),
            oqty:           String(hour),
            partsum:        String(partsum),
            paysum:         _pnt3_paysum,
            part_makercode: "",
            state,
            statename:      "",
            pnt_extr:       "",
            pnt_hour:       String(pntHour),
            pnt_part:       String(pntPart),
            pnt_m:          pntM,
            pntcot:         String(paintRow.pntcot ?? ""),
            ts_payno:       resolvedTsPayno,
            update_id:      getUserid(),
            paykindname:    "도장",
            b_level:        "0.00",
            b_area:         "0",
            pnt_reduce:     "0",
            body_panel:     String(paintRow.body_panel ?? ""),
            pay_orderno:    "",
          });

          // 범퍼 자동 추가행
          const isSubseq2 = String(paintRow.subseq ?? "") === "2";
          if (String(paintRow.payname ?? "").includes("범퍼") && state === "1" && !isSubseq2) {
            const tbEntry = (wrk34CodesRef.current ?? []).find((c) => c.value === "9");
            if (tbEntry) {
              const qty         = String(Number(tbEntry.def_value ?? 0) / 100);
              const _ex3_claim0 = masterRef.current?.claims?.[0];
              const _ex3_qty    = parseFloat(qty);
              const _ex3_ppay   = parseFloat(_ex3_claim0?.ppay ?? "0");
              const _ex3_paysum = (_ex3_claim0 && !isNaN(_ex3_qty) && !isNaN(_ex3_ppay))
                ? String(Math.round(_ex3_ppay * _ex3_qty))
                : "0";
              newRows.push({
                comcode,
                est_serial:     estSerial,
                estb_orgseqno:  newTempId(),
                estb_seqno:     "000",
                paykind:        "6",
                payno,
                subpayno:       "",
                payname:        String(paintRow.payname) + " " + tbEntry.label,
                workcode:       "P",
                workcodename:   "도장",
                price:          "",
                qty,
                oqty:           qty,
                partsum:        "0",
                paysum:         _ex3_paysum,
                part_makercode: "",
                state,
                statename:      "",
                pnt_extr:       "9",
                pnt_hour:       "0",
                pnt_part:       "0",
                pnt_m:          pntM,
                pntcot:         String(paintRow.pntcot ?? ""),
                ts_payno:       resolvedTsPayno,
                update_id:      getUserid(),
                paykindname:    "도장",
                b_level:        "0.00",
                b_area:         "0",
                pnt_reduce:     "0",
                body_panel:     String(paintRow.body_panel ?? ""),
                pay_orderno:    "",
              });
            }
          }
        }

        if (newRows.length === 0) return;

        // 각 신규행을 같은 payno 의 마지막 행 다음에 삽입
        let combined = [...currentRows];
        for (const nr of newRows) {
          let insertIdx = combined.length;
          for (let i = combined.length - 1; i >= 0; i--) {
            if (String(combined[i].payno) === String(nr.payno)) { insertIdx = i + 1; break; }
          }
          combined = [...combined.slice(0, insertIdx), nr, ...combined.slice(insertIdx)];
        }
        combined = combined.map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));

        rowsRef.current = combined;
        setRows(combined);
        recalcPaysum();

        for (const nr of newRows) {
          const _nr = combined.find((r) => r.estb_orgseqno === nr.estb_orgseqno) ?? nr;
          saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_nr));
        }

        // 도장 컬러매칭 / 가열건조비 자동 추가
        const specialRowsBatch = buildSpecialRows(rowsRef.current, solvent);
        if (specialRowsBatch.length > 0) {
          const maxSeqBatch = rowsRef.current.reduce(
            (m, r) => Math.max(m, parseInt(r.estb_seqno || "0", 10)), 0
          );
          const seqAssignedBatch = specialRowsBatch.map((sr, i) => ({
            ...sr,
            estb_seqno: String(maxSeqBatch + 1 + i).padStart(3, "0"),
          }));
          const withSpecialBatch = [...rowsRef.current, ...seqAssignedBatch];
          rowsRef.current = withSpecialBatch;
          setRows(withSpecialBatch);
          for (const sr of seqAssignedBatch) {
            const _sr = sr;
            saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_sr));
          }
        }
        return;
      }

      if (type === "PAINT_MASKING_PICK") {
        const { paintRow, paintSolvent } = payload;
        const payno   = String(paintRow.payno ?? "");
        const payname = String(paintRow.payname ?? "");
        const currentRows = rowsRef.current;

        // 중복 체크: 동일 payno & workcode='P' 이미 존재하면 스킵
        if (currentRows.some((r) => String(r.payno) === payno && r.workcode === "P")) return;

        const solvent = paintSolvent === "oil" ? "oil" : "pnt";
        const pntM    = solvent === "oil" ? "1" : "2";
        const fields  = PAINT_FIELD_MAP[solvent]?.swap ?? PAINT_FIELD_MAP.pnt.swap;
        const hour    = Number(paintRow[fields.h] ?? 0);
        const partsum = Number(paintRow[fields.m] ?? 0);

        const pntHourField = solvent === "oil" ? "oilpnt_hb" : "pnt_hb";
        const pntPartField = solvent === "oil" ? "oilpnt_mb" : "pnt_mb";
        const pntHour = Number(paintRow[pntHourField] ?? 0);
        const pntPart = Number(paintRow[pntPartField] ?? 0);

        // 삽입 위치: subpayno='99990' or '99991' 보다 앞, 없으면 맨 끝
        let insertIdx = currentRows.length;
        const specialIdx = currentRows.findIndex(
          (r) => r.subpayno === "99990" || r.subpayno === "99991"
        );
        if (specialIdx !== -1) insertIdx = specialIdx;

        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";

        // paysum 즉시 계산 (도장행: ppay × hour)
        const _pnt4_claim0 = masterRef.current?.claims?.[0];
        const _pnt4_qty    = parseFloat(hour ?? "0");
        const _pnt4_ppay   = parseFloat(_pnt4_claim0?.ppay ?? "0");
        const _pnt4_paysum = (_pnt4_claim0 && !isNaN(_pnt4_qty) && !isNaN(_pnt4_ppay))
          ? String(Math.round(_pnt4_ppay * _pnt4_qty))
          : "0";

        const newRow = {
          comcode,
          est_serial:     estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        "6",
          payno,
          subpayno:       "",
          payname,
          workcode:       "P",
          workcodename:   "도장",
          price:          "",
          qty:            String(hour),
          oqty:           String(hour),
          partsum:        String(partsum),
          paysum:         _pnt4_paysum,
          part_makercode: "",
          state:          "1",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       String(pntHour),
          pnt_part:       String(pntPart),
          pnt_m:          pntM,
          pntcot:         String(paintRow.pntcot ?? ""),
          ts_payno:       "",
          update_id:      getUserid(),
          paykindname:    "도장",
          b_level:        "0.00",
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     String(paintRow.body_panel ?? ""),
          pay_orderno:    "",
        };

        const combined = [
          ...currentRows.slice(0, insertIdx),
          newRow,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;
        setRows(combined);
        recalcPaysum();

        const _row = newRow;
        saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_row));
        return;
      }

      if (type === "PAINT_COLOR_MATCH_ADD") {
        const { paintSolvent } = payload;
        const currentRows = rowsRef.current;

        // subpayno='99990' 이미 존재하면 스킵
        if (currentRows.some((r) => r.subpayno === "99990")) return;

        // buildSpecialRows 와 동일한 로직으로 99990 Row 생성
        const mst      = masterRef.current ?? {};
        const ls       = laborSettingsRef.current ?? {};
        const solvent  = paintSolvent === "oil" ? "oil" : "pnt";
        const comcode  = mst.comcode    ?? getComcode();
        const estSerial = mst.est_serial ?? "";

        const qty     = String(ls.pntcolormix  ?? "0");
        const partsum = solvent === "oil"
          ? String(ls.pntmix_m_oil ?? "0")
          : String(ls.pntmix_m     ?? "0");
        const ppay   = parseFloat(mst.claims?.[0]?.ppay ?? "0");
        const paysum = String(Math.round(ppay * parseFloat(qty || "0")));

        const newRow = {
          comcode, est_serial: estSerial, estb_orgseqno: newTempId(),
          estb_seqno: "000",
          paykind: "4", payno: "", subpayno: "99990",
          payname: "도장 컬러매칭", workcode: "P", workcodename: "도장",
          price: "", qty, oqty: qty,
          partsum, paysum, part_makercode: "",
          state: "", statename: "", pnt_extr: "",
          pnt_hour: qty, pnt_part: "0", pnt_m: solvent === "oil" ? "1" : "2",
          pntcot: "", ts_payno: "", update_id: getUserid(),
          paykindname: "#공임", b_level: "0.00", b_area: "0",
          pnt_reduce: "0", body_panel: "", pay_orderno: "",
        };

        // 삽입 위치: subpayno='99991' 보다 앞, 없으면 맨 끝
        let insertIdx = currentRows.length;
        const dry99991 = currentRows.findIndex((r) => r.subpayno === "99991");
        if (dry99991 !== -1) insertIdx = dry99991;

        const combined = [
          ...currentRows.slice(0, insertIdx),
          newRow,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;
        setRows(combined);
        recalcPaysum();

        const _row = newRow;
        saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_row));
        return;
      }

      if (type === "CHEM_ITEMS_PICK") {
        const { item } = payload ?? {};
        if (!item) return;

        const currentRows = rowsRef.current;

        // 선택 Row: paykind='1' 인 row
        const selOrgSeq = selectedOrgSeqRef.current;
        const selRow = currentRows.find(
          (r) => r.estb_orgseqno === selOrgSeq && String(r.paykind) === "1"
        );
        if (!selRow) {
          alertInfo("주체(paykind=1) 행을 선택하세요.");
          return;
        }

        const { payno } = selRow;
        const { material_cd, material_nm, price, hour2 } = item;

        // 중복 체크: payno + material_cd + paykind
        if (currentRows.some(
          (r) => String(r.payno) === String(payno) &&
                 String(r.subpayno ?? "") === String(material_cd ?? "") &&
                 String(r.paykind) === "4"
        )) {
          alertInfo(`이미 추가된 케미칼 공임 항목입니다. (${material_nm})`);
          return;
        }
        if (currentRows.some(
          (r) => String(r.payno) === String(payno) &&
                 String(r.subpayno ?? "") === String(material_cd ?? "") &&
                 String(r.paykind) === "5"
        )) {
          alertInfo(`이미 추가된 케미칼 재료비 항목입니다. (${material_nm})`);
          return;
        }

        // 삽입 위치: 선택 Row 바로 아래
        const selIdx = currentRows.findIndex((r) => r.estb_orgseqno === selOrgSeq);
        const insertIdx = selIdx + 1;

        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";
        const xpay      = parseFloat(masterRef.current?.claims?.[0]?.xpay ?? "0");
        const qty4      = parseFloat(hour2 ?? "0");
        const paysum4   = String(Math.round(xpay * qty4));

        const row4 = {
          comcode, est_serial: estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        "4",
          payno:          String(payno ?? ""),
          subpayno:       String(material_cd ?? ""),
          payname:        String(material_nm ?? ""),
          workcode:       "X",
          workcodename:   "교환",
          price:          "",
          qty:            String(qty4),
          oqty:           String(qty4),
          partsum:        "0",
          paysum:         paysum4,
          part_makercode: "",
          state:          "",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       "0",
          pnt_part:       "0",
          pnt_m:          "",
          pntcot:         "",
          ts_payno:       "",
          update_id:      getUserid(),
          paykindname:    "#공임",
          b_level:        "0.00",
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     "",
          pay_orderno:    "",
        };

        const row5 = {
          comcode, est_serial: estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 2).padStart(3, "0"),
          paykind:        "5",
          payno:          String(payno ?? ""),
          subpayno:       String(material_cd ?? ""),
          payname:        String(material_nm ?? "") + "[재료비]",
          workcode:       "",
          workcodename:   "",
          price:          "",
          qty:            "1",
          oqty:           "1",
          partsum:        String(price ?? "0"),
          paysum:         "0",
          part_makercode: "",
          state:          "A",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       "0",
          pnt_part:       "0",
          pnt_m:          "",
          pntcot:         "",
          ts_payno:       "",
          update_id:      getUserid(),
          paykindname:    "#부품",
          b_level:        "0.00",
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     "",
          pay_orderno:    "",
        };

        // 삽입 순서: #공임(row4) → #부품(row5)
        const combined = [
          ...currentRows.slice(0, insertIdx),
          row4,
          row5,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));

        rowsRef.current = combined;
        setRows(combined);
        setSelectedOrgSeq(row4.estb_orgseqno);

        const _r4 = combined.find((r) => r.estb_orgseqno === row4.estb_orgseqno) ?? row4;
        const _r5 = combined.find((r) => r.estb_orgseqno === row5.estb_orgseqno) ?? row5;
        const _tempId4 = row4.estb_orgseqno;
        saveQueueRef.current = saveQueueRef.current
          .then(async () => {
            const result = await saveDetail(_r4);
            if (result?.newserial) {
              setSelectedOrgSeq((prev) => prev === _tempId4 ? result.newserial : prev);
            }
          })
          .then(() => saveDetail(_r5));
        return;
      }

      if (type === "PART_LOOKUP_PICK") {
        const { part_makercode, payname, price, _gubun } = payload ?? {};

        // 제작사 부품은 VAT 포함가(price)에서 공급가(÷1.1 반올림)로 환산
        const resolvedPrice = _gubun === "제작사"
          ? Math.round(Number(price ?? 0) / 1.1)
          : Number(price ?? 0);

        const currentRows = rowsRef.current;
        const selOrgSeq   = selectedOrgSeqRef.current;

        // 현재 선택된 Row 인덱스 (없으면 -1)
        const selIdx = selOrgSeq
          ? currentRows.findIndex((r) => r.estb_orgseqno === selOrgSeq)
          : -1;

        // 선택 Row에서 payno / subpayno 상속
        const selRow   = selIdx !== -1 ? currentRows[selIdx] : null;
        const payno    = selRow?.payno    ?? "";
        const subpayno = selRow?.subpayno ?? "";

        // payno 없으면 알럿 후 중단
        if (!payno) { alertInfo("견적 항목을 선택하세요."); return; }

        // paykind 가 1·2·3·4·5 인 경우만 인서트
        if (!["1","2","3","4","5"].includes(String(selRow?.paykind ?? ""))) {
          alertInfo("선택한 견적내용에 부품을 추가할 수 없습니다.");
          return;
        }

        // 중복 체크: 같은 payno + subpayno + part_makercode 이미 존재하면 스킵
        if (currentRows.some((r) =>
          String(r.payno          ?? "") === String(payno)          &&
          String(r.subpayno       ?? "") === String(subpayno)       &&
          String(r.part_makercode ?? "") === String(part_makercode ?? "")
        )) return;

        // 삽입 위치: 선택된 Row 바로 아래, 없으면 맨 끝
        let insertIdx = selIdx !== -1 ? selIdx + 1 : currentRows.length;

        // 도장컬러매칭(99990) / 가열건조비(99991) 보다 앞에 인서트
        { const _si = currentRows.findIndex((r) => r.subpayno === "99990" || r.subpayno === "99991");
          if (_si !== -1 && insertIdx > _si) insertIdx = _si; }

        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";

        const newRow = {
          comcode,
          est_serial:     estSerial,
          estb_orgseqno:  newTempId(),
          estb_seqno:     String(insertIdx + 1).padStart(3, "0"),
          paykind:        "5",
          payno,
          subpayno,
          payname:        payname ?? "",
          workcode:       "",
          workcodename:   "",
          price:          String(resolvedPrice),
          qty:            "1",
          oqty:           "1",
          partsum:        String(resolvedPrice),
          paysum:         "0",
          part_makercode: part_makercode ?? "",
          state:          "A",
          statename:      "",
          pnt_extr:       "",
          pnt_hour:       "",
          pnt_part:       "0",
          pnt_m:          "",
          pntcot:         "",
          ts_payno:       selRow?.ts_payno ?? "",
          update_id:      getUserid(),
          paykindname:    "#부품",
          b_level:        "0.00",
          b_area:         "0",
          pnt_reduce:     "0",
          body_panel:     "",
          pay_orderno:    "",
        };

        const combined = [
          ...currentRows.slice(0, insertIdx),
          newRow,
          ...currentRows.slice(insertIdx),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
        rowsRef.current = combined;
        setRows(combined);
        setSelectedOrgSeq(newRow.estb_orgseqno);
        recalcPaysum();

        const _row    = newRow;
        const _tempId = newRow.estb_orgseqno;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const result = await saveDetail(_row);
          if (result?.newserial) {
            setSelectedOrgSeq((prev) => prev === _tempId ? result.newserial : prev);
          }
        });
        return;
      }

      console.log(`[${type}]`, payload);
    };
  }, [est_serial, saveDetail, setRows, setSelectedOrgSeq, recalcPaysum, buildSpecialRows, alertInfo]);

  useEffect(() => {
    const handler = (e) => onMsgHandlerRef.current?.(e);
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  
  useEffect(() => {
    const onBeforeUnload = () => {
      closeAllChildWins();
      const mst    = masterRef.current;
      const serial = mst?.est_serial ?? "";
      const _rows  = rowsRef.current ?? [];

      // beforeunload는 동기 핸들러 → await 금지
      // 세 저장을 즉시 동시에 시작해 모두 in-flight 상태로 만들어야 완료됨

      // 1. 접수(마스터) 저장
      if (serial) saveRef.current(serial, mst).catch(() => {});

      // 2. 청구처 저장 — 사이드패널 open + claim 탭 활성 시에만
      if (sidePanelOpenRef.current && sideActiveRef.current === "claim") {
        const claims = Array.isArray(mst?.claims) ? mst.claims : [];
        claims.forEach((claim) => saveClaimRef.current(serial, claim).catch(() => {}));
        claimDirtyRef.current = false;
      }

      // 3. 견적내역 저장
      if (_rows.length > 0) saveAllDetails(_rows).catch(() => {});
    };
    const onUnload = () => closeAllChildWins();
  
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unload", onUnload);
  
    return () => {
      closeAllChildWins();
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("unload", onUnload);
    };
  }, []);
  

  // const selectedRow = useMemo(
  //   () => rows.find((r) => r.estb_orgseqno === selectedOrgSeq) ?? null,
  //   [rows, selectedOrgSeq]
  // );


  // const removeSelected = useCallback(() => {
  //   if (!selectedRow) return;
  //   const next = rows.filter((r) => r.estb_orgseqno !== selectedRow.estb_orgseqno);
  //   setRows(next.map((r, i) => ({ ...r, estb_seqno: i + 1 })));
  //   setSelectedOrgSeq(null);
  // }, [rows, selectedRow]);

  const handleDeleteSelected = useCallback((orgSeqs, displayCount) => {
    // orgSeqs: string[] (멀티선택 또는 단일선택 배열)
    // displayCount: 메시지에 표시할 개수 (미전달 시 orgSeqs.length)
    if (!orgSeqs?.length) return;
    setPendingDelete({ type: "selected", orgSeqs, displayCount: displayCount ?? orgSeqs.length });
    setDeleteOpen(true);
  }, []);

  const handleDeleteAll = useCallback(() => {
    setPendingDelete({ type: "all" });
    setDeleteOpen(true);
  }, []);

  // rows 합계 → master 필드 반영 (저장 직전 호출)
  const masterWithSums = useCallback((targetRows = rows) => {
    const sumLabor  = targetRows.reduce((a, r) => a + (Number(r.paysum)  || 0), 0);
    const sumPart   = targetRows.reduce((a, r) => a + (Number(r.partsum) || 0), 0);
    const supply    = sumLabor + sumPart;
    const sumVat    = Math.round(supply * 0.1);
    const sumTotal  = supply + sumVat;
    return {
      ...master,
      paysum:    String(sumLabor),
      partsum:   String(sumPart),
      vat:       String(sumVat),
      saletotal: String(sumTotal),
    };
  }, [master, rows]);

  const movePaintToBottom = useCallback(() => {
    // 컬러매칭(99990), 가열건조비(99991)는 맨 뒤 고정
    const fixed  = rows.filter((r) => r.subpayno === "99990" || r.subpayno === "99991");
    const paint  = rows.filter((r) => r.paykind === "6" && r.subpayno !== "99990" && r.subpayno !== "99991");
    const others = rows.filter((r) => r.paykind !== "6" && r.subpayno !== "99990" && r.subpayno !== "99991");
    setRows([...others, ...paint, ...fixed].map((r, i) => ({ ...r, estb_seqno: i + 1 })));
  }, [rows]);

  // 청구처 탭 이탈 시 호출 (EstimateEditPage 레벨 → useApi abort 없이 정상 동작)
  const handleClaimSave = useCallback(async () => {
    if (!claimDirtyRef.current) return;  // 변경 없으면 스킵
    try {
      await save(est_serial, master);
      const claims = Array.isArray(master.claims) ? master.claims : [];
      // 순차 저장 (Promise.all 사용 시 단일 useApi 인스턴스 abort 발생)
      for (const claim of claims) {
        await saveClaim(est_serial, claim);
      }
      claimDirtyRef.current = false;  // 저장 완료 → clean
    } catch (err) {
      alertError(err?.message ?? "청구처 저장 실패");
    }
  }, [est_serial, master, save, saveClaim, alertError]);

  // 팝업 오픈 전: claim 탭이 활성화 상태이면 먼저 저장
  const saveClaimIfActive = useCallback(async () => {
    if (sideActive === "claim") await handleClaimSave();
  }, [sideActive, handleClaimSave]);

  // 셀 값 확정 시(blur/Enter/Nav/작업선택) — settle 탭이 열린 경우 단일 행 저장 + 재조회
  const handleValueCommit = useCallback((row) => {
    if (sideActive !== "settle") return;
    saveSingleDetail(row)
      .then(() => setSettleRefreshKey((k) => k + 1))
      .catch(() => {});
  }, [sideActive, saveSingleDetail]);

  // 견적정산 탭 진입 시: 먼저 저장 후 SettlePanel 재조회 트리거
  const handleSettleEnter = useCallback(async () => {
    try {
      await saveAllDetails(rows);
      // 저장 후 견적내역 리프레시 — _new_* 임시 ID를 실제 서버 ID로 갱신
      const detailJson = await fetchDetails(est_serial);
      const refreshed  = detailJson?.dataset ?? [];
      setRows(refreshed);
      setSettleRefreshKey((k) => k + 1);
    } catch (err) {
      alertError(err?.message ?? "저장 실패");
    }
  }, [rows, est_serial, saveAllDetails, fetchDetails, setRows, setSettleRefreshKey, alertError]);

  // [목록] 버튼: 전체 저장 후 이동 (잠긴 경우 저장 없이 이동)
  const handleClose = useCallback(async () => {
    if (isLocked) { navigate(-1); return; }
    try {
      await withLoading(async () => {
        // 1. 접수(마스터) 저장 — 항상 (rows 합계 반영)
        await save(est_serial, masterWithSums());
        // 2. 청구처 저장 — 사이드패널 open + claim 탭 활성 시에만
        if (sidePanelOpen && sideActive === "claim") {
          const claims = Array.isArray(master?.claims) ? master.claims : [];
          for (const claim of claims) {
            await saveClaim(est_serial, claim);
          }
          claimDirtyRef.current = false;
        }
        // 3. 견적내역 저장 — 항상
        await saveAllDetails(rows);
      });
      navigate(-1);
    } catch (err) {
      alertError(err?.message ?? "저장 실패");
    }
  }, [isLocked, est_serial, master, masterWithSums, rows, sidePanelOpen, sideActive,
      save, saveClaim, saveAllDetails, withLoading, navigate, alertError]);

  const handleDuplicateCheck = useCallback(async () => {
    await withLoading(async () => {
      // 1. 마스터 저장
      await save(est_serial, master);
      // 2. 청구처 저장 (사이드패널 open + claim 탭 활성 시만)
      if (sidePanelOpen && sideActive === "claim") {
        const claims = Array.isArray(master?.claims) ? master.claims : [];
        for (const claim of claims) {
          await saveClaim(est_serial, claim);
        }
        claimDirtyRef.current = false;
      }
      // 3. 견적내역 저장
      await saveAllDetails(rows);
      // 4. 중복체크 API
      await fetchOverlap(est_serial);
      // 5. 견적내역 새로고침
      const detailJson = await fetchDetails(est_serial);
      const newRows = detailJson?.dataset ?? [];
      setRows(newRows);
      // 6. state='O' rows 선택
      const overlapSeqs = newRows
        .filter((r) => String(r.state) === "O")
        .map((r) => r.estb_orgseqno);
      if (overlapSeqs.length > 0) {
        setSelectedOrgSeqs(new Set(overlapSeqs));
        setSelectedOrgSeq(overlapSeqs[0]);
      }
      // 7. 견적정산 탭 새로고침
      if (sidePanelOpen && sideActive === "settle") {
        setSettleRefreshKey((k) => k + 1);
      }
    }, "중복체크 중...");
  }, [est_serial, master, rows, sidePanelOpen, sideActive,
      save, saveClaim, saveAllDetails, fetchOverlap, fetchDetails,
      setRows, setSelectedOrgSeqs, setSelectedOrgSeq, setSettleRefreshKey,
      claimDirtyRef, withLoading]);

  // [공유견적] 선택 시 — 가져온 detail rows를 현재 견적 끝에 추가
  const handleSharedEstimateSelect = useCallback((detailRows) => {
    if (!detailRows?.length) return;
    const claim0 = masterRef.current?.claims?.[0];
    setRows((prev) => {
      const added = detailRows.map((r, i) => {
        // est_serial, estb_orgseqno, update_id 는 공유 row 값 사용 안 함
        const { est_serial: _s, estb_orgseqno: _o, update_id: _u, ...rest } = r;

        // paysum 재계산 — 현재 견적 청구처[0] 단가 기준
        let paysum = rest.paysum;
        if (claim0 && rest.workcode && rest.qty && rest.subpayno !== "99991") {
          const qty = parseFloat(rest.qty);
          if (!isNaN(qty)) {
            let rate = null;
            if ("SB".includes(rest.workcode))        rate = parseFloat(claim0.bpay);
            else if (rest.workcode === "P")          rate = parseFloat(claim0.ppay);
            else if ("RXOA".includes(rest.workcode)) rate = parseFloat(claim0.xpay);
            if (rate != null && !isNaN(rate)) paysum = String(Math.round(rate * qty));
          }
        }

        return {
          ...rest,
          est_serial,                      // 현재 견적번호
          estb_orgseqno: newTempId(),        // 신규 임시 키 (_new_ prefix → INSERT)
          estb_seqno: prev.length + i + 1,
          update_id: getUserid(),          // 현재 로그인 사용자
          paysum,
        };
      });
      return [...prev, ...added];
    });
  }, [setRows, est_serial]);

  const handleSaveAndList = useCallback(async () => {
    if (isLocked) return;
    try {
      await withLoading(async () => {
        // 1. 마스터 저장 (항상, rows 합계 반영)
        await save(est_serial, masterWithSums());
        // 2. 청구처 저장 (사이드패널 open + claim 탭 활성 시만)
        if (sidePanelOpen && sideActive === "claim") {
          const claims = Array.isArray(master?.claims) ? master.claims : [];
          for (const claim of claims) {
            await saveClaim(est_serial, claim);
          }
          claimDirtyRef.current = false;
        }
        // 3. 견적내역 저장 (항상)
        await saveAllDetails(rows);
        // 4. 저장 후 견적내역 리프레시 — _new_* 임시 ID를 실제 서버 ID로 갱신
        //    (미리프레시 시 재저장 시 _new_* 가 null 로 전송되어 중복 INSERT 발생)
        const detailJson = await fetchDetails(est_serial);
        const refreshed  = detailJson?.dataset ?? [];
        setRows(refreshed);
        if (sidePanelOpen && sideActive === "settle") {
          setSettleRefreshKey((k) => k + 1);
        }
      }, "저장 중...");
    } catch (err) {
      alertError(err?.message ?? "저장 실패");
    }
  }, [est_serial, master, masterWithSums, rows, sidePanelOpen, sideActive,
      save, saveClaim, saveAllDetails, fetchDetails, setRows, setSettleRefreshKey,
      claimDirtyRef, withLoading, alertError, isLocked]);

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">견적내역</div>
              <div className="text-xs text-zinc-500">견적번호 {est_serial} {master?.seccodename}</div>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={handleClose}
              >
                <ArrowLeft size={15} strokeWidth={2.5} />
                견적목록으로 가기
              </button>
            </div>
          </div>

          <div className="mt-2">
            <EstimateHeaderBar
              onSaveAndList={handleSaveAndList}
              onSave={handleSaveAndList}
              saving={saving}
              onOpenLaborItems={openLaborItemsPopup}
              onOpenPaintItems={openPaintItemsPopup}
              onOpenChemicalItems={openChemicalItemsPopup}
              onOpenPartLookup={openPartLookupPopup}
              onDuplicateCheck={handleDuplicateCheck}
              onOpenPhotoViewer={openPhotoViewerPopup}
              onPrint={handlePrint}
              master={master}
              readOnly={isLocked}
            />
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}   
      <div className="app-container py-3 mb-16 min-h-0 flex-1 flex flex-col gap-3">
        <div className="min-h-0 flex-1 flex gap-3 min-w-0">
          {/* 좌: 접수 + 테이블 */}
          <div className="min-h-0 flex-1 flex flex-col gap-2 min-w-0">
            <EstimateReception master={master} setMaster={setMaster} laborWinOpen={laborWinOpen || paintWinOpen} readOnly={isLocked} />

            <div className="min-h-0 flex-1 flex flex-col min-w-0">
              <EstimateItemsTable
                rows={rows}
                setRows={setRows}
                selectedOrgSeq={selectedOrgSeq}
                setSelectedOrgSeq={setSelectedOrgSeq}
                sortMode={sortMode}
                setSortMode={setSortMode}
                onDeleteSelected={handleDeleteSelected}
                onDeleteAll={handleDeleteAll}
                onMovePaintToBottom={movePaintToBottom}
                master={master}
                onInsertDetail={saveDetail}
                onValueCommit={handleValueCommit}
                selectedOrgSeqs={selectedOrgSeqs}
                setSelectedOrgSeqs={setSelectedOrgSeqs}
                workTimes={workTimes}
                sidePanelOpen={sidePanelOpen}
                est_serial={est_serial}
                onSharedEstimateSelect={handleSharedEstimateSelect}
                readOnly={isLocked}
              />
              
            </div>
            {/* <div className="h-16 flex-none" /> */}
          </div>

          {/* 우: 슬라이드 패널 */}
          <EstimateSidePanel
            master={master}
            setMaster={setMaster}
            active={sideActive}
            onTabChange={setSideActive}
            onClaimLeave={handleClaimSave}
            onClaimDirty={() => { claimDirtyRef.current = true; }}
            onClaimClean={() => { claimDirtyRef.current = false; }}
            onRateChange={recalcPaysum}
            onOpenChange={setSidePanelOpen}
            onSettleEnter={handleSettleEnter}
            settleRefreshKey={settleRefreshKey}
            laborWinOpen={laborWinOpen || paintWinOpen}
            readOnly={isLocked}
          />
        </div>
      </div>

      {/* 청구처 선택 */}
      <ClaimSelectModal
        open={claimSelectOpen}
        onClose={() => setClaimSelectOpen(false)}
        claims={master?.claims ?? []}
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

      {/* 삭제 confirm */}
      <AlertModal
        open={deleteOpen}
        type="delete"
        title="삭제"
        message={
          pendingDelete?.type === "all"
            ? "전체 항목을 삭제할까요?"
            : `선택한 ${pendingDelete?.displayCount ?? pendingDelete?.orgSeqs?.length ?? 1}개 항목을 삭제할까요?`
        }
        confirmText="삭제"
        showCancel
        onCancel={() => setDeleteOpen(false)}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleteOpen(false);
          try {
            if (pendingDelete?.type === "all") {
              await deleteAll(est_serial);
              setRows([]);
              setSelectedOrgSeq(null);
              setSelectedOrgSeqs(new Set());
            } else if (pendingDelete?.type === "selected") {
              const { orgSeqs } = pendingDelete;
              const seqSet = new Set(orgSeqs);

              // 삭제 대상 row 의 payno 수집 (도장 부모 row 한정: pnt_extr='' 인 경우만)
              // pnt_extr≠'' 인 child row(투톤/서페이서) 단독 삭제 시에는 cascade 제외
              const deletedPaynos = new Set(
                rows
                  .filter(
                    (r) =>
                      seqSet.has(r.estb_orgseqno) &&
                      r.workcode === "P" &&
                      (r.paykind === "6" || r.paykind === "4") &&
                      r.subpayno !== "99990" &&
                      r.subpayno !== "99991" &&
                      String(r.pnt_extr ?? "") === ""
                  )
                  .map((r) => r.payno)
              );
              // 동일 payno + pnt_extr≠'' 인 연동 row 도 삭제 대상에 추가
              if (deletedPaynos.size > 0) {
                rows
                  .filter(
                    (r) =>
                      deletedPaynos.has(r.payno) &&
                      String(r.pnt_extr ?? "") !== ""
                  )
                  .forEach((r) => seqSet.add(r.estb_orgseqno));
              }

              // 삭제 후 남을 일반 도장 row 여부 확인
              const remaining = rows.filter((r) => !seqSet.has(r.estb_orgseqno));
              const hasPaintLeft = remaining.some(
                (r) =>
                  r.workcode === "P" &&
                  (r.paykind === "6" || r.paykind === "4") &&
                  r.subpayno !== "99990" &&
                  r.subpayno !== "99991"
              );
              // 남은 도장 row 없으면 특수행(99990/99991)도 삭제 대상에 추가
              if (!hasPaintLeft) {
                rows
                  .filter((r) => r.subpayno === "99990" || r.subpayno === "99991")
                  .forEach((r) => seqSet.add(r.estb_orgseqno));
              }

              await deleteBySeqs(est_serial, [...seqSet]);
              setRows((prev) =>
                prev
                  .filter((r) => !seqSet.has(r.estb_orgseqno))
                  .map((r, i) => ({ ...r, estb_seqno: i + 1 }))
              );
              setSelectedOrgSeq(null);
              setSelectedOrgSeqs(new Set());
            }
          } catch {
            // apiOk 내부에서 alert 처리
          }
          setPendingDelete(null);
        }}
      />

    </div>
  );
}
