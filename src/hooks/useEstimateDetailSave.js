// src/hooks/useEstimateDetailSave.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useLoading } from "../loading/useLoading";
import { useAlert } from "../alerts/useAlert";
import { apiOk } from "../api/apiOk";

/** "" / null → null,  그 외 → 정수 */
const toIntOrNull = (v) => (v === "" || v == null) ? null : parseInt(v, 10) || 0;
/** "" / null → null,  그 외 → 실수 */
const toDecOrNull = (v) => (v === "" || v == null) ? null : parseFloat(v)   || 0;
/** "" / null → null,  그 외 → 문자열 */
const toStrOrNull = (v) => (v === "" || v == null) ? null : String(v);

/** API 허용 필드만 pick + 서버 SP 타입에 맞게 변환 */
function toApiRow(row) {
  return {
    // varchar
    comcode:        toStrOrNull(row.comcode),
    est_serial:     toStrOrNull(row.est_serial),
    estb_orgseqno:  toStrOrNull(row.estb_orgseqno),
    estb_seqno:     row.estb_seqno != null && row.estb_seqno !== ""
                      ? String(row.estb_seqno).padStart(3, "0")
                      : null,
    paykind:        toStrOrNull(row.paykind),
    payno:          toStrOrNull(row.payno),
    subpayno:       toStrOrNull(row.subpayno),
    payname:        toStrOrNull(row.payname),
    workcode:       toStrOrNull(row.workcode),
    part_makercode: toStrOrNull(row.part_makercode),
    state:          toStrOrNull(row.state),
    statename:      toStrOrNull(row.statename),
    pnt_extr:       toStrOrNull(row.pnt_extr),
    update_id:      toStrOrNull(row.update_id),
    ts_payno:       toStrOrNull(row.ts_payno),
    pnt_m:          toStrOrNull(row.pnt_m),
    pntcot:         toStrOrNull(row.pntcot),
    // int / smallint
    price:          toIntOrNull(row.price),
    partsum:        toIntOrNull(row.partsum),
    paysum:         toIntOrNull(row.paysum),
    pnt_part:       toIntOrNull(row.pnt_part),
    b_area:         toIntOrNull(row.b_area),
    pnt_reduce:     toIntOrNull(row.pnt_reduce),
    // decimal
    qty:            toDecOrNull(row.qty),
    pnt_hour:       toDecOrNull(row.pnt_hour),
    oqty:           toDecOrNull(row.oqty),
    b_level:        toDecOrNull(row.b_level),
  };
}

/**
 * 견적 항목(행) 저장 훅
 * API: est_masterestimateb_u.aspx (JSON body)
 * 저장 성공 시 응답의 newserial → 신규행 estb_orgseqno에 반영
 * 저장 실패 시 useAlert.warning 으로 알럿
 */
export function useEstimateDetailSave(setRows) {
  const { refetch: saveReq } = useApi({
    path: "/est_masterestimateb_u.aspx",
    method: "POST",
    bodyType: "json",
    immediate: false,
  });

  const { withLoading } = useLoading();
  const { warning } = useAlert();

  const saveDetail = useCallback(
    async (newRow) => {
      try {
        await withLoading(async () => {
          const json = await saveReq({ masterestimateb: [toApiRow(newRow)] });
          apiOk(json, "견적항목 저장");
          const newserial = json?.newserial;
          if (newserial) {
            setRows((prev) =>
              prev.map((r) =>
                r.estb_orgseqno === "" && r.estb_seqno === newRow.estb_seqno
                  ? { ...r, estb_orgseqno: newserial }
                  : r
              )
            );
          }
        });
      } catch (e) {
        warning(e.message || "견적항목 저장 실패");
      }
    },
    [saveReq, withLoading, setRows, warning]
  );

  return { saveDetail };
}
