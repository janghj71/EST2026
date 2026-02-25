// src/hooks/usePhoto.js
import { useCallback, useState } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";
import { request } from "../api/request";
import { getComcode, getServiceKey } from "../api/config";

/** 사진목록 응답 → dataset 배열 (photo_order 순 정렬) */
function mapPhotos(json) {
  apiOk(json, "사진목록 조회");
  const list = json.dataset ?? [];
  // photo_order 순 정렬
  return list.sort((a, b) => {
    const oa = Number(a.photo_order) || 0;
    const ob = Number(b.photo_order) || 0;
    return oa - ob;
  });
}

export function usePhoto() {
  const {
    data: photos,
    loading,
    error,
    refetch,
  } = useApi({
    path: "/est_photo_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
    onMap: mapPhotos,
  });

  const fetchPhotos = useCallback(
    (est_serial) => refetch({ est_serial }),
    [refetch]
  );

  // ── 저장 공통 (est_photo_u.aspx) ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  /**
   * PhotoViewer용: 자리이동(photo_order)만 저장 — 파일 없음
   * @param {string} estSerial
   * @param {Array<{photo_seqno, photokind, photo_order, memo}>} updates
   */
  const savePhotoOrder = useCallback(async (estSerial, updates) => {
    setSaving(true);
    setSaveError(null);
    try {
      const comcode = getComcode();
      const servicekey = getServiceKey();
      const reqdata = JSON.stringify({
        comcode,
        servicekey,
        est_serial: estSerial,
        dataset: updates,
      });
      const form = new FormData();
      form.append("jsonData", reqdata);

      const json = await request("/est_photo_u.aspx", {
        method: "POST",
        body: form,
      });
      apiOk(json, "사진 순서 저장");
      return json;
    } catch (e) {
      setSaveError(e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * PhotoPopup용: 사진구분/메모/회전 + 파일 첨부 가능
   * @param {string} estSerial
   * @param {Array<{photo_seqno, photokind, photo_order, memo}>} updates
   * @param {Blob|File|null} fileBlob  - 회전된 이미지 blob 등
   * @param {string} [fileName]        - 파일명
   */
  const savePhotoDetail = useCallback(async (estSerial, updates, fileBlob, fileName) => {
    setSaving(true);
    setSaveError(null);
    try {
      const comcode = getComcode();
      const servicekey = getServiceKey();
      const reqdata = JSON.stringify({
        comcode,
        servicekey,
        est_serial: estSerial,
        dataset: updates,
      });
      const form = new FormData();
      form.append("jsonData", reqdata);
      if (fileBlob) form.append("file", fileBlob, fileName || "photo.jpg");

      const json = await request("/est_photo_u.aspx", {
        method: "POST",
        body: form,
      });
      apiOk(json, "사진 저장");
      return json;
    } catch (e) {
      setSaveError(e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    photos: photos ?? [],
    loading,
    error,
    fetchPhotos,
    // 저장
    saving,
    saveError,
    savePhotoOrder,
    savePhotoDetail,
  };
}
