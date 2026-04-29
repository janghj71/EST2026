// src/pages/estimate/ChemicalItemsPopup.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import TableLoadingOverlay from "../../components/TableLoadingOverlay";
import { Search, X } from "lucide-react";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { useFetchMaterials } from "../../hooks/useChemicalItems";
import { formatMoney } from "../../utils/numberFormat";

/**
 * ChemicalItemsPage.jsx 기반(필드 매핑 동일)
 * 부품코드 : material_cd
 * 품목 : material_nm
 * 단위 : unit
 * 단가 : price
 * 작업시간 : hour2
 * 비고 : descr
 * key : material_seqno
 */

export default function ChemicalItemsPopup() {
  const snapshotCtx = useUrlContextSnapshot({
    storageKey: "CHEM_ITEMS_CTX",
    keys: ["est_serial", "carno"],
    cleanPath: "/chemical-items",
  });

  const [ctxOverride, setCtxOverride] = useState({});
  const ctx = useMemo(() => {
    return {
      ...(snapshotCtx || {}),
      ...(ctxOverride || {}),
    };
  }, [snapshotCtx, ctxOverride]);

  const { fetchMaterials } = useFetchMaterials();
  const [materials, setMaterials] = useState([]);
  const [matLoading, setMatLoading] = useState(false);

  useEffect(() => {
    setMatLoading(true);
    fetchMaterials({ material_gubun: "1" })
      .then((json) => {
        if (json?.result === "OK") setMaterials(json.dataset ?? []);
      })
      .catch(() => {})
      .finally(() => setMatLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // 부모창에서 ctx 갱신
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (type !== "CHEM_ITEMS_SET_CTX") return;
      setCtxOverride((prev) => ({ ...prev, ...(payload || {}) }));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return materials;
    return materials.filter((r) => (
      String(r.material_cd ?? "").toLowerCase().includes(s) ||
      String(r.material_nm ?? "").toLowerCase().includes(s) ||
      String(r.descr ?? "").toLowerCase().includes(s)
    ));
  }, [materials, q]);

  const effectiveSelectedId = useMemo(() => {
    if (filtered.length === 0) return null;
    if (!selectedId) return filtered[0].material_seqno;
    if (!filtered.some((r) => r.material_seqno === selectedId)) return filtered[0].material_seqno;
    return selectedId;
  }, [filtered, selectedId]);

  const close = () => window.close();

  const pick = useCallback((row) => {
    if (!window.opener || window.opener.closed) return;
    try {
      window.opener.postMessage(
        {
          type: "CHEM_ITEMS_PICK",
          payload: { ctx, item: row },
        },
        window.location.origin
      );
    } catch {
      // ignore
    }
  }, [ctx]);

  const moveSel = useCallback((dir) => {
    if (filtered.length === 0) return;
    const currentId = effectiveSelectedId ?? filtered[0].material_seqno;
    const idx = filtered.findIndex((r) => r.material_seqno === currentId);
    const nextIdx = Math.min(Math.max((idx < 0 ? 0 : idx) + dir, 0), filtered.length - 1);
    setSelectedId(filtered[nextIdx].material_seqno);
  }, [filtered, effectiveSelectedId]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSel(+1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSel(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const id = effectiveSelectedId;
      const row = filtered.find((r) => r.material_seqno === id);
      if (row) pick(row);
    }
  };

  const columns = useMemo(() => [
    {
      key: "material_cd",
      title: "부품번호",
      width: "12%",
      className: "px-2 py-0",
      render: (_val, row) => (
        <div className="h-8 flex items-center truncate" title={row.material_cd}>
          {row.material_cd}
        </div>
      ),
    },
    {
      key: "material_nm",
      title: "품목",
      width: "33%",
      className: "px-2 py-0",
      render: (_val, row) => (
        <div className="h-8 flex items-center truncate" title={row.material_nm}>
          {row.material_nm}
        </div>
      ),
    },
    {
      key: "unit",
      title: "단위",
      width: "8%",
      align: "center",
      className: "px-2 py-0",
      render: (_val, row) => (
        <div className="h-8 flex items-center justify-center truncate">
          {row.unit}
        </div>
      ),
    },
    {
      key: "price",
      title: "단가",
      width: "15%",
      align: "right",
      className: "px-2 py-0",
      render: (_val, row) => (
        <div className="h-8 flex items-center justify-end tabular-nums pr-1">
          {formatMoney(row.price)}
        </div>
      ),
    },
    {
      key: "hour2",
      title: "작업시간",
      width: "12%",
      align: "right",
      className: "px-2 py-0",
      render: (_val, row) => (
        <div className="h-8 flex items-center justify-end tabular-nums pr-1">
          {String(row.hour2 ?? "")}
        </div>
      ),
    },
    {
      key: "descr",
      title: "비고",
      width: "20%",
      className: "px-2 py-0",
      render: (_val, row) => (
        <div className="h-8 flex items-center truncate" title={row.descr}>
          {row.descr}
        </div>
      ),
    },
  ], []);

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden" onKeyDown={onKeyDown} tabIndex={-1}>
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200">
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-zinc-900">케미칼 항목</div>
            <div className="mt-1 text-sm text-zinc-500">
              {/* 견적번호: <span className="text-zinc-900 font-semibold">{ctx?.est_serial || "-"}</span>
              <span className="mx-2 text-zinc-300">/</span> */}
              차량번호: <span className="text-zinc-900 font-semibold">{ctx?.carno || "-"}</span>
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

      <div className="px-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
              placeholder="부품번호 / 품목 / 비고 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="min-h-0 flex-1 px-5 pb-5 pt-3">
        <div className="relative h-full rounded-md border border-zinc-200 bg-white overflow-hidden">
          <TableLoadingOverlay loading={matLoading} />
          <FixedHeadTable
            columns={columns}
            rows={filtered}
            rowSize="sm"
            rowKey={(row) => row.material_seqno}
            selectedKey={effectiveSelectedId}
            onRowClick={(row) => setSelectedId(row.material_seqno)}
            onRowDoubleClick={(row) => pick(row)}
            emptyText="케미칼 항목이 없습니다."
          />
        </div>
      </div>
    </div>
  );
}
