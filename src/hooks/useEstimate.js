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

  // ── 공유견적 목록 조회 (isestopen='1', carname 선택) ──
  const { refetch: sharedEstRefetch } = useApi({
    path: "/est_masterestimate_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchSharedEstimates = useCallback(
    ({ est_serial, isestopen = "1", findtext } = {}) => {
      const body = { est_serial, isestopen };
      if (findtext?.trim()) body.findtext = findtext.trim();
      return sharedEstRefetch(body);
    },
    [sharedEstRefetch]
  );

  // ── AOS 공유견적 상세 조회 (sharekind='A') ──
  const { refetch: aosSharedDetailRefetch } = useApi({
    path: "/est_aosestb_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchAosSharedDetails = useCallback(
    ({ est_serial, share_comcode }) =>
      aosSharedDetailRefetch({ est_serial, share_comcode }),
    [aosSharedDetailRefetch]
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

  // ── 수정잠금 해제 (est_print/reqday/workend 초기화) ──
  const { refetch: unlockRefetch } = useApi({
    path: "/est_masterestimate_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const unlockEstimate = useCallback(
    (est_serial) =>
      unlockRefetch({ est_serial, est_print: "", reqday: "0", workend: "0" }),
    [unlockRefetch]
  );

  // ── 견적청구 (reqday='1') ──
  const { refetch: requestRefetch } = useApi({
    path: "/est_masterestimate_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const requestEstimate = useCallback(
    (est_serial, outday) =>
      requestRefetch({ est_serial, outday: outday ?? "", reqday: "1" }),
    [requestRefetch]
  );

  // ── 견적종결 (workend='1') ──
  const { refetch: closeRefetch } = useApi({
    path: "/est_masterestimate_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const closeEstimate = useCallback(
    (est_serial, outday) =>
      closeRefetch({ est_serial, outday: outday ?? "", workend: "1" }),
    [closeRefetch]
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

    // 공유견적 목록
    fetchSharedEstimates,
    fetchAosSharedDetails,

    // 수정잠금 해제
    unlockEstimate,

    // 견적청구 / 견적종결
    requestEstimate,
    closeEstimate,
  };
}

/** 대시보드 최근 작업 목록 (lupdate_dt='1') */
export function useRecentWork() {
  const { refetch } = useApi({
    path: "/est_masterestimate_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchRecentWork = useCallback(
    () => refetch({ lupdate_dt: "1" }),
    [refetch]
  );

  return { fetchRecentWork };
}

