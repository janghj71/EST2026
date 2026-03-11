// src/hooks/useCompanyInfo.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

const EMPTY_FORM = {
  idNo: "", comName: "", boss: "", upTae: "", upJong: "", shopKind: "1",
  sanghoid: "", supman: "",
  tel0: "", tel1: "", tel2: "",
  fax0: "", fax1: "", fax2: "",
  zipCode: "", addr1: "", addr2: "",
  email: "",
  yellowidKeyJmt: "",
};


/** dataset 배열 → { set_name: set_value } 맵 */
function datasetToMap(dataset) {
  const map = {};
  for (const item of dataset) {
    map[item.set_name] = item.set_value;
  }
  return map;
}

/** API 맵 → CompanyInfoPage form 객체 */
function mapToForm(json) {
  apiOk(json, "업체정보 조회");
  const m = datasetToMap(json.dataset);
  
  return {
    idNo:        m.idno      ?? "",
    comName:     m.comname   ?? "",
    boss:        m.boss      ?? "",
    upTae:       m.uptae     ?? "",
    upJong:      m.upjong    ?? "",
    shopKind:    m.shopkind  ?? "1",
    sanghoid:    m.sanghoid  ?? "",
    supman:      m.supman    ?? "",
    tel0:        m.tel0      ?? "",
    tel1:        m.tel1      ?? "",
    tel2:        m.tel2      ?? "",
    fax0:        m.fax0      ?? "",
    fax1:        m.fax1      ?? "",
    fax2:        m.fax2      ?? "",
    zipCode:     m.zipcode   ?? "",
    addr1:       m.address1  ?? "",
    addr2:       m.address2  ?? "",
    email:       m.email     ?? "",
    yellowidKeyJmt: m.yellowid_key_jmt ?? "",
  };
}

/** form 객체 → 저장 API 파라미터로 변환 */
function formToParams(form) {
  return {
    idno:     form.idNo,
    comname:  form.comName,
    boss:     form.boss,
    uptae:    form.upTae,
    upjong:   form.upJong,
    shopkind: form.shopKind,
    supman:   form.supman,
    tel0:     form.tel0,
    tel1:     form.tel1,
    tel2:     form.tel2,
    fax0:     form.fax0,
    fax1:     form.fax1,
    fax2:     form.fax2,
    zipcode:  form.zipCode,
    address1: form.addr1,
    address2: form.addr2,
    email:    form.email,
  };
}

export function useCompanyInfo() {
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_codesetitem_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapToForm,
  });

  // ── 저장 ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_codesetitem_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const save = useCallback(async (form) => {
    const json = await saveRequest(formToParams(form));
    apiOk(json, "업체정보 저장");
    return json;
  }, [saveRequest]);

  return {
    form: data ?? EMPTY_FORM,
    setForm: setData,
    loading,
    saving,
    error,
    refetch,
    save,
  };
}
