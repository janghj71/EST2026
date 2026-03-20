// src/hooks/useEstimateDetailSave.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { useLoading } from "../loading/useLoading";
import { useAlert } from "../alerts/useAlert";
import { apiOk } from "../api/apiOk";
import { toIntOrNull, toDecStr, toStrOrNull } from "../utils/numberFormat";

const SPECIAL_SUBPAYNOS = new Set(["99990", "99991"]);

/** 일반 행 먼저, special(subpayno 99990·99991) 행 마지막으로 estb_seqno 재부여 */
function resequence(rows) {
  const normal  = rows.filter((r) => !SPECIAL_SUBPAYNOS.has(r.subpayno));
  const special = rows.filter((r) =>  SPECIAL_SUBPAYNOS.has(r.subpayno));
  return [...normal, ...special].map((r, i) => ({
    ...r,
    estb_seqno: String(i + 1).padStart(3, "0"),
  }));
}

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
    // int / smallint → toIntOrNull ('' → '', null → null, 값 → 정수)
    price:          toIntOrNull(row.price),
    partsum:        toIntOrNull(row.partsum),
    paysum:         toIntOrNull(row.paysum),
    pnt_part:       toIntOrNull(row.pnt_part),
    b_area:         toIntOrNull(row.b_area),
    pnt_reduce:     toIntOrNull(row.pnt_reduce),
    // decimal → toDecStr ('' → '', null → null, 값 → 실수 문자열)
    qty:            toDecStr(row.qty),
    pnt_hour:       toDecStr(row.pnt_hour),
    oqty:           toDecStr(row.oqty),
    b_level:        toDecStr(row.b_level),
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

  const saveAllDetails = useCallback(
    async (rows) => {
      const reseq = resequence(rows);           // estb_seqno 재부여
      setRows(reseq);                           // 화면 state 반영
      const json = await saveReq({
        masterestimateb: reseq.map(toApiRow),
      });
      apiOk(json, "견적항목 저장");             // 실패 시 throw → 호출자 catch
      return reseq;
    },
    [saveReq, setRows]
  );

  return { saveDetail, saveAllDetails };
}
