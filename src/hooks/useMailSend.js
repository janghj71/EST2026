// src/hooks/useMailSend.js
import { useCallback } from "react";
import { useApi } from "./useApi";

export function useMailSend() {
  const { refetch: mailRefetch } = useApi({
    path: "/est_mail_send.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const sendEstimateMail = useCallback(
    (params) => mailRefetch(params),
    [mailRefetch]
  );

  return { sendEstimateMail };
}
