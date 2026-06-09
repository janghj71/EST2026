// src/prints/PhotoPrintPage.jsx
// 사진 인쇄 — PrintPreviewLayout 기반
import React, { useMemo } from "react";
import PrintPreviewLayout from "./PrintPreviewLayout";

const STORAGE_KEY = "photoPrintCtx";

/** 데이터 저장 (PhotoViewer에서 호출) */
export function setPhotoPrintCtx(ctx) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch { /* empty */ }
}

// ── 레이아웃 설정 ────────────────────────────────────────────
const LAYOUT = {
  4:  { cols: 2, rows: 2, gap: "4mm",   headerPt: 18, infoPt: 10, catPt: 10, memoPt: 9,  memoLines: 2, catRowMm: "6mm",  memoRowMm: "10mm" },
  6:  { cols: 2, rows: 3, gap: "3mm",   headerPt: 16, infoPt: 9,  catPt: 9,  memoPt: 8,  memoLines: 1, catRowMm: "4mm",  memoRowMm: "5mm"  },
  12: { cols: 3, rows: 4, gap: "2.5mm", headerPt: 14, infoPt: 8,  catPt: 8,  memoPt: 7,  memoLines: 1, catRowMm: "3mm",  memoRowMm: "4mm"  },
};

export default function PhotoPrintPage() {
  // sessionStorage에서 컨텍스트 읽기
  const ctx = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  if (!ctx) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>인쇄 데이터가 없습니다.</div>;
  }

  const { viewItems = [], count = 4, carNo = "", checkedCats = {}, CATS = [] } = ctx;

  const layout = LAYOUT[count] || LAYOUT[4];
  const printDate = new Date().toLocaleString();

  // 사진구분 라벨
  const isAll = checkedCats?.all === true;
  const kindLabels = isAll
    ? ["전체사진"]
    : Object.entries(checkedCats)
        .filter(([k, v]) => v && k !== "all")
        .map(([k]) => CATS.find((c) => c.key === k)?.label ?? k);

  // 카테고리 key → label 맵
  const catLabelMap = CATS.reduce((m, c) => { m[c.key] = c.label; return m; }, {});

  // count 장씩 페이지 분할
  const groups = [];
  for (let i = 0; i < viewItems.length; i += count) {
    groups.push(viewItems.slice(i, i + count));
  }

  const pages = groups.map((group, pageIndex) => (
    <Page
      key={pageIndex}
      group={group}
      pageIndex={pageIndex}
      totalPages={groups.length}
      carNo={carNo}
      printDate={printDate}
      kindLabels={kindLabels}
      catLabelMap={catLabelMap}
      layout={layout}
    />
  ));

  return (
    <>
      <GlobalStyle layout={layout} />
      <PrintPreviewLayout>{pages}</PrintPreviewLayout>
    </>
  );
}

// ── 페이지 컴포넌트 ──────────────────────────────────────────
function Page({ group, pageIndex, totalPages, carNo, printDate, kindLabels, catLabelMap, layout }) {
  return (
    <div className="photo-page" style={{
      width: "190mm",
      margin: "0 auto",
      paddingTop: "6mm",
      boxSizing: "border-box",
      display: "grid",
      gridTemplateRows: "auto auto 1fr auto",
      gap: layout.gap,
      fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
    }}>
      {/* 차량번호 */}
      <div style={{ textAlign: "center", fontSize: `${layout.headerPt}pt`, fontWeight: "bold" }}>
        {carNo}
      </div>

      {/* 인쇄일시 — 화면에서 숨김, 인쇄 시에만 표시 */}
      <div className="photo-print-info">
        인쇄일시 {printDate}
        &nbsp;|&nbsp; 사진구분: {kindLabels.join(", ")}
        &nbsp;|&nbsp; 페이지 {pageIndex + 1} / {totalPages}
      </div>

      {/* 사진 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        gap: layout.gap,
        height: "100%",
        minHeight: 0,
        alignContent: "stretch",
      }}>
        {group.map((photo, i) => {
          const catLabel = catLabelMap[photo.cat] || photo.cat || "";
          const imgSrc   = photo.sourceUrl || photo.url || "";
          const memo     = photo.memo || "";
          return (
            <div key={i} style={{
              minHeight: 0,
              display: "grid",
              gridTemplateRows: `minmax(0, 1fr) ${layout.catRowMm} ${layout.memoRowMm}`,
              overflow: "hidden",
            }}>
              {/* 사진 */}
              <div style={{
                minHeight: 0,
                border: "1px solid #ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                <img
                  src={imgSrc}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>

              {/* 구분 */}
              <div style={{
                paddingTop: "0.8mm",
                fontSize: `${layout.catPt}pt`,
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {catLabel || " "}
              </div>

              {/* 메모 */}
              <div style={{
                fontSize: `${layout.memoPt}pt`,
                color: "#555",
                lineHeight: 1.2,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: layout.memoLines,
              }}>
                {memo || " "}
              </div>
            </div>
          );
        })}
      </div>

      {/* 푸터 */}
      <div style={{ textAlign: "center", fontSize: "8pt", marginTop: "1mm" }} />
    </div>
  );
}

// ── 인쇄용 전역 스타일 ───────────────────────────────────────
function GlobalStyle({ layout }) {
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      /* 인쇄일시: 화면에서 숨김, 인쇄 시에만 표시 */
      .photo-print-info { display: none; }
      @media print {
        .photo-print-info {
          display: block;
          text-align: right;
          font-size: ${layout.infoPt}pt;
          color: #444;
        }
      }
      /* 화면: 뷰포트 기준 높이 (툴바 60px 제외) */
      @media screen {
        .photo-page { height: calc(100vh - 60px); }
      }
      /* 인쇄: A4 고정 높이 */
      @media print {
        .photo-page { height: 277mm; }
      }
    `}</style>
  );
}
