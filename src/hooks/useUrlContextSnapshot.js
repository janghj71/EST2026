import { useEffect, useState } from "react";

/**
 * URL 쿼리를 1회 스냅샷 → sessionStorage 저장 → URL 정리(쿼리 제거)
 * - storageKey: 세션에 저장할 키
 * - keys: 보존할 쿼리 파라미터 목록
 * - cleanPath: 주소창을 어떤 경로로 정리할지 (생략 시 현재 pathname 유지)
 * - normalize: 값을 후처리하는 함수(옵션)
 */

export function setUrlContextSnapshot(storageKey, nextCtx) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(nextCtx ?? {}));
  } catch {}
}

export function useUrlContextSnapshot({
  storageKey,
  keys,
  cleanPath,
  normalize,
}) {
  const [ctx, setCtx] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const found = keys?.some((k) => qs.has(k));
    if (!found) return;

    const next = {};
    keys.forEach((k) => {
      const v = qs.get(k);
      if (v != null && v !== "undefined" && v !== "null") next[k] = v;
    });

    const mapped = normalize ? normalize(next) : next;

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(mapped));
    } catch {}

    setCtx(mapped);

    // 주소창 정리
    const target = cleanPath || location.pathname;
    if (history?.replaceState) history.replaceState(null, "", target);
  }, []); // 최초 1회

  return ctx;
}
