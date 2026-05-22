// src/pages/NoticeViewPage.jsx
import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import IconBtn from "../components/IconBtn";

const STORAGE_KEY = "noticeViewCtx";
const MSG_TYPE    = "NOTICE_VIEW_SET_CTX";

function injectNoticeStyles(html) {
  if (!html) return html;
  const style = `<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #3f3f46; line-height: 1.6; margin: 0; padding: 16px; }
    a { color: #1d4ed8; text-decoration: underline; }
    p { margin: 0 0 8px; }
  </style>`;
  return style + html;
}

export default function NoticeViewPage() {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved) setCtx(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type !== MSG_TYPE) return;
      setCtx(ev.data.payload);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const fmtDate = (wdate) => (wdate ? String(wdate).slice(0, 10) : "");

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* 헤더 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-5 border-b border-zinc-200 bg-zinc-50">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
          <Bell className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-zinc-900 truncate">
            {ctx?.title || "공지사항"}
          </div>
          {ctx?.wdate && (
            <div className="text-xs text-zinc-400">{fmtDate(ctx.wdate)}</div>
          )}
        </div>
        <IconBtn
          icon={X}
          label="닫기"
          variant="primary"
          onClick={() => window.close()}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {ctx?.contents ? (
          <iframe
            srcDoc={injectNoticeStyles(ctx.contents)}
            title="공지 내용"
            sandbox="allow-same-origin"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-zinc-400">
            내용이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
