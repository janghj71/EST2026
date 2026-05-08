// src/hooks/useAosEstimate.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { getComcode } from "../api/config";

/** AOS 견적목록 + 정비상세 조회 */
function mapAosEstimate(json) {
  apiOk(json, "AOS 견적 조회");
  return {
    dataset:  json.dataset  ?? [],
    dataset2: json.dataset2 ?? [],
  };
}

export function useAosEstimate() {
  const {
    loading,
    error,
    refetch,
  } = useApi({
    path: "/est_aosest_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapAosEstimate,
  });

  /**
   * @param {string} outday1  출고일 시작 (YYYY-MM-DD)
   * @param {string} outday2  출고일 종료 (YYYY-MM-DD)
   * @returns {{ dataset: any[], dataset2: any[] }}
   */
  const fetchAosEstimate = useCallback(
    (outday1, outday2) => refetch({ outday1, outday2 }),
    [refetch]
  );

  return { loading, error, fetchAosEstimate };
}

/**
 * 국토부 전송상태 결과 저장: est_ts_rst_c.aspx
 * params: comcode(자동), est_serial, ts_rstcode, ts_rst, upd_code, send_de, gubun
 */
export function useEstTsRstUpdate() {
  const { refetch } = useApi({
    path: "/est_ts_rst_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /**
   * @param {{ est_serial, ts_rstcode, ts_rst, upd_code, send_de }} params
   */
  const updateTsResult = useCallback(
    (params) => {
      console.log("[updateTsResult] params:", { ...params, gubun: "1" });
      return refetch({ ...params, gubun: "1" });
    },
    [refetch]
  );

  return { updateTsResult };
}

/**
 * 국토부 삭제 후 ts_serial 초기화: est_ts_repair_u.aspx
 * params: comcode(자동), est_serial, ts_serial(='')
 */
export function useEstTsRepairUpdate() {
  const { refetch } = useApi({
    path: "/est_ts_repair_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const clearTsSerial = useCallback(
    (est_serial) => refetch({ est_serial, ts_serial: "" }),
    [refetch]
  );

  return { clearTsSerial };
}

/**
 * 국토부 전송결과 삭제: est_ts_rst_d.aspx
 * params: comcode(자동), est_serial
 */
export function useEstTsRstDelete() {
  const { refetch } = useApi({
    path: "/est_ts_rst_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const deleteTsRst = useCallback(
    (est_serial) => refetch({ est_serial }),
    [refetch]
  );

  return { deleteTsRst };
}

/**
 * 국토부 전송 후 정비상세 국토부코드 갱신: est_aosestb_u.aspx
 * params: { dataset: [{ est_serial, estb_orgseqno, ts_payno, comcode }] }
 */
export function useAosEstbUpdate() {
  const { refetch } = useApi({
    path: "/est_aosestb_u.aspx",
    method: "POST",
    bodyType: "json",
    immediate: false,
  });

  /**
   * @param {string} est_serial
   * @param {Array<{ estb_orgseqno: string, ts_payno: string }>} details  전체 상세 행
   */
  const updateEstbTsPayno = useCallback(
    (est_serial, details) => {
      const comcode = getComcode();
      const dataset = details.map((d) => ({
        est_serial,
        estb_orgseqno: d.estb_orgseqno,
        ts_payno: d.ts_payno || "",
        part_state: d.part_state || "",
        comcode,
      }));
      return refetch({ dataset });
    },
    [refetch]
  );

  return { updateEstbTsPayno };
}

/**
 * 국토부 전송 후 ts_serial 갱신: est_aosest_u.aspx
 * params: comcode, est_serial, ts_serial
 */
export function useAosEstimateUpdate() {
  const { loading, refetch } = useApi({
    path: "/est_aosest_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /**
   * @param {string} est_serial  견적번호
   * @param {string} ts_serial   국토부 정비이력번호 (inner_imprmn_no)
   */
  const updateTsSerial = useCallback(
    (est_serial, ts_serial) =>
      refetch({ comcode: getComcode(), est_serial, ts_serial }),
    [refetch]
  );

  return { loading, updateTsSerial };
}
