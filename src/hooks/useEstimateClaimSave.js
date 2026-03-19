// src/hooks/useEstimateClaimSave.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { toInt, toDecimal } from "../utils/numberFormat";
import { apiOk } from "../api/apiOk";

/** claim 객체 → API 파라미터 변환 */
function claimToParams(est_serial, claim) {
  const base = {
    est_serial,
    subsec:         claim.subsec         ?? "",
    bocomcode:      claim.bocomcode      ?? "",
    bocomname:      claim.bocomname      ?? "",
    regno:          claim.regno          ?? "",
    regday:         claim.regday         ?? "",
    misrate:        toInt(claim.misrate),
    boman_nm:       claim.boman_nm       ?? "",
    insura_carno:   claim.insura_carno   ?? "",
    insura_person:  claim.insura_person  ?? "",
    dambo:          claim.dambo          ?? "",
    xpay:           toInt(claim.xpay),
    bpay:           toInt(claim.bpay),
    ppay:           toInt(claim.ppay),
    pntrate_all:    toDecimal(claim.pntrate_all),
    pntrate_sec:    toDecimal(claim.pntrate_sec),
    insura_exemp:   toInt(claim.insura_exemp),
    vatrate:        toDecimal(claim.vatrate),
    partdcrate:     toDecimal(claim.partdcrate),
    depreci_amt:    toInt(claim.depreci_amt),
    rem_amt:        toInt(claim.rem_amt),
    reqtotal:       toInt(claim.reqtotal),
  };
  // update 시에만 estbo_seqno 포함 (없으면 insert)
  if (claim.estbo_seqno) base.estbo_seqno = claim.estbo_seqno;
  return base;
}

/**
 * 청구처 저장 훅 (insert / update)
 * - estbo_seqno 있음 → est_masterestimatebo_u.aspx (update)
 * - estbo_seqno 없음 → est_masterestimatebo_c.aspx (insert, 응답에 newserial 포함)
 */
export function useEstimateClaimSave() {
  const { refetch: insertReq } = useApi({
    path: "/est_masterestimatebo_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });
  const { refetch: updateReq } = useApi({
    path: "/est_masterestimatebo_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const saveClaim = useCallback(
    async (est_serial, claim) => {
      const params = claimToParams(est_serial, claim);
      const json = await (claim.estbo_seqno ? updateReq(params) : insertReq({ ...params, subsec: "1" }));
      apiOk(json, "청구처 저장");
      return json;
    },
    [insertReq, updateReq]
  );

  return { saveClaim };
}
