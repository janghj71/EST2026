// src/pages/estimate/EstimateEditPage.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
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

  // EstimateSidePanel 탭/열림 상태
  const [sideActive, setSideActive] = useState("labor");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [settleRefreshKey, setSettleRefreshKey] = useState(0);
  // 청구처 변경 여부 (변경 시에만 저장)
  const claimDirtyRef = useRef(false);

  // 최신 master를 stale closure 없이 접근하기 위한 ref
  const masterRef = useRef(master);
  masterRef.current = master;

  // 청구처 M/H 단가 변경(blur) 시 견적내역 paysum 일괄 재계산
  const recalcPaysum = useCallback(() => {
    const claim0 = masterRef.current?.claims?.[0];
    if (!claim0) return;
    setRows((prev) =>
      prev.map((r) => {
        if (!r.workcode || !r.qty) return r;
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

  const [sortMode, setSortMode] = useState("block");
  const [laborOpen, setLaborOpen] = useState(false);

  const { deleteBySeqs, deleteAll } = useEstimateDetailDelete();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // null | { type:"all" } | { type:"selected", orgSeqs:string[] }
  const [selectedOrgSeq, setSelectedOrgSeq] = useState(null);
  const [selectedOrgSeqs, setSelectedOrgSeqs] = useState(new Set());

  const laborWinRef = useRef(null);
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
  

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (
        type !== "LABOR_ITEMS_PICK" && 
        type !== "PAINT_ITEMS_PICK" && 
        type !== "CHEM_ITEMS_PICK" &&
        type !== "PART_LOOKUP_PICK" 

      ) return;
  
      // TODO: 여기서 payload를 rows에 반영(나중 단계)
      console.log(`[${type}]`, payload);
    };
  
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
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
  

  const selectedRow = useMemo(
    () => rows.find((r) => r.estb_orgseqno === selectedOrgSeq) ?? null,
    [rows, selectedOrgSeq]
  );


  const removeSelected = useCallback(() => {
    if (!selectedRow) return;
    const next = rows.filter((r) => r.estb_orgseqno !== selectedRow.estb_orgseqno);
    setRows(next.map((r, i) => ({ ...r, estb_seqno: i + 1 })));
    setSelectedOrgSeq(null);
  }, [rows, selectedRow]);

  const handleDeleteSelected = useCallback((orgSeqs) => {
    // orgSeqs: string[] (멀티선택 또는 단일선택 배열)
    if (!orgSeqs?.length) return;
    setPendingDelete({ type: "selected", orgSeqs });
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
            <EstimateReception master={master} setMaster={setMaster} />

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
            : `선택한 ${pendingDelete?.orgSeqs?.length ?? 1}개 항목을 삭제할까요?`
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
              await deleteBySeqs(est_serial, orgSeqs);
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
