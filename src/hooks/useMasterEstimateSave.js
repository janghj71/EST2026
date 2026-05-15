// src/hooks/useMasterEstimateSave.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { toInt, toDecimal } from "../utils/numberFormat";
import { getUserid } from "../api/config";

/** master 객체 + serial → est_masterestimate_u.aspx 파라미터로 변환 */
function masterToParams(serial, master) {
  return {
    est_serial: serial,
    userid:         getUserid(),
    ...(master.seccode !== "12" ? { estbo_seqno: master.estbo_seqno ?? "" } : {}),
    carno:          master.carno          ?? "",
    makercode:      master.makercode      ?? "",
    carkind:        master.carkind        ?? "",
    cargrade:       master.cargrade       ?? "",
    carcode:        master.carcode        ?? "",
    carname:        master.carname        ?? "",
    modelcode:      master.modelcode      ?? "",
    modelname:      master.modelname      ?? "",
    custom_name:    master.custom_name    ?? "",
    hp0:            master.hp0            ?? "",
    hp1:            master.hp1            ?? "",
    hp2:            master.hp2            ?? "",
    seccode:        master.seccode        ?? "",
    inday:          master.inday          ?? "",
    outday:         master.outday         ?? "",
    preoutday:      master.preoutday      ?? "",
    preouttime:     master.preouttime     ?? "",
    partsum:        toInt(master.partsum),
    paysum:         toInt(master.paysum),
    vat:            toInt(master.vat),
    saletotal:      toInt(master.saletotal),
    state:          master.state          ?? "",
    paykind:        master.paykind        ?? "",
    pntkind:        master.pntkind        ?? "",
    pntcolor_code:  master.pntcolor_code  ?? "",
    pntcot_code:    master.pntcot_code    ?? "",
    pnt_drypay:     toInt(master.pnt_drypay),
    req_pnt_drypay: master.req_pnt_drypay ?? "",
    accday:         master.accday         ?? "",
    reqday:         master.reqday         ?? "",
    isest:          master.isest          ?? "",
    lastkm:         toInt(master.lastkm),
    xpay:        toInt(master.seccode === "12"
                   ? (master.claims?.[0]?.xpay        ?? master.xpay)
                   : master.xpay),
    bpay:        toInt(master.seccode === "12"
                   ? (master.claims?.[0]?.bpay        ?? master.bpay)
                   : master.bpay),
    ppay:        toInt(master.seccode === "12"
                   ? (master.claims?.[0]?.ppay        ?? master.ppay)
                   : master.ppay),
    pntrate_sec: toDecimal(master.seccode === "12"
                   ? (master.claims?.[0]?.pntrate_sec ?? master.pntrate_sec)
                   : master.pntrate_sec),
    paint:          master.paint          ?? "",
    driver_nm:      master.driver_nm      ?? "",
    carsale_amt:    toInt(master.carsale_amt),
    vinno:          master.vinno          ?? "",
    car_registday:  master.car_registday  ?? "",
    caryear:        master.caryear        ?? "",
    ts_serial:      master.ts_serial      ?? "",
    ts_send_dt:     master.ts_send_dt     ?? "",
    w_manname:      master.w_manname      ?? "",
    add_repair:     master.add_repair     ?? "",
    isest_open:     master.isest_open     ?? "",
    est_codecar:    master.est_codecar    ?? "",
    est_carname:    master.est_carname    ?? "",
    email_acc:      master.email_acc      ?? "",
    email_smtp:     master.email_smtp     ?? "",
  };
}

/**
 * 견적 마스터 저장 훅
 * - API: est_masterestimate_u.aspx
 * - 반환: { save(serial, master), saving, updateEstPrint(serial), printUpdating }
 */
export function useMasterEstimateSave() {
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_masterestimate_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const { loading: printUpdating, refetch: printRequest } = useApi({
    path: "/est_masterestimate_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const save = useCallback(
    async (serial, master) => {
      const json = await saveRequest(masterToParams(serial, master));
      apiOk(json, "견적서 저장");
      return json;
    },
    [saveRequest]
  );

  /**
   * 인쇄 완료 처리 — est_print='1' 로 업데이트
   * @param {string} serial - est_serial
   */
  const updateEstPrint = useCallback(
    async (serial) => {
      const json = await printRequest({
        est_serial: serial,
        est_print: "1",
      });
      return json;
    },
    [printRequest]
  );

  return { save, saving, updateEstPrint, printUpdating };
}

/**
 * 국토부 전송 후 ts_serial / ts_send_dt 갱신
 * params: comcode(자동), est_serial, ts_serial, ts_send_dt
 */
export function useMasterEstimateTsUpdate() {
  const { refetch } = useApi({
    path: "/est_masterestimate_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /**
   * @param {string} est_serial
   * @param {string} ts_serial   국토부 정비이력번호 (inner_imprmn_no)
   * @param {string} ts_send_dt  전송일시 ('' 로 초기화 시 사용)
   */
  const updateMasterTsSerial = useCallback(
    (est_serial, ts_serial, ts_send_dt = "") =>
      refetch({ est_serial, ts_serial, ts_send_dt }),
    [refetch]
  );

  return { updateMasterTsSerial };
}
