// src/pages/SmsHistoryPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FixedHeadTable from "../components/FixedHeadTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthRange, addMonths } from "../utils/dateUtils";
import { useSmsSendLog } from "../hooks/useSmsSendLog";
import TableLoadingOverlay from "../components/TableLoadingOverlay";

function rowKey(r) {
  return `${r.seqno || ""}|${r.senddatetime || ""}|${r.callphone || ""}`;
}

export default function SmsHistoryPage() {
  const now = new Date();

  const [monthAnchor, setMonthAnchor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [dateFrom, setDateFrom] = useState(() => monthRange(now).from);
  const [dateTo,   setDateTo]   = useState(() => monthRange(now).to);

  const { fetchLog, loading } = useSmsSendLog();
  const [rows, setRows] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);

  // 분할바 드래그
  const [msgHeight, setMsgHeight] = useState(160);
  const dragRef = useRef(null);
  const containerRef = useRef(null);

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = msgHeight;

    const onMouseMove = (ev) => {
      const delta = startY - ev.clientY; // 위로 올릴수록 양수
      const containerH = containerRef.current?.offsetHeight ?? 600;
      const next = Math.min(Math.max(startH + delta, 80), containerH * 0.75);
      setMsgHeight(next);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    dragRef.current = { onMouseMove, onMouseUp };
  }, [msgHeight]);

  const [filterPhone,    setFilterPhone]    = useState("");
  const [filterMsg,      setFilterMsg]      = useState("");
  const [filterFailOnly, setFilterFailOnly] = useState(false);
  const [filterKind,     setFilterKind]     = useState("");  // "" = 전체

  // rows 전체 기준 구분별 카운트 + 동적 kind 목록
  const kindCounts = useMemo(() => {
    const counts = {};
    rows.forEach((r) => {
      const k = (r.kind ?? "").toLowerCase();
      if (k) counts[k] = (counts[k] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  const kindOptions = useMemo(() => {
    return Object.keys(kindCounts).sort();
  }, [kindCounts]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterKind)
      list = list.filter((r) => (r.kind ?? "").toLowerCase() === filterKind);
    if (filterPhone.trim())
      list = list.filter((r) => (r.callphone ?? "").includes(filterPhone.trim()));
    if (filterMsg.trim())
      list = list.filter((r) => (r.msg ?? "").includes(filterMsg.trim()));
    if (filterFailOnly)
      list = list.filter((r) => r.result_nm === "실패");
    return list;
  }, [rows, filterKind, filterPhone, filterMsg, filterFailOnly]);

  const loadData = useCallback(async (d1, d2) => {
    const res = await fetchLog({ day1: d1, day2: d2 });
    setRows(res?.dataset ?? []);
  }, [fetchLog]);

  const refetch = useCallback(() => {
    loadData(dateFrom, dateTo);
  }, [loadData, dateFrom, dateTo]);

  // 최초 마운트 시 1회 자동 조회
  const initRef = useRef(null);
  if (!initRef.current) initRef.current = { dateFrom, dateTo };
  useEffect(() => {
    loadData(initRef.current.dateFrom, initRef.current.dateTo);
  }, [loadData]);

  // 실제 선택 키: 사용자가 클릭한 키가 현재 rows에 없으면 첫 번째 row 자동 선택
  const activeKey = useMemo(() => {
    if (rows.length === 0) return null;
    if (selectedKey && rows.some((r) => rowKey(r) === selectedKey)) return selectedKey;
    return rowKey(rows[0]);
  }, [rows, selectedKey]);

  const selectedRow = useMemo(() => {
    if (!activeKey) return null;
    return rows.find((r) => rowKey(r) === activeKey) || null;
  }, [rows, activeKey]);

  const moveMonth = (delta) => {
    const d = addMonths(monthAnchor, delta);
    const r = monthRange(d);
    setMonthAnchor(d);
    setDateFrom(r.from);
    setDateTo(r.to);
  };

  const setCurrentMonth = () => {
    const d = new Date();
    const r = monthRange(d);
    setMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    setDateFrom(r.from);
    setDateTo(r.to);
  };

  // ✅ 케미칼 FixedHeadTable 컬럼 스펙에 맞춤: title/width/className/render(_val,row)
  const columns = useMemo(
    () => [
      {
        key: "senddatetime",
        title: "발송일시",
        width: "18%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.senddatetime}>
            {row.senddatetime || ""}
          </div>
        ),
      },
      {
        key: "callphone",
        title: "수신번호",
        width: "14%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.callphone}>
            {row.callphone || ""}
          </div>
        ),
      },
      {
        key: "msg",
        title: "메세지",
        width: "52%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title="">
            {(row.msg || "").replace(/\s+/g, " ").trim()}
          </div>
        ),
      },
      {
        key: "result_nm",
        title: "상태",
        width: "8%",
        align: "center",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-center truncate">{row.result_nm || ""}</div>
        ),
      },
      {
        key: "kind",
        title: "구분",
        width: "8%",
        align: "center",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-center truncate">{row.kind || ""}</div>
        ),
      },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col">
      {/* 타이틀 */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">문자발송 조회</div>
              <div className="text-xs text-zinc-500">발송년월 기준으로 문자 발송 이력을 조회합니다.</div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              문자발송
            </button>
          </div>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="shrink-0">
        <div className="app-container py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-700">발송일자</span>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400"
            />
            <span className="text-zinc-400">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400"
            />

            <button type="button" onClick={() => moveMonth(-1)}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              전월
            </button>
            <button type="button" onClick={setCurrentMonth}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              금월
            </button>
            <button type="button" onClick={() => moveMonth(-1)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => moveMonth(+1)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={refetch}
              className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              조회
            </button>
          </div>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="border-zinc-200 shrink-0">
      <div className="app-container py-2 flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="수신번호"
          value={filterPhone}
          onChange={(e) => setFilterPhone(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-400 w-36"
        />
        <input
          type="text"
          placeholder="메세지"
          value={filterMsg}
          onChange={(e) => setFilterMsg(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-400 w-56"
        />
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={filterFailOnly}
            onChange={(e) => setFilterFailOnly(e.target.checked)}
            className="w-3.5 h-3.5 accent-red-500"
          />
          실패만 보기
        </label>

        {/* 구분 토글 버튼 (동적) — 오른쪽 끝 */}
        {kindOptions.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterKind("")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition
                ${filterKind === ""
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"}`}
            >
              전체 {rows.length}
            </button>
            {kindOptions.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKind(k)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition
                  ${filterKind === k
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"}`}
              >
                {k.toUpperCase()} {kindCounts[k]}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* 테이블 + 분할바 + 메세지 내용 */}
      <div ref={containerRef} className="app-container min-h-0 flex-1 py-0 pb-4 flex flex-col">
        {/* 테이블 */}
        <div className="relative min-h-0 flex-1 rounded-md border border-gray-200 bg-white overflow-hidden">
          <TableLoadingOverlay loading={loading} />
          <FixedHeadTable
            columns={columns}
            rows={filteredRows}
            rowSize="sm"
            rowKey={(row) => rowKey(row)}
            selectedKey={activeKey}
            onRowClick={(row) => setSelectedKey(rowKey(row))}
            emptyText="문자 발송 이력이 없습니다."
          />
        </div>

        {/* 분할바 */}
        <div
          onMouseDown={onDividerMouseDown}
          className="h-2 shrink-0 cursor-row-resize flex items-center justify-center group"
        >
          <div className="w-12 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors" />
        </div>

        {/* 메세지 내용 */}
        <div
          className="shrink-0 rounded-md border border-gray-200 bg-white overflow-hidden flex flex-col"
          style={{ height: msgHeight }}
        >
          <div className="border-b bg-zinc-50 px-3 py-2 flex items-center gap-2 shrink-0">
            <div className="text-sm font-semibold text-zinc-900">메세지 내용</div>
            <div className="ml-auto text-xs text-zinc-500">
              {selectedRow ? `${selectedRow.senddatetime || ""} / ${selectedRow.callphone || ""}` : ""}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto px-3 py-3 text-sm text-zinc-800 whitespace-pre-wrap">
            {selectedRow?.msg || "선택된 항목이 없습니다."}
          </div>
        </div>
      </div>
    </div>
  );
}
