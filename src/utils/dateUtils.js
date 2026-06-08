// src/utils/dateUtils.js
// 날짜 관련 범용 유틸

/** 숫자를 2자리 문자열로 패딩 */
export function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Date → "YYYY-MM-DD" */
export function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 기준 Date의 월 첫날/마지막날을 "YYYY-MM-DD" 문자열로 반환 */
export function monthRange(baseDate) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth(); // 0~11
  return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
}

/** 기준 Date에서 delta 개월 이동한 월의 1일 Date 반환 */
export function addMonths(baseDate, delta) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + delta, 1);
}

/** 인쇄용 현재시각 "YYYY-MM-DD HH:MM" */
export function printDateStr() {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())} ${pad2(n.getHours())}:${pad2(n.getMinutes())}`;
}

/**
 * 날짜 문자열 → { y, m, d }
 * - 시간 포함 시 공백 앞부분만 사용 ("2026-06-08 12:00" → "2026-06-08")
 * - 구분자 없는 "20260608"도 처리
 * - 한 자리 월/일은 그대로 반환 (패딩 안 함)
 */
export function parseDateParts(str) {
  if (!str) return { y: "", m: "", d: "" };
  const s     = String(str).replace(/\s.*$/, "");
  const clean = s.replace(/\D/g, "");
  if (clean.length >= 8)
    return { y: clean.slice(0, 4), m: clean.slice(4, 6), d: clean.slice(6, 8) };
  const p = s.split("-");
  return { y: p[0] || "", m: p[1] || "", d: p[2] || "" };
}
