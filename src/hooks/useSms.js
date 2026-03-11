import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

export function useSms() {
  const {
    loading: sendingSms,
    error: smsError,
    refetch: runSendSms,
  } = useApi({
    path: "/est_sms_send.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: (json) => {
      apiOk(json, "문자발송");
      return json;
    },
  });

  const sendSms = useCallback(
    async ({ comcode, est_serial, hp, callback, smskind, smstxt }) => {
      return runSendSms({
        comcode: comcode || "",
        est_serial: est_serial || "",
        hp: hp || "",
        callback: callback || "",
        smskind: smskind || "",
        smstxt: smstxt || "",
      });
    },
    [runSendSms]
  );

  const sendAlimtalk = useCallback(
    async ({
      comcode,
      est_serial,
      hp,
      callback,
      smskind,
      smstxt,
      biztype,
      yellowid_key,
      templatecode,
      resend,
      btn_type_01,
      btn_nm_01,
      btn_01_url_01,
      btn_01_url_02,
    }) => {
      return runSendSms({
        comcode: comcode || "",
        est_serial: est_serial || "",
        hp: hp || "",
        callback: callback || "",
        smskind: smskind || "",
        smstxt: smstxt || "",
        biztype: biztype || "at",
        yellowid_key: yellowid_key || "",
        templatecode: templatecode || "",
        resend: resend || "Y",
        btn_type_01: btn_type_01 || "",
        btn_nm_01: btn_nm_01 || "",
        btn_01_url_01: btn_01_url_01 || "",
        btn_01_url_02: btn_01_url_02 || "",
      });
    },
    [runSendSms]
  );

  return {
    sendingSms,
    smsError,
    sendSms,
    sendAlimtalk,
  };
}
