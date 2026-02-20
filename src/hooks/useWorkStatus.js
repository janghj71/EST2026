// src/hooks/useWorkStatus.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { clearTbCodeCache } from "./useTbCode";


const MAINCODE = "UKND02";

export function useWorkStatus(reloadList) {
  // ── 등록 ──
  const { loading: creating, refetch: createRequest } = useApi({
    path: "/est_tbcode_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  // ── 삭제 ──
  const { loading: deleting, refetch: deleteRequest } = useApi({
    path: "/est_tbcode_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const create = useCallback(async (codename) => {
    const json = await createRequest({
      maincode: MAINCODE,
      codename,
      codesize: "2",
    });
    apiOk(json, "작업상태 등록");
    clearTbCodeCache();
    await reloadList?.();
    return json;
  }, [createRequest, reloadList]);

  const remove = useCallback(async (subcode) => {
    const json = await deleteRequest({
      maincode: MAINCODE,
      subcode,
    });
    apiOk(json, "작업상태 삭제");
    clearTbCodeCache();
    await reloadList?.();
    return json;
  }, [deleteRequest, reloadList]);

  return { create, creating, remove, deleting };
}
