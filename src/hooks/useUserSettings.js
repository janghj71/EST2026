// src/hooks/useUserSettings.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 조회 응답 → 사용자 배열 */
function mapUsers(json) {
  apiOk(json, "사용자 조회");
  return json.dataset ?? [];
}

/** 저장용 파라미터 추출 */
function toSaveParams(form) {
  return {
    hp:        form.hp ?? "",
    username:  form.username ?? "",
    usertype:  form.usertype ?? "",
  };
}

export function useUserSettings() {
  // ── 조회 ──
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_userregist_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapUsers,
  });

  // ── 저장/중지 (같은 엔드포인트) ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_userregist_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const save = useCallback(async (form) => {
    const json = await saveRequest(toSaveParams(form));
    apiOk(json, "사용자 저장");
    return json;
  }, [saveRequest]);

  // ── 인감 등록 (같은 엔드포인트, 파람만 다름) ──
  const uploadSeal = useCallback(async (hp, imgdata) => {
    const json = await saveRequest({ hp, imgdata });
    apiOk(json, "인감 등록");
    return json;
  }, [saveRequest]);

  // ── 인감 삭제 (같은 엔드포인트, 파람만 다름) ──
  const deleteSeal = useCallback(async (hp) => {
    const json = await saveRequest({ hp, img_dele: "1" });
    apiOk(json, "인감 삭제");
    return json;
  }, [saveRequest]);

  const stop = useCallback(async (row) => {
    const json = await saveRequest({
      hp:        row.hp ?? "",
      username:  row.username ?? "",
      usertype:  row.usertype ?? "",
      luse:      "4",
    });
    apiOk(json, "사용자 중지");
    return json;
  }, [saveRequest]);

  return {
    users: data ?? [],
    setUsers: setData,
    loading,
    saving,
    error,
    refetch,
    save,
    uploadSeal,
    deleteSeal,
    stop,
  };
}
