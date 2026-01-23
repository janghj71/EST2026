// src/utils/popup.js
/**
 * 화면 중앙에 팝업창을 엽니다.
 * @param {string} url        열고자 하는 URL
 * @param {string} name       팝업 창 이름 (동일 이름이면 재사용)
 * @param {number} width      팝업 너비 (픽셀)
 * @param {number} height     팝업 높이 (픽셀)
 * @param {object} [options]  추가 윈도우 옵션 (key: value 형태)
 * options.windowFeatures: window.open features로 들어갈 옵션들(scrollbars,resizable 등)
 * options.postMessage: {
 *   type: string,              // 예: "PHOTO_POPUP_SET_CTX"
 *   payload: any,              // 전송할 payload
 *   targetOrigin?: string,     // 기본: window.location.origin
 *   attempts?: number,         // 기본: 3
 *   intervals?: number[],      // 기본: [0, 200, 600] (ms)
 * }
 * @returns {Window|null}     window.open 반환값
 */
export function openCenteredWindow(
  url,
  name,
  width = 800,
  height = 600,
  options = {}
) {
    // URL이 상대경로인 경우 절대 URL로 변환
    // const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    // URL이 절대 URL 또는 프로토콜 스킴(about:, data: 등)을 포함하면 그대로, 아니면 origin을 붙여 절대경로로 변환
    const fullUrl = /^[a-z][a-z\d+\-.]*:/i.test(url)
      ? url
      : `${window.location.origin}${url}`;

    const left = Math.round(window.screenX + (window.outerWidth  - width) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - height) / 2);

    const {
      windowFeatures = {},   // features만 분리
      postMessage,           // 새 옵션
    } = options;

    // 기본 옵션
    const opts = {
        width,
        height,
        left,
        top,
        scrollbars: 'yes',
        resizable:   'yes',
        ...windowFeatures,
        
  };

  // 옵션 객체를 "key=value,..." 문자열로
  const features = Object.entries(opts)
    .map(([k,v]) => `${k}=${v}`)
    .join(',');
  
  console.log('▶ fullUrl:', fullUrl);

  const win = window.open(fullUrl, name, features);
  if (!win) return null;

  // load 직후가 아니라 약간 지연시켜 주는 게 안정적입니다.
  setTimeout(() => {
    try {
      win.resizeTo(width, height);
      win.moveTo(left, top);
    } catch(e) {
      console.warn('팝업 리사이즈 실패', e);
    }
    try {
      win.focus();
    } catch {}
  }, 100);

  try {
    win.focus();
  } catch {}


  // ===== postMessage 자동 전송(옵션) =====
  if (postMessage && typeof postMessage === "object") {
    const {
      type,
      payload,
      targetOrigin = window.location.origin,
      attempts = 3,
      intervals = [0, 200, 600],
    } = postMessage;

    if (type) {
      const msg = { type, payload };

      const sendOnce = () => {
        try {
          // 닫혔으면 중단
          if (win.closed) return false;
          win.postMessage(msg, targetOrigin);
          return true;
        } catch {
          return false;
        }
      };

      // intervals 우선 사용, 부족하면 attempts 기준으로 채움
      const plan = Array.isArray(intervals) && intervals.length > 0
        ? intervals.slice(0, attempts)
        : Array.from({ length: attempts }, (_, i) => (i === 0 ? 0 : 200 * i));

      plan.forEach((ms) => setTimeout(sendOnce, ms));
    }

  }
  
  return win;
}
