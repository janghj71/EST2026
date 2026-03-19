// src/hooks/useModelcode.js
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 모델코드 응답 → dataset 배열 */
function mapModels(json) {
  apiOk(json, "모델코드 조회");
  return json.dataset ?? [];
}

/**
 * 모델코드 목록 조회 훅
 * - est_modelcode_s.aspx 전체 조회 (마운트 시 1회)
 * - 반환: { models, loading, error }
 *   models: [{ codecar, modelcode, modelname, ... }]
 *   (차량.codecar === 모델.codecar 로 클라이언트 필터)
 */
export function useModelcode() {
  const { data, loading, error } = useApi({
    path: "/est_modelcode_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapModels,
  });

  return {
    models: data ?? [],
    loading,
    error,
  };
}
