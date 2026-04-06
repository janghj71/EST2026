// src/pages/estimate/EstimateEditPage.jsx
import React, { useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAlert } from "../../alerts";

import EstimateHeaderBar from "./EstimateHeaderBar";
import EstimateReception from "./EstimateReception";
import EstimateSidePanel from "./EstimateSidePanel";
import EstimateItemsTable from "./EstimateItemsTable";

import AlertModal from "../../components/AlertModal";
import { openCenteredWindow } from "../../utils/popup";
import { formatNumber } from "../../utils/numberFormat";
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

  const { fetchMasterById, fetchDetails } = useEstimate();
  const { save, saving } = useMasterEstimateSave();
  const { saveClaim } = useEstimateClaimSave();
  const { fetchClaims } = useEstimateClaims();
  const { error: alertError } = useAlert();
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

  // render phase 외부(commit 후)에서 ref 동기화 — "Cannot access refs during render" 방지
  useLayoutEffect(() => {
    wrk34CodesRef.current    = wrk34Codes;
    masterRef.current        = master;
    rowsRef.current          = rows;
    laborSettingsRef.current = laborSettings;
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
  const [laborOpen, setLaborOpen] = useState(false);

  const { deleteBySeqs, deleteAll } = useEstimateDetailDelete();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // null | { type:"all" } | { type:"selected", orgSeqs:string[] }
  const [selectedOrgSeq, setSelectedOrgSeq] = useState(null);
  const [selectedOrgSeqs, setSelectedOrgSeqs] = useState(new Set());

  const laborWinRef = useRef(null);
  const [laborWinOpen, setLaborWinOpen] = useState(false);
  const paintWinRef = useRef(null);
  const chemicalWinRef = useRef(null);
  const partLookupWinRef = useRef(null);

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

    // 이미 열려 있으면 재사용 + ctx만 갱신
    if (laborWinRef.current && !laborWinRef.current.closed) {
      try {
        laborWinRef.current.focus();
        laborWinRef.current.postMessage({ type: "LABOR_ITEMS_SET_CTX", payload }, window.location.origin);
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
        }
      } catch { /* empty */ }
    }, 200);
  
    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "LABOR_ITEMS_SET_CTX", payload }, window.location.origin);
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

    const safePntM = pnt_m === 1 || pnt_m === 2 ? pnt_m : 2;

    const url =
      `/paint-items?est_serial=${encodeURIComponent(estSerial)}` +
      `&carno=${encodeURIComponent(carno)}` +
      `&pntcot_code=${encodeURIComponent(pntcot_code)}`+
      `&pnt_m=${encodeURIComponent(safePntM)}`;

    const payload = {
      est_serial: estSerial,
      carno,
      pntcot_code,
      pnt_m: safePntM,
    };

    // 이미 열려 있으면 재사용 + ctx만 갱신
    if (paintWinRef.current && !paintWinRef.current.closed) {
      try {
        paintWinRef.current.focus();
        paintWinRef.current.postMessage({ type: "PAINT_ITEMS_SET_CTX", payload }, window.location.origin);
        registerChildWin(paintWinRef.current);
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

    // 2회 전송(팝업 초기 렌더 타이밍 대비)
    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "PAINT_ITEMS_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */ }
    }, 200);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "PAINT_ITEMS_SET_CTX", payload }, window.location.origin);
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
    const carno = master?.carno || "";
  
    const url =
      `/part-lookup?est_serial=${encodeURIComponent(estSerial)}` +
      `&carno=${encodeURIComponent(carno)}`;
  
    const payload = { est_serial: estSerial, carno };
  
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

        // 3. 새 row 생성 — 임시 ID로 key 중복 방지
        const comcode = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";
        const pkStr = String(itemPaykind || "4");
        const pkLabel = { "1": "주체", "3": "부품", "4": "#공임", "5": "#부품", "6": "도장" }[pkStr] ?? "";

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
          paysum:         "0",
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
        recalcPaysum();

        // 5. 서버 저장 — toApiRow에서 "_new_" prefix → null 변환
        //    응답 newserial로 estb_orgseqno 교체 (saveDetail 내부)
        const _row = newRow;  // closure 캡처
        saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_row));
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

        // 3. 새 row 생성
        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";
        const pkStr     = String(paykind || "6");
        const pkLabel   = { "1": "주체", "3": "부품", "4": "#공임", "5": "#부품", "6": "도장" }[pkStr] ?? "";

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
          paysum:         "0",
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
            const qty = String(Number(tbEntry.def_value ?? 0) / 100);
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
              paysum:         "0",
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
        recalcPaysum();

        // 6. 서버 저장 (직렬 큐)
        const _row = newRow;
        saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_row));
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

        // 2. 견적내역 동일 payno workcode 로 coatKind 결정
        const sameRows = currentRows.filter((r) => String(r.payno) === String(payno));
        let coatKind = selectedKind ?? "swap";
        if (sameRows.some((r) => r.workcode === "X")) {
          coatKind = "swap";
        } else if (sameRows.some((r) => r.workcode === "B" || r.workcode === "S")) {
          coatKind = "outer";
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
        let insertIdx = currentRows.length;
        for (let i = currentRows.length - 1; i >= 0; i--) {
          if (String(currentRows[i].payno) === String(payno)) { insertIdx = i + 1; break; }
        }

        const comcode   = masterRef.current?.comcode ?? getComcode();
        const estSerial = masterRef.current?.est_serial ?? est_serial ?? "";

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
          paysum:         "0",
          part_makercode: "",
          state,
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

        // 5. 범퍼 자동 추가행: payname에 '범퍼' 포함 AND state='1'
        let extraRow = null;
        if (String(payname).includes("범퍼") && state === "1") {
          const tbEntry = (wrk34CodesRef.current ?? []).find((c) => c.value === "9");
          if (tbEntry) {
            const qty = String(Number(tbEntry.def_value ?? 0) / 100);
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
              paysum:         "0",
              part_makercode: "",
              state,
              statename:      "",
              pnt_extr:       "9",
              pnt_hour:       "0",
              pnt_part:       "0",
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
        recalcPaysum();

        const _row = newRow;
        saveQueueRef.current = saveQueueRef.current.then(() => saveDetail(_row));
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

      console.log(`[${type}]`, payload);
    };
  }, [est_serial, saveDetail, setRows, recalcPaysum, buildSpecialRows]);

  useEffect(() => {
    const handler = (e) => onMsgHandlerRef.current?.(e);
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  
  useEffect(() => {
    const onBeforeUnload = () => closeAllChildWins();
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

  const movePaintToBottom = useCallback(() => {
    const paint = rows.filter((r) => r.paykind === "6");
    const others = rows.filter((r) => r.paykind !== "6");
    setRows([...others, ...paint].map((r, i) => ({ ...r, estb_seqno: i + 1 })));
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
      setSettleRefreshKey((k) => k + 1);
    } catch (err) {
      alertError(err?.message ?? "저장 실패");
    }
  }, [rows, saveAllDetails, alertError]);

  // [목록] 버튼: 전체 저장 후 이동
  const handleClose = useCallback(async () => {
    try {
      await withLoading(async () => {
        // 1. 접수(마스터) 저장 — 항상
        await save(est_serial, master);
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
  }, [est_serial, master, rows, sidePanelOpen, sideActive,
      save, saveClaim, saveAllDetails, withLoading, navigate, alertError]);

  const handleSaveAndList = useCallback(async () => {
    // 저장 시 오더 재부여(델파이 방식)
    const seqReNumbered = rows.map((r, i) => ({ ...r, estb_seqno: i + 1 }));
    setRows(seqReNumbered);

    try {
      await save(est_serial, master);
    } catch (err) {
      alertError(err?.message ?? "저장 실패");
      return;
    }
    
  }, [rows, master, est_serial, save,alertError]);

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
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={handleClose}
              >
                목록
              </button>
            </div>
          </div>

          <div className="mt-2">
            <EstimateHeaderBar
              onSaveAndList={handleSaveAndList}
              saving={saving}
              onOpenLaborItems={openLaborItemsPopup}
              onOpenPaintItems={openPaintItemsPopup}
              onOpenChemicalItems={openChemicalItemsPopup}
              onOpenPartLookup={openPartLookupPopup}
            />
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}   
      <div className="app-container py-3 mb-16 min-h-0 flex-1 flex flex-col gap-3">
        <div className="min-h-0 flex-1 flex gap-3 min-w-0">
          {/* 좌: 접수 + 테이블 */}
          <div className="min-h-0 flex-1 flex flex-col gap-2 min-w-0">
            <EstimateReception master={master} setMaster={setMaster} laborWinOpen={laborWinOpen} />

            <div className="min-h-0 flex-1 flex flex-col min-w-0">
              <EstimateItemsTable
                rows={rows}
                setRows={setRows}
                selectedOrgSeq={selectedOrgSeq}
                setSelectedOrgSeq={setSelectedOrgSeq}
                sortMode={sortMode}
                setSortMode={setSortMode}
                // onAddLabor={() => addRowBelow("4")}
                // onAddPart={() => addRowBelow("5")}
                onDeleteSelected={handleDeleteSelected}
                onDeleteAll={handleDeleteAll}
                onMovePaintToBottom={movePaintToBottom}
                master={master}
                onInsertDetail={saveDetail}
                onValueCommit={handleValueCommit}
                selectedOrgSeqs={selectedOrgSeqs}
                setSelectedOrgSeqs={setSelectedOrgSeqs}
                workTimes={workTimes}
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
            laborWinOpen={laborWinOpen}
          />
        </div>
      </div>

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

              // 삭제 대상 row 의 payno 수집 (도장 row 한정)
              const deletedPaynos = new Set(
                rows
                  .filter(
                    (r) =>
                      seqSet.has(r.estb_orgseqno) &&
                      r.workcode === "P" &&
                      (r.paykind === "6" || r.paykind === "4") &&
                      r.subpayno !== "99990" &&
                      r.subpayno !== "99991"
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
