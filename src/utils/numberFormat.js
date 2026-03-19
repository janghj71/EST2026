/**
 * 숫자를 천 단위 콤마 포맷으로 변환
 * @param {string|number} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = String(value).replace(/[^\d]/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 콤마 제거 + 숫자만 추출
 * @param {string|number} value
 * @returns {string}
 */
export function unformatNumber(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\d]/g, "");
}

/**
 * 빈값/null/undefined → 0, 그 외 Number 변환 (서버 int 파라미터용)
 * @param {string|number|null|undefined} v
 * @returns {number}
 */
export function toInt(v) {
  return v === "" || v == null ? 0 : Number(v);
}

/**
 * 빈값/null/undefined → 0, 그 외 parseFloat 변환 (서버 decimal 파라미터용)
 * @param {string|number|null|undefined} v
 * @returns {number}
 */
export function toDecimal(v) {
  return v === "" || v == null ? 0 : parseFloat(v) || 0;
}
