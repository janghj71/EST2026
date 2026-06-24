// src/pages/estimate/SharedEstimateModal.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Sparkles, X, Search, Loader2 } from "lucide-react";

import FixedHeadTable from "../../components/FixedHeadTable";
import TableLoadingOverlay from "../../components/TableLoadingOverlay";
import { useEstimate } from "../../hooks/useEstimate";
import { useAlert } from "../../alerts/useAlert";
import { formatNumber } from "../../utils/numberFormat";

// est_serial 중복 제거 (같은 키가 두 번 오면 React 키 충돌 → 필터 오작동)
const dedup = (rows) => {
  const seen = new Set();
  return rows.filter((r) => {
    const key = `${r.comcode}|${r.est_serial}|${r.sharekind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ── seccode 순서 기준 정렬 (SQL CASE WHEN 순서와 동일) ───────
const SCOPE_ORDER = [
  "앞범퍼","엔진","미션","흡기","배기","일반","후드","헤드램프",
  "앞펜더","앞패널","휠하우스","카울&대쉬","앞서스펜션","서브프레임",
  "앞필러","앞도어","뒤도어","센터필러","사이드스텝","사이드프레임",
  "루프","크러쉬패드","콘솔","스티어링","시트","바닥패널","연료탱크",
  "뒷범퍼","트렁크리드","뒤펜더","패키지트레이","뒤사이드멤버","트렁크바닥","뒤서스펜션",
];

// ── 목록 A 컬럼 ──────────────────────────────────────────────
const COLS_A = [
  { key: "carname",   title: "차량명",   width: "100px" },
  { key: "acc_scope", title: "견적부위", width: "400px" },
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
  const [selectedCarname, setSelectedCarname] = useState(null);
  const [selectedScopes, setSelectedScopes] = useState(new Set()); // 빈 Set = 전체
  const [loadingB,      setLoadingB]      = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const { fetchSharedEstimates, fetchDetails, fetchAosSharedDetails } = useEstimate();
  const alert = useAlert();

  // ── 중복 제거 차량명 목록 ─────────────────────────────────────
  const carnameOptions = useMemo(() => {
    const seen = new Set();
    return listARows
      .map((r) => r.carname)
      .filter((n) => { if (!n || seen.has(n)) return false; seen.add(n); return true; })
      .sort((a, b) => a.localeCompare(b, 'ko'));
  }, [listARows]);

  // ── listARows 변경 시 첫 번째 차량명 자동 선택 ───────────────
  useEffect(() => {
    setSelectedCarname(carnameOptions[0] ?? null);
    setSelectedScopes(new Set());
  }, [carnameOptions]);

  // ── acc_scope 파싱 → 필터 버튼 옵션 (선택된 차량명 기준) ─────
  const scopeOptions = useMemo(() => {
    const set = new Set();
    listARows
      .filter((r) => !selectedCarname || r.carname === selectedCarname)
      .forEach((r) => {
        if (r.acc_scope) {
          r.acc_scope.split(",").forEach((s) => {
            const t = s.trim();
            if (t) set.add(t);
          });
        }
      });
    return [...set].sort((a, b) => {
      const ai = SCOPE_ORDER.indexOf(a);
      const bi = SCOPE_ORDER.indexOf(b);
      const an = ai === -1 ? 999 : ai;
      const bn = bi === -1 ? 999 : bi;
      return an - bn;
    });
  }, [listARows, selectedCarname]);

  // ── 필터 적용 rows (차량명 → 사고부위 순) ────────────────────
  const filteredARows = useMemo(() => {
    let rows = selectedCarname
      ? listARows.filter((r) => r.carname === selectedCarname)
      : listARows;
    if (selectedScopes.size > 0) {
      rows = rows.filter((r) => {
        const parts = r.acc_scope?.split(",").map((s) => s.trim()) ?? [];
        return [...selectedScopes].every((s) => parts.includes(s));
      });
    }
    return rows;
  }, [listARows, selectedCarname, selectedScopes]);

  // ── 목록 B 조회 — 로컬 로딩(전체 화면 깜박임 없음) ────────
  const loadDetailFor = useCallback(async (row) => {
    if (!row) return;
    setSelectedA(row);
    setListBRows([]);
    setLoadingB(true);
    const json = row.sharekind === 'A'
      ? await fetchAosSharedDetails({ est_serial: row.est_serial, share_comcode: row.comcode })
      : await fetchDetails(row.est_serial);
    if (String(json?.result) === 'false') {
      if (json?.msg !== 'aborted') {
        alert.error(`견적 상세 조회 오류\n${json?.msg ?? '요청 실패'}`);
      }
    } else {
      let dataset = json?.dataset ?? [];
      if (row.sharekind === 'A') {
        const EXCLUDE_WORKCODES = new Set(['T', 'G', 'W']);
        dataset = dataset.filter((r) => {
          if (r.workcode === '' && Number(r.partsum) <= 100) return false;
          if (EXCLUDE_WORKCODES.has(r.workcode)) return false;
          if ((r.payname ?? '').includes('액세서리')) return false;
          return true;
        });
      }
      setListBRows(dataset);
    }
    setLoadingB(false);
  }, [fetchDetails, fetchAosSharedDetails]);

  // ── 목록 A 조회 ──────────────────────────────────────────────
  const runSearch = useCallback(async () => {
    setListARows([]);
    setSelectedA(null);
    setListBRows([]);
    setSelectedCarname(null);
    setSelectedScopes(new Set());
    setLoadingSearch(true);
    const json = await fetchSharedEstimates({
      est_serial,
      isestopen: "1",
      findtext: searchText,
    });
    if (String(json?.result) === 'false') {
      alert.error(`견적 목록 조회 오류\n${json?.msg ?? '요청 실패'}`);
    } else {
      const rows = dedup(json?.dataset ?? []);
      setListARows(rows);
      if (rows.length > 0) await loadDetailFor(rows[0]);
    }
    setLoadingSearch(false);
  }, [searchText, est_serial, fetchSharedEstimates, loadDetailFor]);

  // 모달 열릴 때 초기 조회
  useEffect(() => {
    if (!open) return;
    setSearchText("");
    setListARows([]);
    setListBRows([]);
    setSelectedA(null);
    setSelectedCarname(null);
    setSelectedScopes(new Set());
    const init = async () => {
      setLoadingSearch(true);
      const json = await fetchSharedEstimates({ est_serial, isestopen: "1" });
      if (String(json?.result) === 'false') {
        alert.error(`견적 목록 조회 오류\n${json?.msg ?? '요청 실패'}`);
      } else {
        const rows = dedup(json?.dataset ?? []);
        setListARows(rows);
        if (rows.length > 0) await loadDetailFor(rows[0]);
      }
      setLoadingSearch(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── 필터 버튼 변경 시 첫 번째 Row 자동 선택 ─────────────────
  useEffect(() => {
    if (filteredARows.length > 0) {
      loadDetailFor(filteredARows[0]);
    } else {
      setSelectedA(null);
      setListBRows([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScopes, selectedCarname]);

  // ── 목록 A 행 클릭 → B 조회 ───────────────────────────────
  const handleSelectA = useCallback(async (row) => {
    await loadDetailFor(row);
  }, [loadDetailFor]);

  // ── [선택] ─────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!selectedA) return;
    onSelect?.(listBRows, selectedA);
    onClose?.();
  }, [selectedA, listBRows, onSelect, onClose]);

  if (!open) return null;

  const selectedText = selectedA
    ? `${selectedA.carname}  |  ${selectedA.acc_scope}  `   //|  ${formatNumber(selectedA.saletotal)}원
    : "-";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
      <div className="w-[1100px] max-h-[96vh] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col">

        {/* ── 헤더 ── */}
        <header className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="ml-2 text-base font-semibold text-zinc-900">AI 견적</span>
          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* ── 바디: 왼쪽 필터 패널 + 오른쪽 콘텐츠 ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── 왼쪽 필터 패널 ── */}
          <div className="w-[200px] shrink-0 border-r border-zinc-200 bg-zinc-50 flex flex-col">

            {/* 차량명 — 고정 높이 + 내부 스크롤 */}
            {carnameOptions.length > 0 && (
              <div className="shrink-0 border-b border-zinc-200 py-3 px-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1 mb-2">차량명</div>
                <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                  {carnameOptions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setSelectedCarname(name); setSelectedScopes(new Set()); }}
                      className={`py-1.5 px-2 rounded-md text-xs font-semibold border transition text-left break-keep leading-tight
                        ${selectedCarname === name
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 사고부위 — 나머지 공간 + 내부 스크롤 */}
            <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1 mb-2">사고부위</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedScopes(new Set())}
                  className={`col-span-2 py-1.5 rounded-md text-xs font-semibold border transition text-center truncate
                    ${selectedScopes.size === 0
                      ? "bg-orange-100 text-orange-700 border-orange-300"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"}`}
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
                    className={`py-1.5 rounded-md text-xs font-semibold border transition text-center truncate
                      ${selectedScopes.has(opt)
                        ? "bg-orange-100 text-orange-700 border-orange-300"
                        : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── 오른쪽 콘텐츠 ── */}
          <div className="flex flex-col flex-1 min-w-0">

            {/* ── 검색 ── */}
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 shrink-0">
              {/* <span className="text-sm text-zinc-600 shrink-0">차량명</span> */}
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !loadingSearch) runSearch(); }}
                placeholder="차량명 입력"
                disabled={loadingSearch}
                className="h-9 w-[350px] rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
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

            {/* ── 목록 A ── */}
            <div className="px-4 pt-3">
              <div className="relative rounded-md border border-zinc-200 overflow-hidden" style={{ height: 360 }}>
                <TableLoadingOverlay loading={loadingSearch} />
                <FixedHeadTable
                  columns={COLS_A}
                  rows={filteredARows}
                  rowKey={(r) => `${r.comcode}|${r.est_serial}|${r.sharekind}`}
                  rowSize="sm"
                  selectedKey={selectedA ? `${selectedA.comcode}|${selectedA.est_serial}|${selectedA.sharekind}` : null}
                  onRowClick={handleSelectA}
                  emptyText="데이터가 없습니다."
                />
              </div>
            </div>

            {/* ── 목록 B ── */}
            <div className="px-4 pt-3 pb-3">
              <div className="relative rounded-md border border-zinc-200 overflow-hidden" style={{ height: 380 }}>
                <TableLoadingOverlay loading={loadingB} />
                <FixedHeadTable
                  columns={COLS_B}
                  rows={listBRows}
                  rowKey={(_, i) => i}
                  rowSize="sm"
                  emptyText={
                    loadingB  ? "조회 중..." :
                    selectedA ? "데이터가 없습니다." :
                    "위 목록에서 견적을 선택하세요."
                  }
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="border-t border-zinc-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="text-sm text-zinc-600 flex-1 min-w-0">
            <div className="truncate">선택된 항목: <span className="font-semibold text-zinc-900">{selectedText}</span></div>
            {listBRows.length > 0 && (
              <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                <span>공임합계: <span className="font-semibold text-zinc-800">{formatNumber(listBRows.reduce((s, r) => s + (Number(r.paysum) || 0), 0))}</span></span>
                <span>부품합계: <span className="font-semibold text-zinc-800">{formatNumber(listBRows.reduce((s, r) => s + (Number(r.partsum) || 0), 0))}</span></span>
              </div>
            )}
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
