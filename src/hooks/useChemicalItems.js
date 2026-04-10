// src/hooks/useChemicalItems.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 케미칼 목록 (lazy): est_material_s.aspx */
export function useFetchMaterials() {
  const { refetch } = useApi({
    path: "/est_material_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchMaterials = useCallback(
    ({ material_gubun }) => refetch({ material_gubun }),
    [refetch]
  );

  return { fetchMaterials };
}

/** 사용자 부품 이력 목록 (lazy): est_upart_hist_s.aspx */
export function useFetchPartHistory() {
  const { refetch } = useApi({
    path: "/est_upart_hist_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchPartHistory = useCallback(
    ({ comcode, carcode }) => refetch({ comcode, carcode }),
    [refetch]
  );

  return { fetchPartHistory };
}

/** 제작사 부품 검색 (lazy): neoservice/epc_cdm_ptno_s.aspx */
export function useFetchNeoPart() {
  const { refetch } = useApi({
    path: "/neoservice/epc_cdm_ptno_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchNeoPart = useCallback(
    ({ scdptno }) => refetch({ scdptno }),
    [refetch]
  );

  return { fetchNeoPart };
}

/** 조회 응답 → 케미칼 항목 배열 */
function mapItems(json) {
  apiOk(json, "케미칼 항목 조회");
  return json.dataset ?? [];
}

export function useChemicalItems() {
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_material_s.aspx",
    method: "POST",
    bodyType: "form",
    body: { material_gubun: "1" },
    immediate: true,
    onMap: mapItems,
  });

  // ── 저장 (건별) ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_material_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const saveItem = useCallback(async (row) => {
    const json = await saveRequest({
      material_cd:    row.material_cd ?? "",
      material_seqno: row.material_seqno ?? "",
      material_nm:    row.material_nm ?? "",
      hour2:          String(row.hour2 ?? ""),
      price:          String(row.price ?? ""),
      unit:           row.unit ?? "",
    });
    apiOk(json, "케미칼 항목 저장");
    return json;
  }, [saveRequest]);

  return {
    items: data ?? [],
    setItems: setData,
    loading,
    saving,
    error,
    refetch,
    saveItem,
  };
}
