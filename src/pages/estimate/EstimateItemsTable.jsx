// src/pages/estimate/EstimateItemsTable.jsx
import React, { useMemo, useCallback, useState } from "react";

import FixedHeadTable from "../../components/FixedHeadTable";
import IconBtn from "../../components/IconBtn";
import Field from "../../components/Field";
import MoneyInput from "../../components/MoneyInput";
import { formatNumber } from "../../utils/numberFormat";
import { focusById } from "../../utils/focusUtils"; 

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
];

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
  return ["1", "2", "3", "4", "5", "6"].includes(pk(row));
}

function canEditLaborAmt(row) {
  if (pk(row) !== "4") return false;
  const w = wc(row);
  return w === "P" || w === "G" || w === "T";
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
  onDelete,
  onMovePaintToBottom,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const [popover, setPopover] = useState(null);
  // popover: { type: "work"|"molit"|"state", anchorRect, rowOrgSeq }

  const setCell = useCallback((orgSeq, key, value) => {
    setRows((prev) =>
      prev.map((r) => (r.estb_orgseqno === orgSeq ? { ...r, [key]: value } : r))
    );
  }, [setRows]);

  const openPopover = useCallback((e, type, row) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      type,
      anchorRect: rect,
      rowOrgSeq: row.estb_orgseqno,
    });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const onDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeOrg = Number(active.id);
    const overOrg = Number(over.id);

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
      ].map((r, i) => ({ ...r, estb_seqno: i + 1 }));

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
    { k: "partCode", can: canEditPartCode },
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
  if (idx < 0 || idx + 1 >= rows.length) return false;

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
            {paykindLabel(row?.paykind)}
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
                onChange={(e) => setCell(row.estb_orgseqno, "payname", e.target.value)}
                
                className={CELL_INPUT_BASE.replace("px-2", "px-0")  + " text-left focus:px-1"}
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
        render: (_val, row) => (
          <div className="h-8 flex items-center">
            <button
              type="button"
              className="w-full text-left hover:underline"
              onClick={(e) => openPopover(e, "workcodename", row)}
            >
              {row.workcodename || ""}
            </button>
          </div>

        ),
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
          if (!editable) return <div className="h-8 flex items-center justify-end">{row.qty ?? ""}</div>;
          return (
            <div className={CELL_WRAP}>
              <input
                id={`cell-${row.estb_orgseqno}-qty`}
                value={row.qty ?? ""}
                onChange={(e) => setCell(row.estb_orgseqno, "qty", e.target.value)}
                className={CELL_INPUT_BASE + " text-right tabular-nums pr-1 -mr-1"}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveFocusUpDown(row, "qty", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
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
        width: "110px",
        align: "right",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditLaborAmt(row);
          const id = `cell-${row.estb_orgseqno}-paysum`;
          if (!editable) return <div className="h-8 flex items-center justify-end">{formatNumber(row.paysum || 0)}</div>;
          return (
            <div className={CELL_WRAP}>
              <MoneyInput
                id={id}
                value={row.paysum}
                onChange={(v) => setCell(row.estb_orgseqno, "paysum", v)}
                className={CELL_INPUT_BASE + " text-right tabular-nums"}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveFocusUpDown(row, "paysum", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) focusPrevAcrossRows(row, "paysum");
                    else focusNextAcrossRows(row, "paysum");
                  }

                }}
                suffix={null}
                mode="cell"
                rightPad="pr-1 -mr-1" 
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
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditPartAmt(row);
          const id = `cell-${row.estb_orgseqno}-partsum`;
          if (!editable) return <div className="h-8 flex items-center justify-end">{formatNumber(row.partsum || 0)}</div>;
          return (
            <div className={CELL_WRAP}>
              <MoneyInput
                id={id}
                value={row.partsum}
                onChange={(v) => setCell(row.estb_orgseqno, "partsum", v)}
                className={CELL_INPUT_BASE + " text-right tabular-nums"}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveFocusUpDown(row, "partsum", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) focusPrevAcrossRows(row, "partsum");
                    else focusNextAcrossRows(row, "partsum");
                  }
                  
                }}
                suffix={null}
                mode="cell"
                rightPad="pr-1 -mr-1" 
              />
            </div>
          );
        },
      },
      {
        key: "partCode",
        title: "부품코드",
        width: "140px",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = canEditPartCode(row);
          const id = `cell-${row.estb_orgseqno}-partCode`;
          // if (!editable) return <div className="truncate">{row.partCode || ""}</div>;
          if (!editable)
            return (
              <div className="h-8 flex items-center truncate">
                {row.partCode || ""}
              </div>
            );
          
          return (
            <div className={CELL_WRAP}>
              <input
                id={id}
                value={row.partCode || ""}
                onChange={(e) => setCell(row.estb_orgseqno, "partCode", e.target.value)}
                className={CELL_INPUT_BASE + " text-left font-mono"}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    moveFocusUpDown(row, "partCode", e.key === "ArrowDown" ? +1 : -1);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) focusPrevAcrossRows(row, "partCode");
                    else focusNextAcrossRows(row, "partCode");
                  }
                  
                }}
              />
            </div>
          );
        },
      },

      {
        key: "molit",
        title: "국토부",
        width: "90px",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center">
            <button
              type="button"
              className="w-full text-left hover:underline"
              onClick={(e) => openPopover(e, "molit", row)}
            >
              {row.molit || ""}
            </button>
          </div>

        ),
      },
      {
        key: "state",
        title: "상태",
        width: "140px",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center">
            <button
              type="button"
              className="w-full text-left hover:underline"
              onClick={(e) => openPopover(e, "state", row)}
            >
              {row.state || ""}
            </button>
          </div>
        ),
      },
    ];
  }, [openPopover, setCell, moveFocusUpDown, focusPrevAcrossRows, focusNextAcrossRows]);

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
        cells={cells}
      />
    );
  }, [sortMode]);

  const { sumLabor, sumPart, sumSupply, sumVat, sumTotal } = useMemo(() => {
    const labor = rows.reduce((a, r) => a + (Number(r.paysum) || 0), 0);
    const part  = rows.reduce((a, r) => a + (Number(r.partsum) || 0), 0);
    const supply = labor + part;
    const vat = Math.floor(supply * 0.1); // 정책 확정 전 임시
    const total = supply + vat;
    return { sumLabor: labor, sumPart: part, sumSupply: supply, sumVat: vat, sumTotal: total };
  }, [rows]);

  const masterSendState = ""; // TODO (지금은 화면만)

  const insertAfterSelected = useCallback(
    (paykind) => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.estb_orgseqno === selectedOrgSeq);
        const insertAt = idx >= 0 ? idx + 1 : prev.length;
  
        const base = idx >= 0 ? prev[idx] : prev[prev.length - 1];
  
        const newRow = {
          // 유니크 키
          estb_orgseqno: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
  
          // 시퀀스는 아래에서 재계산
          estb_seqno: 0,
  
          // 같은 블록에 들어가도록 payno는 선택행 기준으로
          payno: base?.payno ?? "",
  
          paykind: String(paykind), // "4" 공임추가, "5" 부품추가
  
          // 편집 필드 초기값
          payname: "",
          qty: "",
          paysum: "",
          partsum: "",
          partCode: "",
  
          // 기타 컬럼(필요한 것만 기본값)
          workcode: "",
          workcodename: "",
          molit: "",
          state: "",
        };
  
        const next = [
          ...prev.slice(0, insertAt),
          newRow,
          ...prev.slice(insertAt),
        ].map((r, i) => ({ ...r, estb_seqno: i + 1 }));
  
        // 새로 삽입된 row 선택
        setSelectedOrgSeq?.(newRow.estb_orgseqno);
  
        return next;
      });
    },
    [setRows, selectedOrgSeq, setSelectedOrgSeq]
  );
  

  return (
    <div className="min-h-0 flex-1 flex flex-col rounded-md border border-zinc-200 bg-white overflow-hidden">
      <div className="px-2 py-2 flex flex-wrap items-center gap-2 border-b border-zinc-200">
        <IconBtn icon={CheckSquare} label="선택" onClick={() => {}} />
        <IconBtn icon={Trash2} label="삭제" onClick={onDelete} />
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
              selectedKey={selectedOrgSeq}
              onRowClick={(row) => setSelectedOrgSeq(row.estb_orgseqno)}
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
            popover.type === "molit" ? "국토부" : "상태"
          }
        >
          {popover.type === "workcodename" ? (
            <div className="grid grid-cols-3 gap-2">
              {WORK_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm hover:bg-zinc-50"
                  onClick={() => {
                    setCell(popover.rowOrgSeq, "workcodename", opt.label);
                    closePopover();
                  }}
                >
                  <span className="text-xs text-zinc-500 mr-1">({opt.code})</span>
                  {opt.label}
                </button>
              ))}
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
    </div>
  );
}

function SortableTr({ id, trProps, dragEnabled, cells }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // 첫 번째 td(드래그 컬럼) 내용만 핸들로 교체
  const patchedCells = cells.map((td, i) => {
    if (i !== 0) return td;
    return React.cloneElement(td, {}, (
      <div className="h-8 flex items-center justify-center">
        {dragEnabled ? (
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
