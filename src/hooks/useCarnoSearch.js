// src/hooks/useCarnoSearch.js
// 차량번호로 이전 견적 검색
// POST est_masterestimate_carno4.aspx
// params: comcode(자동), carno

import { useCallback } from "react";
import { useApi } from "./useApi";

export function useCarnoSearch() {
  const { loading, refetch } = useApi({
    path:      "/est_masterestimate_carno4.aspx",
    method:    "POST",
    bodyType:  "form",
    immediate: false,
  });

  const searchByCarno = useCallback(
    async (carno) => {
      const res = await refetch({ carno });
      return res?.dataset ?? [];
    },
    [refetch],
  );

  return { loading, searchByCarno };
}
