// src/pages/estimate/PartLookupPopup.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { X, Search } from "lucide-react";
import { formatNumber } from "../../utils/numberFormat";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { useFetchPartHistory, useFetchNeoPart } from "../../hooks/useChemicalItems";
import { getComcode } from "../../api/config";
import { useLoading } from "../../loading/useLoading";
import { useAlert } from "../../alerts/useAlert";

export default function PartLookupPopup() {
  const snapshotCtx = useUrlContextSnapshot({
    storageKey: "PART_LOOKUP_CTX",
    keys: ["est_serial", "carno", "comcode", "codecar"],
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

  const { fetchPartHistory } = useFetchPartHistory();
  const { fetchNeoPart }     = useFetchNeoPart();
  const { withLoading }      = useLoading();
  const { error: alertError } = useAlert();
  const [parts, setParts]       = useState([]);   // 사용자 이력
  const [neoParts, setNeoParts] = useState([]);   // 제작사 검색 결과
  const [searchMode, setSearchMode] = useState("user"); // "user" | "neo"
  const [selectedId, setSelectedId] = useState(null);

  // ctx 수신
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

  // API 호출
  useEffect(() => {
    const comcode = ctx?.comcode || getComcode();
    const carcode = ctx?.codecar || "";   // ctx key: codecar, API param: carcode
    if (!carcode) return;
    fetchPartHistory({ comcode, carcode })
      .then((json) => {
        if (json?.result === "OK") setParts(json.dataset ?? []);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.comcode, ctx?.codecar]);

  // searchMode에 따라 소스 분리: "user"=사용자 이력, "neo"=제작사 결과
  const filtered = useMemo(() => {
    const source = searchMode === "neo"
      ? neoParts.map((r) => ({ ...r, _gubun: "제작사" }))
      : parts.map((r)    => ({ ...r, _gubun: "사용자" }));
    const s = q.trim().toLowerCase();
    if (!s) return source;
    return source.filter((r) => {
      const a = String(r.part_makercode ?? "").toLowerCase();
      const b = String(r.payname ?? "").toLowerCase();
      return a.includes(s) || b.includes(s);
    });
  }, [searchMode, parts, neoParts, q]);

  const effectiveSelectedId = useMemo(() => {
    if (filtered.length === 0) return null;
    if (!selectedId) return filtered[0].part_makercode;
    if (!filtered.some((r) => r.part_makercode === selectedId)) return filtered[0].part_makercode;
    return selectedId;
  }, [filtered, selectedId]);

  const columns = useMemo(
    () => [
      {
        key: "_gubun",
        title: "구분",
        width: "10%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center text-zinc-500">{row._gubun || "사용자"}</div>
        ),
      },
      {
        key: "part_makercode",
        title: "부품코드",
        width: "20%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.part_makercode}>
            {row.part_makercode}
          </div>
        ),
      },
      {
        key: "payname",
        title: "부품명",
        width: "50%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.payname}>
            {row.payname}
          </div>
        ),
      },
      {
        key: "price",
        title: "판매단가",
        width: "20%",
        align: "right",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-end tabular-nums pr-1">
            {formatNumber(row.price)}
          </div>
        ),
      },
    ],
    []
  );

  const close = () => window.close();

  const onSearch = useCallback(() => {
    setSearchMode("user");
    setQ(qInput);
  }, [qInput]);

  const onNeoSearch = useCallback(async () => {
    const scdptno = qInput.trim();
    if (!scdptno) return;
    try {
      await withLoading(async () => {
        const json = await fetchNeoPart({ scdptno });
        if (json?.result === "OK") {
          // 응답 필드 매핑: cdptno→part_makercode, pnlgkr→payname, itpric→price
          const mapped = (json.epc_tepcdmpf ?? []).map((r) => ({
            part_makercode: r.cdptno  ?? "",
            payname:        r.pnlgkr  ?? "",
            price:          r.itpric  ?? "0",
          }));
          setNeoParts(mapped);
          setSearchMode("neo");
          setQ(scdptno);
        }
      });
    } catch (e) {
      alertError(e.message || "제작사 부품 검색 실패");
    }
  }, [qInput, fetchNeoPart, withLoading, alertError]);

  const pickRow = (r) => {
    try {
      window.opener?.postMessage(
        { type: "PART_LOOKUP_PICK", payload: r },
        window.location.origin
      );
    } catch { /* empty */ }
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

          <button
            type="button"
            className="h-10 rounded-md border border-blue-500 bg-blue-50 px-5 text-sm font-semibold text-blue-700 hover:bg-blue-100 whitespace-nowrap"
            onClick={onNeoSearch}
          >
            제작사 부품 검색
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="px-4 py-3 min-h-0 flex-1 flex flex-col">
        <div className="min-h-0 flex-1 rounded-md border border-zinc-200 bg-white overflow-hidden">
          <FixedHeadTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.part_makercode}
            selectedKey={effectiveSelectedId}
            onRowClick={(r) => setSelectedId(r.part_makercode)}
            onRowDoubleClick={(r) => pickRow(r)}
            rowSize="sm"
          />
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          * 더블클릭하면 견적에 부품이 추가됩니다.
        </div>
      </div>
    </div>
  );
}
