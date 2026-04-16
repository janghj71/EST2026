// src/prints/PrintPreviewLayout.jsx
// 공용 인쇄 미리보기 레이아웃
// - 상단 툴바: [인쇄] 버튼 + 페이지 네비게이션 (화면 전용)
// - children: 각 child = 1페이지
// - 화면: 현재 페이지 child만 표시
// - 인쇄: 모든 pages를 page-break-after로 순서 출력
import React, { useState } from "react";

export default function PrintPreviewLayout({ children }) {
  const pages  = React.Children.toArray(children);
  const total  = pages.length;
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((p) => Math.max(0, p - 1));
  const next = () => setCurrent((p) => Math.min(total - 1, p + 1));

  return (
    <>
      <style>{`
        /* ── 인쇄 공통 ── */
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body  { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pp-toolbar  { display: none !important; }
          .pp-screen   { display: none !important; }
          .pp-print    { display: block !important; }
          .no-print    { display: none !important; }
        }
        @media screen {
          .pp-print { display: none !important; }
        }

        /* ── 툴바 ── */
        .pp-toolbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 44px;
          background: #1e293b;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          z-index: 9999;
          font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
          font-size: 13px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .pp-toolbar button {
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          padding: 5px 14px;
          transition: background 0.15s;
        }
        .pp-toolbar button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .pp-btn-print {
          background: #2563eb;
          color: #fff;
        }
        .pp-btn-print:hover:not(:disabled) { background: #1d4ed8 !important; }
        .pp-btn-nav {
          background: transparent;
          color: #fff;
          border: 1px solid #475569 !important;
          padding: 4px 10px !important;
        }
        .pp-btn-nav:hover:not(:disabled) { background: #334155 !important; }
        .pp-page-label {
          min-width: 52px;
          text-align: center;
          font-size: 13px;
          color: #cbd5e1;
        }

        /* ── 컨텐츠 영역 (툴바 높이만큼 밀어내기) ── */
        .pp-content {
          margin-top: 44px;
        }
      `}</style>

      {/* ── 툴바 ── */}
      <div className="pp-toolbar">
        <button className="pp-btn-print" onClick={() => window.print()}>
          🖨 인쇄
        </button>
        <button className="pp-btn-nav" onClick={prev} disabled={current === 0}>
          ◀
        </button>
        <span className="pp-page-label">{current + 1} / {total}</span>
        <button className="pp-btn-nav" onClick={next} disabled={current === total - 1}>
          ▶
        </button>
      </div>

      {/* ── 화면: 현재 페이지만 ── */}
      <div className="pp-screen pp-content">
        {pages[current]}
      </div>

      {/* ── 인쇄: 모든 페이지 ── */}
      <div className="pp-print">
        {pages.map((page, i) => (
          <div
            key={i}
            style={i < total - 1 ? { pageBreakAfter: "always" } : undefined}
          >
            {page}
          </div>
        ))}
      </div>
    </>
  );
}
