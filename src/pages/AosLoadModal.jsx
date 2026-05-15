// src/pages/AosLoadModal.jsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Upload, FileJson, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useAosLoad } from "../hooks/useAosEstimate";
import { useMapPayno } from "../hooks/useMapPayno";
import FixedHeadTable from "../components/FixedHeadTable";
import { getComcode } from "../api/config";

// ── prefix 규칙 ──────────────────────────────────────────
const PREFIX_RULES = {
  "01": { seccode: "12", isest: "1", masterKey: "AOS_ESTIMASTER", detailKey: "AOS_ESTIMASTERB", hasSmaster: true,  hpField: "D_TEL"  },
  "02": { seccode: "12", isest: "0", masterKey: "AOS_TMASTER",    detailKey: "AOS_TMASTERB",    hasSmaster: true,  hpField: "HPTEL"  },
  "11": { seccode: "11", isest: "1", masterKey: "AOS_IMASTER",    detailKey: "AOS_IMASTERB",    hasSmaster: false, hpField: "HPTEL"  },
  "12": { seccode: "11", isest: "0", masterKey: "AOS_IMASTER",    detailKey: "AOS_IMASTERB",    hasSmaster: false, hpField: "HPTEL"  },
};

// ── 구분 표시 ─────────────────────────────────────────────
function getKindLabel(seccode, isest) {
  if (seccode === "12") return isest === "1" ? "보험견적" : "보험청구";
  return isest === "1" ? "일반견적" : "일반청구";
}
function getKindColor(seccode, isest) {
  if (seccode === "12") return isest === "1"
    ? "bg-blue-100 text-blue-700"
    : "bg-violet-100 text-violet-700";
  return isest === "1"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-orange-100 text-orange-700";
}

// ── 유틸 ─────────────────────────────────────────────────

/** EUC-KR 인코딩으로 파일 텍스트 읽기 */
function readFileAsText(file, encoding = "euc-kr") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error(`파일 읽기 실패: ${file.name}`));
    reader.readAsText(file, encoding);
  });
}

function splitPhone(tel) {
  const parts = (tel || "").split("-");
  return { hp0: parts[0] || "", hp1: parts[1] || "", hp2: parts[2] || "" };
}

function mapMaster(json, rule, filename) {
  const m = json[rule.masterKey]?.[0] ?? {};
  const s = rule.hasSmaster ? (json["AOS_SMASTER"]?.[0] ?? {}) : {};
  const hp = splitPhone(m[rule.hpField]);
  return {
    carno:         m.CARNO        || "",
    carcode:       m.CARCODE      || "",
    carname:       m.CARNAME      || "",
    modelcode:     m.MODELCODE    || "",
    modelname:     m.MODELNAME    || "",
    caryear:       (m.MAKEDAY     || "").slice(0, 4),
    car_registday: m.MAKEDAY      || "",
    lastkm:        m.GOKM         || "0",
    custom_name:   m.OWNER        || "",
    hp0: hp.hp0, hp1: hp.hp1, hp2: hp.hp2,
    seccode:       rule.seccode,
    inday:         m.INDAY        || "",
    outday:        m.OUTDAY       || "",
    accday:        m.ACCDAY       || "",
    vat:           m.VATKIND      || "",
    isest:         rule.isest,
    carno4:        rule.hasSmaster ? (m.CARNO || "").slice(-4) : (m.CARNO4 || ""),
    regno:         rule.hasSmaster ? (s.REGNO  || "") : "",
    aos_serial:    rule.hasSmaster ? (s.TKEY   || "") : (m.TKEY || ""),
    add_repair:    "1",
    vinno:         "",
    comcode:       getComcode(),
    filename,
  };
}

