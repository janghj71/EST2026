// src/pages/estimate/PaintItemsPopup.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { X, Search } from "lucide-react";

function makeDemoRows() {
  const names = [
    "프런트 범퍼",
    "리어 범퍼",
    "프런트 펜더(좌)",
    "프런트 펜더(우)",
    "프런트 도어(좌)",
    "프런트 도어(우)",
    "리어 도어(좌)",
    "리어 도어(우)",
    "쿼터 패널(좌)",
    "쿼터 패널(우)",
    "본넷",
    "트렁크 리드",
    "루프",
    "사이드미러(좌)",
    "사이드미러(우)",
    "라디에이터 서포트",
    "헤드램프 가니쉬(좌)",
    "헤드램프 가니쉬(우)",
    "테일램프 가니쉬(좌)",
    "테일램프 가니쉬(우)",
  ];

  return names.map((payname, i) => {
    const payno = `P${String(i + 1).padStart(3, "0")}`;
    const baseM = 8000 + i * 700;
    const baseH = 0.25 + i * 0.03;
    const clampH = (x) => Math.round(Math.min(3.5, Math.max(0, x)) * 100) / 100;

    return {
      payno,
      pntcot: "2",
      pntcot_nm: "2코트",
      payname,

      // 유용성
      oilpnt_m: baseM + 2500,
      oilpnt_h: clampH(baseH + 0.12),
      oilpnt_mb: baseM + 2200,
      oilpnt_hb: clampH(baseH + 0.10),
      oilextr21_m: baseM - 800,
      oilextr21_h: clampH(baseH - 0.03),
      oilextr22_m: baseM + 4000,
      oilextr22_h: clampH(baseH + 0.18),

      // 수용성
      pnt_m: baseM + 1200,
      pnt_h: clampH(baseH + 0.06),
      pnt_mb: baseM + 900,
      pnt_hb: clampH(baseH + 0.05),
      extr21_m: baseM - 1400,
      extr21_h: clampH(baseH - 0.05),
      extr22_m: baseM + 2800,
      extr22_h: clampH(baseH + 0.14),
    };
  });
}

function fmtMoney(v) {
  const n = Number(v ?? 0);
  if (!n) return "";
  return n.toLocaleString();
}

function fmtHour(v) {
  const n = Number(v ?? 0);
  if (!n) return "";
  return n.toFixed(2);
}



function solventLabel(solvent) {
  return solvent === "oil" ? "유용성" : "수용성";
}

function solventFromPntM(pnt_m) {
  const n = Number(pnt_m);
  if (n === 1) return "oil"; // 유용성
  if (n === 2) return "pnt"; // 수용성
  return ""; // unknown
}


// solvent: "oil" | "pnt"
function getPaintMH(row, solvent, kind) {
  const map = {
    oil: {
      swap: { m: "oilpnt_m", h: "oilpnt_h" },
      outer: { m: "oilpnt_mb", h: "oilpnt_hb" },
      surface: { m: "oilextr21_m", h: "oilextr21_h" },
      front: { m: "oilextr22_m", h: "oilextr22_h" },
    },
    pnt: {
      swap: { m: "pnt_m", h: "pnt_h" },
      outer: { m: "pnt_mb", h: "pnt_hb" },
      surface: { m: "extr21_m", h: "extr21_h" },
      front: { m: "extr22_m", h: "extr22_h" },
    },
  };

  const f = map[solvent]?.[kind];
  if (!f) return { m: 0, h: 0 };
  return {
    m: Number(row?.[f.m] ?? 0),
    h: Number(row?.[f.h] ?? 0),
  };
}

function TwoLineTitle({ top, bottom }) {
  return (
    <div className="leading-tight">
      <div className="text-[12px] font-semibold text-zinc-800">{top}</div>
      <div className="text-[11px] text-zinc-500">{bottom}</div>
    </div>
  );
}

