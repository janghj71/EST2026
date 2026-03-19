// src/hooks/usePntcot.js
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 도장칼라 응답 → dataset 배열 */
function mapPntcot(json) {
  apiOk(json, "도장칼라 조회");
  return json.dataset ?? [];
}

/**
 * 도장칼라 코드 조회 훅
 * - est_codepntcot_s.aspx 전체 조회 (마운트 시 1회)
 * - 반환: { pntcotList, loading, error }
 *   pntcotList: [{ makercode, pntcolor_code, pntcot_code, pntcot_name }]
 */
export function usePntcot() {
  const { data, loading, error } = useApi({
    path: "/est_codepntcot_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapPntcot,
  });

  return {
    pntcotList: data ?? [],
    loading,
    error,
  };
}
