// src/hooks/useTs_Repair.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { getComcode } from "../api/config";

/**
 * TS 서비스 (http://dev-ts.intravan.co.kr) 관련 훅 모음
 * VITE_TSSERVICE 환경변수 → /tsservice prefix로 라우팅
 */

/** passwd → base64 인코딩 (한글·특수문자 포함 안전 처리) */
function encodePasswd(passwd) {
  try {
    return btoa(unescape(encodeURIComponent(passwd || "")));
  } catch {
    return btoa(passwd || "");
  }
}

/** result: 'false' 이면 msgcode + msg 포함한 에러 throw */
function throwIfFalse(res) {
  if (String(res?.result) === "false" || res?.result === false) {
    const code = res?.msgcode ? `[${res.msgcode}] ` : "";
    throw new Error(`${code}${res?.msg || "오류가 발생했습니다."}`);
  }
}

/** 국토부 ts_payno 목록: /tsservice/api/ts_payno_s.aspx
 *  응답: { result, ts_payno: [{ payno, payname, payno_kind, payno_kind_nm, ... }] }
 */
export function useTs_repart() {
  const { loading, refetch } = useApi({
    path: "/tsservice/api/ts_payno_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchTsPayno = useCallback(async () => {
    const res = await refetch({});
    throwIfFalse(res);
    return res;
  }, [refetch]);

  return { loading, fetchTsPayno };
}

/**
 * 국토부 로그인: /tsservice/api/otvhcle_login.aspx
 * 응답: { result, msgcode, msg, imprmn_entnum, servicecode, url? }
 *   msgcode "104" / "105" → url 팝업 필요 (약관동의, 비밀번호 변경 등)
 */
export function useTsLogin() {
  const { loading, refetch } = useApi({
    path: "/tsservice/api/otvhcle_login.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /**
   * @param {{ idno: string, userid: string, passwd: string }} param  (passwd: 평문)
   * @returns {{ result, msgcode, msg, imprmn_entnum, servicecode, url? }}
   */
  const tsLogin = useCallback(
    async ({ idno, userid, passwd }) => {
      const res = await refetch({ comcode: getComcode(), idno, userid, passwd: encodePasswd(passwd) });
      throwIfFalse(res);
      return res;
    },
    [refetch]
  );

  return { loading, tsLogin };
}

/**
 * 클라이언트 IP 조회: as.intravan.co.kr/api/int_get_api.aspx
 * Vite 프록시(/asservice) 대신 직접 fetch — 브라우저에서 CORS 없이 동작
 */
export function useClientIp() {
  const fetchClientIp = useCallback(async () => {
    try {
      const res = await fetch("http://as.intravan.co.kr/api/int_get_api.aspx");
      const text = (await res.text()).trim();
      return /^\d{1,3}(\.\d{1,3}){3}$/.test(text) ? text : "";
    } catch {
      return "";
    }
  }, []);

  return { fetchClientIp };
}

/**
 * 국토부 정비이력 전송상태 조회: /tsservice/api/otvhcle_imprmn_hist_state.aspx
 * inner_imprmn_no 는 같은 key 반복 전송 → FormData 사용
 */
export function useTsRepairState() {
  const { refetch } = useApi({
    path: "/tsservice/api/otvhcle_imprmn_hist_state.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /**
   * @param {{ imprmn_entnum: string, servicecode: string, ts_serials: string[] }} param
   */
  const fetchRepairState = useCallback(
    async ({ imprmn_entnum, servicecode, ts_serials }) => {
      const fd = new FormData();
      fd.append("imprmn_entnum", imprmn_entnum);
      fd.append("servicecode", servicecode || "");
      ts_serials.forEach((s) => {
        fd.append("inner_imprmn_no", s.padEnd(30, " ")); // 30자리 우측 공백 패딩
      });
      const res = await refetch(fd);
      throwIfFalse(res);
      return res;
    },
    [refetch]
  );

  return { fetchRepairState };
}

/**
 * 국토부 정비이력 삭제: /tsservice/api/otvhcle_imprmn_hist_d.aspx
 * params: imprmn_entnum, servicecode, inner_imprmn_no
 */
export function useTsRepairDelete() {
  const { loading, refetch } = useApi({
    path: "/tsservice/api/otvhcle_imprmn_hist_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const deleteRepairHistory = useCallback(
    async ({ imprmn_entnum, servicecode, inner_imprmn_no }) => {
      const res = await refetch({ imprmn_entnum, servicecode, inner_imprmn_no });
      console.log("[deleteRepairHistory] response:", res);
      throwIfFalse(res);
      return res;
    },
    [refetch]
  );

  return { loading, deleteRepairHistory };
}

/**
 * 국토부 차량정보 조회: /tsservice/api/otvhcle_carinfo.aspx
 * params: vhrno, servicecode, ip_adres, macadrs
 */
export function useTsCarInfo() {
  const { refetch } = useApi({
    path: "/tsservice/api/otvhcle_carinfo.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const fetchCarInfo = useCallback(
    async ({ vhrno, servicecode, ip_adres = "", macadrs = "" }) => {
      const res = await refetch({ vhrno, servicecode, ip_adres, macadrs });
      return res;
    },
    [refetch]
  );

  return { fetchCarInfo };
}

const TS_KEY_CODE = "X5SH-0SP5-7GM4-SMJU";

/**
 * 국토부 정비이력 전송: /tsservice/api/otvhcle_imprmn_hist_c.aspx
 * 응답: { result, msgcode, msg, inner_imprmn_no? }
 */
export function useTsRepairSend() {
  const { loading, refetch } = useApi({
    path: "/tsservice/api/otvhcle_imprmn_hist_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  /**
   * @param {{ servicecode: string, ip_adres?: string, macadrs?: string, jsondata: string }} params
   */
  const sendRepairHistory = useCallback(
    async ({ servicecode, ip_adres = "", macadrs = "", jsondata }) => {
      const res = await refetch({
        servicecode,
        key_code: TS_KEY_CODE,
        ip_adres,
        macadrs,
        jsondata,
      });
      console.log("[useTsRepairSend] response:", res);
      throwIfFalse(res);
      return res;
    },
    [refetch]
  );

  return { loading, sendRepairHistory };
}
