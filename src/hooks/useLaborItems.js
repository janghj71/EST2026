// src/hooks/useLaborItems.js
import { useCallback } from "react";
import { useApi } from "./useApi";

/** 정비항목 목록: est_codepay_s.aspx */
export function useCodepay() {
  const { refetch } = useApi({
    path: "/est_codepay_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchCodepay = useCallback(
    ({ carcode, ocarcode, paykind }) =>
      refetch({ carcode, ocarcode, paykind, prgcode: "208" }),
    [refetch]
  );

  return { fetchCodepay };
}

/** 부품 목록: est_codepart_s.aspx */
export function useCodepart() {
  const { refetch } = useApi({
    path: "/est_codepart_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  // carcode = master.codecar, modelcode = master.modelcode, paykind = master.paykind
  const fetchCodepart = useCallback(
    ({ carcode, modelcode, paykind }) =>
      refetch({ carcode, modelcode, paykind }),
    [refetch]
  );

  return { fetchCodepart };
}

/** 도장 목록: est_codepnt_s.aspx */
export function useCodepnt() {
  const { refetch } = useApi({
    path: "/est_codepnt_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  // carcode = master.paint, paykind = master.pntkind, ocarcode = master.codecar
  const fetchCodepnt = useCallback(
    ({ carcode, paykind, ocarcode }) =>
      refetch({ carcode, paykind, ocarcode }),
    [refetch]
  );

  return { fetchCodepnt };
}

/** 작업/시간 목록: est_codepay_hour_s.aspx */
export function useCodepayHour() {
  const { refetch } = useApi({
    path: "/est_codepay_hour_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchCodepayHour = useCallback(
    ({ carcode, ocarcode, paykind, paint, outday }) => {
      const body = { carcode, ocarcode, paykind, paint, prgcode: "208" };
      // outday가 있을 때만 workday 포함
      if (outday) body.workday = outday;
      return refetch(body);
    },
    [refetch]
  );

  return { fetchCodepayHour };
}

/** 견적점검: est_checkpayno_s.aspx */
export function useCheckPayno() {
  const { refetch } = useApi({
    path: "/est_checkpayno_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchCheckPayno = useCallback(
    ({ paykind }) => refetch({ paykind }),
    [refetch]
  );

  return { fetchCheckPayno };
}
