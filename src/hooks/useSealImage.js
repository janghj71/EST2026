// src/hooks/useSealImage.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

/** File → JPEG Base64 문자열 변환 (항상 jpg 출력) */
function fileToJpegBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      // jpg는 투명 배경 미지원 → 흰색 배경 채우기
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    img.src = URL.createObjectURL(file);
  });
}

/** Base64 문자열 → data URL (표시용) */
function toDataUrl(base64) {
  if (!base64) return "";
  return `data:image/jpeg;base64,${base64}`;
}

/** 조회 응답 → { companySeal, managerSeal } */
function mapToSeals(json) {
  apiOk(json, "직인 조회");
  const dataset = json.dataset ?? [];
  let companySeal = "";
  let managerSeal = "";

  for (const row of dataset) {
    if (row.imgkind === "1" || row.imgkind === 1) {
      companySeal = toDataUrl(row.imgdata);
    }
    if (row.imgkind === "2" || row.imgkind === 2) {
      managerSeal = toDataUrl(row.imgdata);
    }
  }

  return { companySeal, managerSeal };
}

export function useSealImage() {
  // ── 조회 ──
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_tbimage_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapToSeals,
  });

  // ── 저장 ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_tbimage_c.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  // ── 삭제 ──
  const { loading: deleting, refetch: deleteRequest } = useApi({
    path: "/est_tbimage_d.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const seals = data ?? { companySeal: "", managerSeal: "" };

  /** 직인 저장: imgkind(1=회사직인, 2=정비책임자), file=File 객체 */
  const saveSeal = useCallback(async (imgkind, file) => {
    const imgdata = await fileToJpegBase64(file);
    const json = await saveRequest({ imgkind, imgdata });
    apiOk(json, "직인 저장");

    // 로컬 상태 즉시 반영 (재조회 없이)
    const dataUrl = toDataUrl(imgdata);
    setData((prev) => {
      const p = prev ?? { companySeal: "", managerSeal: "" };
      if (String(imgkind) === "1") return { ...p, companySeal: dataUrl };
      if (String(imgkind) === "2") return { ...p, managerSeal: dataUrl };
      return p;
    });

    return json;
  }, [saveRequest, setData]);

  /** 직인 삭제: imgkind(1=회사직인, 2=정비책임자) */
  const deleteSeal = useCallback(async (imgkind) => {
    const json = await deleteRequest({ imgkind });
    apiOk(json, "직인 삭제");

    // 로컬 상태 즉시 반영
    setData((prev) => {
      const p = prev ?? { companySeal: "", managerSeal: "" };
      if (String(imgkind) === "1") return { ...p, companySeal: "" };
      if (String(imgkind) === "2") return { ...p, managerSeal: "" };
      return p;
    });

    return json;
  }, [deleteRequest, setData]);

  return {
    companySeal: seals.companySeal,
    managerSeal: seals.managerSeal,
    loading,
    saving,
    deleting,
    refetch,
    saveSeal,
    deleteSeal,
  };
}
