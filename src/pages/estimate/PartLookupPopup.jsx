// src/pages/estimate/PartLookupPopup.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { X, Search } from "lucide-react";
import { formatNumber } from "../../utils/numberFormat";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";

function makeDemoRows() {
  return [
    { cdptno: "865403T000", pnlgkr: "카바 전범퍼", itpric: 121000 },
    { cdptno: "865313T000", pnlgkr: "그릴 어셈블리", itpric: 98000 },
    { cdptno: "924013T000", pnlgkr: "헤드램프(좌)", itpric: 265000 },
    { cdptno: "924023T000", pnlgkr: "헤드램프(우)", itpric: 265000 },
    { cdptno: "863503T000", pnlgkr: "엠블럼", itpric: 18000 },
  ];
}

export default function PartLookupPopup() {
  const snapshotCtx = useUrlContextSnapshot({
    storageKey: "PART_LOOKUP_CTX",
    keys: ["est_serial", "carno"],
    cleanPath: "/part-lookup",
  });

  const [ctxOverride, setCtxOverride] = useState({});
  const ctx = useMemo(() => {
    return {
      ...(snapshotCtx || {}),
      ...(ctxOverride || {}),
    };
  }, [snapshotCtx, ctxOverride]);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const rows = useMemo(() => makeDemoRows(), []);
  const [selectedId, setSelectedId] = useState(null);

  // ctx 수신 (케미칼 팝업과 동일한 패턴)
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (type !== "PART_LOOKUP_SET_CTX") return;
      setCtxOverride((prev) => ({ ...prev, ...(payload || {}) }));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);


  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const a = String(r.cdptno ?? "").toLowerCase();
      const b = String(r.pnlgkr ?? "").toLowerCase();
      return a.includes(s) || b.includes(s);
    });
  }, [rows, q]);

  const effectiveSelectedId = useMemo(() => {
    if (filtered.length === 0) return null;
    if (!selectedId) return filtered[0].cdptno;
    if (!filtered.some((r) => r.cdptno === selectedId)) return filtered[0].cdptno;
    return selectedId;
  }, [filtered, selectedId]);


  const columns = useMemo(
    () => [
      {
        key: "cdptno",
        title: "부품코드",
        width: "25%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.cdptno}>
            {row.cdptno}
          </div>
        ),
      },
      {
        key: "pnlgkr",
        title: "부품명",
        width: "55%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.pnlgkr}>
            {row.pnlgkr}
          </div>
        ),
      },
      {
        key: "itpric",
        title: "판매단가",
        width: "20%",
        align: "right",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-end tabular-nums pr-1">
            {formatNumber(row.itpric)}
          </div>
        ),
      },
    ],
    []
  );

  const close = () => window.close();

  const onSearch = useCallback(() => {
    setQ(qInput);
  }, [qInput]);

  const pickRow = (r) => {
    try {
      window.opener?.postMessage(
        { type: "PART_LOOKUP_PICK", payload: r },
        window.location.origin
      );
    } catch { /* empty */ }
    window.close();
  };

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      {/* 상단 타이틀 + 닫기 */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200">
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-zinc-900">부품조회</div>
            <div className="mt-1 text-sm text-zinc-500">
              견적번호:{" "}
              <span className="text-zinc-900 font-semibold">{ctx?.est_serial || "-"}</span>
              <span className="mx-2 text-zinc-300">/</span>
              차량번호:{" "}
              <span className="text-zinc-900 font-semibold">{ctx?.carno || "-"}</span>
            </div>
          </div>

          <button
            type="button"
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            onClick={close}
          >
            <X className="h-4 w-4" />
            닫기
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
              placeholder="부품코드 / 부품명 검색"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
            />
          </div>

          <button
            type="button"
            className="h-10 rounded-md border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={onSearch}
          >
            검색
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="px-4 py-3 min-h-0 flex-1 flex flex-col">
        <div className="min-h-0 flex-1 rounded-md border border-zinc-200 bg-white overflow-hidden">
          <FixedHeadTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.cdptno}
            selectedKey={effectiveSelectedId}
            onRowClick={(r) => setSelectedId(r.cdptno)}
            onRowDoubleClick={(r) => pickRow(r)}
            rowSize="sm"
          />
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          * 더블클릭하면 선택 후 자동으로 닫힙니다.
        </div>
      </div>
    </div>
  );
}
