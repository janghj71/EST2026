// src/hooks/useSmsSender.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 조회 응답 → 발신번호 배열 */
function mapSenders(json) {
  apiOk(json, "발신번호 조회");
  return json.dataset ?? [];
}

export function useSmsSender() {
  // -- 조회 --
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_smscallback_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapSenders,
  });

  // -- 등록 / 자리이동 (JSON body) --
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_smscallback_c.aspx",
    method: "POST",
    bodyType: "json",
    immediate: false,
  });

  const saveSenders = useCallback(async (dataset) => {
    const json = await saveRequest({ dataset });
    apiOk(json, "발신번호 저장");
    return json;
  }, [saveRequest]);

  // -- 삭제 (form) --
  const { loading: deleting, refetch: deleteRequest } = useApi({
    path: "/est_smscallback_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const deleteSender = useCallback(async (callback) => {
    const json = await deleteRequest({ callback });
    apiOk(json, "발신번호 삭제");
    return json;
  }, [deleteRequest]);

  return {
    senders: data ?? [],
    setSenders: setData,
    loading,
    saving,
    deleting,
    error,
    refetch,
    saveSenders,
    deleteSender,
  };
}
