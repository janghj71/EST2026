// src/hooks/useCarcode.js
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 차량코드 응답 → 내부 형식으로 변환 */
function mapCars(json) {
  apiOk(json, "차량코드 조회");
  return (json.dataset ?? []).map((r) => ({
    ...r,
    subcode: r.makercode,         // 제작사 필터 호환 (c.subcode === selectedMakerSubcode)
    carkind: Number(r.carkind),   // string → number (차종 필터 비교)
    cargrade: Number(r.cargrade), // string → number (등급 필터 비교)
  }));
}

/**
 * 차량코드 목록 조회 훅
 * - est_carcode_s.aspx 전체 조회 (마운트 시 1회)
 * - 반환: { cars, loading, error }
 *   cars: [{ makercode, subcode, carkind, cargrade, carcode, carname, codecar, paint, est_codecar, est_carname, ... }]
 */
export function useCarcode() {
  const { data, loading, error } = useApi({
    path: "/est_carcode_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapCars,
  });

  return {
    cars: data ?? [],
    loading,
    error,
  };
}
