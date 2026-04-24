// src/hooks/useEstimateDelete.js
// 견적 삭제 API
// POST est_masterestimate_d.aspx
// params: comcode(자동), est_serial, userid

import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useEstimateDelete() {
  const { loading, refetch } = useApi({
    path:      "/est_masterestimate_d.aspx",
    method:    "POST",
    bodyType:  "form",
    immediate: false,
  });

  const deleteEstimate = useCallback(
    async (params) => {
      const res = await refetch(params);
      apiOk(res, "견적 삭제");
      return res;
    },
    [refetch],
  );

  return { loading, deleteEstimate };
}
