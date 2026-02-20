// src/hooks/useInsurerContacts.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** 조회 응답 → 담당자 배열 */
function mapContacts(json) {
  apiOk(json, "보험담당자 조회");
  return json.dataset ?? [];
}

/** 저장용 파라미터 추출 */
function toSaveParams(form) {
  return {
    bocomcode:  form.bocomcode,
    seqno:      form.seqno ?? "",
    boman_nm:   form.boman_nm ?? "",
    hp0:        form.hp0 ?? "",
    hp1:        form.hp1 ?? "",
    hp2:        form.hp2 ?? "",
    fax0:       form.fax0 ?? "",
    fax1:       form.fax1 ?? "",
    fax2:       form.fax2 ?? "",
    email_acc:  form.email_acc ?? "",
    email_smtp: form.email_smtp ?? "",
    tel0:       form.tel0 ?? "",
    tel1:       form.tel1 ?? "",
    tel2:       form.tel2 ?? "",
    memo:       form.memo ?? "",
  };
}

export function useInsurerContacts() {
  // ── 조회 ──
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_tbbocom_man_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapContacts,
  });

  // ── 저장 ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_tbbocom_man_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  // ── 삭제 ──
  const { loading: deleting, refetch: deleteRequest } = useApi({
    path: "/est_tbbocom_man_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const save = useCallback(async (form) => {
    const json = await saveRequest(toSaveParams(form));
    apiOk(json, "보험담당자 저장");
    return json;
  }, [saveRequest]);

  const remove = useCallback(async (bocomcode, seqno) => {
    const json = await deleteRequest({ bocomcode, seqno });
    apiOk(json, "보험담당자 삭제");
    return json;
  }, [deleteRequest]);

  return {
    contacts: data ?? [],
    setContacts: setData,
    loading,
    saving,
    deleting,
    error,
    refetch,
    save,
    remove,
  };
}
