// src/hooks/useNewEstimate.js
// 신규 견적 생성 API
// POST est_masterestimate_c.aspx
// params: comcode(자동), seccode, paykind, pntkind, userid

import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useNewEstimate() {
  const { loading, refetch } = useApi({
    path:      "/est_masterestimate_c.aspx",
    method:    "POST",
    bodyType:  "form",
    immediate: false,
  });

  const createEstimate = useCallback(
    async (params) => {
      const res = await refetch(params);
      apiOk(res, "신규 견적 생성");
      return res;
    },
    [refetch],
  );

  return { loading, createEstimate };
}
