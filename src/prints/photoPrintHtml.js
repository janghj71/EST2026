/**
 * photoPrintHtml.js
 * 사진 인쇄 팝업용 HTML 문자열 생성 유틸리티
 *
 * @param {Object} params
 * @param {Array}  params.viewItems   - 인쇄할 사진 배열 { url, sourceUrl, cat, memo }
 * @param {number} params.count       - 페이지당 사진 수 (4 | 6 | 12)
 * @param {string} params.carNo       - 차량번호
 * @param {Object} params.checkedCats - 체크된 카테고리 맵 { all: true, '1': false, ... }
 * @param {Array}  params.CATS        - 카테고리 목록 [{ key, label }]
 * @returns {string} 팝업 창에 write() 할 완성 HTML 문자열
 */
/** HTML 특수문자 이스케이프 (XSS 방지) */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPhotoPrintHtml({ viewItems, count, carNo, checkedCats, CATS }) {
  // 페이지 그룹 분리
  const groups = [];
  for (let i = 0; i < viewItems.length; i += count) {
    groups.push(viewItems.slice(i, i + count));
  }

  // 인쇄 레이아웃
  const layoutByCount = {
    4: { cols: 2, rows: 2, gapMm: 4, headerPt: 18, infoPt: 10, catPt: 10, memoPt: 9, memoLines: 2, catRowMm: 6, memoRowMm: 10 },
    6: { cols: 2, rows: 3, gapMm: 3, headerPt: 16, infoPt: 9, catPt: 9, memoPt: 8, memoLines: 1, catRowMm: 4, memoRowMm: 5 },
    12: { cols: 3, rows: 4, gapMm: 2.5, headerPt: 14, infoPt: 8, catPt: 8, memoPt: 7, memoLines: 1, catRowMm: 3, memoRowMm: 4 },
  };
  const layout = layoutByCount[count] || layoutByCount[4];

  const totalPages = groups.length;
  const printDate = new Date().toLocaleString();

  // 사진구분 라벨 계산
  const isAll = checkedCats?.all === true;
  const kindLabels = isAll
    ? ["전체사진"]
    : Object.entries(checkedCats || {})
        .filter(([k, v]) => v && k !== "all")
        .map(([k]) => CATS.find((c) => c.key === k)?.label ?? k);

  // 카테고리 key -> label 맵
  const catLabelMap = (CATS || []).reduce((m, c) => {
    m[c.key] = c.label;
    return m;
  }, {});

  const pageHtml = groups
    .map(
      (group, pageIndex) => `
    <div class="page">
      <div class="header">${esc(carNo)}</div>
      <div class="info">
        인쇄일시 ${esc(printDate)}
        &nbsp;|&nbsp; 사진구분: ${kindLabels.map(esc).join(", ")}
        &nbsp;|&nbsp; 페이지 ${pageIndex + 1} / ${totalPages}
      </div>
      <div class="grid">
        ${group
          .map((photo) => {
            const catLabel = catLabelMap[photo.cat] || photo.cat || "";
            const imgSrc = photo.sourceUrl || photo.url || "";
            const memo = photo.memo || "";
            return `
          <div class="item">
            <div class="thumb">
              <img src="${esc(imgSrc)}" alt="" />
            </div>
            <div class="category">${esc(catLabel) || "&nbsp;"}</div>
            <div class="memo">${esc(memo) || "&nbsp;"}</div>
          </div>`;
          })
          .join("")}
      </div>
      <div class="footer"></div>
    </div>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>${esc(carNo) || "사진인쇄"}</title>
    <style>
      @page { size: A4; margin: 10mm; }

      body {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Malgun Gothic', sans-serif;
      }

      .page {
        width: 190mm;
        height: 277mm;
        box-sizing: border-box;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: ${layout.gapMm}mm;
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: always;
      }
      .page + .page {
        page-break-before: always;
        break-before: always;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(${layout.cols}, minmax(0, 1fr));
        grid-template-rows: repeat(${layout.rows}, minmax(0, 1fr));
        gap: ${layout.gapMm}mm;
        height: 100%;
        min-height: 0;
        align-content: stretch;
      }

      .item {
        min-height: 0;
        display: grid;
        grid-template-rows: minmax(0, 1fr) ${layout.catRowMm}mm ${layout.memoRowMm}mm;
        overflow: hidden;
      }

      .thumb {
        min-height: 0;
        border: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .item img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .header {
        text-align: center;
        font-size: ${layout.headerPt}pt;
        font-weight: bold;
      }

      .info {
        text-align: right;
        font-size: ${layout.infoPt}pt;
        color: #444;
      }

      .category {
        margin-top: 0;
        padding-top: 0.8mm;
        box-sizing: border-box;
        font-size: ${layout.catPt}pt;
        font-weight: 600;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: flex-start;
      }

      .memo {
        margin-top: 0;
        font-size: ${layout.memoPt}pt;
        color: #555;
        line-height: 1.2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: ${layout.memoLines};
      }

      .footer {
        text-align: center;
        font-size: 8pt;
        margin-top: 1mm;
      }
    </style>
  </head>
  <body>
    ${pageHtml}
    <script>
      window.onload = function () { window.print(); };
      window.onafterprint = function () { window.close(); };
    </script>
  </body>
</html>`;
}
