// src/hooks/useNotice.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

function mapNotices(json) {
  apiOk(json, "공지사항 조회");
  return json.dataset ?? [];
}

/** 대시보드용 최근 공지 (est_main_info_s.aspx) */
export function useMainNotice() {
  const { refetch } = useApi({
    path: "/est_main_info_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapNotices,
  });

  const fetchMainNotice = useCallback(() => refetch({}), [refetch]);

  return { fetchMainNotice };
}

/** 전체 공지 목록 (est_info_s.aspx) */
export function useNoticeList() {
  const { refetch } = useApi({
    path: "/est_info_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapNotices,
  });

  const fetchNoticeList = useCallback(() => refetch({}), [refetch]);

  return { fetchNoticeList };
}
