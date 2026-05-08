// src/pages/RepairHistorySend.jsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FixedHeadTable from "../components/FixedHeadTable";
import { X, Save, Pen, Pencil, Send, Trash2 } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { moveFocusOnEnter } from "../utils/focusUtils";
import { ymd, monthRange, addMonths } from "../utils/dateUtils";
import { formatMoney, formatNumber } from "../utils/numberFormat";
import { useAosEstimate, useAosEstimateUpdate, useAosEstbUpdate, useEstTsRstUpdate, useEstTsRepairUpdate, useEstTsRstDelete } from "../hooks/useAosEstimate";
import { useTs_repart, useTsLogin, useTsRepairSend, useTsRepairState, useTsRepairDelete, useClientIp } from "../hooks/useTs_Repair";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useTbCode } from "../hooks/useTbCode";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import SimplePopover from "./estimate/SimplePopover";


const inputCls =
  "h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none " +
  "focus:outline-none focus:ring-2 focus:ring-gray-900/10"

const SS_FILTER_KEY = "repair_history_filter";
function loadSavedFilter() {
  try { return JSON.parse(sessionStorage.getItem(SS_FILTER_KEY)); } catch { return null; }
}




function RepairHistoryEditModal({ open, initial, onClose, onSave }) {
  const modalRef = useRef(null);
  const [form, setForm] = useState(() => initial || {});
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;

    // 모달 내부에서만 이동
    const moved = moveFocusOnEnter(e, modalRef.current);
    // (원하면) 마지막에서 Enter면 저장
    if (!e.shiftKey && !moved) {
      onSave(form);
    }
  };

  useEffect(() => {
    if (open) setForm(initial || {});
  }, [open, initial]);

  if (!open) return null;

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50">
      {/* dim */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div 
          ref={modalRef}
          onKeyDown={handleKeyDown}
          className="w-full max-w-[860px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden"
        >
          {/* header */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <Pen className="h-4 w-4 text-zinc-700" />
              <span>정비이력 수정</span>
            </div>

            <button
              type="button"
              className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-2 hover:bg-zinc-50"
              onClick={onClose}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>

          </div>

          {/* body */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {/* 좌측 */}
              <Field label="차량번호">
                <input
                  value={form.carno || ""}
                  onChange={set("carno")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              {/* 우측 */}
              <Field label="고객명">
                <input
                  value={form.custom_name || ""}
                  onChange={set("custom_name")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="차량명">
                <input
                  value={form.carname || ""}
                  onChange={set("carname")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="연락처">
                <div className="flex items-center gap-2">
                  <input 
                    value={form.hp0 || ""} 
                    onChange={set("hp0")} 
                    className={`${inputCls} w-[75px]`}
                  />
                  <span className="text-zinc-500">-</span>
                  <input 
                    value={form.hp1 || ""} 
                    onChange={set("hp1")} 
                    className={`${inputCls} w-[80px]`}
                  />
                  <span className="text-zinc-500">-</span>
                  <input 
                    value={form.hp2 || ""} 
                    onChange={set("hp2")} 
                    className={`${inputCls} w-[80px]`}
                  />
                </div>
              </Field>

              <Field label="주행거리">
                <input
                  value={form.lastkm || ""}
                  onChange={set("lastkm")}
                  className={`${inputCls} w-full text-right`}
                  inputMode="numeric"
                />
              </Field>

              <Field label="등록일자">
                <input
                  type="date"
                  value={form.car_registday || ""}
                  onChange={set("car_registday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="차대번호">
                <input
                  value={form.vinno || ""}
                  onChange={set("vinno")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="입고일자">
                <input
                  type="date"
                  value={form.inday || ""}
                  onChange={set("inday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="정비책임자">
                <input
                  value={form.w_manname || ""}
                  onChange={set("w_manname")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="출고일자">
                <input
                  type="date"
                  value={form.outday || ""}
                  onChange={set("outday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              {/* 우측 하단 */}
              <Field label="사고일자">
                <input
                  type="date"
                  value={form.accday || ""}
                  onChange={set("accday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              {/* 좌측 하단 자리 맞춤용 빈칸 */}
              <div />
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 bg-white">
            <IconBtn
              icon={X}
              label="닫기"
              className="h-10 w-25 justify-center"
              onClick={onClose}
            />

            <IconBtn
              icon={Save}
              label="저장"
              variant="primary"
              className="h-10 w-25 justify-center"
              onClick={onSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <div className="text-sm font-semibold text-zinc-700">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Badge({ tone = "zinc", children }) {
  const toneCls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "err"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-zinc-50 text-zinc-700 border-zinc-200";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${toneCls}`}>
      {children}
    </span>
  );
}

function SendStatusBadge({ ts_serial, ts_rstcode }) {
  if (!ts_serial)                          return null;
  if (ts_rstcode === "MSG50000")           return <Badge tone="ok">성공</Badge>;
  if (ts_serial && !ts_rstcode)            return <Badge tone="warn">처리중</Badge>;
  if (ts_serial && ts_rstcode)             return <Badge tone="err">오류</Badge>;
  return null;
}

function TopBtn({ icon: Icon, children, onClick, variant = "dark" }) {
  const base =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition border";
  const cls =
    variant === "dark"
      ? `${base} bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800`
      : variant === "light"
      ? `${base} bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50`
      : `${base} bg-sky-200 text-zinc-900 border-sky-200 hover:bg-sky-100`;

  return (
    <button type="button" className={cls} onClick={onClick}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function MiniBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

function SmallBtn({ children, onClick, disabled }) {
  // InsuranceEstimate.jsx의 SmallBtn 톤 유지
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/** 우클릭 컨텍스트 메뉴 (portal + 화면 밖 보정) */
function RowContextMenu({ x, y, row, onClose, onModify, onDelete, onSend }) {
  const menuRef = useRef(null);

  // 화면 밖 보정 — DOM 직접 조작 (setState 없음)
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top  = y;
    if (left + rect.width  > window.innerWidth)  left = Math.max(8, window.innerWidth  - rect.width  - 8);
    if (top  + rect.height > window.innerHeight) top  = Math.max(8, window.innerHeight - rect.height - 8);
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
  }, [x, y]);

  // 외부 클릭 / Esc / 스크롤 시 닫기
  useEffect(() => {
    const onDoc    = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose?.(); };
    const onKey    = (e) => { if (e.key === "Escape") onClose?.(); };
    const onScroll = ()  => onClose?.();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown",   onKey);
    window.addEventListener("scroll",      onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown",   onKey);
      window.removeEventListener("scroll",      onScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[1200] w-44 rounded-md border border-zinc-200 bg-white shadow-xl py-1 select-none"
      style={{ left: x, top: y }}
    >
      <CtxItem icon={Pencil} onClick={onModify}>수정</CtxItem>
      <CtxItem icon={Trash2} onClick={onDelete}>삭제</CtxItem>
      <CtxItem icon={Send}   onClick={onSend}>정비이력전송</CtxItem>
    </div>,
    document.body
  );
}

function CtxItem({ icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 px-3 py-1.5"
    >
      {Icon && <Icon className="h-4 w-4 text-zinc-500 shrink-0" />}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

export default function RepairHistorySend() {
  const { info, success, warning } = useAlert();

  const today = useMemo(() => new Date(), []);
  const initRange = useMemo(() => monthRange(today), [today]);
  const [outFrom, setOutFrom] = useState(() => loadSavedFilter()?.outFrom ?? initRange.from);
  const [outTo, setOutTo] = useState(() => loadSavedFilter()?.outTo ?? initRange.to);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const saved = loadSavedFilter()?.outFrom;
    return saved ? new Date(saved) : new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState("1"); // 1~6
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInit, setEditInit] = useState(null);

  // ====== 선택/상세 ======
  const detailBodyElRef = useRef(null);
  const [focusedId, setFocusedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [detailRows, setDetailRows] = useState([]);
  const [tsPaynoPopover, setTsPaynoPopover] = useState(null);  // { anchorRect, rowOrgSeq }
  const [tsPaynoSubRect, setTsPaynoSubRect] = useState(null);  // { rect, kind }
  const [partStatePopover, setPartStatePopover] = useState(null); // { anchorRect, rowOrgSeq }
  const { codes: wrk03Codes } = useTbCode("WRK03");

  const [contextMenu, setContextMenu] = useState(null); // { x, y, row } | null

  // 조회 조건 변경 시 sessionStorage 저장 (페이지 재진입 시 복원)
  useEffect(() => {
    try {
      sessionStorage.setItem(SS_FILTER_KEY, JSON.stringify({ outFrom, outTo }));
    } catch { /* empty */ }
  }, [outFrom, outTo]);

  // ====== API ======
  const [rows, setRows] = useState([]);
  const [allDetail, setAllDetail] = useState([]);
  const { loading: listLoading, fetchAosEstimate } = useAosEstimate();
  const { updateTsSerial } = useAosEstimateUpdate();
  const { updateEstbTsPayno } = useAosEstbUpdate();
  const { fetchTsPayno } = useTs_repart();
  const { tsLogin } = useTsLogin();
  const { loading: sending, sendRepairHistory } = useTsRepairSend();
  const { fetchRepairState } = useTsRepairState();
  const { loading: deleting, deleteRepairHistory } = useTsRepairDelete();
  const { updateTsResult } = useEstTsRstUpdate();
  const { clearTsSerial } = useEstTsRepairUpdate();
  const { deleteTsRst } = useEstTsRstDelete();
  const { fetchClientIp } = useClientIp();

  // 로그인 후 캐시 — 재로그인 없이 재사용
  const imprmnEntnumRef = useRef("");
  const servicecodeRef  = useRef("");
  const { form: companyForm } = useCompanyInfo();
  const [paynoList, setPaynoList] = useState([]);

  useEffect(() => {
    fetchTsPayno()
      .then((json) => { if (json?.result === "OK") setPaynoList(json.ts_payno ?? []); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    let r = [...rows];

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      r = r.filter((x) => {
        return (
          (x.carno || "").toLowerCase().includes(q) ||
          (x.carname || "").toLowerCase().includes(q) ||
          (x.custom_name || "").toLowerCase().includes(q) ||
          (`${x.hp0 || ""}${x.hp1 || ""}${x.hp2 || ""}`).toLowerCase().includes(q)
        );
      });
    }

    if (onlyUnsent) {
      r = r.filter((x) => !x.ts_send_dt);
    }

    const cmp = {
      "1": (a, b) => (a.est_serial > b.est_serial ? 1 : -1), // 입력순
      "2": (a, b) => (a.inday > b.inday ? 1 : -1),           // 입고일자순
      "3": (a, b) => (a.carno > b.carno ? 1 : -1),           // 차량번호순
      "4": (a, b) => (a.custom_name > b.custom_name ? 1 : -1), // 고객명순
      "5": (a, b) => (a.carname > b.carname ? 1 : -1),       // 차량명순
      "6": (a, b) => (`${a.hp0}${a.hp1}${a.hp2}` > `${b.hp0}${b.hp1}${b.hp2}` ? 1 : -1), // 연락처순
    }[sortKey];

    if (cmp) r.sort(cmp);
    return r;
  }, [rows, searchText, sortKey, onlyUnsent]);
  
  const focusedRow = useMemo(() => {
    const serial = focusedId ?? filteredRows[0]?.est_serial ?? null;
    if (!serial) return null;
    return filteredRows.find((r) => r.est_serial === serial) || null;
  }, [focusedId, filteredRows]);
  
  const toggleChecked = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredIds = useMemo(() => filteredRows.map((r) => r.est_serial), [filteredRows]);
  const allChecked = useMemo(
    () => filteredIds.length > 0 && filteredIds.every((id) => checkedIds.has(id)),
    [filteredIds, checkedIds]
  );

  const toggleAllFiltered = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (filteredIds.length === 0) return next;

      if (allChecked) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const mainColumns = useMemo(
    () => [
      {
        key: "__sel",
        title: (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allChecked}
              onChange={toggleAllFiltered}
              onClick={(e) => e.stopPropagation()}
              aria-label="전체 선택"
            />
          </div>
        ),
        width: "5%",
        align: "center",
        render: (_, row) => {
          const checked = checkedIds.has(row.est_serial);
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={checked}
                onChange={() => toggleChecked(row.est_serial)}
                onClick={(e) => e.stopPropagation()}
                aria-label="선택"
              />
            </div>
          );
        },
      },
      { key: "inday", title: "입고일자", width: "8%", align: "left" },
      { key: "outday", title: "출고일자", width: "8%", align: "left", render: (v) => v?.replace(/[\s\-]/g, "") ? v.trim() : "" },
      { key: "carno", title: "차량번호", width: "9%", align: "left" },
      { key: "carname", title: "차량명", width: "16%", align: "left" },
      {
        key: "lastkm",
        title: "주행거리",
        width: "8%",
        align: "right",
        render: (v) => formatNumber(v),
      },
      { key: "custom_name", title: "고객명", width: "16%", align: "left" },
      {
        key: "hp0",
        title: "연락처",
        width: "11%",
        align: "left",
        render: (_, row) => {
          const parts = [row.hp0, row.hp1, row.hp2].filter(Boolean);
          return parts.join("-");
        },
      },
      { key: "ts_send_dt", title: "전송일시", width: "12%", align: "left", render: (v) => v || "" },
      {
        key: "ts_rstcode",
        title: "상태",
        width: "7%",
        align: "center",
        render: (v, row) => <SendStatusBadge ts_serial={row.ts_serial} ts_rstcode={v} />,
      },
    ],
    [checkedIds, allChecked, toggleAllFiltered, sortKey] // sortKey는 없어도 되지만 두는 게 안전
  );
  
  const detailColumns = [
    {
      key: "ts_payno",
      title: "국토부",
      width: "10%",
      align: "left",
      render: (v, row) => (
        <button
          type="button"
          className="w-full text-left hover:underline"
          onClick={(e) => openTsPaynoPopover(e, row)}
        >
          {v || <span className="text-zinc-400">선택</span>}
        </button>
      ),
    },
    { key: "part_makercode", title: "부품코드", width: "10%", align: "left" },
    { key: "payname", title: "작업내용", width: "22%", align: "left" },
    { key: "workcodename", title: "작업", width: "10%", align: "left" },
    { key: "qty", title: "시간", width: "6%", align: "right", render: (v) => v ? String(parseFloat(v)) : "" },
    { key: "paysum",  title: "공임액", width: "9%", align: "right", render: (v) => formatMoney(v) },
    { key: "partsum", title: "부품액", width: "9%", align: "right", render: (v) => formatMoney(v) },
    {
      key: "part_state",
      title: "부품구분",
      width: "8%",
      align: "left",
      render: (v, row) => {
        const canEdit = String(row.paykind) === "3" || String(row.paykind) === "5";
        if (!canEdit) return v || "";
        return (
          <button
            type="button"
            className="w-full text-left hover:underline"
            onClick={(e) => openPartStatePopover(e, row)}
          >
            {v ? (wrk03Codes.find((c) => c.value === v)?.label ?? v) : <span className="text-zinc-400">선택</span>}
          </button>
        );
      },
    },
    { key: "statename", title: "작업상태", width: "8%", align: "left" },
  ];
  
  
  useEffect(() => {
    if (!focusedRow) {
      setDetailRows([]);
      return;
    }
    setDetailRows(
      allDetail.filter((d) => d.est_serial === focusedRow.est_serial)
    );
  }, [focusedRow, allDetail]);

  const openTsPaynoPopover = useCallback((e, row) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTsPaynoSubRect(null);
    setTsPaynoPopover({ anchorRect: rect, rowOrgSeq: row.estb_orgseqno });
  }, []);

  const closeTsPaynoPopover = useCallback(() => {
    setTsPaynoPopover(null);
    setTsPaynoSubRect(null);
  }, []);

  const openPartStatePopover = useCallback((e, row) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPartStatePopover({ anchorRect: rect, rowOrgSeq: row.estb_orgseqno });
  }, []);

  const closePartStatePopover = useCallback(() => {
    setPartStatePopover(null);
  }, []);

  const applyPartState = useCallback((value, orgseqno) => {
    setDetailRows((prev) =>
      prev.map((r) => r.estb_orgseqno === orgseqno ? { ...r, part_state: value } : r)
    );
    setAllDetail((prev) =>
      prev.map((r) => r.estb_orgseqno === orgseqno ? { ...r, part_state: value } : r)
    );
    closePartStatePopover();
  }, [closePartStatePopover]);

  const applyTsPayno = useCallback((payno, orgseqno) => {
    // detailRows 업데이트
    setDetailRows((prev) =>
      prev.map((r) => r.estb_orgseqno === orgseqno ? { ...r, ts_payno: payno } : r)
    );
    // allDetail도 동기화 (onSend에서 allDetail 기준으로 jsondata 생성)
    setAllDetail((prev) =>
      prev.map((r) => r.estb_orgseqno === orgseqno ? { ...r, ts_payno: payno } : r)
    );
    closeTsPaynoPopover();
  }, [closeTsPaynoPopover]);
  


  // ====== 액션(연결은 나중에) ======
  const requireFocused = () => {
    if (!focusedRow) {
      // info("목록에서 먼저 선택하세요.");
      info("목록에서 먼저 선택하세요.");
      return false;
    }
    return true;
  };

  const onNew = () => info("신규");
  const onAosLoad = () => info("AOS 견적 불러오기");

  /**
   * 정비이력 jsondata 빌더 — 실제 국토부 API 구조
   * @param {{ master, details, imprmn_entnum: string }} param
   */
  /**
   * codecar 3번째 문자(1-index) → 차종코드
   *  1·2·5 → '1'(승용), 4 → '2'(화물), 3 → '3'(승합)
   */
  function resolveVhctyAsortCode(codecar) {
    const ch = (codecar || "").charAt(2); // 3번째 문자 (0-index=2)
    if (["1", "2", "5"].includes(ch)) return "1";
    if (ch === "4") return "2";
    if (ch === "3") return "3";
    return "";
  }

  /**
   * paykind → cmpnt_se_code
   *  paykind 1·2·4·6 → 'X'  (부품)
   *  paykind 3·5     → detail.part_state (작업)
   */
  function resolveCmpntSeCode(d) {
    const pk = String(d.paykind ?? "");
    if (["1", "2", "4", "6"].includes(pk)) return "X";
    if (["3", "5"].includes(pk))           return d.part_state || "";
    return "";
  }

  function buildRepairJsondata({ master, details, imprmn_entnum }) {
    return JSON.stringify({
      ot_vhcle_imprmn_hist: [
        {
          imprmn_entnum:       imprmn_entnum                    || "",
          prgcom:              "01_EST",
          upd_code:            master.ts_serial ? "U" : "N",
          upd_reason:          "",
          vhrno:               master.carno                     || "",
          cnm:                 master.carname                   || "",
          wrhousng_de:         (master.inday  || "").slice(0, 10),
          imprmn_compt_de:     (master.outday || "").slice(0, 10),
          dlivy_de:            (master.outday || "").slice(0, 10),
          imprmn_dt:           (master.inday  || "").slice(0, 10),
          vhcty_asort_code:    resolveVhctyAsortCode(master.codecar),
          imprmn_rspnber_nm:   companyForm.supman               || "",
          mber_nm:             master.custom_name               || "",
          telno:               [master.hp0, master.hp1, master.hp2].filter(Boolean).join(""),
          trvl_dstnc:          String(master.lastkm             || "0"),
          inner_imprmn_no:     master.ts_serial                 || "",
          adit_imprmn_agre_at: "Y",
          acdnt_at:            master.seccode === "12" ? "Y" : "N",
        },
      ],
      ot_vhcle_imprmn_hist_dtls: details.filter((d) => d.ts_payno).map((d) => ({
        cmpnt_se_code:        resolveCmpntSeCode(d),
        cmpnt_detail_nm:      d.payname                        || "",
        work_id:              d.ts_payno                       || "",
        car_maker_part_cls:   d.part_makercode                 || "",
        cmpnt_co:             parseInt(d.qty     || 0, 10)     || 0,
        cmpnt_by_wage_amount: parseInt(d.paysum  || 0, 10)     || 0,
        cmpnt_amount_tot:     parseInt(d.partsum || 0, 10)     || 0,
        insurance_yn:         master.seccode === "12" ? "Y" : "N",
      })),
    });
  }

  /**
   * 국토부 정비이력 전송 (체크된 건 순차 처리)
   * @param {Set<string>|undefined} idsOverride  undefined → checkedIds 사용
   */
  const onSend = useCallback(async (idsOverride) => {
    const ids = idsOverride ?? checkedIds;
    if (ids.size === 0) return warning("전송할 건을 체크하세요.");

    // MSG50000(성공) 건이 포함되어 있으면 안내
    const hasSuccess = filteredRows.some(
      (r) => ids.has(r.est_serial) && r.ts_serial && r.ts_rstcode === "MSG50000"
    );
    if (hasSuccess) warning("전송완료(성공) 건은 [정비이력 삭제] 버튼을 사용하세요.");

    // ts_serial = '' 인 건만 전송 대상
    const validIds = new Set(
      filteredRows
        .filter((r) => ids.has(r.est_serial) && !r.ts_serial)
        .map((r) => r.est_serial)
    );
    if (validIds.size === 0) return warning("전송할 건이 없습니다. (미전송 건만 전송 가능합니다)");
    // 이하 validIds 로 처리

    const userid = companyForm.ts_userid;
    const passwd = companyForm.ts_userpwd;
    const idno   = companyForm.idNo;
    if (!userid || !passwd) return warning("업체정보에 국토부 아이디/비밀번호를 설정하세요.");

    // 1. 국토부 로그인
    let loginRes;
    try {
      loginRes = await tsLogin({ idno, userid, passwd });
    } catch (e) {
      return warning(`국토부 로그인 실패: ${e?.message || "알 수 없는 오류"}`);
    }

    if (!loginRes) return warning("국토부 로그인 응답이 없습니다.");

    // msgcode 104/105: 약관동의 / 비밀번호 변경 팝업
    const mc = String(loginRes.msgcode || "");
    if (mc === "104" || mc === "105") {
      if (loginRes.url) window.open(loginRes.url, "_blank", "width=900,height=700");
      return warning(loginRes.msgtext || `국토부 인증 필요 (코드 ${mc})`);
    }

    if (String(loginRes.result).toLowerCase() === "false" || loginRes.result === false) {
      return warning(`국토부 로그인 실패: ${loginRes.msgtext || ""}`);
    }

    // 로그인 응답에서 필요한 값 추출 + ref 캐시
    const imprmn_entnum = loginRes.imprmn_entnum || "";
    const servicecode   = loginRes.servicecode   || "";
    if (imprmn_entnum) imprmnEntnumRef.current = imprmn_entnum;
    if (servicecode)   servicecodeRef.current   = servicecode;

    // IP 조회 (실패해도 빈 문자열로 계속 진행)
    let ip_adres = "";
    try { ip_adres = await fetchClientIp(); } catch { /* empty */ }

    // 2. 체크된 행 순차 전송 (validIds 기준)
    const targetRows = filteredRows.filter((r) => validIds.has(r.est_serial));
    let okCount = 0;
    const failMessages = [];

    for (const master of targetRows) {
      const details = allDetail.filter((d) => d.est_serial === master.est_serial);
      const jsondata = buildRepairJsondata({ master, details, imprmn_entnum });

      let sendRes;
      try {
        sendRes = await sendRepairHistory({
          servicecode,
          ip_adres,
          // macadrs: 브라우저 보안 정책상 불가 → ""
          jsondata,
        });
      } catch (e) {
        failMessages.push(`[${master.carno}] ${e?.message || "전송 오류"}`);
        continue;
      }

      const sendMsg = sendRes?.msg || sendRes?.msgtext || "";
      const sendMc  = String(sendRes?.msgcode || "");
      if (sendMc === "104" || sendMc === "105") {
        if (sendRes.url) window.open(sendRes.url, "_blank", "width=900,height=700");
        failMessages.push(`[${master.carno}] ${sendMsg || `코드 ${sendMc}`}`);
        continue;
      }

      if (String(sendRes?.result).toLowerCase() === "false" || sendRes?.result === false) {
        failMessages.push(`[${master.carno}] ${sendMsg || "전송 실패"}`);
        continue;
      }

      // 3-a. 전송 성공 → inner_imprmn_no 로 ts_serial 갱신
      const newTsSerial = sendRes?.inner_imprmn_no || "";
      if (newTsSerial) {
        try {
          await updateTsSerial(master.est_serial, newTsSerial);
        } catch {
          // ts_serial 갱신 실패는 전송 성공으로 처리 (경고만)
          failMessages.push(`[${master.carno}] 전송은 성공했으나 ts_serial 갱신 실패`);
        }
      }

      // 3-b. 전송 성공 → 정비상세 국토부코드(ts_payno) 갱신
      try {
        const estDetails = allDetail.filter((d) => d.est_serial === master.est_serial);
        await updateEstbTsPayno(master.est_serial, estDetails);
      } catch {
        // 상세 갱신 실패는 전송 성공으로 처리 (경고만)
        failMessages.push(`[${master.carno}] 전송은 성공했으나 상세 국토부코드 갱신 실패`);
      }

      okCount++;
    }

    // 3. 결과 알림
    if (failMessages.length === 0) {
      success(`정비이력 ${okCount}건 전송 완료`);
    } else {
      const failText = failMessages.join("\n");
      if (okCount > 0) {
        warning(`${okCount}건 성공 / ${failMessages.length}건 실패\n${failText}`);
      } else {
        warning(`전송 실패\n${failText}`);
      }
    }

    // 4. 목록 새로고침
    const res = await fetchAosEstimate(outFrom, outTo);
    setRows(res?.dataset ?? []);
    setAllDetail(res?.dataset2 ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds, companyForm, filteredRows, allDetail, outFrom, outTo]);

  const onRefresh = () => onQuery();

  /**
   * 정비이력 삭제 (ts_serial ≠ '' && ts_rstcode = 'MSG50000' 인 건만)
   * @param {Set<string>|undefined} idsOverride
   */
  const onSendDelete = useCallback(async (idsOverride) => {
    const ids = idsOverride ?? checkedIds;
    if (ids.size === 0) return warning("삭제할 건을 체크하세요.");

    const targetRows = filteredRows.filter(
      (r) => ids.has(r.est_serial) && r.ts_serial && r.ts_rstcode === "MSG50000"
    );
    if (targetRows.length === 0)
      return warning("삭제할 건이 없습니다. (전송완료(성공) 건만 삭제 가능합니다)");

    // imprmn_entnum 캐시 없으면 로그인
    if (!imprmnEntnumRef.current) {
      const userid = companyForm.ts_userid;
      const passwd = companyForm.ts_userpwd;
      const idno   = companyForm.idNo;
      if (!userid || !passwd) return warning("업체정보에 국토부 아이디/비밀번호를 설정하세요.");
      try {
        const loginRes = await tsLogin({ idno, userid, passwd });
        imprmnEntnumRef.current = loginRes?.imprmn_entnum || "";
        servicecodeRef.current  = loginRes?.servicecode   || "";
      } catch (e) {
        return warning(`국토부 로그인 실패: ${e?.message || ""}`);
      }
    }

    let okCount = 0;
    const failMessages = [];

    for (const row of targetRows) {
      // 1. 국토부 삭제
      try {
        await deleteRepairHistory({
          imprmn_entnum:  imprmnEntnumRef.current,
          servicecode:    servicecodeRef.current,
          inner_imprmn_no: row.ts_serial,
        });
      } catch (e) {
        failMessages.push(`[${row.carno}] ${e?.message || "삭제 오류"}`);
        continue;
      }

      // 2. ts_serial 초기화
      try { await clearTsSerial(row.est_serial); } catch { /* continue */ }

      // 3. 전송결과 삭제
      try { await deleteTsRst(row.est_serial); } catch { /* continue */ }

      okCount++;
    }

    if (failMessages.length === 0) {
      success(`정비이력 ${okCount}건 삭제 완료`);
    } else {
      const failText = failMessages.join("\n");
      okCount > 0
        ? warning(`${okCount}건 성공 / ${failMessages.length}건 실패\n${failText}`)
        : warning(`삭제 실패\n${failText}`);
    }

    // 완료 후 새로고침
    await onQuery();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds, filteredRows, companyForm, tsLogin, deleteRepairHistory, clearTsSerial, deleteTsRst]);

  const onSendInquiry = () => requireFocused() && info(`정비이력 전송조회: ${focusedRow.id}`);
  const onQuery = useCallback(async () => {
    // ① 목록 조회
    const res = await fetchAosEstimate(outFrom, outTo);
    const newRows      = res?.dataset  ?? [];
    const newAllDetail = res?.dataset2 ?? [];
    setRows(newRows);
    setAllDetail(newAllDetail);
    setFocusedId(null);
    setCheckedIds(new Set());

    // ② 전송상태 조회 대상: ts_serial 있고 아직 최종확인(MSG50000) 아닌 행
    const stateTargets = newRows.filter(
      (r) => r.ts_serial && r.ts_rstcode !== "MSG50000"
    );
    if (stateTargets.length === 0) return;

    // ③ imprmn_entnum 캐시 없으면 로그인 1회
    if (!imprmnEntnumRef.current) {
      const userid = companyForm.ts_userid;
      const passwd = companyForm.ts_userpwd;
      const idno   = companyForm.idNo;
      if (!userid || !passwd) return;
      try {
        const loginRes = await tsLogin({ idno, userid, passwd });
        imprmnEntnumRef.current = loginRes?.imprmn_entnum || "";
        servicecodeRef.current  = loginRes?.servicecode   || "";
      } catch { return; }
    }
    if (!imprmnEntnumRef.current) return;

    // ④ otvhcle_imprmn_hist_state.aspx 호출
    let stateList;
    try {
      const stateRes = await fetchRepairState({
        imprmn_entnum: imprmnEntnumRef.current,
        servicecode:   servicecodeRef.current,
        ts_serials:    stateTargets.map((r) => r.ts_serial),
      });
      stateList = stateRes?.ts_repair_state ?? [];
      if (!Array.isArray(stateList) || stateList.length === 0) return;
    } catch (e) {
      warning(`전송상태 조회 실패: ${e?.message || "알 수 없는 오류"}`);
      return;
    }

    // ⑤ 결과 순회 → est_ts_rst_c.aspx 저장 + 로컬 rows 갱신
    const updMap = {}; // { est_serial: { ts_rstcode, ts_send_dt } }

    for (const st of stateList) {
      const matchRow = newRows.find(
        (r) => r.ts_serial === (st.inner_imprmn_no || "").trim()
      );
      if (!matchRow) continue;

      try {
        await updateTsResult({
          est_serial: matchRow.est_serial,
          ts_rstcode: st.cntc_result_code || "",
          ts_rst:     st.cntc_result_dtls || "",
          upd_code:   st.upd_code         || "",
          send_de:    st.send_de          || "",
        });
      } catch { /* 저장 실패해도 계속 */ }

      updMap[matchRow.est_serial] = {
        ts_rstcode:  st.cntc_result_code || "",
        ts_result_msg: st.cntc_result_dtls || "",
        send_de:     st.send_de          || "",
      };
    }

    // 로컬 갱신
    if (Object.keys(updMap).length > 0) {
      setRows((prev) =>
        prev.map((r) => updMap[r.est_serial] ? { ...r, ...updMap[r.est_serial] } : r)
      );
    }
  }, [fetchAosEstimate, outFrom, outTo, companyForm, tsLogin, fetchRepairState, updateTsResult]);

  // ====== 초기 조회 (복원된 출고일자 or 금월) ======
  useEffect(() => {
    onQuery();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // const onModify = () => requireFocused() && info(`수정: ${focusedRow.id}`);
  const onDelete  = () => requireFocused() && info(`삭제: ${focusedRow.id}`);

  const onModify = () => {
    if (!requireFocused()) return;
    setEditInit({
      carno: focusedRow.carno || "",
      carname: focusedRow.carname || "",
      lastkm: focusedRow.lastkm ?? "",
      vinno: focusedRow.vinno || "",
      w_manname: focusedRow.w_manname || "",
      custom_name: focusedRow.custom_name || "",
      hp0: focusedRow.hp0 || "",
      hp1: focusedRow.hp1 || "",
      hp2: focusedRow.hp2 || "",
      car_registday: focusedRow.car_registday || "",
      inday: focusedRow.inday || "",
      outday: focusedRow.outday || "",
      accday: focusedRow.accday || "",
    });
    setEditOpen(true);
  };
  


  return (
    // <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
    <div className="bg-zinc-50 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">국토부 정비이력 전송</div>
              <div className="text-xs text-zinc-500">정비이력 조회 · 전송 · 전송상태 확인</div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              onClick={() => info("[국토부전송] 퀵버튼")}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              국토부전송
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full px-4 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* 2) Global Action (버튼 나열: 보험견적처럼 별도 라인) */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={onNew}
            >
              + 신규
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onAosLoad}
            >
              AOS 견적 불러오기
            </button>

            <button
              className="rounded-md bg-sky-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSend()}
              disabled={sending}
            >
              {sending ? "전송 중…" : "정비이력 전송"}
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSendDelete()}
              disabled={deleting}
            >
              {deleting ? "삭제 중…" : "정비이력 삭제"}
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onRefresh}
            >
              새로고침
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onSendInquiry}
            >
              정비이력 전송조회
            </button>
          </div>
        </div>

        {/* 3) 조회/검색 (보험견적 카드 스타일 그대로) */}
        <div className="mb-3 rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-zinc-800">출고일자</div>

              <input
                type="date"
                value={outFrom}
                onChange={(e) => {
                  setOutFrom(e.target.value);
                  setMonthAnchor(new Date(e.target.value));
                }}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
              />
              <span className="text-zinc-400">~</span>
              <input
                type="date"
                value={outTo}
                onChange={(e) => setOutTo(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
              />

              {/* 전달 / 금월 / < > */}
              <div className="flex items-center gap-1">
                <MiniBtn
                  onClick={() => {
                    const d = addMonths(monthAnchor, -1);
                    const r = monthRange(d);
                    setOutFrom(r.from); setOutTo(r.to); setMonthAnchor(d);
                  }}
                >
                  전달
                </MiniBtn>
                <MiniBtn
                  onClick={() => {
                    const d = new Date();
                    const r = monthRange(d);
                    setOutFrom(r.from); setOutTo(r.to);
                    setMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                >
                  금월
                </MiniBtn>
                <MiniBtn
                  title="-1개월"
                  onClick={() => {
                    const d = addMonths(monthAnchor, -1);
                    const r = monthRange(d);
                    setOutFrom(r.from); setOutTo(r.to); setMonthAnchor(d);
                  }}
                >
                  {"<"}
                </MiniBtn>
                <MiniBtn
                  title="+1개월"
                  onClick={() => {
                    const d = addMonths(monthAnchor, +1);
                    const r = monthRange(d);
                    setOutFrom(r.from); setOutTo(r.to); setMonthAnchor(d);
                  }}
                >
                  {">"}
                </MiniBtn>
              </div>

              <button
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={onQuery}
              >
                조회
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="차량번호/차량명/고객명/연락처 검색"
                className="w-[520px] max-w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
              />

              <button
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => info("검색")}
              >
                검색
              </button>

              <label className="ml-1 inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyUnsent}
                  onChange={(e) => setOnlyUnsent(e.target.checked)}
                />
                미전송건
              </label>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="select-base ml-auto"
              >
                <option value="1">1.입력순</option>
                <option value="2">2. 입고일자순</option>
                <option value="3">3. 차량번호순</option>
                <option value="4">4. 고객명순</option>
                <option value="5">5. 차량명순</option>
                <option value="6">6. 연락처순</option>
              </select>
            </div>

          </div>
        </div>


        {/* ===== 메인 목록 ===== */}
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="border-b border-zinc-100 px-4 h-11 shrink-0 flex items-center gap-3">
            <div className="text-sm font-semibold text-zinc-900">견적 목록</div>
            <div className="text-xs text-zinc-500">{filteredRows.length}건</div>
            {focusedRow && (
              <div className="ml-auto flex items-center gap-1.5">
                <SmallBtn onClick={onModify}>수정</SmallBtn>
                <SmallBtn onClick={onDelete}>삭제</SmallBtn>
                <SmallBtn
                  onClick={() => onSend(new Set([focusedRow.est_serial]))}
                  disabled={sending}
                >
                  {sending ? "전송 중…" : "정비이력전송"}
                </SmallBtn>
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <TableLoadingOverlay loading={listLoading} />
            <FixedHeadTable
              columns={mainColumns}
              rows={filteredRows}
              rowKey={(r) => r.est_serial}
              selectedKey={focusedId}
              onRowClick={(r) => setFocusedId(r.est_serial)}
              onRowDoubleClick={(r) => { setFocusedId(r.est_serial); onModify(); }}
              getRowProps={(r) => ({
                onContextMenu: (e) => {
                  e.preventDefault();
                  setFocusedId(r.est_serial);
                  setContextMenu({ x: e.clientX, y: e.clientY, row: r });
                },
              })}
              height="100%"
              bodyClassName="min-h-0 flex-1"
              rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-100"
              gutterHoverClass="!bg-gray-50"
            />
          </div>

          {/* ===== 국토부 전송 상태 정보 라인 ===== */}
          <div className="border-t border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800">
            <div className="grid grid-cols-2 items-center">
              <div>
                <span className="font-semibold">경정상태 :</span>
                <span className="ml-1 font-bold text-blue-600">
                  {{ N: "신규", U: "수정", D: "삭제" }[focusedRow?.upd_code] ?? ""}
                </span>
              </div>

              <div>
                <span className="font-semibold">전송일시 :</span>
                <span className="ml-1">{focusedRow?.send_de}</span>
              </div>
            </div>

            <div className="mt-1 flex">
              <span className="font-semibold whitespace-nowrap">
                국토부 전송상태 :
              </span>
              <span className="ml-1 text-zinc-700">
                {focusedRow?.ts_result_msg }
              </span>
            </div>
          </div>


        </div>

        {/* ===== 정비상세 목록 ===== */}
        {/* <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0 overflow-hidden" style={{ height: 320 }}> */}
        <div className="mt-3 rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col overflow-hidden h-[320px] min-h-0">

          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">정비상세</div>
              <div className="text-xs text-zinc-500">{focusedRow ? "선택 건 기준" : "목록에서 건을 선택하세요"}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <FixedHeadTable
              columns={detailColumns}
              rows={focusedRow ? detailRows : []}
              rowKey={(r) => r.estb_orgseqno}
              emptyText={focusedRow ? "정비상세가 없습니다." : "목록에서 선택하면 정비상세가 표시됩니다."}
              height="100%"
              bodyClassName="min-h-0 flex-1"
              bodyScrollRef={detailBodyElRef}
            />
          </div>
        </div>

      </div>

      <RepairHistoryEditModal
        open={editOpen}
        initial={editInit}
        onClose={() => setEditOpen(false)}
        onSave={(form) => {
          // TODO: 실제 저장 API 연결(useApi 훅)
          // useAlert().success("저장되었습니다.");
          setEditOpen(false);
        }}
      />


      {/* 국토부 대분류 팝오버 */}
      {tsPaynoPopover && (
        <SimplePopover
          anchorRect={tsPaynoPopover.anchorRect}
          onClose={closeTsPaynoPopover}
          placement="bottom-left"
          minWidth="140px"
          noTitle
        >
          <div className="p-1 flex flex-col gap-0.5">
            <button
              type="button"
              className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 text-zinc-400"
              onClick={() => applyTsPayno("", tsPaynoPopover.rowOrgSeq)}
            >
              (없음)
            </button>
            {[...new Set(paynoList.map((r) => r.payno_kind_nm))].map((kind) => (
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
        </SimplePopover>
      )}

      {/* 국토부 소분류 flyout */}
      {tsPaynoSubRect && tsPaynoPopover && (
        <div
          className="fixed rounded-md border border-zinc-200 bg-white shadow-lg z-[51] overflow-y-auto"
          style={{
            top:      Math.min(tsPaynoSubRect.rect.top, window.innerHeight - 320),
            left:     tsPaynoSubRect.rect.right + 4,
            maxHeight: "300px",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1 flex flex-col gap-0.5">
            {paynoList
              .filter((r) => r.payno_kind_nm === tsPaynoSubRect.kind)
              .map((item) => (
                <button
                  key={item.payno}
                  type="button"
                  className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                  onClick={() => applyTsPayno(item.payno, tsPaynoPopover.rowOrgSeq)}
                >
                  {item.payno_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 부품구분 WRK03 팝오버 */}
      {partStatePopover && (
        <SimplePopover
          anchorRect={partStatePopover.anchorRect}
          onClose={closePartStatePopover}
          placement="bottom-left"
          minWidth="140px"
          noTitle
        >
          <div className="p-1 flex flex-col gap-0.5">
            <button
              type="button"
              className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 text-zinc-400"
              onClick={() => applyPartState("", partStatePopover.rowOrgSeq)}
            >
              (없음)
            </button>
            {wrk03Codes.filter((c) => String(c.state) === "1").map((item) => (
              <button
                key={item.value}
                type="button"
                className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                onClick={() => applyPartState(item.value, partStatePopover.rowOrgSeq)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </SimplePopover>
      )}

      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          row={contextMenu.row}
          onClose={() => setContextMenu(null)}
          onModify={() => { setContextMenu(null); onModify(); }}
          onDelete={() => { setContextMenu(null); onDelete(); }}
          onSend={() => { const ids = new Set([contextMenu.row.est_serial]); setContextMenu(null); onSend(ids); }}
        />
      )}

    </div>

    
  );

  
}

