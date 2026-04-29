/**
 * 금액 천 단위 콤마 포맷 (ko-KR, 소수점 없음)
 * null/undefined/비정수 → "0"
 * @param {string|number} value
 * @returns {string}
 */
export function formatMoney(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ko-KR");
}

/**
 * 숫자를 천 단위 콤마 포맷으로 변환 (소수점·음수 보존, toLocaleString 기반)
 * null/undefined/빈값 → "0"
 * @param {string|number} value
 * @returns {string}
 */
export function formatLocaleNumber(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString();
}

/**
 * 숫자를 천 단위 콤마 포맷으로 변환 (소수점·음수 보존 안함) 양의정수로 변환 
 * * null/undefined/빈값 → ""
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

// ── API body 변환 헬퍼 ──────────────────────────────────────────
// 규칙: '' → '',  null/undefined → null,  그 외 → 변환값

/** '' → '',  null/undefined → null,  그 외 → parseInt 정수 */
export function toIntOrNull(v) {
  if (v === "")  return "0";
  if (v == null) return "0";
  return String(parseInt(v, 10) || 0);
}

/** '' → '',  null/undefined → null,  그 외 → parseFloat 실수 문자열 */
export function toDecStr(v) {
  if (v === "")  return "0";
  if (v == null) return "0";
  return String(parseFloat(v) || 0);
}

/** '' → '',  null/undefined → null,  그 외 → String */
export function toStrOrNull(v) {
  if (v === "")  return "";
  if (v == null) return null;
  return String(v);
}
