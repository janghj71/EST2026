// src/hooks/useTs_Repair.js
import { useCallback } from "react";
import { useApi } from "./useApi";

/**
 * TS 서비스 (http://dev-ts.intravan.co.kr) 관련 훅 모음
 * VITE_TSSERVICE 환경변수 → /tsservice prefix로 라우팅
 */

/** 국토부 ts_payno 목록: /tsservice/api/ts_payno_s.aspx
 *  응답: { result, ts_payno: [{ payno, payname, payno_kind, payno_kind_nm, ... }] }
 */
export function useTs_repart() {
  const { refetch } = useApi({
    path: "/tsservice/api/ts_payno_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchTsPayno = useCallback(
    () => refetch({}),
    [refetch]
  );

  return { fetchTsPayno };
}
