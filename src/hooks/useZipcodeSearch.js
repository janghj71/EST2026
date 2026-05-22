// src/hooks/useZipcodeSearch.js
import { useCallback } from "react";
import { useApi } from "./useApi";

function mapResults(json) {
  return json?.dataset ?? [];
}

export function useZipcodeSearch() {
  const { data, loading, error, refetch } = useApi({
    path: "/est_zipcode_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapResults,
  });

  const searchZipcode = useCallback(
    (roadname, bdbunji1 = "") => refetch({ roadname, bdbunji1 }),
    [refetch]
  );

  return {
    results: data ?? [],
    loading,
    error,
    searchZipcode,
  };
}
