// src/hooks/useMasterEstimateSave.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { toInt } from "../utils/numberFormat";
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
    xpay:        master.seccode === "12"
                   ? (master.claims?.[0]?.xpay        ?? master.xpay        ?? "")
                   : (master.xpay        ?? ""),
    bpay:        master.seccode === "12"
                   ? (master.claims?.[0]?.bpay        ?? master.bpay        ?? "")
                   : (master.bpay        ?? ""),
    ppay:        master.seccode === "12"
                   ? (master.claims?.[0]?.ppay        ?? master.ppay        ?? "")
                   : (master.ppay        ?? ""),
    pntrate_sec: master.seccode === "12"
                   ? (master.claims?.[0]?.pntrate_sec ?? master.pntrate_sec ?? "")
                   : (master.pntrate_sec ?? ""),
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
 * - 반환: { save(serial, master), saving }
 */
export function useMasterEstimateSave() {
  const { loading: saving, refetch: saveRequest } = useApi({
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

  return { save, saving };
}
