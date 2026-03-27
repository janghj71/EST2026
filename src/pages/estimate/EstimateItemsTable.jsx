// src/pages/estimate/EstimateItemsTable.jsx
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";

import FixedHeadTable from "../../components/FixedHeadTable";
import IconBtn from "../../components/IconBtn";
import Field from "../../components/Field";
import MoneyInput from "../../components/MoneyInput";
import { formatNumber } from "../../utils/numberFormat";
import { focusById } from "../../utils/focusUtils";
import { getUserid, getComcode } from "../../api/config";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  CheckSquare,
  Check,
  Trash2,
  Plus,
  ListPlus,
  ArrowDownWideNarrow,
  Send,
  Share2,
} from "lucide-react";

import SimplePopover from "./SimplePopover";

const WORK_OPTIONS = [
  { code: "R", label: "탈착" },
  { code: "X", label: "교환" },
  { code: "B", label: "판금" },
  { code: "A", label: "조정" },
  { code: "O", label: "오버홀" },
  { code: "S", label: "수리" },
  { code: "T", label: "견인" },
  { code: "G", label: "구난" },
  { code: "W", label: "세차" },
  { code: "P", label: "도장" },
];

/** 도장(P) 소분류 — master.pntkind 별, state 포함 */
const PAINT_OPTIONS = {
  "3": [
    { label: "교환도장",     state: "1" },
    { label: "외측판금도장", state: "3" },
    { label: "표면도장",     state: "2" },
    { label: "전면판금도장", state: "5" },
  ],
  default: [
    { label: "교환도장",     state: "1" },
    { label: "판금도장",     state: "3" },
    { label: "부분판금도장", state: "2" },
  ],
};

function paykindLabel(paykind) {
  switch (String(paykind)) {
    case "1": return "주체";
    case "3": return "부품";
    case "4": return "#공임";
    case "5": return "#부품";
    case "6": return "도장";
    default:  return "";
  }
}
const CELL_INPUT_BASE =
  "h-8 w-full rounded-xs bg-transparent px-2 text-zinc-900 outline-none " +
  "focus:bg-white focus:ring-1 focus:ring-zinc-900/20 focus:border focus:border-zinc-300";

const CELL_WRAP = "h-[40px] flex items-center";

const pk = (row) => String(row?.paykind ?? "");
const wc = (row) => String(row?.workcode ?? "");

function canEditQty(row) {
  // 1,2,3,4,5,6 모두 시간 가능
  if (!["1", "2", "3", "4", "5", "6"].includes(pk(row))) return false;
  // workcode T,G,W: 시간 입력 불가 (인풋 미표시)
  if (pk(row) === "4" && ["T", "G", "W"].includes(wc(row))) return false;
  return true;
}

function canEditLaborAmt(row) {
  if (pk(row) !== "4") return false;
  const w = wc(row);
  // P 제외, W 추가 → T,G,W만 공임액 수정 가능
  return w === "T" || w === "G" || w === "W";
}

function canEditPartAmt(row) {
  // 3: 부품액
  // 4 & workcode P: 부품액
  // 5: 부품액
  // 6: 부품액
  const k = pk(row);
  if (k === "3" || k === "5" || k === "6") return true;
  if (k === "4" && wc(row) === "P") return true;
  return false;
}

function canEditPartCode(row) {
  // 3,5만 부품코드
  return pk(row) === "3" || pk(row) === "5";
}

function canEditWorkcode(row) {
  // paykind '3'(부품), '5'(#부품)는 작업 코드 선택 불필요
  return pk(row) !== "3" && pk(row) !== "5";
}

function canEditPayName(row) {
  // 기존 유지(공임/부품 추가행만 작업내용 수정 가능)
  const k = pk(row);
  return k === "4" || k === "5";
}


function getSubjectBlockRange(rows, subjectIndex) {
  if (subjectIndex < 0 || subjectIndex >= rows.length) return { start: -1, end: -1 };
  // subjectIndex는 paykind===1인 행이어야 함
  let start = subjectIndex;
  let end = subjectIndex;
  for (let i = subjectIndex + 1; i < rows.length; i++) {
    if (String(rows[i].paykind) === "1") break; // 다음 주체면 블록 종료
    end = i;
  }
  return { start, end };
}

