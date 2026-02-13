// src/hooks/useEstStep1.js
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/**
 * [로그인] -> [사용자인증] -> [인증번호 받기]
 * POST /est_step1.aspx
 * body: { idno, hp }
 *
 * return (mapped):
 * - luseno (인증번호)
 * - comname (업체명)
 * - boss (대표자)
 * - installable (user_max - user_use)
 * - row (원본 dataset[0])
 */
export function useEstStep1(options = {}) {
  const api = useApi({
    path: "/est_step1.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    body: {},
    requestKey: "est_step1",
    onMap: (json) => {
      apiOk(json, "인증번호 받기");

      const row = Array.isArray(json?.dataset) ? json.dataset[0] : null;

      const userMax = Number(row?.user_max ?? 0);
      const userUse = Number(row?.user_use ?? 0);

      return {
        row,
        luseno: row?.luseno ?? "",
        comname: row?.comname ?? "",
        boss: row?.boss ?? "",
        installable: Math.max(0, userMax - userUse),
      };
    },
    ...options,
  });

  // 버튼 클릭에서 이 함수만 호출하면 됨
  const sendAuthNo = (idno, hp, override = {}) => {
    return api.refetch({ idno, hp, ...(override?.body ?? {}) });
  };

  return {
    ...api, // data, loading, error, refetch, setData
    sendAuthNo,
  };
}
