// src/pages/ChemicalItemsPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import FixedHeadTable from "../components/FixedHeadTable";
import { Search, Save, RefreshCcw } from "lucide-react";

/**
 * 필드 매핑
 * 부품코드 : material_cd
 * 품목 : material_nm
 * 단위 : unit
 * 단가 : price   (편집)
 * 작업시간 : hour2 (편집)
 * 비고 : descr
 */

const CELL_INPUT_BASE =
  "h-8 w-full rounded-xs bg-transparent px-2 text-zinc-900 outline-none " +
  "focus:bg-white focus:ring-1 focus:ring-zinc-900/20 focus:border focus:border-zinc-300";

const CELL_WRAP = "h-[40px] flex items-center"; 


function makeDemoRows() {
  return [
    { material_cd: "744475", material_nm: "폴리우레탄 실리콘 310ml", unit: "개", price: 1000, hour2: 0.55, descr: "차체밀봉(방음/방청)" },
    { material_cd: "286272", material_nm: "멀티 실러드 300ml(MS 9320 회색/검정)", unit: "개", price: 50000, hour2: 0.45, descr: "차체밀봉(방음/방청/언더코팅)" },
    { material_cd: "286273", material_nm: "파워 실러드 300ml(MS 9320 회색/검정)", unit: "개", price: 0, hour2: 0.45, descr: "차체밀봉(방음/방청/방진)" },
    { material_cd: "794224", material_nm: "캐비티 이너왁스 500ml(WX215)", unit: "개", price: 12000, hour2: 0.45, descr: "차체부식방지" },
    { material_cd: "739358", material_nm: "캐비티 이너왁스 1ℓ(350-1리터)", unit: "개", price: 0, hour2: 0.65, descr: "차체부식방지" },
  ];
}

function onlyDigits(v) {
  return String(v ?? "").replace(/[^\d]/g, "");
}
function toNumberOrZero(v) {
  const s = onlyDigits(v);
  return s ? Number(s) : 0;
}
function fmtMoney(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString("ko-KR");
}

