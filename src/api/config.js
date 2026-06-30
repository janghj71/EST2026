// src/api/config.js

const HOST = import.meta.env.VITE_API_HOST ?? 'http://estservice.goldauto.co.kr';
const BASE = import.meta.env.VITE_API_BASE ?? '/api';

const SERVICEKEY_STORAGE_KEY = "serviceKey";

export const API_HOST = HOST;
export const API_BASE = BASE;
// export const API_ESTSERVICE = `${HOST}`
export const API_ESTSERVICE = `${HOST}${BASE}`;


export const API_NEOSERVICE =
  import.meta.env.VITE_NEOSERVICE ?? 'http://neoservice.goldauto.co.kr';

export const API_AXSERVICE =
  import.meta.env.VITE_AXSERVICE ?? 'http://axservice.goldauto.co.kr';

export const API_IVSERVICE =
  import.meta.env.VITE_IVSERVICE ?? 'https://ivservice.intravan.co.kr';

export const API_TSSERVICE =
  import.meta.env.VITE_TSSERVICE ?? 'http://dev-ts.intravan.co.kr';

export const API_ASSERVICE =
  import.meta.env.VITE_ASSERVICE ?? 'http://as.intravan.co.kr';

export const API_ADBCPSERVICE =
  import.meta.env.VITE_ADBCPSERVICE ?? 'http://adbcp.intravan.co.kr';


export function getServiceKey() {
  return localStorage.getItem(SERVICEKEY_STORAGE_KEY) || "";
}

export function setServiceKey(v) {
  if (!v) {
    localStorage.removeItem(SERVICEKEY_STORAGE_KEY);
  } else {
    localStorage.setItem(SERVICEKEY_STORAGE_KEY, v);
  }
}

// (선택) comcode도 공통으로 저장해두면 편함
const COMCODE_STORAGE_KEY = "comcode";
export function getComcode() {
  return localStorage.getItem(COMCODE_STORAGE_KEY) || "";
}
export function setComcode(v) {
  if (!v) localStorage.removeItem(COMCODE_STORAGE_KEY);
  else localStorage.setItem(COMCODE_STORAGE_KEY, v);
}

const USERID_STORAGE_KEY = "userid";
export function getUserid() {
  return localStorage.getItem(USERID_STORAGE_KEY) || "";
}
export function setUserid(v) {
  if (!v) localStorage.removeItem(USERID_STORAGE_KEY);
  else localStorage.setItem(USERID_STORAGE_KEY, v);
}


const KEY_MOBILENO = "mobileno";

/** PC용 mobileno: 최초 1회 생성 후 localStorage에 고정 저장 */
export function createMobileno() {
  const saved = localStorage.getItem(KEY_MOBILENO);
  if (saved) return saved;

  const v =
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(KEY_MOBILENO, v);
  return v;
}

/** 저장된 값만 조회(없으면 "") */
export function getMobileno() {
  return localStorage.getItem(KEY_MOBILENO) || "";
}

export function setMobileno(v) {
  if (!v) localStorage.removeItem(KEY_MOBILENO);
  else localStorage.setItem(KEY_MOBILENO, v);
}

/** (선택) 초기화 */
export function clearMobileno() {
  localStorage.removeItem(KEY_MOBILENO);
}
