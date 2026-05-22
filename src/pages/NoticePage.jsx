// src/pages/NoticePage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import IconBtn from "../components/IconBtn";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import { useNoticeList } from "../hooks/useNotice";
import { openCenteredWindow } from "../utils/popup";

/* wdate "2019-10-30 오전 10:34:00" → "2019-10-30" */
function fmtDate(wdate) {
  if (!wdate) return "";
  return String(wdate).slice(0, 10);
}

export default function NoticePage() {
  const { fetchNoticeList } = useNoticeList();
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [openNum, setOpenNum] = useState(null); // 열린 공지 num
  const viewWinRef = useRef(null);

  const openNoticeView = (row) => {
    const payload = { num: row.num, title: row.title, wdate: row.wdate, contents: row.contents };
    sessionStorage.setItem("noticeViewCtx", JSON.stringify(payload));
    const msg = { type: "NOTICE_VIEW_SET_CTX", payload };
    if (viewWinRef.current && !viewWinRef.current.closed) {
      try {
        viewWinRef.current.postMessage(msg, window.location.origin);
        viewWinRef.current.focus();
        return;
      } catch { viewWinRef.current = null; }
    }
    viewWinRef.current = openCenteredWindow("/notice-view", "noticeView", 800, 640, {
      scrollbars: "yes", resizable: "yes",
      postMessage: msg,
    });
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNoticeList();
      setRows(res?.dataset ?? []);
    } finally {
      setLoading(false);
    }
  }, [fetchNoticeList]);

  useEffect(() => { loadList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (row) => {
    setOpenNum((prev) => (prev === row.num ? null : row.num));
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* 헤더 */}
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">공지사항</div>
            <div className="text-sm text-zinc-500">서비스 업데이트 및 안내사항을 확인하세요.</div>
          </div>
          <div className="ml-auto">
            <IconBtn
              icon={X}
              label="닫기"
              variant="primary"
              onClick={() => window.close()}
            />
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        <TableLoadingOverlay loading={loading} />

        {!loading && rows.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-zinc-400">
            공지사항이 없습니다.
          </div>
        )}

        <div className="divide-y divide-zinc-100">
          {rows.map((row) => {
            const isOpen = openNum === row.num;
            return (
              <div key={row.num}>
                {/* 행 헤더 */}
                <button
                  type="button"
                  onClick={() => toggle(row)}
                  className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="shrink-0 text-xs text-zinc-400 w-8 text-right">
                    {row.num}
                  </span>
                  <span className="flex-1 text-sm font-medium text-zinc-800 truncate">
                    {row.title}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {fmtDate(row.wdate)}
                  </span>
                  <span className="shrink-0 text-zinc-400">
                    {isOpen
                      ? <ChevronUp  className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {/* 펼침 내용 */}
                {isOpen && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-4 flex items-start justify-between gap-4">
                    <div
                      className="prose prose-sm max-w-none text-zinc-700 flex-1 min-w-0"
                      dangerouslySetInnerHTML={{ __html: row.contents ?? "" }}
                    />
                    <button
                      type="button"
                      onClick={() => openNoticeView(row)}
                      className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      크게 보기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 푸터 카운트 */}
      <div className="shrink-0 border-t border-zinc-200 px-6 py-2 text-xs text-zinc-400">
        총 {rows.length}건
      </div>
    </div>
  );
}
