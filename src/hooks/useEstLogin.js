import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { setServiceKey, setComcode, getMobileno, setUserid } from "../api/config";

export function useEstLogin(options = {}) {
  const api = useApi({
    path: "/est_login.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    body: {},
    requestKey: "est_login",
    onMap: (json) => {
      apiOk(json, "로그인");
      return json;
    },
    ...options,
  });

  const login = async ({ comcode, userid, passwd }, override = {}) => {
    const mobileno = getMobileno();

    const res = await api.refetch({
      comcode,
      userid,
      passwd,
      mobileno,
      ...(override?.body ?? {}),
    });

    // ✅ 성공이면 servicekey 저장 (이후 모든 API가 자동 첨부됨)
    if (String(res?.result).toUpperCase() === "OK") {
      if (res?.servicekey) setServiceKey(res.servicekey);
      if (comcode) setComcode(comcode);
      if (userid) setUserid(userid);
    }

    return res;
  };

  return { ...api, login };
}
