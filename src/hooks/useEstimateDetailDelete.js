// src/hooks/useEstimateDetailDelete.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { getComcode } from "../api/config";

export function useEstimateDetailDelete() {
  const { refetch } = useApi({
    path: "/est_masterestimateb_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /** 선택삭제: orgSeqs = estb_orgseqno 배열 */
  const deleteBySeqs = useCallback(async (serial, orgSeqs) => {
    const json = await refetch({
      comcode:       getComcode(),
      est_serial:    serial,
      estb_orgseqno: orgSeqs.join(","),
    });
    apiOk(json, "삭제");
    return json;
  }, [refetch]);

  /** 전체삭제: estb_orgseqno 파라미터 없음 */
  const deleteAll = useCallback(async (serial) => {
    const json = await refetch({
      comcode:    getComcode(),
      est_serial: serial,
    });
    apiOk(json, "전체삭제");
    return json;
  }, [refetch]);

  return { deleteBySeqs, deleteAll };
}