export default function EstimateItemsTable({
  rows = [],
  setRows,
  selectedOrgSeq,
  setSelectedOrgSeq,
  sortMode,
  setSortMode,
  // onAddLabor,
  // onAddPart,
  onDeleteSelected,
  onDeleteAll,
  onMovePaintToBottom,
  master,
  onInsertDetail,
  onValueCommit,
  selectedOrgSeqs = new Set(),
  setSelectedOrgSeqs,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const [popover, setPopover] = useState(null);
  // popover: { type: "workcodename"|"ts_payno"|"statename", anchorRect, rowOrgSeq }
  const [paintSubRect, setPaintSubRect] = useState(null); // 도장 서브패널 앵커

  // 신규 row 삽입 후 payname 포커스 대기용 ref
  // saveDetail이 newserial로 estb_orgseqno를 확정하면 포커스 실행
  const pendingFocusSeqRef = useRef(null); // 삽입된 행의 estb_seqno

  useEffect(() => {
    if (!pendingFocusSeqRef.current) return;
    const seq = pendingFocusSeqRef.current;
    const found = rows.find(
      (r) => String(r.estb_seqno) === String(seq) && r.estb_orgseqno
    );
    if (found) {
      pendingFocusSeqRef.current = null;
      setSelectedOrgSeq?.(found.estb_orgseqno);   // 선택 Row 하이라이트
      focusById(`cell-${found.estb_orgseqno}-payname`);
    }
  }, [rows]);

  // ── 삭제 드롭다운 ───────────────────────────────────────────────
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const deleteMenuRef = useRef(null);

  useEffect(() => {
    if (!deleteMenuOpen) return;
    const handle = (e) => {
      if (!deleteMenuRef.current?.contains(e.target)) setDeleteMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [deleteMenuOpen]);

  // ── 선택 드롭다운 ───────────────────────────────────────────────
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const selectMenuRef = useRef(null);

  useEffect(() => {
    if (!selectMenuOpen) return;
    const handle = (e) => {
      if (!selectMenuRef.current?.contains(e.target)) setSelectMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [selectMenuOpen]);

  // 마지막 row 마지막 컬럼 Enter → 공임추가 (순환 의존 방지용 ref)
  const insertAfterSelectedRef = useRef(null);

  // Insert 키 → 공임추가
  useEffect(() => {
    const handle = (e) => {
      if (e.key !== "Insert") return;
      e.preventDefault();
      insertAfterSelectedRef.current?.("4");
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  // qty 변동 감지용 — focus 시점의 값을 기록
  const qtyBeforeEditRef = useRef(null);
  // 소숫점 입력 허용: 편집 중인 셀 orgSeqno 추적 (편집 중에는 fmtQty 미적용)
  const [qtyEditingOrgSeq, setQtyEditingOrgSeq] = useState(null);
  // 부품액(partsum) 편집 중 summary 보정값 (렌더 계산에 사용하므로 state로 관리)
  const [partsumEditingOrgSeq, setPartsumEditingOrgSeq] = useState(null);
  const [partsumBeforeEdit, setPartsumBeforeEdit] = useState(null);
  // 공임액(paysum, T/G/W 직접입력) 편집 중 summary 보정값
  const [paysumEditingOrgSeq, setPaysumEditingOrgSeq] = useState(null);
  const [paysumBeforeEdit, setPaysumBeforeEdit] = useState(null);

  // ── 시간(qty) 입력 후 paysum 자동 계산 ──────────────────────────
  // workcode 그룹별 M/H 단가: 첫 번째 청구처 기준
  //   S,B  → bpay (판금)
  //   P    → ppay (도장)
  //   R,X,O,A → xpay (탈착)
  const calcPaysum = useCallback((workcode, qty) => {
    const claim = master?.claims?.[0];
    if (!claim || !workcode || qty === "" || qty == null) return null;
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum)) return null;

    let rate = null;
    if ("SB".includes(workcode))    rate = parseFloat(claim.bpay);
    else if (workcode === "P")      rate = parseFloat(claim.ppay);
    else if ("RXOA".includes(workcode)) rate = parseFloat(claim.xpay);

    if (rate == null || isNaN(rate)) return null;
    return String(Math.round(rate * qtyNum));
  }, [master]);

  const setCell = useCallback((orgSeq, key, value) => {
    setRows((prev) =>
      prev.map((r) => (r.estb_orgseqno === orgSeq ? { ...r, [key]: value } : r))
    );
  }, [setRows]);

  const openPopover = useCallback((e, type, row) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPaintSubRect(null);
    setPopover({
      type,
      anchorRect: rect,
      rowOrgSeq: row.estb_orgseqno,
    });
  }, []);

  const closePopover = useCallback(() => {
    setPopover(null);
    setPaintSubRect(null);
  }, []);

  const onDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeOrg = active.id;
    const overOrg = over.id;

    const fromIndex = rows.findIndex((r) => r.estb_orgseqno === activeOrg);
    const toIndex = rows.findIndex((r) => r.estb_orgseqno === overOrg);
    if (fromIndex < 0 || toIndex < 0) return;

    const activeRow = rows[fromIndex];

    const canDragRow = (r) => {
      // if (String(r.paykind) === "1") return true;
      // if (sortMode === "free" && String(r.paykind) === "6") return true;
      // return false;
      const k = String(r.paykind);
      if (sortMode === "block") return k === "1"; 
      if (sortMode === "free") return k === "4" || k === "5" || k === "6";
      return false;
    };
    if (!canDragRow(activeRow)) return;

    // 블록 모드: 주체는 payno 블록 통째 이동
    if (sortMode === "block" && String(activeRow.paykind) === "1") {
      // const { start, end } = getPaynoBlockRange(rows, activeRow.payno);
      const { start, end } = getSubjectBlockRange(rows, fromIndex);
      if (start < 0 || end < start) return;

      const block = rows.slice(start, end + 1);
      const rest = rows.filter((_, i) => i < start || i > end);

      const overIndexInRest = rest.findIndex((r) => r.estb_orgseqno === overOrg);
      const insertAt =
        overIndexInRest < 0 ? rest.length :
        (toIndex > end ? overIndexInRest + 1 : overIndexInRest);

      const next = [
        ...rest.slice(0, insertAt),
        ...block,
        ...rest.slice(insertAt),
      ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));

      setRows(next);
      return;
    }

    // 자유 모드: 단일 row 이동
    const next = arrayMove(rows, fromIndex, toIndex).map((r, i) => ({
      ...r,
      estb_seqno: i + 1,
    }));
    setRows(next);
  }, [rows, setRows, sortMode]);

  const EDIT_ORDER = useMemo(() => ([
    { k: "payname", can: canEditPayName },
    { k: "qty", can: canEditQty },
    { k: "paysum", can: canEditLaborAmt },
    { k: "partsum", can: canEditPartAmt },
    { k: "part_makercode", can: canEditPartCode },
  ]), []);

  const nextEditableId = useCallback(
    (row, key) => {
      const org = row.estb_orgseqno;
      const pos = EDIT_ORDER.findIndex((x) => x.k === key);

      for (let i = pos + 1; i < EDIT_ORDER.length; i++) {
        const it = EDIT_ORDER[i];
        if (it.can(row)) return `cell-${org}-${it.k}`;
      }
      return null;
    }, [EDIT_ORDER]
  );
  
  const focusNextEditable =  useCallback(
    (row, currentKey) => {
      const id = nextEditableId(row, currentKey);
      if (id) focusById(id);
    }, [nextEditableId]
  );

  const prevEditableId = useCallback(
    (row, key) => {
      const org = row.estb_orgseqno;
      const pos = EDIT_ORDER.findIndex((x) => x.k === key);
      for (let i = pos - 1; i >= 0; i--) {
        const it = EDIT_ORDER[i];
        if (it.can(row)) return `cell-${org}-${it.k}`;
      }
      return null;
    }, [EDIT_ORDER]);
  
  const focusPrevEditable = useCallback(
    (row, currentKey) => {
      const id = prevEditableId(row, currentKey);
      if (id) focusById(id);
    }, [prevEditableId]
  );
  
  
  const firstEditableKey = useCallback(
    (row) => {
      const hit = EDIT_ORDER.find((x) => x.can(row));
      return hit ? hit.k : null;
    }, [EDIT_ORDER]
  );

  const lastEditableKey = useCallback(
    (row) => {
      for (let i = EDIT_ORDER.length - 1; i >= 0; i--) {
        const it = EDIT_ORDER[i];
        if (it.can(row)) return it.k;
      }
      return null;
    },
    [EDIT_ORDER]
  );
  
  const focusRowKey = useCallback((row, key) => {
    if (!row || !key) return false;
    focusById(`cell-${row.estb_orgseqno}-${key}`);
    setSelectedOrgSeq?.(row.estb_orgseqno);
    return true;
  }, [setSelectedOrgSeq]);
  

  const canEditKey = useCallback(
    (row, key) => {
      const hit = EDIT_ORDER.find((x) => x.k === key);
      return hit ? hit.can(row) : false;
    }, [EDIT_ORDER]
  );
  
  // 현재 포커스된 id("cell-123-qty")를 파싱
  const parseCellId = (id) => {
    const m = /^cell-(\d+)-([a-zA-Z0-9_]+)$/.exec(id || "");
    if (!m) return null;
    return { orgSeq: Number(m[1]), key: m[2] };
  };
  
  const focusRowByPreferredKey = useCallback(
    (row, preferredKey) => {
      const org = row.estb_orgseqno;

      // 1) 같은 컬럼이 가능하면 그걸로
      if (preferredKey && canEditKey(row, preferredKey)) {
        focusById(`cell-${org}-${preferredKey}`);
        return;
      }
      // 2) 아니면 그 row의 첫 편집 가능 컬럼으로
      const k2 = firstEditableKey(row);
      if (k2) focusById(`cell-${org}-${k2}`);

  },
  [canEditKey,firstEditableKey] // 가 컴포넌트 밖이거나 안정적이면 빈 deps 가능
);
  
  const moveFocusUpDown = useCallback(
    (currentRow, currentKey, dir ) => {
      const idx = rows.findIndex((r) => r.estb_orgseqno === currentRow.estb_orgseqno);
      if (idx < 0) return;
    
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= rows.length) return;
    
      const targetRow = rows[nextIdx];
      setSelectedOrgSeq?.(targetRow.estb_orgseqno); // 선택바도 같이 이동(선택)
      focusRowByPreferredKey(targetRow, currentKey);
    }, [rows, focusRowByPreferredKey, setSelectedOrgSeq]
  );

  const focusNextAcrossRows = useCallback((row, currentKey) => {
  // 1) 같은 row에서 다음 editable
  const id = nextEditableId(row, currentKey);
  if (id) { focusById(id); return true; }

  // 2) 없으면 다음 row의 첫 editable
  const idx = rows.findIndex((r) => r.estb_orgseqno === row.estb_orgseqno);
  if (idx < 0 || idx + 1 >= rows.length) {
    // 마지막 row의 마지막 컬럼 → 신규 공임추가
    insertAfterSelectedRef.current?.("4");
    return false;
  }

  const nextRow = rows[idx + 1];
  const k2 = firstEditableKey(nextRow);
  return focusRowKey(nextRow, k2);
}, [rows, nextEditableId, firstEditableKey, focusRowKey]);

const focusPrevAcrossRows = useCallback((row, currentKey) => {
  // 1) 같은 row에서 이전 editable
  const id = prevEditableId(row, currentKey);
  if (id) { focusById(id); return true; }

  // 2) 없으면 이전 row의 마지막 editable
  const idx = rows.findIndex((r) => r.estb_orgseqno === row.estb_orgseqno);
  if (idx <= 0) return false;

  const prevRow = rows[idx - 1];
  const k2 = lastEditableKey(prevRow);
  return focusRowKey(prevRow, k2);
}, [rows, prevEditableId, lastEditableKey, focusRowKey]);


  // 시간(qty) 표시 포맷 — 후행 0 제거: "2.940"→"2.94", "1.000"→"1"
  const fmtQty = (v) => {
    if (v == null || v === "") return "";
    const n = parseFloat(v);
    return isNaN(n) ? String(v) : String(n);
  };

  // 시간(qty) 입력값 정규화 — ".3"→"0.3", "1."→"1", "2.50"→"2.5"
  const normalizeQty = (v) => {
    if (v == null || v === "") return v;
    let s = String(v);
    if (s.startsWith(".")) s = "0" + s;       // .3  → 0.3
    if (s.endsWith("."))   s = s.slice(0, -1); // 1.  → 1
    const n = parseFloat(s);
    if (!isNaN(n)) s = String(n);             // 2.50 → 2.5
    return s;
  };

  // FixedHeadTable render 시그니처에 맞춰: render(val, row, idx)
  const columns = useMemo(() => {
    return [
      {
        key: "drag",
        title: "",
        width: "36px",
        align: "center",
        className: "px-2 py-0",
        render: (_val, _row) => <div className="h-8 flex items-center justify-center" />,
      },
      {
        key: "kind",
        title: "구분",
        width: "70px",
        className: "px-2  py-0 text-zinc-700",
        render: (_val, row) => (
          <div className="h-8 flex items-center text-zinc-700">
            {row?.paykindname || paykindLabel(row?.paykind)}
          </div>
        ),
        
      },
      {
        key: "payname",
        title: "작업내용",
        width: "360px",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditPayName(row);
          const id = `cell-${row.estb_orgseqno}-payname`;
          if (!editable)
            return (
              <div className="h-8 flex items-center truncate">
                {row.payname || ""}
              </div>
            );
          
          return (
            <div className={CELL_WRAP}>
              <input
                id={`cell-${row.estb_orgseqno}-payname`}
                value={row.payname || ""}
                onMouseDown={() => setSelectedOrgSeq?.(row.estb_orgseqno)}
                onChange={(e) => setCell(row.estb_orgseqno, "payname", e.target.value)}
                autoComplete="off"
                className={CELL_INPUT_BASE.replace("px-2", "px-0") + " text-left focus:px-1 [&:-webkit-autofill]:![background-color:transparent] [&:-webkit-autofill]:![box-shadow:0_0_0_1000px_white_inset]"}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveFocusUpDown(row, "payname", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) focusPrevAcrossRows(row, "payname");
                    else focusNextAcrossRows(row, "payname");
                  }
                }}
              />
            </div>
            
          );
        },
      },
      {
        key: "workcodename",
        title: "작업",
        width: "80px",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditWorkcode(row);
          return (
            <div className="h-8 flex items-stretch">
              {editable ? (
                <button
                  type="button"
                  className="w-full text-left hover:underline"
                  onClick={(e) => openPopover(e, "workcodename", row)}
                >
                  {row.workcodename || "선택"}
                </button>
              ) : (
                <span className="flex items-center px-2 text-zinc-700">{row.workcodename || ""}</span>
              )}
            </div>
          );
        },
      },
      {
        key: "qty",
        title: "시간",
        width: "80px",
        align: "right",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditQty(row);
          const id = `cell-${row.estb_orgseqno}-qty`;
          // T/G/W(세차·구난·견인)는 qty 미사용 → 빈 칸 표시
          if (!editable) return <div className="h-8 flex items-center justify-end">{["T","G","W"].includes(wc(row)) ? "" : fmtQty(row.qty)}</div>;
          return (
            <div className={CELL_WRAP}>
              <input
                id={`cell-${row.estb_orgseqno}-qty`}
                value={qtyEditingOrgSeq === row.estb_orgseqno ? (row.qty ?? "") : fmtQty(row.qty)}
                onMouseDown={() => setSelectedOrgSeq?.(row.estb_orgseqno)}
                onChange={(e) => {
                  const intOnly = row.paykind === "3" || row.paykind === "5";
                  const v = intOnly ? e.target.value.replace(/[^0-9]/g, "") : e.target.value;
                  setCell(row.estb_orgseqno, "qty", v);
                }}
                autoComplete="off"
                className={CELL_INPUT_BASE + " text-right tabular-nums pr-1 -mr-1 [&:-webkit-autofill]:![background-color:transparent] [&:-webkit-autofill]:![box-shadow:0_0_0_1000px_white_inset]"}
                onFocus={(e) => {
                  setSelectedOrgSeq?.(row.estb_orgseqno);
                  qtyBeforeEditRef.current = row.qty ?? "";
                  setQtyEditingOrgSeq(row.estb_orgseqno);
                  e.target.select();
                }}
                onBlur={() => {
                  setQtyEditingOrgSeq(null);
                  // blur 시에도 paysum 확정 (Enter/Nav 없이 포커스 이동한 경우)
                  const rawQty  = row.qty ?? "";
                  const curQty  = normalizeQty(rawQty);
                  // 정규화 값이 다르면 state 반영 (.3→0.3, 1.→1)
                  if (curQty !== rawQty) setCell(row.estb_orgseqno, "qty", curQty);
                  if (curQty !== qtyBeforeEditRef.current) {
                    const ps = calcPaysum(row.workcode, curQty);
                    if (ps !== null) setCell(row.estb_orgseqno, "paysum", ps);
                    qtyBeforeEditRef.current = curQty;
                    onValueCommit?.({ ...row, qty: curQty, ...(ps !== null ? { paysum: ps } : {}) });
                  } else {
                    onValueCommit?.({ ...row });
                  }
                }}
                onKeyDown={(e) => {
                  // paykind '3','5' — 소숫점 키 차단
                  if ((row.paykind === "3" || row.paykind === "5") && e.key === ".") {
                    e.preventDefault();
                    return;
                  }
                  // 변동 시 paysum 갱신 + onValueCommit (Enter / ArrowDown / ArrowUp 공통)
                  const flushPaysum = () => {
                    const rawQty = row.qty ?? "";
                    const curQty = normalizeQty(rawQty);
                    if (curQty !== rawQty) setCell(row.estb_orgseqno, "qty", curQty);
                    if (curQty !== qtyBeforeEditRef.current) {
                      const ps = calcPaysum(row.workcode, curQty);
                      if (ps !== null) setCell(row.estb_orgseqno, "paysum", ps);
                      qtyBeforeEditRef.current = curQty;
                      onValueCommit?.({ ...row, qty: curQty, ...(ps !== null ? { paysum: ps } : {}) });
                    }
                  };
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    flushPaysum();
                    moveFocusUpDown(row, "qty", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    flushPaysum();
                    if (e.shiftKey) focusPrevAcrossRows(row, "qty");
                    else focusNextAcrossRows(row, "qty");
                  }
                }}
              />
            </div>
          );
        },
      },
      {
        key: "paysum",
        title: "공임액",
        width: "145px",
        align: "right",
        noTruncate: true,
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditLaborAmt(row);
          const id = `cell-${row.estb_orgseqno}-paysum`;
          if (!editable) return <div className="h-8 flex items-center justify-end pr-1">{formatNumber(row.paysum || 0)}</div>;
          return (
            <div className={CELL_WRAP}>
              <MoneyInput
                id={id}
                value={row.paysum}
                onMouseDown={() => setSelectedOrgSeq?.(row.estb_orgseqno)}
                onChange={(v) => setCell(row.estb_orgseqno, "paysum", v)}
                autoComplete="off"
                className={CELL_INPUT_BASE + " text-right tabular-nums border border-transparent"}
                onFocus={() => {
                  setSelectedOrgSeq?.(row.estb_orgseqno);
                  setPaysumEditingOrgSeq(row.estb_orgseqno);
                  setPaysumBeforeEdit(row.paysum);
                }}
                onBlur={() => {
                  setPaysumEditingOrgSeq(null);
                  setPaysumBeforeEdit(null);
                  onValueCommit?.({ ...row });
                }}
                onKeyDown={(e) => {
                  const commitPaysum = () => {
                    setPaysumEditingOrgSeq(null);
                    setPaysumBeforeEdit(null);
                    onValueCommit?.({ ...row });
                  };
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    commitPaysum();
                    moveFocusUpDown(row, "paysum", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitPaysum();
                    if (e.shiftKey) focusPrevAcrossRows(row, "paysum");
                    else focusNextAcrossRows(row, "paysum");
                  }
                }}
                suffix={null}
                mode="cell"
                rightPad="pr-1"
              />
            </div>
          );
        },
      },
      {
        key: "partsum",
        title: "부품액",
        width: "110px",
        align: "right",
        noTruncate: true,
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditPartAmt(row);
          const id = `cell-${row.estb_orgseqno}-partsum`;
          if (!editable) return <div className="h-8 flex items-center justify-end pr-1">{formatNumber(row.partsum || 0)}</div>;
          return (
            <div className={CELL_WRAP}>
              <MoneyInput
                id={id}
                value={row.partsum}
                onMouseDown={() => setSelectedOrgSeq?.(row.estb_orgseqno)}
                onChange={(v) => setCell(row.estb_orgseqno, "partsum", v)}
                autoComplete="off"
                className="text-right tabular-nums border border-transparent !select-text"
                onFocus={() => {
                  setSelectedOrgSeq?.(row.estb_orgseqno);
                  setPartsumEditingOrgSeq(row.estb_orgseqno);
                  setPartsumBeforeEdit(row.partsum);
                }}
                onBlur={() => {
                  setPartsumEditingOrgSeq(null);
                  setPartsumBeforeEdit(null);
                  onValueCommit?.({ ...row });
                }}
                onKeyDown={(e) => {
                  const commitPartsum = () => {
                    setPartsumEditingOrgSeq(null);
                    setPartsumBeforeEdit(null);
                    onValueCommit?.({ ...row });
                  };
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    commitPartsum();
                    moveFocusUpDown(row, "partsum", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitPartsum();
                    if (e.shiftKey) focusPrevAcrossRows(row, "partsum");
                    else focusNextAcrossRows(row, "partsum");
                  }
                }}
                suffix={null}
                mode="cell"
                rightPad="pr-1"
              />
            </div>
          );
        },
      },
      {
        key: "part_makercode",
        title: "부품코드",
        width: "140px",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditPartCode(row);
          const id = `cell-${row.estb_orgseqno}-part_makercode`;
          if (!editable)
            return (
              <div className="h-8 flex items-center truncate">
                {row.part_makercode || ""}
              </div>
            );

          return (
            <div className={CELL_WRAP}>
              <input
                id={id}
                value={row.part_makercode || ""}
                onMouseDown={() => setSelectedOrgSeq?.(row.estb_orgseqno)}
                onChange={(e) => setCell(row.estb_orgseqno, "part_makercode", e.target.value)}
                autoComplete="off"
                className={CELL_INPUT_BASE + " text-left font-mono [&:-webkit-autofill]:![background-color:transparent] [&:-webkit-autofill]:![box-shadow:0_0_0_1000px_white_inset]"}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveFocusUpDown(row, "part_makercode", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) focusPrevAcrossRows(row, "part_makercode");
                    else focusNextAcrossRows(row, "part_makercode");
                  }

                }}
              />
            </div>
          );
        },
      },

      {
        key: "ts_payno",
        title: "국토부",
        width: "90px",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center">
            <button
              type="button"
              className="w-full text-left hover:underline"
              onClick={(e) => openPopover(e, "ts_payno", row)}
            >
              {row.ts_payno || ""}
            </button>
          </div>
        ),
      },
      {
        key: "statename",
        title: "상태",
        width: "140px",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center">
            <button
              type="button"
              className="w-full text-left hover:underline"
              onClick={(e) => openPopover(e, "statename", row)}
            >
              {row.statename || ""}
            </button>
          </div>
        ),
      },
    ];
  }, [openPopover, setCell, moveFocusUpDown, focusPrevAcrossRows, focusNextAcrossRows, calcPaysum]);

  // rowRenderer(드래그): FixedHeadTable 패치의 rowRenderer를 사용
  const rowRenderer = useCallback(({ row, idx, key, trProps, cells }) => {
    const isSubject = String(row.paykind) === "1";
    const isPaint = String(row.paykind) === "6";
    // const dragEnabled = isSubject || (sortMode === "free" && isPaint);
    const k = String(row.paykind);
    const dragEnabled =
      sortMode === "block"
      ? k === "1"
      : (k === "4" || k === "5" || k === "6"); // 자유: 4,5,6

    return (
      <SortableTr
        key={key}
        id={row.estb_orgseqno}
        trProps={trProps}
        dragEnabled={dragEnabled}
        isMultiSel={selectedOrgSeqs.has(row.estb_orgseqno)}
        cells={cells}
      />
    );
  }, [sortMode, selectedOrgSeqs]);

  // summary — paysum/partsum 편집 중이면 focus 시점 원본값 사용 (타이핑 중 불변)
  const { sumLabor, sumPart, sumSupply, sumVat, sumTotal } = useMemo(() => {
    const labor = rows.reduce((a, r) => {
      if (r.estb_orgseqno === paysumEditingOrgSeq) {
        return a + (Number(paysumBeforeEdit) || 0); // 편집 중: focus 시점 원본값
      }
      return a + (Number(r.paysum) || 0);
    }, 0);
    const part  = rows.reduce((a, r) => {
      if (r.estb_orgseqno === partsumEditingOrgSeq) {
        return a + (Number(partsumBeforeEdit) || 0); // 편집 중: focus 시점 원본값
      }
      return a + (Number(r.partsum) || 0);
    }, 0);
    const supply = labor + part;
    const vat    = Math.floor(supply * 0.1);
    return { sumLabor: labor, sumPart: part, sumSupply: supply, sumVat: vat, sumTotal: supply + vat };
  }, [rows, paysumEditingOrgSeq, paysumBeforeEdit, partsumEditingOrgSeq, partsumBeforeEdit]);

  const masterSendState = ""; // TODO (지금은 화면만)

  const insertAfterSelected = useCallback(
    (paykind) => {
      // ① 삽입 위치 · base를 closure rows에서 동기적으로 계산
      const idx = rows.findIndex((r) => r.estb_orgseqno === selectedOrgSeq);
      const insertAt = idx >= 0 ? idx + 1 : rows.length;
      const base = idx >= 0 ? rows[idx] : rows[rows.length - 1];

      // ② payname 가드 — setRows 밖에서 체크 (rows가 비어있으면 base=undefined → 허용)
      if (base && !base.payname) return;

      const pkStr = String(paykind);

      // payno: paykind별 고정값
      const paynoMap = { "4": "99994", "5": "99995" };
      const payno = paynoMap[pkStr] ?? "";

      // state: paykind='5'(부품)일때만 makercode 조건 적용, paykind='4'(공임)은 ''
      const state =
        pkStr === "5"
          ? (master?.makercode ?? "") > "06" ? "F" : "A"
          : "";

      // ③ newRow 동기 생성 — setRows 콜백 밖에서 만들어야 onInsertDetail에 즉시 전달 가능
      const newRow = {
        comcode:        base?.comcode        ?? getComcode(),
        est_serial:     base?.est_serial     ?? master?.est_serial ?? "",
        estb_orgseqno:  "",                           // 서버 할당 → 비워둠
        estb_seqno:     String(insertAt + 1).padStart(3, "0"),
        paykind:        pkStr,
        payno,
        subpayno:       "",
        payname:        "",
        workcode:       "",
        price:          "",
        qty:            "0",
        partsum:        "0",
        paysum:         "0",
        part_makercode: "",
        state,
        statename:      "",
        oqty:           "",
        pnt_extr:       "",
        pnt_hour:       "",
        pnt_part:       "0",
        pnt_m:          "",
        pntcot:         "",
        ts_payno:       "",
        update_id:      getUserid(),
        paykindname:    paykindLabel(pkStr),
        workcodename:   "",
        b_level:        "0.00",
        b_area:         "0",
        pnt_reduce:     "0",
        body_panel:     "",
      };

      // ④ functional updater 유지 → 대기 중인 setCell 업데이트(qty/paysum 등)와 충돌 방지
      setRows((prev) => {
        const prevIdx = prev.findIndex((r) => r.estb_orgseqno === selectedOrgSeq);
        const prevInsertAt = prevIdx >= 0 ? prevIdx + 1 : prev.length;
        return [
          ...prev.slice(0, prevInsertAt),
          newRow,
          ...prev.slice(prevInsertAt),
        ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
      });

      // ⑤ 선택 Row · 포커스 대기 · 서버 저장 — 모두 동기 실행 (savedRow 패턴 제거)
      setSelectedOrgSeq?.("");
      pendingFocusSeqRef.current = newRow.estb_seqno;
      onInsertDetail?.(newRow);
    },
    [setRows, selectedOrgSeq, setSelectedOrgSeq, master, onInsertDetail, rows]
  );

  // ref 항상 최신 함수로 동기화
  insertAfterSelectedRef.current = insertAfterSelected;

  // ── 멀티선택 핸들러 ─────────────────────────────────────────────
  const handleSelectParts = useCallback(() => {
    const seqs = new Set(
      rows
        .filter((r) => String(r.paykind) === "3" || String(r.paykind) === "5")
        .map((r) => r.estb_orgseqno)
    );
    setSelectedOrgSeqs?.(seqs);
    setSelectMenuOpen(false);
  }, [rows, setSelectedOrgSeqs]);

  const handleDeselect = useCallback(() => {
    setSelectedOrgSeqs?.(new Set());
    setSelectMenuOpen(false);
  }, [setSelectedOrgSeqs]);


  return (
    <div className="min-h-0 flex-1 flex flex-col rounded-md border border-zinc-200 bg-white overflow-hidden">
      <div className="px-2 py-2 flex flex-wrap items-center gap-2 border-b border-zinc-200">
        {/* 선택 드롭다운 */}
        <div className="relative" ref={selectMenuRef}>
          <IconBtn
            icon={CheckSquare}
            label="선택"
            onClick={() => setSelectMenuOpen((v) => !v)}
          />
          {selectMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[120px] rounded-md border border-zinc-200 bg-white shadow-lg py-1 text-sm">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={handleSelectParts}
              >
                부품일괄선택
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={handleDeselect}
              >
                선택해제
              </button>
            </div>
          )}
        </div>
        {/* 삭제 드롭다운 */}
        <div className="relative" ref={deleteMenuRef}>
          <IconBtn
            icon={Trash2}
            label="삭제"
            onClick={() => setDeleteMenuOpen((v) => !v)}
          />
          {deleteMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[110px] rounded-md border border-zinc-200 bg-white shadow-lg py-1 text-sm">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => { setDeleteMenuOpen(false); onDeleteAll?.(); }}
              >
                전체삭제
              </button>
              <button
                type="button"
                disabled={selectedOrgSeqs.size === 0 && selectedOrgSeq == null}
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200 disabled:text-zinc-300 disabled:cursor-not-allowed"
                onClick={() => {
                  setDeleteMenuOpen(false);
                  // 멀티선택 우선, 없으면 단일선택
                  const targets = selectedOrgSeqs.size > 0
                    ? [...selectedOrgSeqs]
                    : selectedOrgSeq != null ? [selectedOrgSeq] : [];
                  if (targets.length > 0) onDeleteSelected?.(targets);
                }}
              >
                선택삭제
              </button>
            </div>
          )}
        </div>
        <IconBtn icon={Plus} label="공임추가" onClick={() => insertAfterSelected("4")} />
        <IconBtn icon={Plus} label="부품추가" onClick={() => insertAfterSelected("5")} />
        <IconBtn icon={ListPlus} label="기본정비항목" onClick={() => alert("TODO")} />

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1">
            <span className="text-xs text-zinc-600">정렬</span>
            <button
              type="button"
              className={`px-2 py-1 rounded-md text-xs ${
                sortMode === "block"
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200"
              }`}
              onClick={() => setSortMode("block")}
            >
              블록
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded-md text-xs ${
                sortMode === "free"
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200"
              }`}
              onClick={() => setSortMode("free")}
            >
              자유
            </button>
          </div>

          <IconBtn icon={ArrowDownWideNarrow} label="도장 하단정렬" onClick={onMovePaintToBottom} />
          <IconBtn icon={Send} label="정비이력전송" onClick={() => alert("TODO")} />
          <IconBtn icon={Share2} label="공유견적" onClick={() => alert("TODO")} />
        </div>
      </div>

      {/* 테이블 + 드래그 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.estb_orgseqno)} strategy={verticalListSortingStrategy}>
            <FixedHeadTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.estb_orgseqno}
              rowSize="sm"
              enableHorizontalScroll
              selectedKey={selectedOrgSeq}
              selectedKeys={selectedOrgSeqs}
              onRowClick={(row, _idx, e) => {
                if (e?.ctrlKey || e?.metaKey) {
                  // Ctrl+클릭(Mac: Cmd+클릭): 멀티선택 토글
                  setSelectedOrgSeqs?.((prev) => {
                    const next = new Set(prev);
                    if (next.has(row.estb_orgseqno)) next.delete(row.estb_orgseqno);
                    else next.add(row.estb_orgseqno);
                    return next;
                  });
                } else {
                  setSelectedOrgSeq(row.estb_orgseqno);
                }
              }}
              rowRenderer={rowRenderer}
            />
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex-none border-t border-zinc-200 bg-white">
      <div className="px-4 py-3">
        <div className="flex items-center gap-6 text-sm text-zinc-700">
          <div>부품액: <span className="font-semibold">{formatNumber(sumPart)}</span></div>
          <div>공임액: <span className="font-semibold">{formatNumber(sumLabor)}</span></div>
          <div>부품+공임: <span className="font-semibold">{formatNumber(sumSupply)}</span></div>
          <div>부가세: <span className="font-semibold">{formatNumber(sumVat)}</span></div>
          <div className="ml-auto text-red-600 font-semibold">
            합계: {formatNumber(sumTotal)}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200" />
        <div className="px-4 py-2 text-sm text-zinc-700">
          정비이력 전송: <span className="text-zinc-500">{masterSendState || ""}</span>
        </div>
      </div>

      {/* 팝오버 */}
      {popover && (
        <SimplePopover
          anchorRect={popover.anchorRect}
          onClose={closePopover}
          title={
            popover.type === "workcodename" ? "작업 선택" :
            popover.type === "ts_payno" ? "국토부" : "상태"
          }
        >
          {popover.type === "workcodename" ? (
            <div className="grid grid-cols-3 gap-2">
              {WORK_OPTIONS.map((opt) =>
                opt.code === "P" ? (
                  /* 도장(P) — 플라이아웃 서브메뉴 진입 */
                  <button
                    key="P"
                    type="button"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm hover:bg-zinc-50"
                    onClick={(e) => setPaintSubRect(e.currentTarget.getBoundingClientRect())}
                  >
                    <span className="text-xs text-zinc-500 mr-1">(P)</span>
                    도장 ▶
                  </button>
                ) : (
                  <button
                    key={opt.code}
                    type="button"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm hover:bg-zinc-50"
                    onClick={() => {
                      const orgSeq = popover.rowOrgSeq;
                      let committed = null;
                      setRows((prev) =>
                        prev.map((r) => {
                          if (r.estb_orgseqno !== orgSeq) return r;
                          const ps = calcPaysum(opt.code, r.qty);
                          committed = {
                            ...r,
                            workcode:     opt.code,
                            workcodename: opt.label,
                            // P → 다른 작업 변경 시 도장 관련 필드 초기화
                            ...(r.workcode === "P" ? {
                              state:     "",
                              statename: "",
                              pnt_extr:  "",
                              pnt_hour:  "0",
                              pnt_part:  "0",
                            } : {}),
                            ...(ps !== null ? { paysum: ps } : {}),
                          };
                          return committed;
                        })
                      );
                      closePopover();
                      // 세차/구난/견인(W/G/T) — qty 비활성 → 공임액으로 포커스
                      if (["T", "G", "W"].includes(opt.code)) {
                        focusById(`cell-${orgSeq}-paysum`);
                      } else {
                        focusById(`cell-${orgSeq}-qty`);
                      }
                      if (committed) onValueCommit?.(committed);
                    }}
                  >
                    <span className="text-xs text-zinc-500 mr-1">({opt.code})</span>
                    {opt.label}
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="text-sm text-zinc-600">
              TODO: {popover.type} 옵션 목록
              <div className="mt-2">
                <button
                  className="rounded-md bg-zinc-900 text-white px-3 py-2 text-sm"
                  onClick={closePopover}
                  type="button"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </SimplePopover>
      )}

      {/* 도장(P) 소분류 플라이아웃 — SimplePopover의 z-50 overlay 위(z-51)에 렌더 */}
      {paintSubRect && popover?.type === "workcodename" && (
        <div
          className="fixed rounded-md border border-zinc-200 bg-white shadow-lg z-[51] w-[200px]"
          style={{ top: paintSubRect.top, left: paintSubRect.right + 6 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-zinc-200 text-sm font-semibold text-zinc-800">
            도장 소분류
          </div>
          <div className="p-2 flex flex-col gap-1">
            {(PAINT_OPTIONS[master?.pntkind] ?? PAINT_OPTIONS.default).map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-zinc-50"
                onClick={() => {
                  const orgSeq = popover.rowOrgSeq;
                  let committed = null;
                  setRows((prev) =>
                    prev.map((r) => {
                      if (r.estb_orgseqno !== orgSeq) return r;
                      const ps = calcPaysum("P", r.qty);
                      committed = {
                        ...r,
                        workcode:     "P",
                        workcodename: "도장",
                        state:        opt.state,
                        statename:    opt.label,
                        ...(ps !== null ? { paysum: ps } : {}),
                      };
                      return committed;
                    })
                  );
                  closePopover();
                  focusById(`cell-${orgSeq}-qty`);
                  if (committed) onValueCommit?.(committed);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableTr({ id, trProps, dragEnabled, isMultiSel, cells }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // 첫 번째 td(드래그 컬럼) 내용만 핸들로 교체
  // 우선순위: 멀티선택 체크 > 드래그 핸들 > 빈 칸
  const patchedCells = cells.map((td, i) => {
    if (i !== 0) return td;
    return React.cloneElement(td, {}, (
      <div className="h-8 flex items-center justify-center">
        {isMultiSel ? (
          <div className="w-6 flex items-center justify-center text-emerald-600">
            <Check size={14} strokeWidth={2.5} />
          </div>
        ) : dragEnabled ? (
          <div
            className="w-6 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 select-none"
            {...listeners}
            title="드래그"
          >
            ≡
          </div>
        ) : (
          <div className="w-6" />
        )}
      </div>
    ));
  });

  return (
    <tr
      {...trProps}
      {...attributes}
      ref={(el) => {
        setNodeRef(el);
        // FixedHeadTable 측정용 ref도 유지(trProps.ref)
        if (typeof trProps.ref === "function") trProps.ref(el);
      }}
      className={(trProps.className || "") + " h-[34px]"}
      style={{ ...style, ...(trProps.style || {}) }}
    >
      {patchedCells}
    </tr>
  );
}
