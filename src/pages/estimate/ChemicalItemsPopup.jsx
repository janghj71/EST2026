// src/pages/estimate/ChemicalItemsPopup.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { Search, X } from "lucide-react";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";

/**
 * ChemicalItemsPage.jsx 기반(필드 매핑 동일)
 * 부품코드 : material_cd
 * 품목 : material_nm
 * 단위 : unit
 * 단가 : price
 * 작업시간 : hour2
 * 비고 : descr
 */

function makeDemoRows() {
  // 기존 ChemicalItemsPage도 demo였으므로 일단 동일하게 유지
  return [
    { material_cd: "744475", material_nm: "폴리우레탄 실리콘 310ml", unit: "개", price: 1000, hour2: 0.55, descr: "차체밀봉(방음/방청)" },
    { material_cd: "286272", material_nm: "멀티 실러드 300ml(MS 9320 회색/검정)", unit: "개", price: 50000, hour2: 0.45, descr: "차체밀봉(방음/방청/언더코팅)" },
    { material_cd: "286273", material_nm: "파워 실러드 300ml(MS 9320 회색/검정)", unit: "개", price: 0, hour2: 0.45, descr: "차체밀봉(방음/방청/방진)" },
    { material_cd: "794224", material_nm: "캐비티 이너왁스 500ml(WX215)", unit: "개", price: 12000, hour2: 0.45, descr: "차체부식방지" },
    { material_cd: "739358", material_nm: "캐비티 이너왁스 1ℓ(350-1리터)", unit: "개", price: 0, hour2: 0.65, descr: "차체부식방지" },
  ];
}

function fmtMoney(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString("ko-KR");
}

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

  const rows = useMemo(() => makeDemoRows(), []);
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
    if (!s) return rows;
    return rows.filter((r) => (
      String(r.material_cd ?? "").toLowerCase().includes(s) ||
      String(r.material_nm ?? "").toLowerCase().includes(s) ||
      String(r.descr ?? "").toLowerCase().includes(s)
    ));
  }, [rows, q]);


  const effectiveSelectedId = useMemo(() => {
    if (filtered.length === 0) return null;
    // 아직 아무것도 선택 안 했거나, 필터로 인해 선택이 사라졌으면 첫 행을 선택된 것으로 "간주"
    if (!selectedId) return filtered[0].material_cd;
    if (!filtered.some((r) => r.material_cd === selectedId)) return filtered[0].material_cd;
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
      window.close(); // ✅ 도장항목 팝업처럼 선택하면 닫기
    } catch {
      // ignore
    }
  }, [ctx]);

  const moveSel = useCallback((dir) => {
    if (filtered.length === 0) return;
    const currentId = effectiveSelectedId ?? filtered[0].material_cd;
    const idx = filtered.findIndex((r) => r.material_cd === currentId);
    const nextIdx = Math.min(Math.max((idx < 0 ? 0 : idx) + dir, 0), filtered.length - 1);
    setSelectedId(filtered[nextIdx].material_cd);
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
      const row = filtered.find((r) => r.material_cd === id);
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
          {fmtMoney(row.price)}
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
              견적번호: <span className="text-zinc-900 font-semibold">{ctx?.est_serial || "-"}</span>
              <span className="mx-2 text-zinc-300">/</span>
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
        <div className="h-full rounded-md border border-zinc-200 bg-white overflow-hidden">
          <FixedHeadTable
            columns={columns}
            rows={filtered}
            rowSize="sm"
            rowKey={(row) => row.material_cd}
            selectedKey={effectiveSelectedId}  
            onRowClick={(row) => setSelectedId(row.material_cd)}
            onRowDoubleClick={(row) => pick(row)}
            emptyText="케미칼 항목이 없습니다."
          />
        </div>
      </div>
    </div>
  );
  

}
