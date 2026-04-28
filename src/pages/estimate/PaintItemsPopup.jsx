// src/pages/estimate/PaintItemsPopup.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { useCodepnt } from "../../hooks/useLaborItems";
import { X, Search } from "lucide-react";

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
  return "";
}

// solvent: "oil" | "pnt"
function getPaintMH(row, solvent, kind) {
  const map = {
    oil: {
      swap:    { m: "oilpnt_m",    h: "oilpnt_h"    },
      outer:   { m: "oilpnt_mb",   h: "oilpnt_hb"   },
      surface: { m: "oilextr21_m", h: "oilextr21_h" },
      front:   { m: "oilextr22_m", h: "oilextr22_h" },
    },
    pnt: {
      swap:    { m: "pnt_m",    h: "pnt_h"    },
      outer:   { m: "pnt_mb",   h: "pnt_hb"   },
      surface: { m: "extr21_m", h: "extr21_h" },
      front:   { m: "extr22_m", h: "extr22_h" },
    },
  };

  const f = map[solvent]?.[kind];
  if (!f) return { m: 0, h: 0 };
  return {
    m: Number(row?.[f.m] ?? 0),
    h: Number(row?.[f.h] ?? 0),
  };
}

/** workcode 에 따라 클릭 가능한 kind 판별
 *  X       → swap 만 사용
 *  B / S   → outer / surface / front 사용
 *  그 외   → 모두 허용
 */
function canClickKind(kind, workcode) {
  if (workcode === "X")                          return kind === "swap";
  if (workcode === "B" || workcode === "S")      return kind !== "swap";
  return true;
}

