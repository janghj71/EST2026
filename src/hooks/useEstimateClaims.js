// src/hooks/useEstimateClaims.js
import { useCallback } from "react";
import { useApi } from "./useApi";

/**
 * 청구처 조회 / 삭제 / 견적정산 조회 훅
 * - 청구처 조회 API : est_masterestimatebo_s.aspx
 * - 청구처 삭제 API : est_masterestimatebo_d.aspx
 * - 견적정산 조회 API: est_bocal1_s.aspx
 * - 반환: { fetchClaims, deleteClaim, fetchSettle, loading, deleting, settleLoading }
 */
export function useEstimateClaims() {
  const { loading, refetch } = useApi({
    path: "/est_masterestimatebo_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const { loading: deleting, refetch: deleteReq } = useApi({
    path: "/est_masterestimatebo_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const { loading: settleLoading, refetch: settleReq } = useApi({
    path: "/est_bocal1_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchClaims = useCallback(
    (est_serial) => refetch({ est_serial }),
    [refetch]
  );

  const deleteClaim = useCallback(
    (est_serial, estbo_seqno) => deleteReq({ est_serial, estbo_seqno }),
    [deleteReq]
  );

  const fetchSettle = useCallback(
    (params) => settleReq(params),
    [settleReq]
  );

  return { fetchClaims, deleteClaim, fetchSettle, loading, deleting, settleLoading };
}
