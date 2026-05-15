// src/hooks/useMapPayno.js
import { useCallback } from "react";
import { useApi } from "./useApi";

export function useMapPayno() {
  const { refetch } = useApi({
    path: "/est_mapppayno_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /** payname → ts_payno Map 반환 */
  const fetchMapPayno = useCallback(async () => {
    const json = await refetch({});
    const rows = json?.dataset ?? [];
    const map = new Map();
    rows.forEach((r) => {
      if (r.payname && r.ts_payno) map.set(r.payname, r.ts_payno);
    });
    return map;
  }, [refetch]);

  return { fetchMapPayno };
}
