// src/hooks/useStatementList.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useStatementList() {
  const { loading, refetch } = useApi({
    path: "/est_formbat_s.aspx",
    immediate: false,
  });

  const fetchStatementList = useCallback(async ({ day1, day2 }) => {
    const json = await refetch({ day1, day2, isest: "0" });
    apiOk(json, "명세서 목록 조회");
    return json.dataset ?? [];
  }, [refetch]);

  return { loading, fetchStatementList };
}
