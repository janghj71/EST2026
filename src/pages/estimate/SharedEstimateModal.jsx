// src/pages/estimate/SharedEstimateModal.jsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Share2, X, Search, Loader2 } from "lucide-react";

import FixedHeadTable from "../../components/FixedHeadTable";
import { useEstimate } from "../../hooks/useEstimate";
import { useLoading } from "../../loading/useLoading";
import { useAlert } from "../../alerts/useAlert";
import { formatNumber } from "../../utils/numberFormat";

// ── 목록 A 컬럼 ──────────────────────────────────────────────
const COLS_A = [
  { key: "carname",   title: "차량명",   width: "160px" },
  { key: "acc_scope", title: "견적부위", width: "340px" },
  {
    key: "saletotal",
    title: "견적금액",
    width: "110px",
    align: "right",
    render: (val) => formatNumber(val ?? 0),
  },
];

// ── 도장 부가정보 포맷 ────────────────────────────────────────
const PNT_M_MAP   = { "1": "유성", "2": "수성" };
const PNT_COT_MAP = { "1": "1코트", "2": "2코트", "4": "3코트", "5": "4코트" };

// ── 목록 B 컬럼 ──────────────────────────────────────────────
const COLS_B = [
  { key: "payname",      title: "작업내용", width: "200px" },
  {
    key: "workcodename",
    title: "작업",
    width: "80px",
    render: (val, row) => {
      const m = PNT_M_MAP[row.pnt_m];
      const c = PNT_COT_MAP[row.pntcot];
      const paint = [m, c].filter(Boolean).join("·");
      return (
        <span>
          {val}
          {paint && <span className="ml-1 text-[10px] text-zinc-400">{paint}</span>}
        </span>
      );
    },
  },
  { key: "qty",          title: "시간",     width: "70px", align: "right" },
  {
    key: "paysum",
    title: "공임액",
    width: "90px",
    align: "right",
    render: (val) => formatNumber(val ?? 0),
  },
  {
    key: "partsum",
    title: "부품액",
    width: "90px",
    align: "right",
    render: (val) => formatNumber(val ?? 0),
  },
  { key: "partCode", title: "부품코드", width: "120px" },
];