function mapDetails(json, rule) {
  return (json[rule.detailKey] ?? []).map((d) => ({
    paykind:        d.KIND     || "",
    payno:          d.PAYNO    || "",
    subpayno:       d.SUBPAYNO || "",
    payname:        d.PAYNAME  || "",
    workcode:       d.WORKKIND || "",
    price:          d.PRICE    || "0",
    qty:            d.QTY      || "",
    partsum:        d.PARTSUM  || "0",
    paysum:         d.PAYSUM   || "0",
    part_makercode: d.PARTNO   || "",
    part_state:     d.PARTKIND || "",
    ts_payno:       "",
  }));
}

async function parseFile(file) {
  const text = await readFileAsText(file, "euc-kr");
  const json = JSON.parse(text);
  const prefix = file.name.slice(0, 2);
  const rule = PREFIX_RULES[prefix];
  if (!rule) throw new Error(`알 수 없는 파일 prefix: "${prefix}"`);
  const master  = mapMaster(json, rule, file.name);
  const details = mapDetails(json, rule);

  console.log(`[AosLoad] 파싱: ${file.name}`, {
    prefix, rule, master,
    detailCount: details.length,
    details,
  });

  return { master, details };
}

// ── 버튼 스타일 ───────────────────────────────────────────
const btnBase  = "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition border";
const btnDark  = `${btnBase} bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed`;
const btnLight = `${btnBase} bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50`;

// ── 상세 서브 테이블 ──────────────────────────────────────
const PAYKIND_LABEL = { "1": "공임", "2": "공임", "3": "부품", "4": "공임", "5": "부품", "6": "도장" };
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
const WORK_MAP = Object.fromEntries(WORK_OPTIONS.map((w) => [w.code, w.label]));

