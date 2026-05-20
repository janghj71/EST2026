// src/pages/RepairHistorySend.jsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import FixedHeadTable from "../components/FixedHeadTable";
import { X, Save, Pen, Pencil, Send, Trash2 } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { moveFocusOnEnter } from "../utils/focusUtils";
import { getUserid, API_TSSERVICE } from "../api/config";
import { monthRange, addMonths } from "../utils/dateUtils";
import { formatMoney, formatNumber } from "../utils/numberFormat";
import { useAosEstimate, useAosEstimateUpdate, useAosEstbUpdate, useEstTsRstUpdate, useEstTsRepairUpdate, useEstTsRstDelete, useTsRepairList, useMasterEstimatebUpdate, useAosEstDelete, useAosEstSave, useAosEstSingle, useAosEstCreate, useAosEstbSave, useAosEstbDelete } from "../hooks/useAosEstimate";
import { useTs_repart, useTsLogin, useTsRepairSend, useTsRepairState, useTsRepairDelete, useClientIp } from "../hooks/useTs_Repair";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useTbCode } from "../hooks/useTbCode";
import { buildRepairJsondata } from "../utils/repairJsondata";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import SimplePopover from "./estimate/SimplePopover";
import AosLoadModal from "./AosLoadModal";
import { openCenteredWindow } from "../utils/popup";


const inputCls =
  "h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none " +
  "focus:outline-none focus:ring-2 focus:ring-gray-900/10"

const SS_FILTER_KEY = "repair_history_filter";
function loadSavedFilter() {
  try { return JSON.parse(sessionStorage.getItem(SS_FILTER_KEY)); } catch { return null; }
}




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

/**
 * AOS 견적 신규/수정 통합 모달
 * - estSerial prop: 신규 채번 후 전달된 est_serial (또는 수정 대상)
 * - 마운트 시 est_aosest_s.aspx 단건 조회 → 마스터 + 상세 편집
 * - 상세: est_aosestb_c.aspx (upsert), est_aosestb_d.aspx (삭제)
 */