// hour2: 소수(최대 2자리)만 허용
function onlyHour(v) {
  const s = String(v ?? "").replace(/[^\d.]/g, "");
  const [a, b] = s.split(".");
  if (b == null) return a;
  return `${a}.${b.slice(0, 2)}`;
}
function toHourNumber(v) {
  const s = onlyHour(v);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function ChemicalItemsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // ✅ 변경 추적(단가/시간 둘 다)
  // key: material_cd, value: { price?, hour2? }
  const [dirtyMap, setDirtyMap] = useState(() => new Map());

  const priceRefs = useRef(new Map()); // material_cd -> input
  const hourRefs = useRef(new Map());  // material_cd -> input

  useEffect(() => {
    const data = makeDemoRows();
    setRows(data);
    setSelectedId(data[0]?.material_cd ?? null);
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

  const dirtyCount = dirtyMap.size;

  const patchDirty = useCallback((material_cd, patch) => {
    setDirtyMap((prev) => {
      const next = new Map(prev);
      const cur = next.get(material_cd) || {};
      next.set(material_cd, { ...cur, ...patch });
      return next;
    });
  }, []);

  const setCell = useCallback((material_cd, key, value) => {
    setRows((prev) =>
      prev.map((r) => (r.material_cd === material_cd ? { ...r, [key]: value } : r))
    );
    patchDirty(material_cd, { [key]: value });
  }, [patchDirty]);

  const focusPrice = useCallback((material_cd) => {
    const el = priceRefs.current.get(material_cd);
    if (el) { el.focus(); el.select?.(); }
  }, []);

  const focusHour = useCallback((material_cd) => {
    const el = hourRefs.current.get(material_cd);
    if (el) { el.focus(); el.select?.(); }
  }, []);

  // Enter: price -> hour2 -> 다음 row price
  // const moveNext = useCallback((material_cd, field) => {
  //   const idx = filtered.findIndex((r) => r.material_cd === material_cd);
  //   if (idx < 0) return;

  //   if (field === "price") {
  //     focusHour(material_cd);
  //     return;
  //   }

  //   // field === "hour2"
  //   const next = filtered[idx + 1];
  //   if (!next) return;
  //   setSelectedId(next.material_cd);
  //   requestAnimationFrame(() => focusPrice(next.material_cd));
  // }, [filtered, focusHour, focusPrice]);

  const moveByEnter = useCallback((material_cd, field, reverse = false) => {
    const idx = filtered.findIndex((r) => r.material_cd === material_cd);
    if (idx < 0) return;
  
    if (!reverse) {
      // ===== Enter =====
      if (field === "price") {
        focusHour(material_cd);
        return;
      }
      // field === "hour2"
      const next = filtered[idx + 1];
      if (!next) return;
      setSelectedId(next.material_cd);
      requestAnimationFrame(() => focusPrice(next.material_cd));
      return;
    }
  
    // ===== Shift + Enter =====
    if (field === "hour2") {
      focusPrice(material_cd);
      return;
    }
    // field === "price" -> 이전 row의 마지막 필드(hour2)로
    const prev = filtered[idx - 1];
    if (!prev) return;
    setSelectedId(prev.material_cd);
    requestAnimationFrame(() => focusHour(prev.material_cd));
  }, [filtered, focusHour, focusPrice]);

  const onSave = useCallback(async () => {
    if (dirtyMap.size === 0) return;

    const payload = Array.from(dirtyMap.entries()).map(([material_cd, changed]) => ({
      material_cd,
      ...changed,
    }));

    console.log("SAVE payload:", payload);

    // 저장 성공 가정
    setDirtyMap(new Map());
  }, [dirtyMap]);

  const onReload = useCallback(() => {
    const data = makeDemoRows();
    setRows(data);
    setDirtyMap(new Map());
    setSelectedId(data[0]?.material_cd ?? null);
  }, []);

  
  // 특정 필드로 포커스
  const focusField = useCallback((material_cd, field) => {
    if (field === "price") focusPrice(material_cd);
    else focusHour(material_cd);
  }, [focusPrice, focusHour]);

  // ↑↓: 같은 필드 유지하면서 행 이동
  const moveRowByArrow = useCallback((material_cd, field, dir) => {
    const idx = filtered.findIndex((r) => r.material_cd === material_cd);
    if (idx < 0) return;

    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= filtered.length) return;

    const next = filtered[nextIdx];
    setSelectedId(next.material_cd);
    requestAnimationFrame(() => focusField(next.material_cd, field));
  }, [filtered, focusField]);


  const columns = useMemo(
    () => [
      {
        key: "material_cd",
        title: "부품번호",
        width: "110px",
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
        width: "360px",
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
        width: "70px",
        align: "center",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-center truncate">{row.unit}</div>
        ),
      },
      {
        key: "price",
        title: "단가",
        width: "120px",
        align: "right",
        className: "px-2 py-0",
        render: (_val, row) => {
          const id = row.material_cd;
          const isSel = selectedId === id;
        
          return (
            <div className={CELL_WRAP + " justify-end"}>
              <input
                ref={(el) => {
                  if (el) priceRefs.current.set(id, el);
                  else priceRefs.current.delete(id);
                }}
                className={[
                  CELL_INPUT_BASE,
                  "text-right tabular-nums pr-1 -mr-1",   // 견적내역 느낌
                  "max-w-[110px]",                        // 너 기존 폭 유지
                  !isSel ? "pointer-events-none" : "",    // 선택행 아닐땐 클릭/편집 불가(원하면 제거 가능)
                ].join(" ")}
                inputMode="numeric"
                value={fmtMoney(row.price)}
                onFocus={() => setSelectedId(id)}
                onChange={(e) => setCell(id, "price", toNumberOrZero(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveRowByArrow(id, "price", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    moveByEnter(id, "price", e.shiftKey);   // Shift+Enter 지원
                  }
                }}
                
              />
            </div>
          );
        }


      },
      {
        key: "hour2",
        title: "작업시간",
        width: "90px",
        align: "right",
        className: "px-2 py-0",

        render: (_val, row) => {
          const id = row.material_cd;
          const isSel = selectedId === id;
        
          return (
            <div className={CELL_WRAP + " justify-end"}>
              <input
                ref={(el) => {
                  if (el) hourRefs.current.set(id, el);
                  else hourRefs.current.delete(id);
                }}
                className={[
                  CELL_INPUT_BASE,
                  "text-right tabular-nums pr-1 -mr-1",
                  "max-w-[80px]",
                  !isSel ? "pointer-events-none" : "",
                ].join(" ")}
                inputMode="decimal"
                value={String(row.hour2 ?? "")}
                onFocus={() => setSelectedId(id)}
                onChange={(e) => setCell(id, "hour2", toHourNumber(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveRowByArrow(id, "hour2", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    moveByEnter(id, "hour2", e.shiftKey);   // ✅ Shift+Enter 지원
                  }
                }}
                
              />
            </div>
          );
        }
        

      },
      {
        key: "descr",
        title: "비고",
        width: "260px",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.descr}>
            {row.descr}
          </div>
        ),
      },
    ],
    [moveByEnter, moveRowByArrow, setCell, selectedId]
  );


  return (
    <div className="h-full flex flex-col">
      {/* 1) 타이틀 (sticky) - 보험견적 화면과 동일 톤 */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur">
        <div className="border-b border-zinc-400">
          <div className="app-container py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900">케미칼 항목 설정</div>
                <div className="text-xs text-zinc-500">
                  단가 · 작업시간을 수정하고, 기타 정보는 제공값을 표시
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                케미칼
              </button>
            </div>
          </div>
        </div>
  
        {/* 2) 툴바(검색/새로고침/저장) - 타이틀 다음 라인 */}
        <div className="app-container py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="h-9 w-[320px] rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-gray-400"
                placeholder="부품번호 / 품목 / 비고 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={onReload}
              className="h-9 px-3 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              title="새로고침"
            >
              <RefreshCcw className="w-4 h-4" />
              새로고침
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={dirtyCount === 0}
              className={[
                "h-9 px-3 rounded-md text-sm font-semibold flex items-center gap-2",
                dirtyCount === 0
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800",
              ].join(" ")}
              title="저장"
            >
              <Save className="w-4 h-4" />
              저장{dirtyCount ? `(${dirtyCount})` : ""}
            </button>
          </div>
        </div>
        
      </div>
  
      {/* 3) 테이블 영역 */}
      <div className="app-container min-h-0 flex-1 py-4">
        <div className="h-full rounded-md border border-gray-200 bg-white overflow-hidden">
          <FixedHeadTable
            columns={columns}
            rows={filtered}
            rowSize="sm"
            rowKey={(row) => row.material_cd}
            selectedKey={selectedId}
            onRowClick={(row) => {
              setSelectedId(row.material_cd);
              requestAnimationFrame(() => focusPrice(row.material_cd));
            }}
            emptyText="케미칼 항목이 없습니다."
          />
        </div>
      </div>
    </div>
  );
  


}