export default function SharedEstimateModal({
  open,
  onClose,
  est_serial,
  carname,
  onSelect,
}) {
  const [searchText, setSearchText]     = useState("");
  const [listARows, setListARows]       = useState([]);
  const [listBRows, setListBRows]       = useState([]);
  const [selectedA, setSelectedA]       = useState(null);
  const [selectedScopes, setSelectedScopes] = useState(new Set()); // 빈 Set = 전체
  const [loadingB,      setLoadingB]      = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const { fetchSharedEstimates, fetchDetails } = useEstimate();
  const { withLoading } = useLoading();
  const alert = useAlert();

  // ── acc_scope 파싱 → 필터 버튼 옵션 ─────────────────────────
  const scopeOptions = useMemo(() => {
    const set = new Set();
    listARows.forEach((r) => {
      if (r.acc_scope) {
        r.acc_scope.split(",").forEach((s) => {
          const t = s.trim();
          if (t) set.add(t);
        });
      }
    });
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [listARows]);

  // ── 필터 적용 rows ────────────────────────────────────────────
  const filteredARows = useMemo(() => {
    if (selectedScopes.size === 0) return listARows;
    return listARows.filter((r) => {
      const parts = r.acc_scope?.split(",").map((s) => s.trim()) ?? [];
      return [...selectedScopes].every((s) => parts.includes(s));
    });
  }, [listARows, selectedScopes]);

  // ── 목록 B 조회 — 로컬 로딩(전체 화면 깜박임 없음) ────────
  const loadDetailFor = useCallback(async (row) => {
    if (!row) return;
    setSelectedA(row);
    setListBRows([]);
    setLoadingB(true);
    try {
      const json = await fetchDetails(row.est_serial);
      setListBRows(json?.dataset ?? []);
    } catch (err) {
      alert.error(`견적 상세 조회 오류\n${err?.message ?? err}`);
    } finally {
      setLoadingB(false);
    }
  }, [fetchDetails]);

  // ── 목록 A 조회 — 버튼 로컬 로딩(깜박임 없음) ────────────
  const runSearch = useCallback(async () => {
    setListARows([]);
    setSelectedA(null);
    setListBRows([]);
    setLoadingSearch(true);
    try {
      const json = await fetchSharedEstimates({
        est_serial,
        isestopen: "1",
        findtext: searchText,
      });
      const rows = json?.dataset ?? [];
      setListARows(rows);
      setSelectedScopes(new Set());
      if (rows.length > 0) await loadDetailFor(rows[0]);
    } catch (err) {
      alert.error(`견적 목록 조회 오류\n${err?.message ?? err}`);
    } finally {
      setLoadingSearch(false);
    }
  }, [searchText, est_serial, fetchSharedEstimates, loadDetailFor, setLoadingSearch]);

  // 모달 열릴 때 초기 조회 — 전역 로딩 오버레이 사용
  useEffect(() => {
    if (!open) return;
    setSearchText("");
    setListARows([]);
    setListBRows([]);
    setSelectedA(null);
    const init = async () => {
      try {
        await withLoading(async () => {
          const json = await fetchSharedEstimates({ est_serial, isestopen: "1" });
          const rows = json?.dataset ?? [];
          setListARows(rows);
          setSelectedScopes(new Set());
          if (rows.length > 0) await loadDetailFor(rows[0]);
        }, "견적 목록 조회 중...");
      } catch (err) {
        alert.error(`견적 목록 조회 오류\n${err?.message ?? err}`);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── 필터 변경 시 첫 번째 Row 자동 선택 ──────────────────────
  useEffect(() => {
    if (filteredARows.length > 0) {
      loadDetailFor(filteredARows[0]);
    } else {
      setSelectedA(null);
      setListBRows([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScopes]);

  // ── 목록 A 행 클릭 → B 조회 ───────────────────────────────
  const handleSelectA = useCallback(async (row) => {
    await loadDetailFor(row);
  }, [loadDetailFor]);

  // ── [선택] ─────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!selectedA) return;
    onSelect?.(listBRows);
    onClose?.();
  }, [selectedA, listBRows, onSelect, onClose]);

  if (!open) return null;

  const selectedText = selectedA
    ? `${selectedA.carname}  |  ${selectedA.acc_scope}  |  ${formatNumber(selectedA.saletotal)}원`
    : "-";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
      <div className="w-[860px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col">

        {/* ── 헤더 ── */}
        <header className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
            <Share2 className="h-4 w-4" />
          </span>
          <span className="ml-2 text-base font-semibold text-zinc-900">공유견적</span>
          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* ── 검색 ── */}
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
          <span className="text-sm text-zinc-600 shrink-0">차량명</span>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loadingSearch) runSearch(); }}
            placeholder="차량명 입력"
            disabled={loadingSearch}
            className="h-9 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
          />
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={loadingSearch}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border text-sm font-semibold transition
              disabled:cursor-not-allowed
              bg-zinc-800 text-white border-zinc-800 hover:bg-zinc-700
              disabled:bg-zinc-300 disabled:border-zinc-300 disabled:text-white"
          >
            {loadingSearch
              ? <><Loader2 className="h-4 w-4 animate-spin" /> 조회 중...</>
              : <><Search className="h-4 w-4" /> 검색</>
            }
          </button>
        </div>

        {/* ── acc_scope 필터 버튼 ── */}
        {scopeOptions.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedScopes(new Set())}
              className={`w-[84px] py-1 rounded-full text-xs font-semibold border transition text-center truncate
                ${selectedScopes.size === 0
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"}`}
            >
              전체
            </button>
            {scopeOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setSelectedScopes((prev) => {
                    const next = new Set(prev);
                    next.has(opt) ? next.delete(opt) : next.add(opt);
                    return next;
                  })
                }
                className={`w-[84px] py-1 rounded-full text-xs font-semibold border transition text-center truncate
                  ${selectedScopes.has(opt)
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* ── 목록 A ── */}
        <div className="px-4 pt-3">
          {/* <div className="text-xs font-semibold text-zinc-500 mb-1">견적 목록</div> */}
          <div className="rounded-md border border-zinc-200 overflow-hidden" style={{ height: 240 }}>
            <FixedHeadTable
              columns={COLS_A}
              rows={filteredARows}
              rowKey={(r) => r.est_serial}
              rowSize="sm"
              selectedKey={selectedA?.est_serial}
              onRowClick={handleSelectA}
              emptyText="데이터가 없습니다."
            />
          </div>
        </div>

        {/* ── 목록 B ── */}
        <div className="px-4 pt-3 pb-3">
          <div className="rounded-md border border-zinc-200 overflow-hidden" style={{ height: 340 }}>
            <FixedHeadTable
              columns={COLS_B}
              rows={listBRows}
              rowKey={(_, i) => i}
              rowSize="sm"
              emptyText={
                loadingB        ? "조회 중..." :
                selectedA       ? "데이터가 없습니다." :
                "위 목록에서 견적을 선택하세요."
              }
            />
          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="border-t border-zinc-200 px-4 py-3 flex items-center gap-3">
          <div className="text-sm text-zinc-600 flex-1 min-w-0 truncate">
            선택된 항목: <span className="font-semibold text-zinc-900">{selectedText}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!selectedA}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleConfirm}
            >
              선택
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
