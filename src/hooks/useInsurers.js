// src/hooks/useInsurers.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 조회 응답 → 보험사 배열 */
function mapInsurers(json) {
  apiOk(json, "보험사 조회");
  return json.dataset ?? [];
}

/** 저장용 파라미터 추출 */
function toSaveParams(row) {
  return {
    bocomcode:  row.bocomcode,
    bocomname:  row.bocomname,
    xpay:       row.xpay  ?? "",
    bpay:       row.bpay  ?? "",
    ppay:       row.ppay  ?? "",
    expay:      row.expay ?? "",
    ebpay:      row.ebpay ?? "",
    eppay:      row.eppay ?? "",
  };
}

export function useInsurers() {
  // ── 조회 ──
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_tbbocom_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapInsurers,
  });

  // ── 저장 ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_tbbocom_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const save = useCallback(async (row) => {
    const json = await saveRequest(toSaveParams(row));
    apiOk(json, "보험사 저장");
    return json;
  }, [saveRequest]);

  return {
    insurers: data ?? [],
    setInsurers: setData,
    loading,
    saving,
    error,
    refetch,
    save,
  };
}
