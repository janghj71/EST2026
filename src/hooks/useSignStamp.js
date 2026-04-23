// src/hooks/useSignStamp.js
import { useCallback } from "react";
import { useApi } from "./useApi";

/**
 * 개인정보활용동의 서명/날인 조회·저장 훅
 *
 * fetchSignStamp({ sign_serial, signkind })
 *   → Promise<raw API JSON>  (dataset[0].signstamp / signstamp2)
 *
 * saveSignStamp({ sign_serial, signkind, signstamp, signstamp2 })
 *   → Promise<raw API JSON>
 */
export function useSignStamp() {
  const { loading: fetching, refetch: fetchReq } = useApi({
    path: "/est_signstamp_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const { loading: saving, refetch: saveReq } = useApi({
    path: "/est_signstamp_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchSignStamp = useCallback(
    (params) => fetchReq(params),
    [fetchReq]
  );

  const saveSignStamp = useCallback(
    (params) => saveReq(params),
    [saveReq]
  );

  return { fetching, saving, fetchSignStamp, saveSignStamp };
}
