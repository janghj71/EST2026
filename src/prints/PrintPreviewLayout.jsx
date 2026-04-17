// src/prints/PrintPreviewLayout.jsx
// 공용 인쇄 미리보기 레이아웃
import React, { useState, useEffect } from "react";
import { Printer, ChevronLeft, ChevronRight, X } from "lucide-react";
import IconBtn from "../components/IconBtn";

export default function PrintPreviewLayout({ children, onAfterPrint }) {
  const pages  = React.Children.toArray(children);
  const total  = pages.length;
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((p) => Math.max(0, p - 1));
  const next = () => setCurrent((p) => Math.min(total - 1, p + 1));

  // ── afterprint 이벤트 → 부모 콜백 ──────────────────────────
  useEffect(() => {
    if (!onAfterPrint) return;
    const handler = () => onAfterPrint();
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onAfterPrint]);

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
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          z-index: 9999;
          display: flex;
          align-items: center;
        }

        /* ── 툴바 내부 — 인쇄물 너비 기준 ── */
        .pp-toolbar-inner {
          width: 190mm;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pp-page-label {
          min-width: 52px;
          text-align: center;
          font-size: 13px;
          color: #475569;
          font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
        }

        /* ── 컨텐츠 영역 ── */
        .pp-content {
          margin-top: 44px;
        }
      `}</style>

      {/* ── 툴바 ── */}
      <div className="pp-toolbar">
        <div className="pp-toolbar-inner">
          <IconBtn
            icon={Printer}
            label="인쇄"
            variant="orange"
            onClick={() => window.print()}
          />
          <IconBtn
            icon={ChevronLeft}
            variant="default"
            onClick={prev}
            disabled={current === 0}
          />
          <span className="pp-page-label">{current + 1} / {total}</span>
          <IconBtn
            icon={ChevronRight}
            variant="default"
            onClick={next}
            disabled={current === total - 1}
          />
          <IconBtn
            icon={X}
            label="닫기"
            variant="primary"
            onClick={() => window.close()}
            className="ml-auto"
          />
        </div>
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