function DetailSubTable({ details }) {
  if (!details?.length) return <div className="text-xs text-zinc-400 py-2">상세 데이터 없음</div>;
  return (
    <div className="rounded border border-zinc-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-zinc-100">
          <tr>
            <th className="px-2 py-1 text-center font-semibold text-zinc-600 w-[28px]">No</th>
            <th className="px-2 py-1 text-center font-semibold text-zinc-600 w-[40px]">구분</th>
            <th className="px-2 py-1 text-left font-semibold text-zinc-600 w-[90px]">품번</th>
            <th className="px-2 py-1 text-left font-semibold text-zinc-600">작업내용</th>
            <th className="px-2 py-1 text-center font-semibold text-zinc-600 w-[50px] whitespace-nowrap">작업</th>
            <th className="px-2 py-1 text-right font-semibold text-zinc-600 w-[46px]">수량</th>
            <th className="px-2 py-1 text-right font-semibold text-zinc-600 w-[70px]">공임</th>
            <th className="px-2 py-1 text-right font-semibold text-zinc-600 w-[70px]">부품</th>
            <th className="px-2 py-1 text-center font-semibold text-zinc-600 w-[60px] whitespace-nowrap">부품종류</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d, i) => (
            <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50">
              <td className="px-2 py-0.5 text-center text-zinc-400">{i + 1}</td>
              <td className="px-2 py-0.5 text-center">{PAYKIND_LABEL[d.paykind] || d.paykind}</td>
              <td className="px-2 py-0.5 truncate" title={d.part_makercode}>{d.part_makercode}</td>
              <td className="px-2 py-0.5 truncate" title={d.payname}>{d.payname}</td>
              <td className="px-2 py-0.5 text-center whitespace-nowrap">{WORK_MAP[d.workcode] || d.workcode}</td>
              <td className="px-2 py-0.5 text-right">{d.qty}</td>
              <td className="px-2 py-0.5 text-right">{d.paysum && d.paysum !== "0" ? Number(d.paysum).toLocaleString() : ""}</td>
              <td className="px-2 py-0.5 text-right">{d.partsum && d.partsum !== "0" ? Number(d.partsum).toLocaleString() : ""}</td>
              <td className="px-2 py-0.5 text-center">{d.part_state}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function AosLoadModal({ open, onClose }) {
  const { loadAosFiles } = useAosLoad();
  const { fetchMapPayno } = useMapPayno();
  const fileInputRef = useRef(null);

  const [dragging,    setDragging]    = useState(false);
  const [phase,       setPhase]       = useState("idle");   // idle | preview | loading | done
  const [fileItems,   setFileItems]   = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set()); // 선택된 항목 ids
  const [expandedId,  setExpandedId]  = useState(null);      // 상세 펼침 항목 id
  const [filterKind,   setFilterKind]  = useState("all");     // 구분 필터
  const [filterSearch, setFilterSearch] = useState("");       // 차량번호/고객명 검색
  const [resultMap,   setResultMap]   = useState({});
  const [executing,   setExecuting]   = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setFileItems([]);
    setSelectedIds(new Set());
    setExpandedId(null);
    setFilterKind("all");
    setFilterSearch("");
    setResultMap({});
    setExecuting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => { if (open) reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 파일 추가 ───────────────────────────────────────────
  const addFiles = useCallback(async (fileList) => {
    const jsonFiles = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".json")
    );
    if (!jsonFiles.length) return;

    const newItems = await Promise.all(
      jsonFiles.map(async (file) => {
        const id = `${file.name}_${file.lastModified}`;
        try {
          const { master, details } = await parseFile(file);
          return {
            id, filename: file.name,
            carno: master.carno, carname: master.carname,
            custom_name: master.custom_name,
            inday: master.inday, outday: master.outday,
            seccode: master.seccode, isest: master.isest,
            detailCount: details.length, parseError: "",
            master, details,
          };
        } catch (e) {
          console.error(`[AosLoad] 파싱 오류: ${file.name}`, e);
          return {
            id, filename: file.name,
            carno: "", carname: "", custom_name: "",
            inday: "", outday: "", seccode: "", isest: "",
            detailCount: 0, parseError: e.message,
            master: null, details: [],
          };
        }
      })
    );

    setFileItems((prev) => {
      const existingIds = new Set(prev.map((x) => x.id));
      const fresh = newItems.filter((x) => !existingIds.has(x.id));
      // 파싱 성공 + 상세 1건 이상인 항목만 자동 선택
      setSelectedIds((prevSel) => {
        const next = new Set(prevSel);
        fresh.forEach((x) => { if (!x.parseError && x.detailCount > 0) next.add(x.id); });
        return next;
      });
      return [...prev, ...fresh];
    });
    setPhase("preview");
  }, []);

  // ── 체크박스 핸들러 ─────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const validItems      = useMemo(() => fileItems.filter((x) => !x.parseError), [fileItems]);
  // 상세 0건 / 이미 결과 있는 항목은 선택 불가
  const selectableItems = useMemo(
    () => validItems.filter((x) => x.detailCount > 0 && !resultMap[x.filename]),
    [validItems, resultMap]
  );
  const allChecked = selectableItems.length > 0 && selectableItems.every((x) => selectedIds.has(x.id));
  const toggleAll  = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableItems.map((x) => x.id)));
  };

  // ── 상세 펼침 토글 ──────────────────────────────────────
  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── 드래그 앤 드롭 ──────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };

  // ── 불러오기 실행 ───────────────────────────────────────
  const onExecute = async () => {
    const toSend = fileItems.filter((x) => !x.parseError && selectedIds.has(x.id));
    if (!toSend.length) return;

    setPhase("loading");
    setExecuting(true);
    try {
      // payname → ts_payno 매핑 테이블 조회
      let paynameMap = new Map();
      try {
        paynameMap = await fetchMapPayno();
      } catch {
        // 매핑 실패해도 ts_payno 빈 값으로 진행
      }

      const dataset = toSend.map((x) => ({
        ...x.master,
        details: x.details.map((d) => ({
          ...d,
          ts_payno: paynameMap.get(d.payname) ?? "",
        })),
      }));
      console.log("[AosLoad] 서버 전송 dataset:", dataset);
      const res = await loadAosFiles(dataset);
      console.log("[AosLoad] 서버 응답:", res);

      const newMap = { ...resultMap };
      if (String(res?.result) === "false") {
        toSend.forEach((x) => {
          newMap[x.filename] = { result: "false", msg: res.msg || "서버 오류", est_serial: "", detail_count: 0 };
        });
      } else {
        (res?.dataset ?? []).forEach((item) => { newMap[item.filename] = item; });
      }
      setResultMap(newMap);
      // 성공한 항목은 자동 체크 해제
      setSelectedIds((prev) => {
        const next = new Set(prev);
        toSend.forEach((x) => {
          if (String(newMap[x.filename]?.result) !== "false") next.delete(x.id);
        });
        return next;
      });
    } catch (e) {
      console.error("[AosLoad] 서버 전송 오류:", e);
      const newMap = { ...resultMap };
      toSend.forEach((x) => {
        newMap[x.filename] = { result: "false", msg: e.message || "오류", est_serial: "", detail_count: 0 };
      });
      setResultMap(newMap);
    } finally {
      setExecuting(false);
      setPhase("preview"); // 결과 확인 후 preview로 복귀
    }
  };

  // ── 집계 ────────────────────────────────────────────────
  const parseErrCount  = fileItems.filter((x) =>  x.parseError).length;
  const selectedCount  = validItems.filter((x) => selectedIds.has(x.id)).length;
  const successCount   = Object.values(resultMap).filter((r) => String(r.result) !== "false").length;
  const failCount      = Object.values(resultMap).filter((r) => String(r.result) === "false").length;

  // ── 구분 필터 옵션 ───────────────────────────────────────
  const KIND_FILTERS = useMemo(() => {
    const counts = { "보험견적": 0, "보험청구": 0, "일반견적": 0, "일반청구": 0 };
    validItems.forEach((x) => {
      const k = getKindLabel(x.seccode, x.isest);
      if (k in counts) counts[k]++;
    });
    return [
      { key: "all",   label: "전체",   count: validItems.length },
      { key: "보험견적", label: "보험견적", count: counts["보험견적"] },
      { key: "보험청구", label: "보험청구", count: counts["보험청구"] },
      { key: "일반견적", label: "일반견적", count: counts["일반견적"] },
      { key: "일반청구", label: "일반청구", count: counts["일반청구"] },
    ].filter((f) => f.key === "all" || f.count > 0);
  }, [validItems]);

  // 필터 적용된 rows (구분 + 검색어)
  const filteredItems = useMemo(() => {
    const kw = filterSearch.trim().toLowerCase();
    return fileItems.filter((x) => {
      // 구분 필터
      if (filterKind !== "all" && !x.parseError) {
        if (getKindLabel(x.seccode, x.isest) !== filterKind) return false;
      }
      // 검색어 필터 (차량번호, 고객명)
      if (kw) {
        const carno      = (x.carno      || "").toLowerCase();
        const customName = (x.custom_name || "").toLowerCase();
        if (!carno.includes(kw) && !customName.includes(kw)) return false;
      }
      return true;
    });
  }, [fileItems, filterKind, filterSearch]);

  // ── FixedHeadTable 컬럼 — 미리보기 ──────────────────────
  const previewColumns = useMemo(() => [
    {
      key: "__check", title: "", width: "4%", align: "center", noTruncate: true,
      render: (_, row) => {
        // 파싱오류, 상세 0건, 이미 결과 있는 항목은 체크박스 미표시
        if (row.parseError || row.detailCount === 0 || resultMap[row.filename]) return null;
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={selectedIds.has(row.id)}
              onChange={() => toggleSelect(row.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 cursor-pointer"
            />
          </div>
        );
      },
    },
    {
      key: "__kind", title: "구분", width: "13%", align: "center",
      render: (_, row) => row.parseError
        ? <span className="text-rose-400 text-xs">파싱오류</span>
        : (
          <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${getKindColor(row.seccode, row.isest)}`}>
            {getKindLabel(row.seccode, row.isest)}
          </span>
        ),
    },
    { key: "inday",       title: "입고일자", width: "12%", align: "left",  render: (v) => <span className="whitespace-nowrap">{v || ""}</span> },
    { key: "outday",      title: "출고일자", width: "12%", align: "left",  render: (v) => <span className="whitespace-nowrap">{v || ""}</span> },
    { key: "carno",       title: "차량번호", width: "11%", align: "left",  render: (v) => v || "" },
    { key: "carname",     title: "차량명",   width: "16%", align: "left",
      render: (v) => <span className="truncate block" title={v}>{v || ""}</span> },
    { key: "custom_name", title: "고객명",   width: "11%", align: "left",
      render: (v) => <span className="truncate block" title={v}>{v || ""}</span> },
    {
      key: "__detail", title: "상세", width: "11%", align: "center",
      render: (_, row) => row.parseError ? "—" : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
        >
          {expandedId === row.id
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
          {row.detailCount}건
        </button>
      ),
    },
    {
      key: "__status", title: "상태", width: "10%", align: "center",
      render: (_, row) => {
        if (row.parseError)
          return <span className="inline-flex items-center gap-1 text-rose-600 text-xs"><XCircle className="h-3 w-3" />오류</span>;
        const r = resultMap[row.filename];
        if (!r)
          return <span className="text-zinc-300 text-xs">대기</span>;
        return String(r.result) !== "false"
          ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-3 w-3" />성공</span>
          : <span className="inline-flex items-center gap-1 text-rose-600 text-xs"><XCircle className="h-3 w-3" />실패</span>;
      },
    },
  ], [selectedIds, toggleSelect, expandedId, toggleExpand, resultMap]);

  // ── FixedHeadTable 컬럼 — 결과 ──────────────────────────

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[860px] rounded-md border border-zinc-200 bg-white shadow-xl flex flex-col overflow-hidden"
          style={{ maxHeight: "95vh" }}
        >
          {/* ── 헤더 ── */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 shrink-0">
            <FileJson className="h-4 w-4 text-zinc-700" />
            <span className="text-base font-semibold text-zinc-900">AOS 견적 불러오기</span>
            <button
              type="button"
              className="ml-auto rounded-md border border-zinc-200 bg-white p-2 hover:bg-zinc-50"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── 바디 ── */}
          <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">

            {/* 드롭존 */}
            {(phase === "idle" || phase === "preview") && (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-md border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
                }`}
              >
                <Upload className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
                <div className="text-sm font-semibold text-zinc-700">
                  JSON 파일을 여기에 드래그하거나 클릭하여 선택
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  여러 파일 동시 선택 가능 · .json 파일만
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>
            )}

            {/* 파싱 결과 미리보기 */}
            {phase === "preview" && fileItems.length > 0 && (
              <div className="rounded-md border border-zinc-200 overflow-hidden">
                {/* 테이블 헤더 툴바 */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-100 bg-zinc-50">
                  {/* 전체선택 체크박스 */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="h-4 w-4"
                    />
                    <span className="text-xs text-zinc-600 font-medium">전체선택</span>
                  </label>
                  <span className="text-sm font-semibold text-zinc-800">
                    {fileItems.length}건 로드
                    {parseErrCount > 0 && <span className="ml-2 text-rose-600 font-normal">· 오류 {parseErrCount}건</span>}
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    선택 {selectedCount}건
                  </span>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs text-zinc-400 hover:text-zinc-700"
                  >
                    전체삭제
                  </button>
                </div>

                {/* 구분 필터 + 검색 */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-white flex-wrap">
                  {/* 구분 필터 버튼 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {KIND_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => { setFilterKind(f.key); setExpandedId(null); }}
                        className={`inline-flex items-center gap-1 w-[90px] py-1 rounded-full text-xs font-semibold border transition justify-center ${
                          filterKind === f.key
                            ? "bg-orange-100 text-orange-700 border-orange-300"
                            : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        {f.label}
                        <span className={`rounded-full px-1 text-[11px] ${
                          filterKind === f.key ? "bg-orange-200 text-orange-700" : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 차량번호/고객명 검색 */}
                  <div className="relative ml-auto">
                    <input
                      type="text"
                      value={filterSearch}
                      onChange={(e) => { setFilterSearch(e.target.value); setExpandedId(null); }}
                      placeholder="차량번호 / 고객명"
                      className="h-7 w-44 rounded-md border border-zinc-300 bg-white pl-2.5 pr-7 text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {filterSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterSearch("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 필터 결과 건수 */}
                  {(filterKind !== "all" || filterSearch) && (
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {filteredItems.length}건 표시
                    </span>
                  )}
                </div>

                <div style={{ height: 500 }} className="min-h-0">
                  <FixedHeadTable
                    columns={previewColumns}
                    rows={filteredItems}
                    rowKey={(row) => row.id}
                    height="100%"
                    tableTextClass="text-xs"
                    emptyText="파일 없음"
                    expandedKey={expandedId}
                    expandedRowRender={(row) => (
                      <div className="py-2 px-1">
                        <div className="text-xs font-semibold text-zinc-600 mb-1.5">
                          📄 {row.filename} — 정비상세 {row.detailCount}건
                        </div>
                        <DetailSubTable details={row.details} />
                      </div>
                    )}
                    getRowClassName={(row) => {
                      if (row.parseError) return "bg-rose-50";
                      const r = resultMap[row.filename];
                      if (!r) return "";
                      return String(r.result) !== "false" ? "bg-emerald-50" : "bg-rose-50";
                    }}
                  />
                </div>

                {/* 파싱 오류 / 전송 실패 메시지 */}
                {(parseErrCount > 0 || failCount > 0) && (
                  <div className="px-3 py-2 bg-rose-50 border-t border-rose-100 flex flex-col gap-0.5">
                    {fileItems.filter((x) => x.parseError).map((x) => (
                      <div key={x.id} className="text-xs text-rose-600">
                        [파싱오류] {x.filename}: {x.parseError}
                      </div>
                    ))}
                    {fileItems
                      .filter((x) => !x.parseError && String(resultMap[x.filename]?.result) === "false")
                      .map((x) => (
                        <div key={x.id} className="text-xs text-rose-600">
                          [전송실패] {x.filename}: {resultMap[x.filename]?.msg || "오류"}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 로딩 중 */}
            {phase === "loading" && (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <div className="text-sm text-zinc-600">
                  서버에 전송 중… ({selectedCount}건)
                </div>
              </div>
            )}
          </div>

          {/* ── 푸터 ── */}
          <div className="flex items-center gap-3 border-t border-zinc-200 px-4 py-3 bg-white shrink-0">
            {/* 결과 요약 */}
            {(successCount > 0 || failCount > 0) && (
              <div className="flex items-center gap-2 mr-auto text-xs">
                {successCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />성공 {successCount}건
                  </span>
                )}
                {failCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                    <XCircle className="h-3.5 w-3.5" />실패 {failCount}건
                    <span className="text-zinc-400 font-normal ml-0.5">— 체크 후 재실행 가능</span>
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button type="button" className={btnLight} onClick={onClose}>
                {successCount > 0 ? "닫기 (목록 새로고침)" : "취소"}
              </button>
              {phase === "preview" && (
                <button
                  type="button"
                  className={btnDark}
                  onClick={onExecute}
                  disabled={selectedCount === 0 || executing}
                >
                  {executing
                    ? <><Loader2 className="h-4 w-4 animate-spin" />전송 중…</>
                    : `불러오기 실행 (${selectedCount}건)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