export default function PaintItemsPopup() {
  const ctx = useUrlContextSnapshot({
    storageKey: "PaintItemsCtx",
    keys: ["est_serial", "carno", "carname", "pntcot_code", "pnt_m"],
    cleanPath: "/paint-items",
  });

  const hydratedRef = useRef(false);

  const [estSerial, setEstSerial] = useState(() => ctx.est_serial || "");
  const [carNo, setCarNo] = useState(() => ctx.carno || "");
  const [carName, setCarName] = useState(() => ctx.carname || "");

  // 도장코트: master.pntcot_code
  const [pntcotCode, setPntcotCode] = useState(() => ctx.pntcot_code || "");

  // 도장도료: pnt_m (표시만)
  const [paintSolvent, setPaintSolvent] = useState(() => {
    return solventFromPntM(ctx.pnt_m) || "pnt"; 

  });

  // ---- 팝업 ctx 저장(F5) + 최초 hydration ----
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "PaintItemsCtx",
        JSON.stringify({
          est_serial: ctx.est_serial || "",
          carno: ctx.carno || "",
          carname: ctx.carname || "",
          pntcot_code: ctx.pntcot_code || "",
          pnt_m: ctx.pnt_m ?? "",
        })
      );
    } catch { /* empty */ }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx.est_serial && !estSerial) setEstSerial(ctx.est_serial);
    if (ctx.carno && !carNo) setCarNo(ctx.carno);
    if (ctx.carname && !carName) setCarName(ctx.carname);
    if (ctx.pntcot_code && !pntcotCode) setPntcotCode(ctx.pntcot_code);
    
    const byPntM = solventFromPntM(ctx.pnt_m);
    if (byPntM) setPaintSolvent(byPntM);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.est_serial, ctx.carno, ctx.carname, ctx.pntcot_code, ctx.pnt_m]);

  // ---- 부모 창에서 ctx 갱신 메시지 받을 수 있게(공임항목 방식) ----
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (type !== "PAINT_ITEMS_SET_CTX") return;

      if (payload?.est_serial != null) setEstSerial(payload.est_serial || "");
      if (payload?.carno != null) setCarNo(payload.carno || "");
      if (payload?.carname != null) setCarName(payload.carname || "");

      if (payload?.pntcot_code != null) setPntcotCode(payload.pntcot_code || "");

      if (payload?.pnt_m != null) {
        const byPntM = solventFromPntM(payload.pnt_m);
        if (byPntM) setPaintSolvent(byPntM);
      }
      

      try {
        sessionStorage.setItem(
          "PaintItemsCtx",
          JSON.stringify({
            est_serial: payload?.est_serial || "",
            carno: payload?.carno || "",
            carname: payload?.carname || "",
            pntcot_code: payload?.pntcot_code || "",
            pnt_m: payload?.pnt_m ?? "",
          })
        );

      } catch { /* empty */ }
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // ---- Data / Filter ----
  const [items] = useState(makeDemoRows);
  const [q, setQ] = useState("");

  const [selectedPayno, setSelectedPayno] = useState("");
  const [selectedKind, setSelectedKind] = useState("swap"); // swap|outer|surface|front

  const filtered = useMemo(() => {
    const coat = String(pntcotCode || "").trim();
    const qq = String(q || "").trim().toLowerCase();

    return items
      .filter((r) => (!coat ? true : String(r.pntcot) === coat))
      .filter((r) => (!qq ? true : String(r.payname || "").toLowerCase().includes(qq)));
  }, [items, pntcotCode, q]);

  const rows = useMemo(() => filtered, [filtered]);

  // ---- Close ----
  const onClose = useCallback(() => {
    try {
      window.close();
    } catch { /* empty */ }
  }, []);

  // ---- Columns (중요: FixedHeadTable 규격 render(val,row,idx)) ----
  const columns = useMemo(() => {
    const mk = (kind, label, sub) => ({
      key: `${kind}_${sub}`, // row에 필드가 없어도 render로 표시 가능
      title: <TwoLineTitle top={label} bottom={sub === "m" ? "재료비" : "지수"} />,
      width: sub === "m" ? "9%" : "7%",
      align: "right",
      render: (val, row) => {
        const { m, h } = getPaintMH(row, paintSolvent, kind);
        return sub === "m" ? fmtMoney(m) : fmtHour(h);
      },
    });

    return [
      { key: "pntcot_nm", title: "코트", width: "7%", align: "left", render: (val) => val || "" },
      { key: "payname", title: "도장항목", width: "20%", align: "left", render: (val) => val || "" },

      mk("swap", "교환도장", "m"),
      mk("swap", "교환도장", "h"),

      mk("outer", "외측판금", "m"),
      mk("outer", "외측판금", "h"),

      mk("surface", "표면판금", "m"),
      mk("surface", "표면판금", "h"),

      mk("front", "전면판금", "m"),
      mk("front", "전면판금", "h"),
    ];
  }, [paintSolvent]);

  // ---- rowRenderer로 “셀 클릭(kind 선택)” + “노란 강조” 구현 ----
  const rowRenderer = useCallback(
    ({ row, idx, trProps }) => {
      const isSelRow = row?.payno === selectedPayno;

      const onCellPick = (kind) => {
        setSelectedPayno(row?.payno || "");
        setSelectedKind(kind);
      };

      const tdBase = "px-3 py-2 align-middle whitespace-nowrap truncate";
      const tdAlign = (align) => (align === "right" ? "text-right tabular-nums" : align === "center" ? "text-center" : "text-left");

      const onRowDblClick = () => {
        if (!row?.payno) return;
        window.opener?.postMessage(
          { type: "PAINT_ITEMS_PICK", payload: { ...row, paintSolvent, selectedKind } },
          window.location.origin
        );
      };

      return (
        <tr {...trProps} onDoubleClick={onRowDblClick}>
          {columns.map((c) => {
            const kind =
              c.key.startsWith("swap_")
                ? "swap"
                : c.key.startsWith("outer_")
                ? "outer"
                : c.key.startsWith("surface_")
                ? "surface"
                : c.key.startsWith("front_")
                ? "front"
                : null;

            const isKindCell = !!kind;
            const isSelKind = isSelRow && isKindCell && selectedKind === kind;

            const val = row[c.key];
            const content = c.render ? c.render(val, row, idx) : val;

            return (
              <td
                key={c.key}
                className={[
                  tdBase,
                  tdAlign(c.align),
                  c.className || "",
                  isKindCell ? "cursor-pointer" : "",
                  isSelKind ? "!bg-yellow-100 font-semibold" : "",
                ].join(" ")}
                onClick={(e) => {
                  if (!isKindCell) return; // 기본 셀은 row click 그대로
                  e.preventDefault();
                  e.stopPropagation();
                  onCellPick(kind);
                }}
                title={typeof content === "string" ? content : undefined}
              >
                {content}
              </td>
            );
          })}
        </tr>
      );
    },
    [columns, selectedPayno, selectedKind]
  );

  return (
    <div className="h-screen bg-zinc-50 overflow-hidden flex flex-col">

      {/* Header (공임항목 스타일) */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <div className="text-xl font-bold text-zinc-900">도장항목</div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600">
                <div className="min-w-0">
                  <span className="mr-2">
                    수리차명: <span className="font-medium text-zinc-800">{carName || "-"}</span>
                  </span>
                  <span>
                    / 차량번호: <span className="font-medium text-zinc-800">{carNo || "-"}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-800">
                    도장코트: <span className="font-semibold">{pntcotCode ? `${pntcotCode}코트` : "-"}</span>
                  </span>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-800">
                    도장도료: <span className="font-semibold">{solventLabel(paintSolvent)}</span>
                  </span>

                </div>
              </div>

            </div>

            <div className="ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 min-h-0 flex-1">
        <div className="rounded-md border border-zinc-200 bg-white h-full min-h-0 flex flex-col">
          {/* 검색 */}
          <div className="border-b border-zinc-200 px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500"
                placeholder="도장항목 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <FixedHeadTable
              rows={rows}
              columns={columns}
              rowSize="md"
              // height="calc(80vh - 190px)"
              height="100%"
              rowKey={(r) => r.payno}
              selectedKey={selectedPayno}
              onRowClick={(r) => setSelectedPayno(r?.payno || "")}
              rowHoverClass="hover:!bg-zinc-50"
              rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
              rowRenderer={rowRenderer}
            />
          </div>
          
        </div>
      </div>

      {/* Footer Buttons (배치만) */}
      <div className="sticky bottom-0 z-20 border-t border-zinc-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-3">
          <button type="button" className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
            견적항목 대상 도장입력
          </button>
          <button type="button" className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            차체 마스킹(전체)
          </button>
          <button type="button" className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            차체 마스킹(탈착작업)
          </button>
          <button type="button" className="ml-auto h-9 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
            도장 컬러매칭
          </button>
        </div>
      </div>
    </div>
  );
}
