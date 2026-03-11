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
    async ({ est_serial, hp, callback, smskind, smstxt }) => {
      return runSendSms({
        est_serial: est_serial || "",
        hp: hp || "",
        callback: callback || "",
        smskind: smskind || "",
        smstxt: smstxt || "",
      });
    },
    [runSendSms]
  );

  return {
    sendingSms,
    smsError,
    sendSms,
  };
}

