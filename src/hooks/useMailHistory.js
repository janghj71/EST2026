// src/hooks/useMailHistory.js
import { useCallback } from "react";
import { useApi } from "./useApi";

/**
 * 발송메일 조회 훅
 * - 목록 조회 API : est_mail_s.aspx  (param: comcode, day1, day2)
 * - 상세 조회 API : est_mail_s.aspx  (param: comcode, mail_serial)
 * - 반환: { fetchMailList, fetchMailDetail, listLoading, detailLoading }
 */
export function useMailHistory() {
  const { loading: listLoading, refetch: listReq } = useApi({
    path: "/est_mail_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const { loading: detailLoading, refetch: detailReq } = useApi({
    path: "/est_mail_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchMailList = useCallback(
    ({ day1, day2 }) => listReq({ day1, day2 }),
    [listReq]
  );

  const fetchMailDetail = useCallback(
    (mail_serial) => detailReq({ mail_serial }),
    [detailReq]
  );

  return { fetchMailList, fetchMailDetail, listLoading, detailLoading };
}
