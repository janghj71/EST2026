// src/pages/MailHistoryPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Mail, X } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import IconBtn from "../components/IconBtn";
import { useMailHistory } from "../hooks/useMailHistory";
import { ymd, monthRange, addMonths } from "../utils/dateUtils";

/* ── 발송일자가 오늘 이전인지 체크 ────────────────────── */
function isOlderThanToday(send_date) {
  if (!send_date) return false;
  const datePart = String(send_date).slice(0, 10); // "YYYY-MM-DD"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(datePart) < today;
}

/* ── 발송결과 표시 ─────────────────────────────────────── */
function sendResultLabel(row) {
  if (row.smtp_result === "250") return "성공";
  if (isOlderThanToday(row.send_date)) return "실패";
  return "-";
}

/* ═══════════════════════════════════════════════════════
   메인 페이지
═══════════════════════════════════════════════════════ */
const STORAGE_KEY = "mailHistoryCtx";
const MSG_TYPE    = "MAIL_HISTORY_SET_CTX";

export default function MailHistoryPage() {
  const now = new Date();

  const [monthAnchor, setMonthAnchor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [dateFrom, setDateFrom] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.day1 || monthRange(now).from; } catch { return monthRange(now).from; }
  });
  const [dateTo, setDateTo] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.day2 || monthRange(now).to; } catch { return monthRange(now).to; }
  });

  const [rows,           setRows]           = useState([]);
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [detail,         setDetail]         = useState(null);

  /* ── 필터 ────────────────────────────────────────────── */
  const [filterName,     setFilterName]    = useState("");
  const [filterTitle,    setFilterTitle]   = useState("");
  const [filterFailOnly, setFilterFailOnly] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.filterFailOnly ?? false; } catch { return false; }
  });

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterName.trim())
      list = list.filter(r => (r.rcv_name ?? "").includes(filterName.trim()));
    if (filterTitle.trim())
      list = list.filter(r => (r.send_title ?? "").includes(filterTitle.trim()));
    if (filterFailOnly)
      list = list.filter(r => sendResultLabel(r) === "실패");
    return list;
  }, [rows, filterName, filterTitle, filterFailOnly]);

  const { fetchMailList, fetchMailDetail, detailLoading } = useMailHistory();
  const [mailLoading, setMailLoading] = useState(false);

  /* ── API 호출 래퍼 ───────────────────────────────────── */
  const loadList = useCallback(async (d1, d2) => {
    setMailLoading(true);
    try {
      const res = await fetchMailList({ day1: d1, day2: d2 });
      setRows(res?.dataset ?? []);
    } finally {
      setMailLoading(false);
    }
  }, [fetchMailList]);

  const loadDetail = useCallback(async (mail_serial) => {
    setDetail(null);
    const res = await fetchMailDetail(mail_serial);
    setDetail(res?.dataset?.[0] ?? null);
  }, [fetchMailDetail]);

  /* 초기 조회 */
  useEffect(() => {
    loadList(dateFrom, dateTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* postMessage 수신 — 대시보드에서 날짜 전달 */
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type !== MSG_TYPE) return;
      const { day1, day2, filterFailOnly } = ev.data.payload || {};
      if (!day1 || !day2) return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ day1, day2, filterFailOnly }));
      setDateFrom(day1);
      setDateTo(day2);
      if (filterFailOnly != null) setFilterFailOnly(filterFailOnly);
      loadList(day1, day2);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadList]);

  /* ── 월 이동 ─────────────────────────────────────────── */
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

  const onSearch = () => loadList(dateFrom, dateTo);

  /* ── 행 클릭 ─────────────────────────────────────────── */
  const onRowClick = (row) => {
    setSelectedSerial(row.mail_serial);
    loadDetail(row.mail_serial);
  };

  /* ── 컬럼 ────────────────────────────────────────────── */
  const columns = useMemo(() => [
    {
      key: "__read",
      title: "",
      width: "3%",
      align: "center",
      render: (_, row) =>
        row.open_dt
          ? <Eye  className="w-4 h-4 text-blue-500 mx-auto" title={`열람: ${row.open_dt}`} />
          : <Mail className="w-4 h-4 text-zinc-400 mx-auto" title="미열람" />,
    },
    {
      key: "rcv_name",
      title: "받는사람",
      width: "20%",
      align: "left",
      render: (v) => <span className="truncate block">{v || ""}</span>,
    },
    {
      key: "send_title",
      title: "제목",
      align: "left",
      render: (v) => <span className="truncate block" title={v}>{v || ""}</span>,
    },
    {
      key: "send_date",
      title: "보낸날짜",
      width: "20%",
      align: "left",
    },
    {
      key: "smtp_result",
      title: "결과",
      width: "7%",
      align: "center",
      render: (_, row) => {
        const lbl = sendResultLabel(row);
        const cls =
          lbl === "성공" ? "text-emerald-600 font-semibold" :
          lbl === "실패" ? "text-red-500 font-semibold"     : "text-zinc-400";
        return <span className={cls}>{lbl}</span>;
      },
    },
    {
      key: "open_dt",
      title: "열람일자",
      width: "20%",
      align: "left",
      render: (v) => v || "-",
    },
  ], []);

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* 헤더 */}
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">발송메일 조회</div>
            <div className="text-sm text-zinc-500">기간별 메일 발송 이력을 조회합니다.</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconBtn
              icon={X}
              label="닫기"
              variant="primary"
              onClick={() => window.close()}
            />
          </div>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center gap-2 flex-wrap shrink-0">
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
          onClick={onSearch}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          조회
        </button>

        <span className="ml-auto text-xs text-zinc-400">{rows.length}건</span>
      </div>

      {/* 필터 바 */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex items-center gap-2 flex-wrap shrink-0">
        <input
          type="text"
          placeholder="받는사람"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-400 w-36"
        />
        <input
          type="text"
          placeholder="제목"
          value={filterTitle}
          onChange={(e) => setFilterTitle(e.target.value)}
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
        <span className="ml-auto text-xs text-zinc-400">
          {filteredRows.length !== rows.length
            ? `${filteredRows.length} / ${rows.length}건`
            : `${rows.length}건`}
        </span>
      </div>

      {/* 목록 */}
      <div className="flex-1 min-h-0 p-3">
        <div className="relative h-full rounded-md border border-zinc-200 bg-white overflow-hidden">
          <TableLoadingOverlay loading={mailLoading} />
          <FixedHeadTable
            columns={columns}
            rows={filteredRows}
            rowKey={(r) => r.mail_serial}
            selectedKey={selectedSerial}
            onRowClick={onRowClick}
            emptyText="발송된 메일이 없습니다."
            height="100%"
          />
        </div>
      </div>

      {/* 상세 모달 */}
      {selectedSerial && (
        <MailDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => { setSelectedSerial(null); setDetail(null); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   메일 상세 모달
═══════════════════════════════════════════════════════ */
/* mail_content 스타일 주입
 * - border-top 파란색(#3366cc) → 진한 회색(#3f3f46)
 * - 링크 색상 → 짙은 파란색(#1e40af)에서 zinc 계열로 */
function injectMailStyles(html) {
  if (!html) return html;
  const overridden = html.replace(/#3366cc/gi, "#3f3f46");
  const style = `<style>
    a { color: #1d4ed8 !important; text-decoration: underline; }
    a:hover { color: #1e40af !important; }
  </style>`;
  return style + overridden;
}

function MailDetailModal({ detail, loading, onClose }) {
  const resultLabel = detail ? sendResultLabel(detail) : "-";
  const resultCls   = resultLabel === "성공" ? "text-emerald-600 font-semibold"
    : resultLabel === "실패" ? "text-red-500 font-semibold" : "text-zinc-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[760px] max-h-[88vh] flex flex-col bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden">

        {/* 모달 헤더 */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
              <Mail className="h-4 w-4" />
            </span>
            <div className="text-base font-semibold text-zinc-900 truncate">
              {detail?.rcv_name || "메일 상세"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-zinc-300 bg-white p-1.5 text-zinc-600 hover:bg-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 메타 정보 */}
        {detail && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-b border-zinc-100 text-xs text-zinc-700 bg-white shrink-0">
            <span>
              <span className="text-zinc-400 mr-1">보낸날짜</span>
              {detail.send_date || ""}
            </span>
            <span>
              <span className="text-zinc-400 mr-1">발송결과</span>
              <span className={resultCls}>{resultLabel}</span>
            </span>
            {detail.open_dt && (
              <span>
                <span className="text-zinc-400 mr-1">열람일자</span>
                {detail.open_dt}
              </span>
            )}
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
              불러오는 중...
            </div>
          ) : detail?.mail_content ? (
            <iframe
              srcDoc={injectMailStyles(detail.mail_content)}
              title="메일 내용"
              sandbox="allow-same-origin"
              style={{ width: "100%", height: "100%", minHeight: "420px", border: "none" }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-zinc-400">
              내용이 없습니다.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
