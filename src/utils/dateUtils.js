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
