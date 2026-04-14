// src/hooks/useEstimate.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 견적목록 응답 → dataset 배열 */
function mapEstimates(json) {
  apiOk(json, "견적목록 조회");
  return json.dataset ?? [];
}

/** 마스터 단건 응답 → dataset[0] */
function mapMasterOne(json) {
  apiOk(json, "접수 조회");
  return json.dataset?.[0] ?? null;
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

  /** 텍스트 검색 (findtext만 전달, comcode는 useApi가 자동 병합) */
  const fetchByText = useCallback(
    (findtext) => estRefetch({ findtext }),
    [estRefetch]
  );

  // ── 마스터 단건 조회 (est_serial) ──
  const {
    data: masterData,
    loading: masterLoading,
    error: masterError,
    refetch: masterRefetch,
  } = useApi({
    path: "/est_masterestimate_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapMasterOne,
  });

  const fetchMasterById = useCallback(
    (est_serial) => masterRefetch({ est_serial }),
    [masterRefetch]
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
    (est_serial, estbo_seqno) => {
      const body = { est_serial };
      if (estbo_seqno != null) body.estbo_seqno = estbo_seqno;
      return detailRefetch(body);
    },
    [detailRefetch]
  );

  // ── 중복체크 (est_serial) ──
  const { refetch: overlapRefetch } = useApi({
    path: "/est_overlap_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchOverlap = useCallback(
    (est_serial) => overlapRefetch({ est_serial }),
    [overlapRefetch]
  );

  return {
    // 견적목록
    estimates: estimates ?? [],
    estLoading,
    estError,
    fetchEstimates,
    fetchByText,

    // 마스터 단건
    masterData,
    masterLoading,
    masterError,
    fetchMasterById,

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

    // 중복체크
    fetchOverlap,
  };
}
