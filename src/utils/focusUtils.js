/**
 * Enter / Shift+Enter 키로 포커스 이동
 * - Enter        : 다음 필드
 * - Shift+Enter  : 이전 필드
 */
export function moveFocusOnEnter(e) {
  if (e.key !== "Enter") return;

  // textarea는 줄바꿈 유지하고 싶으면 제외
  if (e.target.tagName === "TEXTAREA") return;

  e.preventDefault();

  const focusable = Array.from(
    document.querySelectorAll(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      !el.disabled &&
      !el.readOnly &&
      el.offsetParent !== null
  );

  const idx = focusable.indexOf(e.target);

  if (idx === -1) return;

  // Shift + Enter → 이전
  if (e.shiftKey) {
    if (idx - 1 >= 0) {
      focusable[idx - 1].focus();
    }
    return;
  }

  // Enter → 다음
  if (idx + 1 < focusable.length) {
    focusable[idx + 1].focus();
  }
}


/**
 * id로 특정 엘리먼트에 포커스 주기
 * - DOM 렌더 직후(행 추가 직후)에도 안전하게 포커스를 주기 위해
 *   requestAnimationFrame을 사용한다.
 *
 * @param {string} id
 * @param {{ select?: boolean, preventScroll?: boolean, retry?: number }} opt
 *  - select: input이면 텍스트 전체 선택
 *  - preventScroll: 스크롤 이동 없이 포커스
 *  - retry: 요소가 아직 DOM에 없을 때 재시도 횟수(기본 3)
 * @returns {boolean} 성공 여부(즉시 반환, 실제 포커스는 rAF에서 수행)
 */
export function focusById(id, opt = {}) {
  if (!id) return false;

  const { select = false, preventScroll = false, retry = 3 } = opt;

  let remain = Math.max(0, Number(retry) || 0);

  const tryFocus = () => {
    const el = document.getElementById(id);
    if (!el) {
      if (remain > 0) {
        remain -= 1;
        requestAnimationFrame(tryFocus);
      }
      return;
    }

    // focus
    try {
      el.focus({ preventScroll });
    } catch {
      el.focus();
    }

    // select (input/textarea)
    if (select) {
      const tag = (el.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA") {
        try {
          el.select?.();
        } catch {}
      }
    }
  };

  requestAnimationFrame(tryFocus);
  return true;
}
