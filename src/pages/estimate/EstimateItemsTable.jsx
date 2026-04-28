// src/pages/estimate/EstimateItemsTable.jsx
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";

import FixedHeadTable from "../../components/FixedHeadTable";
import IconBtn from "../../components/IconBtn";

import MoneyInput from "../../components/MoneyInput";
import { formatNumber } from "../../utils/numberFormat";
import { focusById } from "../../utils/focusUtils";
import { getUserid, getComcode } from "../../api/config";
import { useTbCode } from "../../hooks/useTbCode";
import { useCodepnt } from "../../hooks/useLaborItems";
import { useTs_repart } from "../../hooks/useTs_Repair";
import { useAlert } from "../../alerts";

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
import SharedEstimateModal from "./SharedEstimateModal";
import BasicMaintenanceMenu from "./BasicMaintenanceMenu";

const WORK_OPTIONS = [
  { code: "R", label: "탈착" },
  { code: "X", label: "교환" },
  { code: "B", label: "판금" },
  { code: "A", label: "조정" },
  { code: "O", label: "오버홀" },
  { code: "S", label: "수리" },
  { code: "P", label: "도장" },
  { code: "T", label: "견인" },
  { code: "G", label: "구난" },
  { code: "W", label: "세차" },
];

// workcode → workcodename 빠른 조회
const WC_NAME_MAP = Object.fromEntries(WORK_OPTIONS.map((o) => [o.code, o.label]));

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

/** 도장 state → coatKind 역매핑 */
const STATE_TO_COAT = { "1": "swap", "3": "outer", "2": "surface", "5": "front" };

/** solvent × coatKind → 도장 API 응답 필드명 매핑 */
const PAINT_COAT_FIELD_MAP = {
  oil: {
    swap:    { h: "oilpnt_h",    m: "oilpnt_m"    },
    outer:   { h: "oilpnt_hb",   m: "oilpnt_mb"   },
    surface: { h: "oilextr21_h", m: "oilextr21_m"  },
    front:   { h: "oilextr22_h", m: "oilextr22_m"  },
  },
  pnt: {
    swap:    { h: "pnt_h",    m: "pnt_m"    },
    outer:   { h: "pnt_hb",   m: "pnt_mb"   },
    surface: { h: "extr21_h", m: "extr21_m"  },
    front:   { h: "extr22_h", m: "extr22_m"  },
  },
};

