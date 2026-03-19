// src/hooks/useBocomList.js
import { useCallback, useMemo } from "react";
import { useApi } from "./useApi";

/**
 * 보험사 목록 조회 훅
 * - API: est_tbbocom_s.aspx (comcode는 useApi가 자동 추가)
 * - 반환: { bocomList, bocomOptions, loading }
 *   - bocomList: 원본 dataset 배열
 *   - bocomOptions: [{ value: "01", label: "01 메리츠", ...row }]
 */
export function useBocomList() {
  const { data, loading } = useApi({
    path: "/est_tbbocom_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: (json) => json?.dataset ?? [],
  });

  const bocomList = data ?? [];

  const bocomOptions = useMemo(
    () =>
      bocomList.map((row) => ({
        value: row.bocomcode,
        label: `${row.bocomcode} ${row.bocomname}`,
        ...row,
      })),
    [bocomList]
  );

  const findBocom = useCallback(
    (bocomcode) => bocomList.find((r) => r.bocomcode === bocomcode) ?? null,
    [bocomList]
  );

  return { bocomList, bocomOptions, findBocom, loading };
}
