// src/hooks/useDepositSave.js
// 입금 저장 API
// POST est_masterpayin_c.aspx
// params: comcode(자동), est_serial, estbo_seqno, inday, incom

import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useDepositSave() {
  const { loading, refetch } = useApi({
    path:      "/est_masterpayin_c.aspx",
    method:    "POST",
    bodyType:  "form",
    immediate: false,
  });

  const saveDeposit = useCallback(
    async (params) => {
      const res = await refetch(params);
      apiOk(res, "입금 저장");
      return res;
    },
    [refetch],
  );

  return { loading, saveDeposit };
}
