// src/hooks/useEstimate.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 견적목록 응답 → dataset 배열 */
function mapEstimates(json) {
  apiOk(json, "견적목록 조회");
  return json.dataset ?? [];
}

/** 청구보험 응답 → dataset 배열 */
function mapClaims(json) {
  apiOk(json, "청구보험 조회");
  return json.dataset ?? [];
}

/** 견적상세 응답 → dataset 배열 */
function mapDetails(json) {
  apiOk(json, "견적상세 조회");
  return json.dataset ?? [];
}

export function useEstimate() {
  // ── 견적목록 조회 (day1, day2) ──
  const {
    data: estimates,
    loading: estLoading,
    error: estError,
    refetch: estRefetch,
  } = useApi({
    path: "/est_masterestimate_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapEstimates,
  });

  const fetchEstimates = useCallback(
    (day1, day2) => estRefetch({ day1, day2 }),
    [estRefetch]
  );

  // ── 청구보험 조회 (est_serial) ──
  const {
    data: claims,
    loading: claimLoading,
    error: claimError,
    refetch: claimRefetch,
  } = useApi({
    path: "/est_masterestimatebo_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapClaims,
  });

  const fetchClaims = useCallback(
    (est_serial) => claimRefetch({ est_serial }),
    [claimRefetch]
  );

  // ── 견적상세 조회 (est_serial, estbo_seqno) ──
  const {
    data: details,
    loading: detailLoading,
    error: detailError,
    refetch: detailRefetch,
  } = useApi({
    path: "/est_masterestimateb_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapDetails,
  });

  const fetchDetails = useCallback(
    (est_serial, estbo_seqno) => detailRefetch({ est_serial, estbo_seqno }),
    [detailRefetch]
  );

  return {
    // 견적목록
    estimates: estimates ?? [],
    estLoading,
    estError,
    fetchEstimates,

    // 청구보험
    claims: claims ?? [],
    claimLoading,
    claimError,
    fetchClaims,

    // 견적상세
    details: details ?? [],
    detailLoading,
    detailError,
    fetchDetails,
  };
}
