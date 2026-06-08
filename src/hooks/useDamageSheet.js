// src/hooks/useDamageSheet.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { getComcode } from "../api/config";

function mapRows(json) {
  return json?.dataset ?? [];
}

/** 손상시트(작업지시) 조회/저장 */
export function useDamageSheet() {
  // 조회 — est_damagesheet_s.aspx
  const { data, loading, error, refetch } = useApi({
    path: "/est_damagesheet_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapRows,
  });

  const fetchDamageSheet = useCallback(
    (est_serial) => refetch({ est_serial }),
    [refetch]
  );

  // 저장 — est_damagesheet_c.aspx (JSON body)
  const { refetch: saveReq } = useApi({
    path: "/est_damagesheet_c.aspx",
    method: "POST",
    bodyType: "json",
    immediate: false,
  });

  const saveDamageSheet = useCallback(
    ({ est_serial, dataset }) =>
      saveReq({ comcode: getComcode(), est_serial, dataset }),
    [saveReq]
  );

  // 예상견적 공임/시간 조회 — est_damage_pay_s.aspx
  const { refetch: payReq } = useApi({
    path: "/est_damage_pay_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapRows,
  });

  const fetchDamagePay = useCallback(
    (est_serial) => payReq({ est_serial }),
    [payReq]
  );

  return { rows: data ?? [], loading, error, fetchDamageSheet, saveDamageSheet, fetchDamagePay };
}
