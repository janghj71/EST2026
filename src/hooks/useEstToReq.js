// src/hooks/useEstToReq.js
// 견적 → 작업 전환 API
// POST est_esttoreq_c.aspx
// params: comcode, est_serial, update_id
// response: { result, newserial, ... }

import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useEstToReq() {
  const { loading, refetch } = useApi({
    path:      "/est_esttoreq_c.aspx",
    method:    "POST",
    bodyType:  "form",
    immediate: false,
  });

  const estToReq = useCallback(
    async (params) => {
      const res = await refetch(params);
      apiOk(res, "작업전환");
      return res;
    },
    [refetch],
  );

  return { loading, estToReq };
}
