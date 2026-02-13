// src/hooks/useEstStep2.js
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useEstStep2(options = {}) {
  const api = useApi({
    path: "/est_step2.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    body: {},
    requestKey: "est_step2",
    onMap: (json) => {
      apiOk(json, "인증확인");
      return json;
    },
    ...options,
  });

  const confirmAuth = ({ comcode, userid, passwd, luseno, mobileno }, override = {}) => {
    return api.refetch({
      comcode,
      userid,
      passwd,
      luseno,
      mobileno,
      ...(override?.body ?? {}),
    });
  };

  return { ...api, confirmAuth };
}
