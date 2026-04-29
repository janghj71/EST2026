// src/hooks/useSmsSendLog.js
import { useCallback } from "react";
import { useApi } from "./useApi";

/**
 * 문자 발송 이력 조회 훅
 * - API: est_smssendlog_s.aspx
 * - params: comcode(자동주입), day1, day2 (YYYY-MM-DD)
 * - 반환: { fetchLog, loading }
 */
export function useSmsSendLog() {
  const { loading, refetch } = useApi({
    path: "/est_smssendlog_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchLog = useCallback(
    ({ day1, day2 }) => refetch({ day1, day2 }),
    [refetch]
  );

  return { fetchLog, loading };
}