function RepairHistoryEditModal({ open, estSerial, isNew, onClose, onSaved, wrk03Codes, paynoList }) {
  const { fetchAosEstSingle } = useAosEstSingle();
  const { loading: savingMaster, saveAosEst } = useAosEstSave();
  const { loading: savingDetail, saveAosEstb } = useAosEstbSave();
  const { loading: deletingDetail, deleteAosEstb } = useAosEstbDelete();
  const { warning, success } = useAlert();

  const modalRef = useRef(null);
  const masterFormRef = useRef(null);
  const [loadingData, setLoadingData] = useState(false);
  const [master, setMaster] = useState({});
  const [details, setDetails] = useState([]);
  // 편집 중인 상세 행 (null = 없음)
  const [editingDetailIdx, setEditingDetailIdx] = useState(null);
  // 팝오버
  const [detailTsPopover, setDetailTsPopover] = useState(null);   // { anchorRect, idx }
  const [detailTsSubRect, setDetailTsSubRect] = useState(null);   // { rect, kind }
  const [detailWkPopover, setDetailWkPopover] = useState(null);   // { anchorRect, idx }
  const [detailPsPopover, setDetailPsPopover]  = useState(null);  // { anchorRect, idx }

  // estSerial 변경 시 단건 조회
  useEffect(() => {
    if (!open || !estSerial) return;
    setLoadingData(true);
    setDetails([]);
    setEditingDetailIdx(null);
    fetchAosEstSingle(estSerial)
      .then((res) => {
        const m = res?.dataset?.[0] ?? {};
        setMaster({
          carno: m.carno || "",
          carname: m.carname || "",
          lastkm: m.lastkm ?? "",
          vinno: m.vinno || "",
          w_manname: m.w_manname || "",
          custom_name: m.custom_name || "",
          hp0: m.hp0 || "",
          hp1: m.hp1 || "",
          hp2: m.hp2 || "",
          car_registday: m.car_registday || "",
          inday: m.inday || "",
          outday: m.outday || "",
          accday: m.accday || "",
          add_repair: m.add_repair ?? "1",
        });
        setDetails(res?.dataset2 ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [open, estSerial]); // eslint-disable-line react-hooks/exhaustive-deps

  const setM = (key) => (e) => setMaster((p) => ({ ...p, [key]: e.target.value }));

  // ── 마스터 저장 ──
  const handleSaveMaster = async () => {
    try {
      const res = await saveAosEst({ ...master, est_serial: estSerial });
      if (String(res?.result) === "false") { warning(res?.msg || "저장 중 오류"); return; }
      success("저장되었습니다.");
      onSaved?.();
    } catch (e) { warning(e?.message || "저장 오류"); }
  };

  // ── 상세 행 추가 ──
  const addDetailRow = () => {
    const newRow = {
      estb_orgseqno: "", est_serial: estSerial,
      payname: "", workcode: "",
      part_makercode: "", part_state: "", ts_payno: "", paykind: "1",
      _isNew: true,
    };
    setDetails((p) => [...p, newRow]);
    setEditingDetailIdx(details.length);
  };

  // ── 상세 인라인 편집 ──
  const setDField = (idx, key) => (e) => {
    setDetails((p) => p.map((r, i) => i === idx ? { ...r, [key]: e.target.value } : r));
  };
  const setDVal = (idx, key, val) => {
    setDetails((p) => p.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  };

  // ── 상세 저장 ──
  const handleSaveDetail = async (idx) => {
    const d = details[idx];
    if (!d) return;
    const paykind = d.part_state ? "5" : "1";
    try {
      const res = await saveAosEstb({
        est_serial: estSerial,
        estb_orgseqno: d.estb_orgseqno || "",
        paykind,
        payname: d.payname || "",
        workcode: d.workcode || "",
        part_makercode: d.part_makercode || "",
        part_state: d.part_state || "",
        ts_payno: d.ts_payno || "",
      });
      if (String(res?.result) === "false") { warning(res?.msg || "저장 오류"); return; }
      // 저장 후 재조회
      const fresh = await fetchAosEstSingle(estSerial);
      setDetails(fresh?.dataset2 ?? []);
      setEditingDetailIdx(null);
    } catch (e) { warning(e?.message || "저장 오류"); }
  };

  // ── 상세 행 Enter 키 이동 (input/select만 대상, 마지막에서 Enter → 저장) ──
  const makeDetailKeyDown = (idx) => (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    const tr = e.currentTarget.closest("tr");
    if (!tr) return;
    const inputs = Array.from(tr.querySelectorAll("input:not([disabled]), select:not([disabled])"));
    const i = inputs.indexOf(e.currentTarget);
    if (i === -1) return;
    if (i + 1 < inputs.length) {
      inputs[i + 1].focus();
    } else {
      handleSaveDetail(idx);
    }
  };

  // ── 상세 삭제 ──
  const handleDeleteDetail = async (idx) => {
    const d = details[idx];
    if (!d) return;
    if (d._isNew) { setDetails((p) => p.filter((_, i) => i !== idx)); setEditingDetailIdx(null); return; }
    try {
      const res = await deleteAosEstb(d.estb_orgseqno);
      if (String(res?.result) === "false") { warning(res?.msg || "삭제 오류"); return; }
      setDetails((p) => p.filter((_, i) => i !== idx));
      setEditingDetailIdx(null);
    } catch (e) { warning(e?.message || "삭제 오류"); }
  };

  // ── 모달 정비상세 컬럼 정의 ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const modalDetailColumns = useMemo(() => [
    {
      key: "ts_payno",
      title: "국토부",
      width: "12%",
      align: "left",
      render: (v, row) => {
        const idx = details.findIndex((r) => r === row);
        const isEditing = editingDetailIdx === idx;
        if (!isEditing) return <span>{v || ""}</span>;
        return (
          <button
            type="button"
            className={`${inputCls} w-full text-left text-xs py-1`}
            onClick={(e) => {
              e.stopPropagation();
              setDetailTsSubRect(null);
              setDetailTsPopover({ anchorRect: e.currentTarget.getBoundingClientRect(), idx });
            }}
          >
            {v || <span className="text-zinc-400">선택</span>}
          </button>
        );
      },
    },
    {
      key: "part_makercode",
      title: "부품코드",
      width: "10%",
      align: "left",
      render: (v, row) => {
        const idx = details.findIndex((r) => r === row);
        const isEditing = editingDetailIdx === idx;
        if (!isEditing) return <span>{v || ""}</span>;
        return (
          <input
            value={v || ""}
            onChange={setDField(idx, "part_makercode")}
            onKeyDown={makeDetailKeyDown(idx)}
            className={`${inputCls} w-full text-xs py-1`}
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    {
      key: "payname",
      title: "작업내용",
      width: "26%",
      align: "left",
      render: (v, row) => {
        const idx = details.findIndex((r) => r === row);
        const isEditing = editingDetailIdx === idx;
        if (!isEditing) return <span className="block truncate">{v || ""}</span>;
        return (
          <input
            value={v || ""}
            onChange={setDField(idx, "payname")}
            onKeyDown={makeDetailKeyDown(idx)}
            className={`${inputCls} w-full text-xs py-1`}
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    {
      key: "workcode",
      title: "작업",
      width: "10%",
      align: "left",
      render: (v, row) => {
        const idx = details.findIndex((r) => r === row);
        const isEditing = editingDetailIdx === idx;
        if (!isEditing) return <span>{row.workcodename || WORK_OPTIONS.find((c) => c.code === v)?.label || v || ""}</span>;
        return (
          <button
            type="button"
            className={`${inputCls} w-full text-left text-xs py-1`}
            onClick={(e) => {
              e.stopPropagation();
              setDetailWkPopover({ anchorRect: e.currentTarget.getBoundingClientRect(), idx });
            }}
          >
            {v ? (WORK_OPTIONS.find((c) => c.code === v)?.label ?? v) : <span className="text-zinc-400">선택</span>}
          </button>
        );
      },
    },
    {
      key: "part_state",
      title: "부품구분",
      width: "10%",
      align: "left",
      render: (v, row) => {
        const idx = details.findIndex((r) => r === row);
        const isEditing = editingDetailIdx === idx;
        const label = (wrk03Codes || []).find((c) => c.value === v)?.label || v || "";
        if (!isEditing) return <span>{label}</span>;
        return (
          <button
            type="button"
            className={`${inputCls} w-full text-left text-xs py-1`}
            onClick={(e) => {
              e.stopPropagation();
              setDetailPsPopover({ anchorRect: e.currentTarget.getBoundingClientRect(), idx });
            }}
          >
            {v ? label : <span className="text-zinc-400">선택</span>}
          </button>
        );
      },
    },
    {
      key: "__actions",
      title: "",
      width: "12%",
      align: "center",
      render: (_, row) => {
        const idx = details.findIndex((r) => r === row);
        const isEditing = editingDetailIdx === idx;
        if (!isEditing) return null;
        return (
          <div className="flex gap-1 items-center justify-center whitespace-nowrap">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSaveDetail(idx); }}
              disabled={savingDetail}
              className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50"
            >저장</button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDeleteDetail(idx); }}
              disabled={deletingDetail}
              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >삭제</button>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [details, editingDetailIdx, savingDetail, deletingDetail, wrk03Codes]);

  if (!open) return null;

  const isBusy = loadingData || savingMaster || savingDetail || deletingDetail;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-[960px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col"
          style={{ maxHeight: "92vh" }}
        >
          {/* header */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 shrink-0">
            <Pen className="h-4 w-4 text-zinc-700" />
            <span className="text-base font-semibold text-zinc-900">{isNew ? "신규 정비이력" : "정비이력 수정"}</span>
            {estSerial && <span className="text-xs text-zinc-400 ml-1">({estSerial})</span>}
            <button type="button" className="ml-auto rounded-md border border-zinc-200 bg-white p-2 hover:bg-zinc-50" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* body – scrollable */}
          <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
            {loadingData && <div className="text-center text-sm text-zinc-400 py-4">불러오는 중…</div>}

            {/* ── 마스터 입력 ── */}
            <div
              ref={masterFormRef}
              className="grid grid-cols-2 gap-x-8 gap-y-3"
              onKeyDown={(e) => moveFocusOnEnter(e, masterFormRef.current)}
            >
              {/* 좌 1 */}
              <Field label="차량번호"><input value={master.carno || ""} onChange={setM("carno")} className={`${inputCls} w-full`} /></Field>
              {/* 우 1 */}
              <Field label="고객명"><input value={master.custom_name || ""} onChange={setM("custom_name")} className={`${inputCls} w-full`} /></Field>

              {/* 좌 2 */}
              <Field label="차량명"><input value={master.carname || ""} onChange={setM("carname")} className={`${inputCls} w-full`} /></Field>
              {/* 우 2 */}
              <Field label="연락처">
                <div className="flex items-center gap-2">
                  <input value={master.hp0 || ""} onChange={setM("hp0")} className={`${inputCls} w-[75px]`} />
                  <span className="text-zinc-500">-</span>
                  <input value={master.hp1 || ""} onChange={setM("hp1")} className={`${inputCls} w-[80px]`} />
                  <span className="text-zinc-500">-</span>
                  <input value={master.hp2 || ""} onChange={setM("hp2")} className={`${inputCls} w-[80px]`} />
                </div>
              </Field>

              {/* 좌 3 */}
              <Field label="주행거리"><input value={master.lastkm || ""} onChange={setM("lastkm")} className={`${inputCls} w-full text-right`} inputMode="numeric" /></Field>
              {/* 우 3 */}
              <Field label="등록일자"><input type="date" value={master.car_registday || ""} onChange={setM("car_registday")} className={`${inputCls} w-full`} /></Field>

              {/* 좌 4 */}
              <Field label="차대번호"><input value={master.vinno || ""} onChange={setM("vinno")} className={`${inputCls} w-full`} /></Field>
              {/* 우 4 — 사고일자 (입고일자 위) */}
              <Field label="사고일자"><input type="date" value={master.accday || ""} onChange={setM("accday")} className={`${inputCls} w-full`} /></Field>

              {/* 좌 5 */}
              <Field label="정비책임자"><input value={master.w_manname || ""} onChange={setM("w_manname")} className={`${inputCls} w-full`} /></Field>
              {/* 우 5 — 입고일자 */}
              <Field label="입고일자"><input type="date" value={master.inday || ""} onChange={setM("inday")} className={`${inputCls} w-full`} /></Field>

              {/* 좌 6 — 추가수리비 동의함 체크박스 */}
              <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                <div className="text-sm font-semibold text-zinc-700">추가수리비</div>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={master.add_repair === "1"}
                    onChange={(e) => setMaster((p) => ({ ...p, add_repair: e.target.checked ? "1" : "0" }))}
                  />
                  동의함
                </label>
              </div>
              {/* 우 6 — 출고일자 */}
              <Field label="출고일자"><input type="date" value={master.outday || ""} onChange={setM("outday")} className={`${inputCls} w-full`} /></Field>
            </div>

            {/* 마스터 저장 버튼 */}
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleSaveMaster}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                기본정보 저장
              </button>
            </div>

            {/* ── 정비상세 ── */}
            <div className="rounded-md border border-zinc-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50">
                <span className="text-sm font-semibold text-zinc-800">정비상세</span>
                <button
                  type="button"
                  onClick={addDetailRow}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  + 행 추가
                </button>
              </div>
              <div style={{ height: 240 }} className="min-h-0">
                <FixedHeadTable
                  columns={modalDetailColumns}
                  rows={details}
                  rowKey={(r, i) => r.estb_orgseqno || `_new_${i}`}
                  height="100%"
                  tableTextClass="text-xs"
                  emptyText={loadingData ? "불러오는 중…" : "정비상세가 없습니다. [+ 행 추가]를 클릭하세요."}
                  onRowClick={(row) => {
                    const idx = details.findIndex((r) => r === row);
                    if (editingDetailIdx !== idx) setEditingDetailIdx(idx);
                  }}
                  getRowClassName={(row) => {
                    const idx = details.findIndex((r) => r === row);
                    return editingDetailIdx === idx ? "!bg-blue-50" : "";
                  }}
                  rowSelectedClass=""
                  rowHoverClass="hover:!bg-zinc-50"
                  gutterSelectedClass=""
                  gutterHoverClass="!bg-zinc-50"
                  wheelSelect={false}
                />
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 bg-white shrink-0">
            <IconBtn icon={X} label="닫기" className="h-10 w-25 justify-center" onClick={onClose} />
          </div>
        </div>
      </div>

      {/* 상세 국토부 대분류 팝오버 */}
      {detailTsPopover && (
        <SimplePopover
          anchorRect={detailTsPopover.anchorRect}
          onClose={() => { setDetailTsPopover(null); setDetailTsSubRect(null); }}
          placement="bottom-left"
          minWidth="140px"
          noTitle
        >
          <div className="p-1 flex flex-col gap-0.5">
            <button type="button" className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 text-zinc-400"
              onClick={() => { setDVal(detailTsPopover.idx, "ts_payno", ""); setDetailTsPopover(null); setDetailTsSubRect(null); }}>
              (없음)
            </button>
            {[...new Set((paynoList || []).map((r) => r.payno_kind_nm))].map((kind) => (
              <button key={kind} type="button"
                className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 flex justify-between items-center gap-4"
                onClick={(e) => setDetailTsSubRect({ rect: e.currentTarget.getBoundingClientRect(), kind })}>
                <span>{kind}</span><span className="text-zinc-400">{">"}</span>
              </button>
            ))}
          </div>
        </SimplePopover>
      )}
      {detailTsSubRect && detailTsPopover && (
        <div className="fixed rounded-md border border-zinc-200 bg-white shadow-lg z-[9999] overflow-y-auto"
          style={{ top: Math.min(detailTsSubRect.rect.top, window.innerHeight - 320), left: detailTsSubRect.rect.right + 4, maxHeight: "300px" }}
          onMouseDown={(e) => e.stopPropagation()}>
          <div className="p-1 flex flex-col gap-0.5">
            {(paynoList || []).filter((r) => r.payno_kind_nm === detailTsSubRect.kind).map((item) => (
              <button key={item.payno} type="button"
                className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                onClick={() => {
                  setDVal(detailTsPopover.idx, "ts_payno", item.payno);
                  setDetailTsPopover(null); setDetailTsSubRect(null);
                }}>
                {item.payno_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 상세 작업 팝오버 */}
      {detailWkPopover && (
        <SimplePopover
          anchorRect={detailWkPopover.anchorRect}
          onClose={() => setDetailWkPopover(null)}
          placement="bottom-left"
          minWidth="100px"
          noTitle
        >
          <div className="p-1 flex flex-col gap-0.5">
            <button type="button" className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 text-zinc-400"
              onClick={() => { setDVal(detailWkPopover.idx, "workcode", ""); setDetailWkPopover(null); }}>
              (없음)
            </button>
            {WORK_OPTIONS.map((item) => (
              <button key={item.code} type="button"
                className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                onClick={() => { setDVal(detailWkPopover.idx, "workcode", item.code); setDetailWkPopover(null); }}>
                {item.label}
              </button>
            ))}
          </div>
        </SimplePopover>
      )}

      {/* 상세 부품구분 팝오버 */}
      {detailPsPopover && (
        <SimplePopover
          anchorRect={detailPsPopover.anchorRect}
          onClose={() => setDetailPsPopover(null)}
          placement="bottom-left"
          minWidth="140px"
          noTitle
        >
          <div className="p-1 flex flex-col gap-0.5">
            <button type="button" className="text-left rounded px-2 py-1 text-sm hover:bg-zinc-50 text-zinc-400"
              onClick={() => { setDVal(detailPsPopover.idx, "part_state", ""); setDetailPsPopover(null); }}>
              (없음)
            </button>
            {(wrk03Codes || []).filter((c) => String(c.state) === "1").map((item) => (
              <button key={item.value} type="button"
                className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-50"
                onClick={() => { setDVal(detailPsPopover.idx, "part_state", item.value); setDetailPsPopover(null); }}>
                {item.label}
              </button>
            ))}
          </div>
        </SimplePopover>
      )}
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

/** 경정사유 입력 모달 */
function AmendReasonModal({ open, onConfirm, onCancel }) {
  const [value, setValue] = React.useState("");
  React.useEffect(() => { if (open) setValue(""); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-md border border-zinc-200 bg-white shadow-xl p-5 flex flex-col gap-4">
        <div className="text-sm font-semibold text-zinc-900">경정사유 입력</div>
        <input
          autoFocus
          className="h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-gray-900/10 w-full"
          placeholder="경정사유를 입력하세요"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(value); if (e.key === "Escape") onCancel(); }}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            onClick={onCancel}
          >취소</button>
          <button
            type="button"
            className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
            onClick={() => onConfirm(value)}
          >확인</button>
        </div>
      </div>
    </div>
  );
}

const UPD_CODE_LABEL = { N: "신규", U: "수정", D: "삭제" };

function SendStatusBadge({ ts_serial, ts_rstcode, upd_code }) {
  if (!ts_serial) return null;
  const prefix = UPD_CODE_LABEL[upd_code] ?? "";
  const label  = (s) => prefix ? `${prefix} ${s}` : s;

  if (ts_rstcode === "MSG50000") return <Badge tone="ok">{label("성공")}</Badge>;
  if (!ts_rstcode)               return <Badge tone="warn">{label("처리중")}</Badge>;
  return                                <Badge tone="err">{label("오류")}</Badge>;
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
function RowContextMenu({ x, y, row, onClose, onModify, onDelete, onSend, showEditDelete = true }) {
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
      {showEditDelete && <CtxItem icon={Pencil} onClick={onModify}>수정</CtxItem>}
      {showEditDelete && <CtxItem icon={Trash2} onClick={onDelete}>삭제</CtxItem>}
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
  const { info, success, warning, remove } = useAlert();
  const location = useLocation();

  // 대시보드에서 전송일자로 진입했는지 여부 (마운트 시 고정)
  const tsSendMode = !!location.state?.ts_send_dt1;

  const today = useMemo(() => new Date(), []);
  const initRange = useMemo(() => monthRange(today), [today]);
  const [outFrom, setOutFrom] = useState(() => {
    if (location.state?.ts_send_dt1) return location.state.ts_send_dt1;
    return loadSavedFilter()?.outFrom ?? initRange.from;
  });
  const [outTo, setOutTo] = useState(() => {
    if (location.state?.ts_send_dt2) return location.state.ts_send_dt2;
    return loadSavedFilter()?.outTo ?? initRange.to;
  });
  const [monthAnchor, setMonthAnchor] = useState(() => {
    if (location.state?.ts_send_dt1) return new Date(location.state.ts_send_dt1);
    const saved = loadSavedFilter()?.outFrom;
    return saved ? new Date(saved) : new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState("1"); // 1~6
  const [onlyUnsent,  setOnlyUnsent]  = useState(false);
  const [onlySuccess, setOnlySuccess] = useState(false);
  const [onlyError,   setOnlyError]   = useState(() => location.state?.onlyError ?? false);
  const [onlyNew,     setOnlyNew]     = useState(false); // upd_code = N
  const [onlyUpdated, setOnlyUpdated] = useState(false); // upd_code = U
  const [onlyDeleted, setOnlyDeleted] = useState(false); // upd_code = D
  const [activeTab,   setActiveTab]   = useState(() => location.state?.activeTab ?? "aos"); // "aos" | "adl"
  const [editOpen, setEditOpen] = useState(false);
  const [editEstSerial, setEditEstSerial] = useState(null);
  const [isNewEdit, setIsNewEdit] = useState(false);

  // ====== 선택/상세 ======
  const detailBodyElRef = useRef(null);
  const [focusedId, setFocusedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [detailRows, setDetailRows] = useState([]);
  const [tsPaynoPopover, setTsPaynoPopover] = useState(null);  // { anchorRect, rowOrgSeq }
  const [tsPaynoSubRect, setTsPaynoSubRect] = useState(null);  // { rect, kind }
  const [partStatePopover, setPartStatePopover] = useState(null); // { anchorRect, rowOrgSeq }
  const [amendModalOpen, setAmendModalOpen] = useState(false);
  const amendResolverRef = useRef(null);

  /** 경정사유 모달을 열고 입력값(또는 null)을 Promise로 반환 */
  const promptAmendReason = useCallback(() => {
    setAmendModalOpen(true);
    return new Promise((resolve) => { amendResolverRef.current = resolve; });
  }, []);
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
  const { loading: adlLoading,  fetchTsRepairList } = useTsRepairList();
  const { updateTsSerial }                  = useAosEstimateUpdate();
  const { updateEstbTsPayno }               = useAosEstbUpdate();
  const { updateMasterEstimatebTsPayno }    = useMasterEstimatebUpdate();
  const { fetchTsPayno }                    = useTs_repart();
  const { tsLogin }                         = useTsLogin();
  const { loading: sending, sendRepairHistory } = useTsRepairSend();
  const { fetchRepairState }                = useTsRepairState();
  const { loading: deleting, deleteRepairHistory } = useTsRepairDelete();
  const { updateTsResult }                  = useEstTsRstUpdate();
  const { clearTsSerial, updateTsRepairSerial } = useEstTsRepairUpdate();
  const { deleteAosEst }                    = useAosEstDelete();
  const { loading: creating, createAosEst } = useAosEstCreate();
  const { deleteTsRst }                     = useEstTsRstDelete();
  const { fetchClientIp }                   = useClientIp();

  // 탭별 분기 설정
  const tabConfig = useMemo(() => ({
    fetchFn:           activeTab === "aos" ? fetchAosEstimate          : fetchTsRepairList,
    updateTsSerialFn:  activeTab === "aos" ? updateTsSerial            : updateTsRepairSerial,
    updateEstbFn:      activeTab === "aos" ? updateEstbTsPayno         : updateMasterEstimatebTsPayno,
    gubun:             activeTab === "aos" ? "1"                       : "0",
  }), [activeTab, fetchAosEstimate, fetchTsRepairList, updateTsSerial, updateTsRepairSerial, updateEstbTsPayno, updateMasterEstimatebTsPayno]);

  const listLoading2 = activeTab === "aos" ? listLoading : adlLoading;

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

    // 미전송 / 성공 / 오류 중 하나라도 체크되면 OR 조건으로 필터링
    if (onlyUnsent || onlySuccess || onlyError) {
      r = r.filter((x) => {
        if (onlyUnsent  && !x.ts_serial) return true;
        if (onlySuccess && x.ts_rstcode === "MSG50000") return true;
        if (onlyError   && x.ts_serial && x.ts_rstcode && x.ts_rstcode !== "MSG50000") return true;
        return false;
      });
    }

    // 신규 / 수정 / 삭제 — 위 결과에 AND 조건으로 추가 필터링 (그룹 내 OR)
    if (onlyNew || onlyUpdated || onlyDeleted) {
      r = r.filter((x) => {
        if (onlyNew     && x.upd_code === "N") return true;
        if (onlyUpdated && x.upd_code === "U") return true;
        if (onlyDeleted && x.upd_code === "D") return true;
        return false;
      });
    }

    const cmp = {
      "1": (a, b) => (a.est_serial > b.est_serial ? -1 : 1), // 입력순 역순(최신↑)
      "2": (a, b) => (a.inday  > b.inday  ? -1 : 1),          // 입고일자 역순(최신↑)
      "7": (a, b) => (a.outday > b.outday ? -1 : 1),          // 출고일자 역순(최신↑)
      "3": (a, b) => (a.carno > b.carno ? 1 : -1),           // 차량번호순
      "4": (a, b) => (a.custom_name > b.custom_name ? 1 : -1), // 고객명순
      "5": (a, b) => (a.carname > b.carname ? 1 : -1),       // 차량명순
      "6": (a, b) => (`${a.hp0}${a.hp1}${a.hp2}` > `${b.hp0}${b.hp1}${b.hp2}` ? 1 : -1), // 연락처순
    }[sortKey];

    if (cmp) r.sort(cmp);
    return r;
  }, [rows, searchText, sortKey, onlyUnsent, onlySuccess, onlyError, onlyNew, onlyUpdated, onlyDeleted]);
  
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
        width: "10%",
        align: "center",
        render: (v, row) => <SendStatusBadge ts_serial={row.ts_serial} ts_rstcode={v} upd_code={row.upd_code} />,
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
    { key: "payname", title: "작업내용", width: "30%", align: "left" },
    { key: "workcodename", title: "작업", width: "8%", align: "left" },
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

  const onNew = async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const res = await createAosEst({
        inday: today,
        userid: getUserid(),
        w_manname: companyForm.supman || "",
      });
      if (String(res?.result) === "false") { warning(res?.msg || "채번 실패"); return; }
      const newSerial = res?.newserial || res?.est_serial || "";
      if (!newSerial) { warning("채번된 견적번호가 없습니다."); return; }
      setEditEstSerial(newSerial);
      setIsNewEdit(true);
      setEditOpen(true);
    } catch (e) { warning(e?.message || "채번 오류"); }
  };
  const [aosLoadOpen, setAosLoadOpen] = useState(false);
  const onAosLoad = () => setAosLoadOpen(true);

  /**
   * buildRepairJsondata → src/utils/repairJsondata.js 공통 유틸 사용

  /**
   * 국토부 정비이력 전송 (체크된 건 순차 처리)
   * @param {Set<string>|undefined} idsOverride  undefined → checkedIds 사용
   */
  const onSend = useCallback(async (idsOverride) => {
    const ids = idsOverride ?? checkedIds;
    if (ids.size === 0) return warning("전송할 건을 체크하세요.");

    // 전송 대상 필터링
    // - 첫 전송: ts_serial = ''
    // - 재전송:  ts_serial ≠ '' && ts_rstcode ≠ '' (처리중 제외)
    const validIds = new Set(
      filteredRows
        .filter((r) => {
          if (!ids.has(r.est_serial)) return false;
          if (!r.ts_serial) return true;              // 첫 전송
          if (!r.ts_rstcode) return false;            // 처리중 → 불가
          return true;                                // 재전송 가능
        })
        .map((r) => r.est_serial)
    );
    if (validIds.size === 0) return warning("전송할 건이 없습니다.\n(처리중인 건은 결과 수신 후 재전송 가능합니다)");

    // 경정사유 필요 여부 확인 (MSG50000 성공 건이 포함된 경우)
    const targetRows = filteredRows.filter((r) => validIds.has(r.est_serial));
    const needsAmend = (r) => r.ts_rstcode === "MSG50000" && r.upd_code !== "D";
    const hasAmendRows = targetRows.some(needsAmend);

    let upd_reason = "";
    if (hasAmendRows) {
      const input = await promptAmendReason();
      if (input === null) return; // 취소 → stop
      upd_reason = input;
    }
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
    let okCount = 0;
    const failMessages = [];

    for (const master of targetRows) {
      const details = allDetail.filter((d) => d.est_serial === master.est_serial);

      // row별 upd_code / inner_imprmn_no 결정
      const rowIsAmend   = needsAmend(master);
      const rowUpdCode   = rowIsAmend ? "U" : "N";
      const rowUpdReason = rowIsAmend ? upd_reason : "";
      const rowInnerNo   = rowIsAmend ? (master.ts_serial || "") : "";

      const jsondata = buildRepairJsondata({
        master,
        details,
        imprmn_entnum,
        supman:          companyForm.supman || "",
        upd_code:        rowUpdCode,
        upd_reason:      rowUpdReason,
        inner_imprmn_no: rowInnerNo,
      });

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

      // 3-a. 전송 성공 → inner_imprmn_no 로 ts_serial 갱신 (탭별 API 분기)
      const newTsSerial = sendRes?.inner_imprmn_no || "";
      if (newTsSerial) {
        try {
          await tabConfig.updateTsSerialFn(master.est_serial, newTsSerial);
        } catch {
          failMessages.push(`[${master.carno}] 전송은 성공했으나 ts_serial 갱신 실패`);
        }
      }

      // 3-a2. 기존 전송결과 삭제 (재전송 시 이전 결과 초기화)
      try { await deleteTsRst(master.est_serial); } catch { /* continue */ }

      // 3-b. 전송 성공 → 정비상세 국토부코드(ts_payno) 갱신 (탭별 API 분기)
      try {
        const estDetails = allDetail.filter((d) => d.est_serial === master.est_serial);
        await tabConfig.updateEstbFn(master.est_serial, estDetails);
      } catch {
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

    // 4. 목록 새로고침 (탭별 fetch 분기)
    const res = await tabConfig.fetchFn(outFrom, outTo);
    setRows(res?.dataset ?? []);
    setAllDetail(res?.dataset2 ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds, companyForm, filteredRows, allDetail, outFrom, outTo, tabConfig]);

  const onRefresh = () => onQuery(activeTab);

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

      // 2. 전송결과 삭제
      try { await deleteTsRst(row.est_serial); } catch { /* continue */ }

      // 3. ts_serial 동일값 전달 → 서버에서 전송일자 갱신 (탭별 API 분기)
      try { await tabConfig.updateTsSerialFn(row.est_serial, row.ts_serial); } catch { /* continue */ }

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

    // 완료 후 새로고침 (activeTab을 명시적으로 전달해 stale closure 방지)
    await onQuery(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds, filteredRows, companyForm, tsLogin, deleteRepairHistory, deleteTsRst, activeTab, tabConfig]);

  const onSendInquiry = () => {
    const userid = companyForm.ts_userid;
    const passwd = companyForm.ts_userpwd;
    if (!userid || !passwd) return warning("업체정보에 국토부 아이디/비밀번호를 설정하세요.");
    const encodedPasswd = btoa(unescape(encodeURIComponent(passwd)));
    const url = `${API_TSSERVICE}/login.aspx?userid=${encodeURIComponent(userid)}&passwd=${encodeURIComponent(encodedPasswd)}`;
    openCenteredWindow(url, "정비이력전송조회", 1200, 800);
  };
  const onQuery = useCallback(async (tabOverride) => {
    const tab = tabOverride ?? activeTab;
    // ① 목록 조회 (탭별 API 분기, 전송일자/출고일자 모드 분기)
    const res = await (tab === "aos"
      ? fetchAosEstimate(outFrom, outTo, tsSendMode)
      : fetchTsRepairList(outFrom, outTo, tsSendMode));
    const newRows      = res?.dataset  ?? [];
    const newAllDetail = res?.dataset2 ?? [];
    setRows(newRows);
    setAllDetail(newAllDetail);
    setFocusedId(null);
    setCheckedIds(new Set());

    // ② 전송상태 조회 대상: ts_serial 있고 아직 결과 미수신(ts_rstcode='') 인 행
    const stateTargets = newRows.filter(
      (r) => r.ts_serial && r.ts_rstcode === ""
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

      const cntcCode = st.cntc_result_code || "";

      // ts_rstcode = '' (처리중) 이면 est_ts_rst_c.aspx 호출 안 함
      if (cntcCode) {
        try {
          await updateTsResult({
            est_serial: matchRow.est_serial,
            ts_serial:  matchRow.ts_serial  || "",
            ts_rstcode: cntcCode,
            ts_rst:     st.cntc_result_dtls || "",
            upd_code:   st.upd_code         || "",
            send_de:    st.send_de          || "",
            gubun:      tab === "aos" ? "1" : "0",
          });
        } catch { /* 저장 실패해도 계속 */ }
      }

      updMap[matchRow.est_serial] = {
        ts_rstcode: cntcCode,
        ts_rst:     st.cntc_result_dtls || "",
        upd_code:   st.upd_code         || "",
        send_de:    st.send_de          || "",
      };
    }

    // 로컬 갱신
    if (Object.keys(updMap).length > 0) {
      setRows((prev) =>
        prev.map((r) => updMap[r.est_serial] ? { ...r, ...updMap[r.est_serial] } : r)
      );
    }
  }, [activeTab, fetchAosEstimate, fetchTsRepairList, outFrom, outTo, companyForm, tsLogin, fetchRepairState, updateTsResult]);

  /** 탭 전환: 목록 초기화 후 해당 탭 조회 */
  const handleTabChange = useCallback(async (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setRows([]);
    setAllDetail([]);
    setFocusedId(null);
    setCheckedIds(new Set());
    await onQuery(tab); // tabOverride로 전달해 stale closure 회피
  }, [activeTab, onQuery]);

  // ====== 초기 조회 (복원된 출고일자 or 금월) ======
  useEffect(() => {
    onQuery();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDelete = async () => {
    if (!requireFocused()) return;
    const ok = await remove(`[${focusedRow.carno}] 견적을 삭제하시겠습니까?`, "견적 삭제");
    if (!ok) return;

    try {
      const res = await deleteAosEst(focusedRow.est_serial);
      if (String(res?.result) === "false") {
        warning(res?.msg || "삭제 중 오류가 발생했습니다.");
        return;
      }
      success("삭제되었습니다.");
      await onQuery(activeTab);
    } catch (e) {
      warning(e?.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  const onModify = () => {
    if (!requireFocused()) return;
    setEditEstSerial(focusedRow.est_serial);
    setIsNewEdit(false);
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
        {/* 1-b) 탭 — AOS 견적 / ADL 견적 */}
        <div className="mb-3 flex gap-0 border-b border-zinc-200">
          {[
            { key: "aos", label: "AOS 견적" },
            { key: "adl", label: "ADL 견적" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={`px-5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 2) Global Action (버튼 나열: 보험견적처럼 별도 라인) */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "aos" && (
              <button
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onNew}
                disabled={creating}
              >
                {creating ? "처리 중…" : "+ 신규"}
              </button>
            )}

            {activeTab === "aos" && (
              <button
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={onAosLoad}
              >
                AOS 견적 불러오기
              </button>
            )}

            <button
              className="rounded-md bg-sky-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSend()}
              disabled={sending}
            >
              정비이력 전송
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSendDelete()}
              disabled={deleting}
            >
              정비이력 삭제
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
              <div className="text-sm font-semibold text-zinc-800">{tsSendMode ? "전송일자" : "출고일자"}</div>

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
                onClick={() => onQuery(activeTab)}
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

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlySuccess}
                  onChange={(e) => setOnlySuccess(e.target.checked)}
                />
                성공건
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyError}
                  onChange={(e) => setOnlyError(e.target.checked)}
                />
                오류건
              </label>

              {/* 구분선 */}
              <span className="text-zinc-300 select-none">|</span>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyNew}
                  onChange={(e) => setOnlyNew(e.target.checked)}
                />
                신규
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyUpdated}
                  onChange={(e) => setOnlyUpdated(e.target.checked)}
                />
                수정
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyDeleted}
                  onChange={(e) => setOnlyDeleted(e.target.checked)}
                />
                삭제
              </label>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="select-base ml-auto"
              >
                <option value="1">1. 입력순</option>
                <option value="2">2. 입고일자순</option>
                <option value="7">3. 출고일자순</option>
                <option value="3">4. 차량번호순</option>
                <option value="4">5. 고객명순</option>
                <option value="5">6. 차량명순</option>
                <option value="6">7. 연락처순</option>
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
                {activeTab === "aos" && <SmallBtn onClick={onModify}>수정</SmallBtn>}
                {activeTab === "aos" && <SmallBtn onClick={onDelete}>삭제</SmallBtn>}
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
            <TableLoadingOverlay loading={listLoading2} />
            <FixedHeadTable
              columns={mainColumns}
              rows={filteredRows}
              rowKey={(r) => r.est_serial}
              selectedKey={focusedId}
              onRowClick={(r) => setFocusedId(r.est_serial)}
              onRowDoubleClick={(r) => { setFocusedId(r.est_serial); if (activeTab === "aos") onModify(); }}
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
                {focusedRow?.ts_rst}
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

      <AosLoadModal
        open={aosLoadOpen}
        onClose={async () => {
          setAosLoadOpen(false);
          await onQuery(activeTab);
        }}
      />

      <RepairHistoryEditModal
        open={editOpen}
        estSerial={editEstSerial}
        isNew={isNewEdit}
        wrk03Codes={wrk03Codes}
        paynoList={paynoList}
        onClose={async () => {
          const savedId = editEstSerial;
          setEditOpen(false);
          await onQuery(activeTab);
          if (savedId) setFocusedId(savedId);
        }}
        onSaved={() => { /* 개별 저장은 모달 내에서 처리 */ }}
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

      <AmendReasonModal
        open={amendModalOpen}
        onConfirm={(val) => {
          setAmendModalOpen(false);
          amendResolverRef.current?.(val);
          amendResolverRef.current = null;
        }}
        onCancel={() => {
          setAmendModalOpen(false);
          amendResolverRef.current?.(null);
          amendResolverRef.current = null;
        }}
      />

      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          row={contextMenu.row}
          onClose={() => setContextMenu(null)}
          onModify={() => { setContextMenu(null); onModify(); }}
          onDelete={() => { setContextMenu(null); onDelete(); }}
          onSend={() => { const ids = new Set([contextMenu.row.est_serial]); setContextMenu(null); onSend(ids); }}
          showEditDelete={activeTab === "aos"}
        />
      )}

    </div>

    
  );

  
}