/** workcode 에 따른 초기 selectedKind */
function defaultKind(workcode) {
  if (workcode === "X")                          return "swap";
  if (workcode === "B" || workcode === "S")      return "outer";
  return "swap";
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
    keys: ["est_serial", "carno", "carname", "pntcot_code", "pnt_m",
           "paint", "pntkind", "codecar", "workcode"],
    cleanPath: "/paint-items",
  });

  const hydratedRef = useRef(false);

  const [estSerial,   setEstSerial]   = useState(() => ctx.est_serial  || "");
  const [carNo,       setCarNo]       = useState(() => ctx.carno       || "");
  const [carName,     setCarName]     = useState(() => ctx.carname     || "");
  const [pntcotCode,  setPntcotCode]  = useState(() => ctx.pntcot_code || "");
  const [paintSolvent, setPaintSolvent] = useState(() => solventFromPntM(ctx.pnt_m) || "pnt");

  // API 파라미터
  const [paint,   setPaint]   = useState(() => ctx.paint   || "");
  const [pntkind, setPntkind] = useState(() => ctx.pntkind || "");
  const [codecar, setCodecar] = useState(() => ctx.codecar || "");

  // 주체 workcode: 교환(X) vs 판금/수리(B/S) 구분용
  const [workcode, setWorkcode] = useState(() => ctx.workcode || "");

  // ---- 팝업 ctx 저장(F5) + 최초 hydration ----
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "PaintItemsCtx",
        JSON.stringify({
          est_serial:  ctx.est_serial  || "",
          carno:       ctx.carno       || "",
          carname:     ctx.carname     || "",
          pntcot_code: ctx.pntcot_code || "",
          pnt_m:       ctx.pnt_m       ?? "",
          paint:       ctx.paint       || "",
          pntkind:     ctx.pntkind     || "",
          codecar:     ctx.codecar     || "",
          workcode:    ctx.workcode    || "",
        })
      );
    } catch { /* empty */ }

    // carname / pnt_m(paintSolvent): 사용자 편집 없는 표시 필드 → 항상 동기화
    if (ctx.carname != null) setCarName(ctx.carname || "");
    const byPntM = solventFromPntM(ctx.pnt_m);
    if (byPntM) setPaintSolvent(byPntM);

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx.est_serial  && !estSerial)  setEstSerial(ctx.est_serial);
    if (ctx.carno       && !carNo)      setCarNo(ctx.carno);
    if (ctx.pntcot_code && !pntcotCode) setPntcotCode(ctx.pntcot_code);
    if (ctx.paint       && !paint)      setPaint(ctx.paint);
    if (ctx.pntkind     && !pntkind)    setPntkind(ctx.pntkind);
    if (ctx.codecar     && !codecar)    setCodecar(ctx.codecar);
    if (ctx.workcode    !== undefined)  setWorkcode(ctx.workcode || "");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.est_serial, ctx.carno, ctx.carname, ctx.pntcot_code, ctx.pnt_m,
      ctx.paint, ctx.pntkind, ctx.codecar, ctx.workcode]);

  // ---- 부모 창에서 ctx 갱신 메시지 ----
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (type !== "PAINT_ITEMS_SET_CTX") return;

      if (payload?.est_serial  != null) setEstSerial(payload.est_serial   || "");
      if (payload?.carno       != null) setCarNo(payload.carno            || "");
      if (payload?.carname     != null) setCarName(payload.carname        || "");
      if (payload?.pntcot_code != null) setPntcotCode(payload.pntcot_code || "");
      if (payload?.paint       != null) setPaint(payload.paint            || "");
      if (payload?.pntkind     != null) setPntkind(payload.pntkind        || "");
      if (payload?.codecar     != null) setCodecar(payload.codecar        || "");
      if (payload?.workcode    != null) setWorkcode(payload.workcode      || "");

      if (payload?.pnt_m != null) {
        const byPntM = solventFromPntM(payload.pnt_m);
        if (byPntM) setPaintSolvent(byPntM);
      }

      try {
        sessionStorage.setItem(
          "PaintItemsCtx",
          JSON.stringify({
            est_serial:  payload?.est_serial  || "",
            carno:       payload?.carno       || "",
            carname:     payload?.carname     || "",
            pntcot_code: payload?.pntcot_code || "",
            pnt_m:       payload?.pnt_m       ?? "",
            paint:       payload?.paint       || "",
            pntkind:     payload?.pntkind     || "",
            codecar:     payload?.codecar     || "",
            workcode:    payload?.workcode    || "",
          })
        );
      } catch { /* empty */ }
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // ---- API fetch ----
  const { fetchCodepnt } = useCodepnt();
  const [paints, setPaints] = useState([]);

  useEffect(() => {
    if (!paint && !pntkind && !codecar) return;
    fetchCodepnt({ carcode: paint, paykind: pntkind, ocarcode: codecar })
      .then((json) => {
        if (json?.result === "OK") setPaints(json.dataset ?? []);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint, pntkind, codecar]);

  // ---- Filter ----
  const [q, setQ] = useState("");

  const [selectedPayno, setSelectedPayno] = useState("");

  // 견적내역에 이미 추가된 항목(paykind=6) payno Set — 부모 창에서 postMessage로 수신
  const [existingPaynos, setExistingPaynos] = useState(new Set());

  useEffect(() => {
    const handle = (e) => {
      if (e.origin !== window.location.origin) return;
      const { type, payload } = e.data || {};
      if (type === "PAINT_ITEMS_EXISTING_ROWS") {
        setExistingPaynos(new Set(payload?.existing_paynos ?? []));
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, []);

  // selectedKind: workcode 변경 시 기본값 재설정
  const [selectedKind, setSelectedKind] = useState(() => defaultKind(ctx.workcode || ""));
  useEffect(() => {
    setSelectedKind(defaultKind(workcode));
  }, [workcode]);

  const filtered = useMemo(() => {
    const coat = String(pntcotCode || "").trim();
    const qq   = String(q         || "").trim().toLowerCase();

    return paints
      .filter((r) => (!coat ? true : String(r.pntcot) === coat))
      .filter((r) => (!qq   ? true : String(r.payname || "").toLowerCase().includes(qq)));
  }, [paints, pntcotCode, q]);

  const rows = useMemo(() => filtered, [filtered]);

  // ---- Close ----
  const onClose = useCallback(() => {
    try { window.close(); } catch { /* empty */ }
  }, []);

  // ---- Columns ----
  const columns = useMemo(() => {
    const mk = (kind, label, sub) => ({
      key: `${kind}_${sub}`,
      title: <TwoLineTitle top={label} bottom={sub === "m" ? "재료비" : "지수"} />,
      width: sub === "m" ? "9%" : "7%",
      align: "right",
      render: (val, row) => {
        const { m, h } = getPaintMH(row, paintSolvent, kind);
        return sub === "m" ? fmtMoney(m) : fmtHour(h);
      },
    });

    return [
      { key: "pntcot_nm", title: "코트",     width: "7%",  align: "left", render: (val) => val || "" },
      { key: "payname",   title: "도장항목", width: "20%", align: "left", render: (val) => val || "" },

      mk("swap",    "교환도장",  "m"),
      mk("swap",    "교환도장",  "h"),
      mk("outer",   "외측판금",  "m"),
      mk("outer",   "외측판금",  "h"),
      mk("surface", "표면판금",  "m"),
      mk("surface", "표면판금",  "h"),
      mk("front",   "전면판금",  "m"),
      mk("front",   "전면판금",  "h"),
    ];
  }, [paintSolvent]);

  // ---- 견적항목 대상 도장입력 (일괄) ----
  const onBatchPick = useCallback(() => {
    window.opener?.postMessage(
      { type: "PAINT_ITEMS_BATCH", payload: { paints, paintSolvent } },
      window.location.origin
    );
  }, [paints, paintSolvent]);

  // ---- 도장 컬러매칭 ----
  const onColorMatchPick = useCallback(() => {
    window.opener?.postMessage(
      { type: "PAINT_COLOR_MATCH_ADD", payload: { paintSolvent } },
      window.location.origin
    );
  }, [paintSolvent]);

  // ---- 차체 마스킹 ----
  const onMaskingPick = useCallback((maskPayno) => {
    const paintRow = paints.find((p) => String(p.payno) === maskPayno);
    if (!paintRow) return;
    window.opener?.postMessage(
      { type: "PAINT_MASKING_PICK", payload: { paintRow, paintSolvent } },
      window.location.origin
    );
  }, [paints, paintSolvent]);

  // ---- rowRenderer ----
  const rowRenderer = useCallback(
    ({ row, idx, trProps }) => {
      const isSelRow = row?.payno === selectedPayno;

      const onCellPick = (kind) => {
        setSelectedPayno(row?.payno || "");
        setSelectedKind(kind);
      };

      const tdBase  = "px-3 py-2 align-middle whitespace-nowrap truncate";
      const tdAlign = (align) =>
        align === "right"  ? "text-right tabular-nums" :
        align === "center" ? "text-center" : "text-left";

      const onRowDblClick = () => {
        if (!row?.payno) return;

        const isSubseq2 = String(row.subseq ?? "") === "2";

        // 교환(X) → 항상 swap / 판금·수리(B/S) → 선택한 kind
        const kind     = workcode === "X" ? "swap" : selectedKind;
        // subseq='2': subpayno = row.payno, b_level = carcode 6번째 문자
        const subpayno = isSubseq2 ? String(row.payno) : "";
        const b_level  = isSubseq2 ? (String(row.carcode ?? "").charAt(5) || "0.00") : "0.00";

        // subseq='2': 삽입 위치 기준 payno 결정
        //   1순위: 같은 category + subseq='1' 부모 행
        //   2순위: category < 선택row.category 중 가장 큰 category의 subseq='1' 행
        let insertPayno = "";
        if (isSubseq2) {
          const s1Rows = paints.filter((p) => String(p.subseq ?? "") === "1");
          // 1순위: 동일 category
          const exactParent = s1Rows.find((p) => p.category === row.category);
          if (exactParent) {
            insertPayno = exactParent.payno ?? "";
          } else {
            // 2순위: category < 선택row.category 중 최대 category 행
            const candidates = s1Rows.filter((p) => p.category < row.category);
            if (candidates.length > 0) {
              const closest = candidates.reduce((best, cur) =>
                cur.category > best.category ? cur : best
              );
              insertPayno = closest.payno ?? "";
            }
          }
        }

        window.opener?.postMessage(
          { type: "PAINT_ITEMS_PICK",
            payload: { ...row, paintSolvent, selectedKind: kind, subpayno, b_level, insertPayno } },
          window.location.origin
        );
      };

      return (
        <tr {...trProps} onDoubleClick={onRowDblClick}>
          {columns.map((c) => {
            const kind =
              c.key.startsWith("swap_")    ? "swap"    :
              c.key.startsWith("outer_")   ? "outer"   :
              c.key.startsWith("surface_") ? "surface" :
              c.key.startsWith("front_")   ? "front"   : null;

            const isKindCell  = !!kind;
            const isSelKind   = isSelRow && isKindCell && selectedKind === kind;

            const val     = row[c.key];
            const content = c.render ? c.render(val, row, idx) : val;

            return (
              <td
                key={c.key}
                className={[
                  tdBase,
                  tdAlign(c.align),
                  c.className || "",
                  isKindCell ? "cursor-pointer" : "",
                  isSelKind  ? "!bg-yellow-100 font-semibold" : "",
                ].join(" ")}
                onClick={(e) => {
                  if (!isKindCell) return;
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
    [columns, selectedPayno, selectedKind, workcode, paintSolvent, paints]
  );

  return (
    <div className="h-screen bg-zinc-50 overflow-hidden flex flex-col">

      {/* Header */}
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
                    도장코트: <span className="font-semibold">{pntcotCode ? `${{ "1":"1", "2":"2", "4":"3", "5":"4" }[pntcotCode] ?? pntcotCode}코트` : "-"}</span>
                  </span>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-800">
                    도장도료: <span className="font-semibold">{solventLabel(paintSolvent)}</span>
                  </span>
                  {workcode && (
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800 text-xs">
                      {workcode === "X" ? "교환" : workcode === "B" ? "판금" : workcode === "S" ? "수리" : workcode}
                    </span>
                  )}
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
              height="100%"
              rowKey={(r) => r.payno}
              selectedKey={selectedPayno}
              onRowClick={(r) => setSelectedPayno(r?.payno || "")}
              rowHoverClass="hover:!bg-zinc-50"
              rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
              rowRenderer={rowRenderer}
              getRowClassName={(row) =>
                existingPaynos.has(row.payno)
                  ? { className: "bg-yellow-50", allowBg: true, hoverClass: "hover:bg-yellow-100" }
                  : ""
              }
            />
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="sticky bottom-0 z-20 border-t border-zinc-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-3">
          <button type="button" onClick={onBatchPick} className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
            견적항목 대상 도장입력
          </button>
          <button type="button" onClick={() => onMaskingPick("adlP001")} className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            차체 마스킹(전체)
          </button>
          <button type="button" onClick={() => onMaskingPick("adlP002")} className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            차체 마스킹(탈착작업)
          </button>
          <button type="button" onClick={onColorMatchPick} className="ml-auto h-9 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
            도장 컬러매칭
          </button>
        </div>
      </div>
    </div>
  );
}