function paykindLabel(paykind) {
  switch (String(paykind)) {
    case "1": return "주체";
    case "2": return "부공임";
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
  // paykind='6' + payno=subpayno + b_level>0 (subseq='2' 부가항목): 시간 수정 불가
  if (pk(row) === "6" &&
      String(row.payno ?? "") === String(row.subpayno ?? "") &&
      parseFloat(row.b_level ?? "0") > 0) return false;
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
  if (row.subpayno === "99991") return false; // 가열건조비: partsum 수정 불가
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

/**
 * 견적 row의 [상태] 표시 텍스트 계산
 * workcode='P' AND substring(payno,4,1)<>'P' AND paykind='3' 인 경우
 */
function computeStatename(row, master, wrk34Codes, pyk02Codes, wrk03Codes) {
  // 중복체크: state='O' → '중복' 표기 (최우선)
  if (String(row.state ?? "") === "O") return "중복";

  const payno    = String(row.payno    ?? "");
  const subpayno = String(row.subpayno ?? "");

  // 우수기술료: left(payno,2)='SS' → PYK02/subcode=right(payno,2) codename 표시
  if (payno.substring(0, 2) === "SS") {
    const subcode = payno.slice(-2);
    const tbEntry = (pyk02Codes ?? []).find((c) => c.value === subcode);
    return tbEntry ? tbEntry.label : (row.statename || "");
  }

  if (String(row.workcode) === "P") {
    // 악세사리 케이스: payno = subpayno (paykind 무관)
    if (payno !== "" && payno === subpayno) {
      const bl = parseInt(row.b_level ?? "0", 10);
      if (bl === 3) return "악세사리- 중 (20 X 20cm)";
      if (bl === 4) return "악세사리- 대 (30 X 30cm)";
      return "악세사리- 소 (10 X 10cm)";
    }
    // state 케이스: substring(payno,4,1)<>'P' AND master.paykind='3' AND row.paykind in ('4','6')
    const rowPk = String(row.paykind ?? "");
    if (
      payno.charAt(3) !== "P" &&
      String(master?.paykind ?? "") === "3" &&
      (rowPk === "4" || rowPk === "6")
    ) {
      const st = String(row.state ?? "");
      // pnt_extr 가 있으면 WRK34/subcode=9 의 codename 을 접미사로 붙임
      if (String(row.pnt_extr ?? "") !== "") {
        const tbEntry = (wrk34Codes ?? []).find((c) => c.value === String(row.pnt_extr));
        const suffix = tbEntry ? "-" + tbEntry.label : "";
        if (st === "1") return "교환도장" + suffix;
        if (st === "2") return "표면도장" + suffix;
        if (st === "3") return "외측판금도장" + suffix;
        if (st === "5") return "전면판금도장" + suffix;
      }
      if (st === "1") return "교환도장";
      if (st === "2") return "표면도장";
      if (st === "3") return "외측판금도장";
      if (st === "5") return "전면판금도장";
    }
  }

  // paykind='5' or '3': WRK03/subcode=state 조회
  const rowPk = String(row.paykind ?? "");
  if (rowPk === "5" || rowPk === "3") {
    const st = String(row.state ?? "");
    if (st) {
      const tbEntry = (wrk03Codes ?? []).find((c) => c.value === st);
      if (tbEntry) return tbEntry.label;
    }
  }

  return row.statename || "";
}

function canEditPayName(row) {
  const k = pk(row);
  if (k !== "4" && k !== "5") return false;
  // paykind='4', subpayno in ('99990','99991') 수정 불가
  if (k === "4" && (row.subpayno === "99990" || row.subpayno === "99991")) return false;
  return true;
}


// function getSubjectBlockRange(rows, subjectIndex) {
//   if (subjectIndex < 0 || subjectIndex >= rows.length) return { start: -1, end: -1 };
//   // subjectIndex는 paykind===1인 행이어야 함
//   let start = subjectIndex;
//   let end = subjectIndex;
//   for (let i = subjectIndex + 1; i < rows.length; i++) {
//     if (String(rows[i].paykind) === "1") break; // 다음 주체면 블록 종료
//     end = i;
//   }
//   return { start, end };
// }

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
  workTimes = [],
  sidePanelOpen = false,
  est_serial,
  onSharedEstimateSelect,
  readOnly = false,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const { codes: wrk34Codes } = useTbCode("WRK34");
  const { codes: pyk02Codes } = useTbCode("PYK02");
  const { codes: wrk03Codes } = useTbCode("WRK03");

  const { fetchCodepnt } = useCodepnt();
  const [pntRows, setPntRows] = useState([]);
  const [sharedEstOpen, setSharedEstOpen] = useState(false);
  const [pntAccRows, setPntAccRows] = useState([]); // 악세사리 목록 캐시 (carcode='', paykind='0')
  const { fetchTsPayno } = useTs_repart();
  const [tsPaynoRows, setTsPaynoRows] = useState([]); // 국토부 ts_payno 목록 캐시
  const { info: alertInfo } = useAlert();

  // master 변경 시 도장 목록 1회 fetch → pntRows 캐시
  useEffect(() => {
    const carcode  = master?.paint    ?? "";
    const paykind  = master?.pntkind  ?? "";
    const ocarcode = master?.codecar  ?? "";
    if (!carcode && !ocarcode) return;
    fetchCodepnt({ carcode, paykind, ocarcode })
      .then((json) => { if (json?.result === "OK") setPntRows(json.dataset ?? []); })
      .catch(() => {});
  }, [master?.paint, master?.pntkind, master?.codecar]);

  // 악세사리 목록 마운트 시 1회 fetch → pntAccRows 캐시
  useEffect(() => {
    fetchCodepnt({ carcode: "", paykind: "0" })
      .then((json) => {
        console.log("[pntAcc] dataset:", json?.dataset);
        if (json?.result === "OK") setPntAccRows(json.dataset ?? []);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 국토부 ts_payno 목록 마운트 시 1회 fetch → tsPaynoRows 캐시
  useEffect(() => {
    fetchTsPayno()
      .then((json) => { if (json?.result === "OK") setTsPaynoRows(json.ts_payno ?? []); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [popover, setPopover] = useState(null);
  // popover: { type: "workcodename"|"ts_payno"|"statename"|"pntextr"|"state_pntacc", anchorRect, rowOrgSeq }
  const [paintSubRect, setPaintSubRect] = useState(null); // 도장 서브패널 앵커
  const [pntAccItems, setPntAccItems] = useState([]); // 악세사리 상태 드롭다운 목록
  const [tsPaynoSubRect, setTsPaynoSubRect] = useState(null); // 국토부 대분류 플라이아웃 앵커 { rect, kind }

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

  // ── 기본정비항목 드롭다운 ───────────────────────────────────────
  const [basicMenuOpen, setBasicMenuOpen] = useState(false);
  const basicMenuRef = useRef(null);

  useEffect(() => {
    if (!basicMenuOpen) return;
    const handle = (e) => {
      if (!basicMenuRef.current?.contains(e.target)) setBasicMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [basicMenuOpen]);

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

  /** [작업] 팝업을 열지 않을 Row 판별 */
  const isWorkcodePopupBlocked = (row) =>
    row.subpayno === "99990" ||
    row.subpayno === "99991" ||
    (row.pnt_extr ?? "") !== "" ||
    String(row.payno ?? "").startsWith("SS") ||
    String(row.payno ?? "") === "adlP001" ||
    String(row.payno ?? "") === "adlP002";

  const openPopover = useCallback((e, type, row) => {
    // 컬러매칭/가열건조비/도장부가/우수기술료 Row는 [작업] 팝업 차단
    if (type === "workcodename" && isWorkcodePopupBlocked(row)) return;
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
    setTsPaynoSubRect(null);
  }, []);

  const openPntAccPopover = useCallback((e, row) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pntcot = String(master?.pntcot_code ?? "");
    const filtered = pntAccRows.filter(
      (item) => item.payno === row.payno && item.pntcot === pntcot
    );
    setPntAccItems(filtered);
    setPopover({ type: "state_pntacc", anchorRect: rect, rowOrgSeq: row.estb_orgseqno });
  }, [pntAccRows, master]);

  const onDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeOrg = active.id;
    const overOrg = over.id;

    const fromIndex = rows.findIndex((r) => r.estb_orgseqno === activeOrg);
    const toIndex = rows.findIndex((r) => r.estb_orgseqno === overOrg);
    if (fromIndex < 0 || toIndex < 0) return;

    const activeRow = rows[fromIndex];

    const BLOCK_KINDS = new Set(["1", "2", "3", "6"]);
    const canDragRow = (r) => {
      const k = String(r.paykind);
      if (sortMode === "block") return BLOCK_KINDS.has(k) && String(r.payno || "") !== "";
      if (sortMode === "free") return true; // 모든 row
      return false;
    };
    if (!canDragRow(activeRow)) return;

    // 블록 모드: 동일 payno 블록 전체 이동
    if (sortMode === "block") {
      const blockPayno = String(activeRow.payno || "");
      if (!blockPayno) return;

      // 동일 payno를 가진 연속 블럭의 start/end 인덱스
      const start = rows.findIndex((r) => String(r.payno || "") === blockPayno);
      let end = start;
      for (let i = start + 1; i < rows.length; i++) {
        if (String(rows[i].payno || "") === blockPayno) end = i;
        else break;
      }
      if (start < 0 || end < start) return;

      const block = rows.slice(start, end + 1);
      const rest  = rows.filter((_, i) => i < start || i > end);

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
          const editable = !readOnly && canEditPayName(row);
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
          const editable = !readOnly && canEditWorkcode(row);
          const blocked = editable && isWorkcodePopupBlocked(row);
          return (
            <div className="h-8 flex items-stretch">
              {editable ? (
                <button
                  type="button"
                  className={`w-full text-left${blocked ? "" : " hover:underline"}`}
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
          const editable = !readOnly && canEditQty(row);
          const id = `cell-${row.estb_orgseqno}-qty`;
          // T/G/W(세차·구난·견인)는 qty 미사용 → 빈 칸 표시
          if (!editable) return <div className="h-8 flex items-center justify-end pr-1">{["T","G","W"].includes(wc(row)) ? "" : fmtQty(row.qty)}</div>;
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
                    let ps;
                    if (row.subpayno === "99991") {
                      const dry = parseFloat(master?.pnt_drypay ?? "0");
                      const q   = parseFloat(curQty);
                      ps = (!isNaN(dry) && !isNaN(q)) ? String(Math.round(dry * q)) : null;
                    } else {
                      ps = calcPaysum(row.workcode, curQty);
                    }
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
                      let ps;
                      if (row.subpayno === "99991") {
                        const dry = parseFloat(master?.pnt_drypay ?? "0");
                        const q   = parseFloat(curQty);
                        ps = (!isNaN(dry) && !isNaN(q)) ? String(Math.round(dry * q)) : null;
                      } else {
                        ps = calcPaysum(row.workcode, curQty);
                      }
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
          const editable = !readOnly && canEditLaborAmt(row);
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
          const editable = !readOnly && canEditPartAmt(row);
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
        width: "130px",
        className: "px-2 py-0",
        render: (_val, row) => {
          const editable = !readOnly && canEditPartCode(row);
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
        width: "70px",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center">
            <button
              type="button"
              className="w-full text-left hover:underline"
              onClick={(e) => openPopover(e, "ts_payno", row)}
            >
              {row.ts_payno || <span className="text-zinc-400">선택</span>}
            </button>
          </div>
        ),
      },
      {
        key: "statename",
        title: "상태",
        width: "160px",
        className: "px-2 py-0",
        render: (_val, row) => {
          // paykind in ('4','6') AND pnt_extr='' AND workcode='P' → 도장부가 드롭다운
          const rowPk = String(row.paykind ?? "");
          // 악세사리 케이스: workcode='P' AND payno=subpayno AND b_level>0
          const isPntAcc =
            row.workcode === "P" &&
            String(row.payno ?? "") !== "" &&
            String(row.payno ?? "") === String(row.subpayno ?? "") &&
            parseFloat(row.b_level ?? "0") > 0;
          const canPntExtr =
            !isPntAcc &&
            (rowPk === "4" || rowPk === "6") &&
            String(row.pnt_extr ?? "") === "" &&
            row.workcode === "P" &&
            String(row.state ?? "") !== "2";
          // paykind in ('5','3') → WRK03 상태 드롭다운
          const canWrk03State = rowPk === "5" || rowPk === "3";
          const stateText = computeStatename(row, master, wrk34Codes, pyk02Codes, wrk03Codes);
          return (
            <div className="h-8 flex items-center">
              {!readOnly && isPntAcc ? (
                <button
                  type="button"
                  className="w-full text-left hover:underline"
                  onClick={(e) => openPntAccPopover(e, row)}
                >
                  {stateText}
                </button>
              ) : !readOnly && canPntExtr ? (
                <button
                  type="button"
                  className="w-full text-left hover:underline"
                  onClick={(e) => openPopover(e, "pntextr", row)}
                >
                  {stateText}
                </button>
              ) : !readOnly && canWrk03State ? (
                <button
                  type="button"
                  className="w-full text-left hover:underline"
                  onClick={(e) => openPopover(e, "wrk03state", row)}
                >
                  {stateText}
                </button>
              ) : (
                stateText
              )}
            </div>
          );
        },
      },
    ];
  }, [openPopover, setCell, moveFocusUpDown, focusPrevAcrossRows, focusNextAcrossRows, calcPaysum]);

  // 블럭 모드: payno 기준 첫 번째 row의 estb_orgseqno Set (핸들 표시 기준)
  const firstPaynoOrgSeqs = useMemo(() => {
    const seen   = new Set();
    const result = new Set();
    for (const r of rows) {
      const p = String(r.payno || "");
      if (!p) continue;
      if (!seen.has(p)) {
        seen.add(p);
        result.add(r.estb_orgseqno);
      }
    }
    return result;
  }, [rows]);

  // rowRenderer(드래그): FixedHeadTable 패치의 rowRenderer를 사용
  const rowRenderer = useCallback(({ row, idx, key, trProps, cells }) => {
    const k = String(row.paykind);
    const BLOCK_KINDS = new Set(["1", "2", "3", "6"]);
    const dragEnabled =
      !readOnly && (
        sortMode === "block"
        ? BLOCK_KINDS.has(k) &&
          String(row.payno || "") !== "" &&
          firstPaynoOrgSeqs.has(row.estb_orgseqno)
        : true // 자유: 모든 row
      );
    const isSelected =
      selectedOrgSeq === row.estb_orgseqno || selectedOrgSeqs.has(row.estb_orgseqno);
    const mergedTrProps = { ...trProps };

    return (
      <SortableTr
        key={key}
        id={row.estb_orgseqno}
        trProps={mergedTrProps}
        dragEnabled={dragEnabled}
        isMultiSel={selectedOrgSeqs.has(row.estb_orgseqno)}
        cells={cells}
      />
    );
  }, [sortMode, selectedOrgSeq, selectedOrgSeqs, firstPaynoOrgSeqs]);

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
    const vat    = Math.round(supply * 0.1);
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
        estb_orgseqno:  "_new_" + Date.now(),           // 임시 유니크 ID (서버 응답 후 교체)
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
      const _tempId = newRow.estb_orgseqno;
      onInsertDetail?.(newRow)?.then?.((result) => {
        // 서버 저장 후 tempId → newserial 로 selectedOrgSeq 갱신
        // (현재 선택이 tempId인 경우에만 교체 — 그 사이 다른 행 선택 시 유지)
        if (result?.newserial) {
          setSelectedOrgSeq?.((prev) =>
            prev === _tempId ? result.newserial : prev
          );
          // 로딩바 해제 시 포커스가 사라지므로 재설정
          // (다른 행을 이미 클릭했으면 _tempId와 달라 setSelectedOrgSeq도 no-op이므로 포커스도 이동 안 함)
          requestAnimationFrame(() => {
            focusById(`cell-${result.newserial}-payname`);
          });
        }
      });
    },
    [setRows, selectedOrgSeq, setSelectedOrgSeq, master, onInsertDetail, rows]
  );

  // ref 항상 최신 함수로 동기화
  insertAfterSelectedRef.current = insertAfterSelected;

  // ── 기본정비항목 소분류 클릭 → 공임 Row 삽입 ───────────────────
  const handleBasicItemClick = useCallback((subItem) => {
    // subItem: { value: subcode, label: codename, def_value, ... }
    const subpayno  = String(subItem.value ?? "");
    const workcode  = subpayno.substring(0, 1);
    const workcodename = WC_NAME_MAP[workcode] ?? "";
    const qty = subItem.def_value ?? "0";

    // 중복 체크 — 같은 subpayno 가 이미 존재하면 삽입 불가
    if (subpayno && rows.some((r) => r.subpayno === subpayno)) {
      alertInfo(`이미 추가된 항목입니다.\n[${subItem.label}]`);
      return;
    }

    // paysum 계산
    const claim = master?.claims?.[0];
    let paysum = "0";
    if (claim && workcode && qty && qty !== "0") {
      const qtyNum = parseFloat(qty);
      if (!isNaN(qtyNum)) {
        let rate = null;
        if ("SB".includes(workcode))         rate = parseFloat(claim.bpay);
        else if (workcode === "P")           rate = parseFloat(claim.ppay);
        else if ("RXOA".includes(workcode))  rate = parseFloat(claim.xpay);
        if (rate != null && !isNaN(rate)) paysum = String(Math.round(rate * qtyNum));
      }
    }

    // 삽입 위치: 도장컬러매칭(99990) / 가열건조비(99991) 보다 항상 위
    // ※ closure의 rows로 seqno를 미리 계산 → onInsertDetail에 올바른 값 전달
    const fixedIdxNow = rows.findIndex(
      (r) => r.subpayno === "99990" || r.subpayno === "99991"
    );
    const insertAtNow = fixedIdxNow >= 0 ? fixedIdxNow : rows.length;
    const seqno = rows[insertAtNow]?.estb_seqno ?? String(insertAtNow + 1).padStart(3, "0");

    const base = rows.length > 0 ? rows[rows.length - 1] : null;

    const newRow = {
      comcode:        base?.comcode    ?? getComcode(),
      est_serial:     base?.est_serial ?? master?.est_serial ?? "",
      estb_orgseqno:  "_new_" + Date.now(),
      estb_seqno:     seqno,
      paykind:        "4",
      payno:          "99994",
      subpayno,
      payname:        subItem.label ?? "",
      workcode,
      workcodename,
      qty,
      oqty:           qty,
      paysum,
      partsum:        "0",
      price:          "",
      part_makercode: "",
      state:          "",
      statename:      "",
      pnt_extr:       "",
      pnt_hour:       "",
      pnt_part:       "0",
      pnt_m:          "",
      pntcot:         "",
      ts_payno:       "",
      update_id:      getUserid(),
      paykindname:    "#공임",
      b_level:        "0.00",
      b_area:         "0",
      pnt_reduce:     "0",
      body_panel:     "",
    };

    setRows((prev) => {
      // prev 기준으로 insertAt 재계산 (batched update 대응)
      const fixedIdx = prev.findIndex(
        (r) => r.subpayno === "99990" || r.subpayno === "99991"
      );
      const insertAt = fixedIdx >= 0 ? fixedIdx : prev.length;
      return [
        ...prev.slice(0, insertAt),
        newRow,                         // seqno는 이미 newRow에 반영됨
        ...prev.slice(insertAt),
      ];
    });

    const _tempId = newRow.estb_orgseqno;
    setSelectedOrgSeq?.(_tempId);
    onInsertDetail?.(newRow)?.then?.((result) => {
      // 서버 저장 후 tempId → newserial 로 selectedOrgSeq 갱신
      if (result?.newserial) {
        setSelectedOrgSeq?.((prev) =>
          prev === _tempId ? result.newserial : prev
        );
      }
    });
  }, [rows, setRows, setSelectedOrgSeq, master, onInsertDetail]);

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
            disabled={readOnly}
            onClick={() => setDeleteMenuOpen((v) => !v)}
          />
          {deleteMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[110px] rounded-md border border-zinc-200 bg-white shadow-lg py-1 text-sm">
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

              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => { setDeleteMenuOpen(false); onDeleteAll?.(); }}
              >
                전체삭제
              </button>
              
              
            </div>
          )}
        </div>
        <IconBtn icon={Plus} label="공임추가" disabled={readOnly} onClick={() => insertAfterSelected("4")} />
        <IconBtn icon={Plus} label="부품추가" disabled={readOnly} onClick={() => insertAfterSelected("5")} />
        {/* 기본정비항목 드롭다운 */}
        <div className="relative" ref={basicMenuRef}>
          <IconBtn
            icon={ListPlus}
            label="기본정비항목"
            disabled={readOnly}
            onClick={() => setBasicMenuOpen((v) => !v)}
          />
          <BasicMaintenanceMenu
            open={basicMenuOpen}
            onClose={() => setBasicMenuOpen(false)}
            onItemClick={handleBasicItemClick}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1">
            <span className="text-xs text-zinc-600">자리이동</span>
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

          <IconBtn icon={ArrowDownWideNarrow} label="도장 하단정렬" disabled={readOnly} onClick={onMovePaintToBottom} />
          <IconBtn icon={Send} label="정비이력전송" onClick={() => alert("TODO")} />
          <IconBtn icon={Share2} label="공유견적" disabled={readOnly} onClick={() => setSharedEstOpen(true)} />
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
              enableHorizontalScroll={sidePanelOpen}
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
              getRowClassName={(row) => {
                const isOverlap = String(row?.state) === "O";
                const isPaint   = String(row?.paykind) === "6";
                if (isOverlap && isPaint)
                  return { className: "text-red-600 bg-[#f8f8ee]", allowBg: true, hoverClass: "" };
                if (isOverlap)
                  return { className: "text-red-600", allowBg: false };
                if (isPaint)
                  return { className: "bg-[#f8f8ee]", allowBg: true, hoverClass: "" };
                return "";
              }}
              getGutterRowClass={(key) => {
                const r = rows.find((row) => row.estb_orgseqno === key);
                return String(r?.paykind) === "6" ? "bg-[#f8f8ee]" : "";
              }}
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
          placement={popover.type === "workcodename" ? "right-top" : "bottom-left"}
          minWidth={
            popover.type === "workcodename"  ? "100px" :
            popover.type === "pntextr"       ? "140px" :
            popover.type === "wrk03state"    ? "140px" :
            popover.type === "state_pntacc"  ? "160px" :
            popover.type === "ts_payno"      ? "140px" : "360px"
          }
          noTitle={popover.type === "workcodename" || popover.type === "pntextr" || popover.type === "wrk03state" || popover.type === "state_pntacc" || popover.type === "ts_payno"}
          title={
            popover.type === "ts_payno" ? "국토부" : "상태"
          }
        >
          {popover.type === "workcodename" ? (() => {
            const popoverRow = rows.find((r) => r.estb_orgseqno === popover?.rowOrgSeq);
            const pk = String(popoverRow?.paykind ?? "");
            const isFiltered = pk === "1" || pk === "2";
            // workcode='P' + paykind in ('4','6') → (P)도장 버튼만 활성화
            const isPaintOnly =
              popoverRow?.workcode === "P" && (pk === "4" || pk === "6");
            return (
            <div className="flex flex-col gap-0.5">
              {WORK_OPTIONS.map((opt) => {
                const disabled =
                  (isPaintOnly && opt.code !== "P") ||
                  (isFiltered && !workTimes.some(
                    (wt) => String(wt.payno) === String(popoverRow?.payno) && wt.workcode === opt.code
                  ));
                return opt.code === "P" ? (
                  /* 도장(P) — 플라이아웃 서브메뉴 진입 */
                  <button
                    key="P"
                    type="button"
                    disabled={disabled}
                    className={`rounded border px-2 py-1 text-sm text-left
                      ${disabled
                        ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
                    onClick={disabled ? undefined : (e) => setPaintSubRect(e.currentTarget.getBoundingClientRect())}
                  >
                    <span className="text-xs mr-1">(P)</span>
                    도장 ▶
                  </button>
                ) : (
                  <button
                    key={opt.code}
                    type="button"
                    disabled={disabled}
                    className={`rounded border px-2 py-1 text-sm text-left
                      ${disabled
                        ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
                    onClick={disabled ? undefined : () => {
                      const orgSeq = popover.rowOrgSeq;

                      // workcode 변경 충돌 체크 (paykind='1', setRows 호출 전)
                      const _chkRow = rows.find((r) => r.estb_orgseqno === orgSeq);
                      if (_chkRow && String(_chkRow.paykind) === "1") {
                        const _newWC = opt.code;
                        // 동일 workcode 중복 방지
                        const _hasDup = rows.some(
                          (r) => String(r.payno) === String(_chkRow.payno) &&
                                 String(r.paykind) === "1" &&
                                 r.workcode === _newWC &&
                                 r.estb_orgseqno !== orgSeq
                        );
                        if (_hasDup) {
                          alertInfo(`이미 ${opt.label} 작업이 있어 변경할 수 없습니다.`);
                          closePopover();
                          return;
                        }
                        // X↔B/S 공존 방지
                        if (_newWC === "B" || _newWC === "S") {
                          const _hasX = rows.some(
                            (r) => String(r.payno) === String(_chkRow.payno) &&
                                   String(r.paykind) === "1" &&
                                   r.workcode === "X" &&
                                   r.estb_orgseqno !== orgSeq
                          );
                          if (_hasX) {
                            alertInfo("교환 작업이 있어 판금/수리로 변경할 수 없습니다.");
                            closePopover();
                            return;
                          }
                        }
                        if (_newWC === "X") {
                          const _hasBS = rows.some(
                            (r) => String(r.payno) === String(_chkRow.payno) &&
                                   String(r.paykind) === "1" &&
                                   (r.workcode === "B" || r.workcode === "S") &&
                                   r.estb_orgseqno !== orgSeq
                          );
                          if (_hasBS) {
                            alertInfo("판금/수리 작업이 있어 교환으로 변경할 수 없습니다.");
                            closePopover();
                            return;
                          }
                        }
                      }

                      let committed = null;
                      const cascadeCommits = [];
                      const toDelete = [];   // →X 시 삭제할 행 orgseqno
                      setRows((prev) => {
                        const mainRow = prev.find((r) => r.estb_orgseqno === orgSeq);
                        const prevWC  = mainRow?.workcode;
                        const newWC   = opt.code;
                        const isP1    = mainRow && String(mainRow.paykind) === "1";
                        // (어떤 workcode든)→B/S 또는 →X 인 경우 도장 캐스케이드
                        const anyToBS = isP1 && (newWC === "B" || newWC === "S") && !(prevWC === "B" || prevWC === "S");
                        const anyToX  = isP1 && newWC === "X" && prevWC !== "X";

                        // →X 시: 같은 payno paykind='1' 의 R/B/S/O 행 삭제 수집
                        if (anyToX) {
                          prev.forEach((r) => {
                            if (r.estb_orgseqno !== orgSeq &&
                                String(r.paykind) === "1" &&
                                String(r.payno) === String(mainRow.payno) &&
                                ["R", "B", "S", "O"].includes(r.workcode)) {
                              toDelete.push(r.estb_orgseqno);
                            }
                          });
                        }

                        return prev.map((r) => {
                          // ── 메인 행 ──
                          if (r.estb_orgseqno === orgSeq) {
                            const wtEntry = workTimes.find(
                              (wt) => String(wt.payno) === String(r.payno) && wt.workcode === newWC
                            );
                            const newQty = wtEntry ? String(wtEntry.hour ?? "0") : r.qty;
                            const ps = calcPaysum(newWC, newQty);
                            committed = {
                              ...r,
                              workcode:     newWC,
                              workcodename: opt.label,
                              qty:          newQty,
                              oqty:         newQty,
                              paysum:       ps ?? "0",
                              ...(prevWC === "P" ? {
                                state:     "",
                                statename: "",
                                pnt_extr:  "",
                                pnt_hour:  "0",
                                pnt_part:  "0",
                              } : {}),
                            };
                            return committed;
                          }

                          // ── 캐스케이드: 같은 payno 도장(P) 행 ──
                          // pnt_extr 있는 행(서페이스 도장 등)은 캐스케이드 제외
                          if ((anyToBS || anyToX) &&
                              r.workcode === "P" &&
                              String(r.payno) === String(mainRow.payno) &&
                              String(r.pnt_extr ?? "") === "") {
                            let targetState, targetCoat;
                            if      (anyToBS && r.state !== "3") { targetState = "3"; targetCoat = "outer"; }
                            else if (anyToX  && r.state !== "1") { targetState = "1"; targetCoat = "swap";  }
                            else return r; // 이미 원하는 상태면 스킵

                            const solvent = String(r.pnt_m ?? "") === "1" ? "oil" : "pnt";
                            const fields  = PAINT_COAT_FIELD_MAP[solvent]?.[targetCoat];
                            let newHour = r.qty, newPart = r.partsum;
                            if (fields) {
                              const pntRow = pntRows.find(
                                (d) => String(d.payno)  === String(r.payno) &&
                                       String(d.pntcot) === String(r.pntcot ?? "")
                              );
                              if (pntRow) {
                                newHour = String(parseFloat(pntRow[fields.h] ?? "0"));
                                newPart = String(parseFloat(pntRow[fields.m] ?? "0"));
                              }
                            }
                            const paintLabel = (PAINT_OPTIONS[String(master?.pntkind)] ?? PAINT_OPTIONS.default)
                              .find((o) => o.state === targetState)?.label ?? "";
                            const ps = calcPaysum("P", newHour);
                            const cascaded = {
                              ...r,
                              state:     targetState,
                              statename: paintLabel,
                              qty:       newHour,
                              oqty:      newHour,
                              partsum:   newPart,
                              paysum:    ps ?? "0",
                            };
                            cascadeCommits.push(cascaded);
                            return cascaded;
                          }

                          return r;
                        });
                      });
                      closePopover();
                      // 세차/구난/견인(W/G/T) — qty 비활성 → 공임액으로 포커스
                      if (["T", "G", "W"].includes(opt.code)) {
                        focusById(`cell-${orgSeq}-paysum`);
                      } else {
                        focusById(`cell-${orgSeq}-qty`);
                      }
                      if (committed) onValueCommit?.(committed);
                      cascadeCommits.forEach((row) => onValueCommit?.(row));
                      // cascade 삭제: 표시 개수 = toDelete.length (실제 삭제 대상만)
                      if (toDelete.length > 0) onDeleteSelected?.(toDelete, toDelete.length);
                    }}
                  >
                    <span className="text-xs mr-1">({opt.code})</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            );
          })()
          : popover.type === "wrk03state" ? (() => {
            // WRK03 / state='1' 목록 → paykind 5/3 상태 선택
            const selRow    = rows.find((r) => r.estb_orgseqno === popover.rowOrgSeq);
            const stateItems = wrk03Codes.filter((c) => String(c.state) === "1");
            return (
              <div className="p-1 flex flex-col gap-0.5">
                {stateItems.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                    onClick={() => {
                      if (!selRow) { closePopover(); return; }
                      const updated = { ...selRow, state: item.value };
                      setRows((prev) =>
                        prev.map((r) => r.estb_orgseqno === selRow.estb_orgseqno ? updated : r)
                      );
                      closePopover();
                      onValueCommit?.(updated);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })()
          : popover.type === "pntextr" ? (() => {
            // WRK34 / state='1' 목록 → 투톤, 서페이서 등
            const selRow    = rows.find((r) => r.estb_orgseqno === popover.rowOrgSeq);
            const extrItems = wrk34Codes.filter((c) => String(c.state) === "1");
            const isBumper  = String(selRow?.payname ?? "").includes("범퍼");
            return (
              <div className="p-1 flex flex-col gap-0.5">
                {extrItems.map((item) => {
                  const isSerf    = item.label.includes("서페이서");
                  const disabled  = isSerf && !isBumper;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={disabled}
                      className={`text-left rounded px-2 py-1 text-sm whitespace-nowrap
                        ${disabled
                          ? "text-zinc-300 cursor-not-allowed"
                          : "hover:bg-zinc-50"}`}
                      onClick={disabled ? undefined : () => {
                        if (!selRow) { closePopover(); return; }
                        // 중복 체크: payno + subpayno + pnt_extr
                        const isDup = rows.some((r) =>
                          String(r.payno)    === String(selRow.payno) &&
                          String(r.subpayno) === String(selRow.subpayno) &&
                          String(r.pnt_extr) === String(item.value)
                        );
                        if (isDup) {
                          alertInfo("이미 추가된 항목입니다.");
                          closePopover();
                          return;
                        }
                        // qty = def_value / 100
                        const qty = String(parseFloat(item.def_value ?? "0") / 100);
                        const ps  = calcPaysum("P", qty);
                        const newRow = {
                          comcode:        selRow.comcode     ?? getComcode(),
                          est_serial:     selRow.est_serial  ?? master?.est_serial ?? "",
                          estb_orgseqno:  "_new_" + Date.now(),
                          estb_seqno:     selRow.estb_seqno,
                          paykind:        "6",
                          payno:          selRow.payno,
                          subpayno:       selRow.subpayno,
                          payname:        selRow.payname + "-" + item.label,
                          pnt_extr:       item.value,
                          pnt_m:          selRow.pnt_m,
                          pntcot:         selRow.pntcot,
                          state:          selRow.state,
                          statename:      selRow.statename ?? "",
                          workcode:       "P",
                          workcodename:   "도장",
                          qty,
                          oqty:           qty,
                          paysum:         ps ?? "0",
                          partsum:        "0",
                          price:          "",
                          part_makercode: "",
                          pnt_hour:       "0",
                          pnt_part:       "0",
                          ts_payno:       selRow.ts_payno    ?? "",
                          update_id:      getUserid(),
                          paykindname:    paykindLabel("6"),
                          b_level:        "0.00",
                          b_area:         "0",
                          pnt_reduce:     "0",
                          body_panel:     selRow.body_panel  ?? "",
                          pay_orderno:    selRow.pay_orderno,
                        };
                        const _tempId = newRow.estb_orgseqno;
                        // 선택 Row 바로 다음에 삽입
                        setRows((prev) => {
                          const idx = prev.findIndex((r) => r.estb_orgseqno === selRow.estb_orgseqno);
                          const at  = idx >= 0 ? idx + 1 : prev.length;
                          return [
                            ...prev.slice(0, at),
                            newRow,
                            ...prev.slice(at),
                          ].map((r, i) => ({ ...r, estb_seqno: String(i + 1).padStart(3, "0") }));
                        });
                        closePopover();
                        setSelectedOrgSeq?.(_tempId);
                        focusById(`cell-${_tempId}-payname`);
                        onInsertDetail?.(newRow)?.then?.((result) => {
                          if (result?.newserial) {
                            setSelectedOrgSeq?.((prev) =>
                              prev === _tempId ? result.newserial : prev
                            );
                            requestAnimationFrame(() =>
                              focusById(`cell-${result.newserial}-payname`)
                            );
                          }
                        });
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })()
          : popover.type === "state_pntacc" ? (() => {
            const selRow = rows.find((r) => r.estb_orgseqno === popover.rowOrgSeq);
            return (
              <div className="p-1 flex flex-col gap-0.5">
                {pntAccItems.length === 0 ? (
                  <div className="text-sm text-zinc-500 py-2 px-2">데이터 없음</div>
                ) : (
                  pntAccItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                      onClick={() => {
                        if (!selRow) { closePopover(); return; }
                        const b_level = item.carcode ? String(item.carcode).charAt(5) : selRow.b_level;
                        const partsum = Number(item.oilpnt_m) || 0;
                        const updated = { ...selRow, b_level, partsum, statename: item.info };
                        setRows((prev) =>
                          prev.map((r) => r.estb_orgseqno === selRow.estb_orgseqno ? updated : r)
                        );
                        closePopover();
                        onValueCommit?.(updated);
                      }}
                    >
                      {item.info}
                    </button>
                  ))
                )}
              </div>
            );
          })()
          : popover.type === "ts_payno" ? (() => {
            const kinds = [...new Set(tsPaynoRows.map((r) => r.payno_kind_nm))];
            return (
              <div className="p-1 flex flex-col gap-0.5">
                {/* 빈값(초기화) */}
                <button
                  type="button"
                  className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 text-zinc-400"
                  onClick={() => {
                    const selRow = rows.find((r) => r.estb_orgseqno === popover.rowOrgSeq);
                    if (!selRow) { closePopover(); return; }
                    const updated = { ...selRow, ts_payno: "" };
                    setRows((prev) => prev.map((r) => r.estb_orgseqno === selRow.estb_orgseqno ? updated : r));
                    closePopover();
                    onValueCommit?.(updated);
                  }}
                >
                  (없음)
                </button>
                {/* 대분류 목록 */}
                {kinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 flex justify-between items-center gap-4"
                    onClick={(e) => setTsPaynoSubRect({ rect: e.currentTarget.getBoundingClientRect(), kind })}
                  >
                    <span>{kind}</span>
                    <span className="text-zinc-400">{">"}</span>
                  </button>
                ))}
              </div>
            );
          })()
          : (
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
          className="fixed rounded-md border border-zinc-200 bg-white shadow-lg z-[51]"
          style={{ top: paintSubRect.top, left: paintSubRect.right + 6 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1.5 flex flex-col gap-0.5">
            {(PAINT_OPTIONS[master?.pntkind] ?? PAINT_OPTIONS.default).map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 whitespace-nowrap"
                onClick={() => {
                  const orgSeq = popover.rowOrgSeq;
                  let committed = null;
                  const cascadeCommits = [];
                  setRows((prev) => {
                    const paintRow  = prev.find((r) => r.estb_orgseqno === orgSeq);
                    const prevState = paintRow?.state;
                    const newState  = opt.state;
                    // 교환(1)↔비교환(3/2/5) 전환 시 workcode 캐스케이드
                    const stateToOuter = prevState === "1" && newState !== "1";
                    const stateToSwap  = prevState !== "1" && newState === "1";

                    return prev.map((r) => {
                      // ── 도장 행 ──
                      if (r.estb_orgseqno === orgSeq) {
                        // pntkind='1' + state='2' → 부분판금: outer 필드 × (pntrate_sec/100)
                        const isPartPanel = String(master?.pntkind) === "1" && newState === "2";
                        const coatKind = isPartPanel ? "outer" : STATE_TO_COAT[newState];
                        const solvent  = String(r.pnt_m ?? "") === "1" ? "oil" : "pnt";
                        const fields   = coatKind ? PAINT_COAT_FIELD_MAP[solvent]?.[coatKind] : null;
                        let newHour = r.qty, newPart = r.partsum;
                        if (fields) {
                          const pntRow = pntRows.find(
                            (d) => String(d.payno)  === String(r.payno) &&
                                   String(d.pntcot) === String(r.pntcot ?? "")
                          );
                          if (pntRow) {
                            let rawHour = parseFloat(pntRow[fields.h] ?? "0");
                            let rawPart = parseFloat(pntRow[fields.m] ?? "0");
                            if (isPartPanel) {
                              const rate = parseFloat(master?.claims?.[0]?.pntrate_sec ?? "0") / 100;
                              rawHour = Math.floor(rawHour * rate * 100) / 100; // 소수점 둘째 자리 절삭
                              rawPart = Math.round(rawPart * rate / 10) * 10;   // 10단위 반올림
                            }
                            newHour = String(rawHour);
                            newPart = String(rawPart);
                          }
                        }
                        const ps = calcPaysum("P", newHour);
                        committed = {
                          ...r,
                          workcode:     "P",
                          workcodename: "도장",
                          state:        newState,
                          statename:    opt.label,
                          qty:          newHour,
                          oqty:         newHour,
                          partsum:      newPart,
                          ...(ps !== null ? { paysum: ps } : {}),
                        };
                        return committed;
                      }

                      // ── 캐스케이드: 같은 payno paykind='1' 행 ──
                      if ((stateToOuter || stateToSwap) &&
                          String(r.paykind) === "1" &&
                          String(r.payno) === String(paintRow?.payno)) {
                        let newWC, newWCName;
                        if (stateToOuter && r.workcode === "X") {
                          // state 1→3/2/5: X → B or S (workTimes에서 결정)
                          // workTimes에서 B 먼저, 없으면 S 로 결정
                          const wtB = workTimes.find((wt) => String(wt.payno) === String(r.payno) && wt.workcode === "B");
                          const wtS = workTimes.find((wt) => String(wt.payno) === String(r.payno) && wt.workcode === "S");
                          if      (wtB) { newWC = "B"; newWCName = "판금"; }
                          else if (wtS) { newWC = "S"; newWCName = "수리"; }
                          else          { newWC = "B"; newWCName = "판금"; } // fallback
                        } else if (stateToSwap && (r.workcode === "B" || r.workcode === "S")) {
                          newWC = "X"; newWCName = "교환";
                        } else return r; // 이미 원하는 상태면 스킵

                        const wtEntry = workTimes.find(
                          (wt) => String(wt.payno) === String(r.payno) && wt.workcode === newWC
                        );
                        const newQty = wtEntry ? String(wtEntry.hour ?? "0") : r.qty;
                        const ps = calcPaysum(newWC, newQty);
                        const cascaded = {
                          ...r,
                          workcode:     newWC,
                          workcodename: newWCName,
                          qty:          newQty,
                          oqty:         newQty,
                          paysum:       ps ?? "0",
                        };
                        cascadeCommits.push(cascaded);
                        return cascaded;
                      }

                      return r;
                    });
                  });
                  closePopover();
                  focusById(`cell-${orgSeq}-qty`);
                  if (committed) onValueCommit?.(committed);
                  cascadeCommits.forEach((row) => onValueCommit?.(row));
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 국토부(ts_payno) 소분류 플라이아웃 — z-51 */}
      {tsPaynoSubRect && popover?.type === "ts_payno" && (
        <div
          className="fixed rounded-md border border-zinc-200 bg-white shadow-lg z-[51] overflow-y-auto"
          style={{
            top: Math.min(tsPaynoSubRect.rect.top, window.innerHeight - 320),
            left: tsPaynoSubRect.rect.right + 4,
            maxHeight: "300px",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1 flex flex-col gap-0.5">
            {tsPaynoRows
              .filter((r) => r.payno_kind_nm === tsPaynoSubRect.kind)
              .map((item) => (
                <button
                  key={item.payno}
                  type="button"
                  className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                  onClick={() => {
                    const selRow = rows.find((r) => r.estb_orgseqno === popover.rowOrgSeq);
                    if (!selRow) { closePopover(); return; }
                    const updated = { ...selRow, ts_payno: item.payno };
                    setRows((prev) => prev.map((r) => r.estb_orgseqno === selRow.estb_orgseqno ? updated : r));
                    setTsPaynoSubRect(null);
                    closePopover();
                    onValueCommit?.(updated);
                  }}
                >
                  {item.payno_name}
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* 공유견적 모달 */}
      <SharedEstimateModal
        open={sharedEstOpen}
        onClose={() => setSharedEstOpen(false)}
        est_serial={est_serial}
        carname={master?.carname ?? ""}
        onSelect={(detailRows) => {
          onSharedEstimateSelect?.(detailRows);
          setSharedEstOpen(false);
        }}
      />
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
