// src/hooks/useCarRegInfo.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { getComcode } from "../api/config";

/**
 * 원부조회: http://adbcp.intravan.co.kr/apiCarinfo.aspx
 * params: comcode, carno, owner
 */
export function useCarRegInfo() {
  const { refetch } = useApi({
    path: "/adbcpservice/apiCarinfo.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchCarRegInfo = useCallback(
    async ({ carno, owner = "" }) => {
      const res = await refetch({ comcode: getComcode(), carno, owner });
      return res;
    },
    [refetch]
  );

  return { fetchCarRegInfo };
}
