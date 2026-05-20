// src/hooks/useAosEstimate.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { getComcode, getUserid } from "../api/config";

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
    (day1, day2, byTsSend = false) =>
      byTsSend
        ? refetch({ ts_send_dt1: day1, ts_send_dt2: day2 })
        : refetch({ outday1: day1, outday2: day2 }),
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
   * @param {{ est_serial, ts_serial, ts_rstcode, ts_rst, upd_code, send_de }} params
   */
  const updateTsResult = useCallback(
    ({ gubun = "1", ...rest }) => {
      console.log("[updateTsResult] params:", { ...rest, gubun });
      return refetch({ ...rest, gubun });
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

  /** ADL 탭 전송 성공 후 ts_serial 갱신 */
  const updateTsRepairSerial = useCallback(
    (est_serial, ts_serial) => refetch({ est_serial, ts_serial }),
    [refetch]
  );

  return { clearTsSerial, updateTsRepairSerial };
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
 * ADL 직접입력 정비이력 목록 조회: est_ts_repair_s.aspx
 * 응답: { dataset: [...], dataset2: [...] }
 */
export function useTsRepairList() {
  const { loading, error, refetch } = useApi({
    path: "/est_ts_repair_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchTsRepairList = useCallback(
    (day1, day2, byTsSend = false) =>
      byTsSend
        ? refetch({ ts_send_dt1: day1, ts_send_dt2: day2 })
        : refetch({ outday1: day1, outday2: day2 }),
    [refetch]
  );

  return { loading, error, fetchTsRepairList };
}

/**
 * ADL 정비상세 국토부코드 갱신: est_masterestimateb_u.aspx
 * params: { masterestimateb: [{ est_serial, estb_orgseqno, ts_payno, part_state, comcode }] }
 */
export function useMasterEstimatebUpdate() {
  const { refetch } = useApi({
    path: "/est_masterestimateb_u.aspx",
    method: "POST",
    bodyType: "json",
    immediate: false,
  });

  const updateMasterEstimatebTsPayno = useCallback(
    (est_serial, details) => {
      const comcode = getComcode();
      const masterestimateb = details.map((d) => ({
        est_serial,
        estb_orgseqno: d.estb_orgseqno,
        ts_payno:      d.ts_payno   || "",
        part_state:    d.part_state || "",
        comcode,
      }));
      return refetch({ masterestimateb });
    },
    [refetch]
  );

  return { updateMasterEstimatebTsPayno };
}

/**
 * AOS 견적 수정 저장: est_aosest_c.aspx
 * params: comcode(자동), est_serial + 모달 입력 필드
 */
export function useAosEstSave() {
  const { loading, refetch } = useApi({
    path: "/est_aosest_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const saveAosEst = useCallback(
    ({ est_serial, carno, carname, vinno, car_registday, lastkm,
       custom_name, hp0, hp1, hp2, inday, outday, w_manname, accday, add_repair }) =>
      refetch({ est_serial, carno, carname, vinno, car_registday, lastkm,
                custom_name, hp0, hp1, hp2, inday, outday, w_manname, accday, add_repair }),
    [refetch]
  );

  return { loading, saveAosEst };
}

/**
 * AOS 견적 삭제: est_aosest_d.aspx
 * params: comcode, est_serial, userid
 * 응답: result='false' 이면 msg 반환
 */
export function useAosEstDelete() {
  const { loading, refetch } = useApi({
    path: "/est_aosest_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const deleteAosEst = useCallback(
    (est_serial) =>
      refetch({ comcode: getComcode(), est_serial, userid: getUserid() }),
    [refetch]
  );

  return { loading, deleteAosEst };
}

/**
 * AOS 견적 불러오기 (bulk insert): est_aosload_c.aspx
 * params: { dataset: [ { ...master, details: [...] } ] }
 * 응답:   { result, count, dataset: [{ filename, est_serial, detail_count, result, msg }] }
 */
export function useAosLoad() {
  const { loading, refetch } = useApi({
    path: "/est_aosload_c.aspx",
    method: "POST",
    bodyType: "json",
    immediate: false,
  });

  const loadAosFiles = useCallback(
    (dataset) => refetch({ dataset }),
    [refetch]
  );

  return { loading, loadAosFiles };
}

/**
 * AOS 견적 단건 조회: est_aosest_s.aspx
 * params: comcode(자동), est_serial
 * 응답: { dataset: [master], dataset2: [details] }
 */
export function useAosEstSingle() {
  const { refetch } = useApi({
    path: "/est_aosest_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchAosEstSingle = useCallback(
    (est_serial) => refetch({ est_serial }),
    [refetch]
  );

  return { fetchAosEstSingle };
}

/**
 * AOS 견적 신규 채번: est_aosest_c.aspx (add_repair='1')
 * params: comcode(자동), seccode='11', inday, userid, add_repair='1', w_manname
 * 응답: { newserial: "..." }
 */
export function useAosEstCreate() {
  const { loading, refetch } = useApi({
    path: "/est_aosest_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const createAosEst = useCallback(
    ({ inday, userid, w_manname }) =>
      refetch({ seccode: "11", inday, userid, add_repair: "1", w_manname }),
    [refetch]
  );

  return { loading, createAosEst };
}

/**
 * AOS 정비상세 저장(upsert): est_aosestb_c.aspx
 * estb_orgseqno 없으면 insert, 있으면 update
 * params: comcode(자동), est_serial, estb_orgseqno, paykind, payname, workcode,
 *         qty, partsum, paysum, part_makercode, part_state, ts_payno
 */
export function useAosEstbSave() {
  const { loading, refetch } = useApi({
    path: "/est_aosestb_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const saveAosEstb = useCallback(
    ({ est_serial, estb_orgseqno = "", paykind, payname, workcode,
       part_makercode, part_state, ts_payno }) =>
      refetch({ est_serial, estb_orgseqno, paykind, payname, workcode,
                part_makercode, part_state, ts_payno }),
    [refetch]
  );

  return { loading, saveAosEstb };
}

/**
 * AOS 정비상세 삭제: est_aosestb_d.aspx
 * params: comcode(자동), estb_orgseqno
 */
export function useAosEstbDelete() {
  const { loading, refetch } = useApi({
    path: "/est_aosestb_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const deleteAosEstb = useCallback(
    (estb_orgseqno) => refetch({ estb_orgseqno }),
    [refetch]
  );

  return { loading, deleteAosEstb };
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

/** 대시보드 국토부 전송오류 카운트 (AOS + ADL 합산) */
export function useDashboardTsErrors() {
  const { refetch: aosRefetch } = useApi({
    path: "/est_aosest_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const { refetch: adlRefetch } = useApi({
    path: "/est_ts_repair_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const isError = (r) =>
    r.ts_serial && r.ts_rstcode && r.ts_rstcode !== "MSG50000";

  const fetchTsErrors = useCallback(
    async (ts_send_dt1, ts_send_dt2) => {
      const [aosRes, adlRes] = await Promise.all([
        aosRefetch({ ts_send_dt1, ts_send_dt2 }),
        adlRefetch({ ts_send_dt1, ts_send_dt2 }),
      ]);
      return {
        aosErrors: (aosRes?.dataset ?? []).filter(isError),
        adlErrors: (adlRes?.dataset ?? []).filter(isError),
      };
    },
    [aosRefetch, adlRefetch]
  );

  return { fetchTsErrors };
}
