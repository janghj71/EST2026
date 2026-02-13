// src/hooks/useCompanyInfo.js
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

const EMPTY_FORM = {
  idNo: "", comName: "", boss: "", upTae: "", upJong: "", shopKind: "1",
  tel0: "", tel1: "", tel2: "",
  fax0: "", fax1: "", fax2: "",
  zipCode: "", addr1: "", addr2: "",
  emailId: "", emailDomain: "",
};


/** dataset 배열 → { set_name: set_value } 맵 */
function datasetToMap(dataset) {
  const map = {};
  for (const item of dataset) {
    map[item.set_name] = item.set_value;
  }
  return map;
}

/** 이메일 문자열 → id / domain 분리 */
function splitEmail(email) {
  if (!email || !email.includes("@")) return { emailId: "", emailDomain: "" };
  const [id, domain] = email.split("@");
  return { emailId: id, emailDomain: domain };
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

  return {
    form: data ?? EMPTY_FORM,
    setForm: setData,
    loading,
    error,
    refetch,
  };
}
