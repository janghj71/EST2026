// src/hooks/useEstimateList.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useEstimateList() {
  const { loading, refetch } = useApi({
    path: "/est_formbat_s.aspx",
    immediate: false,
  });

  const fetchEstimateList = useCallback(async ({ day1, day2 }) => {
    const json = await refetch({ day1, day2, isest: "1" });
    apiOk(json, "견적서 목록 조회");
    return json.dataset ?? [];
  }, [refetch]);

  return { loading, fetchEstimateList };
}
