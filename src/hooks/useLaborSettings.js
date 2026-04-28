// src/hooks/useLaborSettings.js
import { useCallback } from "react";
import { useApi } from "./useApi";
import { apiOk } from "../api/apiOk";

const EMPTY_FORM = {
  paykind: "1", pntkind: "1",
  pntrate_m05: "0", pntrate_m18: "0",
  pntrate_sec: "80", pnt_drypay: "0",
  xpay: "0", bpay: "0", ppay: "0",
  expay: "0", ebpay: "0", eppay: "0",
  w_manname: "", pntmix_model: "",
  pnt_material: false, est_aosonly: false,
  pntcolormix:  "0",   // 도장 컬러매칭 시간
  pntmix_m_oil: "0",   // 컬러매칭 재료비 (유용성)
  pntmix_m:     "0",   // 컬러매칭 재료비 (수용성)
  pntcotx1: "0", pntcotx2: "0", pntcotx4: "0", // 공통작업시간 Qty (코트별, 기본)
  pntcotb1: "0", pntcotb2: "0", pntcotb4: "0", // 공통작업시간 Qty (코트별, 판금도장)
};

/** dataset 배열 → { set_name: set_value } 맵 */
function datasetToMap(dataset) {
  const map = {};
  for (const item of dataset) {
    map[item.set_name] = item.set_value;
  }
  return map;
}

/** API 맵 → LaborSettingsPage form 객체 */
function mapToForm(json) {
  apiOk(json, "공임설정 조회");
  const m = datasetToMap(json.dataset);
  return {
    paykind:      m.paykind      ?? "1",
    pntkind:      m.pntkind      ?? "1",
    pntrate_m05:  m.pntrate_m05  ?? "0",
    pntrate_m18:  m.pntrate_m18  ?? "0",
    pntrate_sec:  m.pntrate_sec  ?? "80",
    pnt_drypay:   m.pnt_drypay   ?? "0",
    xpay:         m.xpay         ?? "0",
    bpay:         m.bpay         ?? "0",
    ppay:         m.ppay         ?? "0",
    expay:        m.expay        ?? "0",
    ebpay:        m.ebpay        ?? "0",
    eppay:        m.eppay        ?? "0",
    w_manname:    m.w_manname    ?? "",
    pntmix_model: m.pntmix_model ?? "",
    pnt_material: m.pnt_material === "1",
    est_aosonly:  m.est_aosonly  === "1",
    pntcolormix:  m.pntcolormix  ?? "0",
    pntmix_m_oil: m.pntmix_m_oil ?? "0",
    pntmix_m:     m.pntmix_m     ?? "0",
    pntcotx1: m.pntcotx1 ?? "0",
    pntcotx2: m.pntcotx2 ?? "0",
    pntcotx4: m.pntcotx4 ?? "0",
    pntcotb1: m.pntcotb1 ?? "0",
    pntcotb2: m.pntcotb2 ?? "0",
    pntcotb4: m.pntcotb4 ?? "0",
  };
}

/** form 객체 → 저장 API 파라미터 */
function formToParams(form) {
  return {
    paykind:      form.paykind,
    pntkind:      form.pntkind,
    pntrate_m05:  form.pntrate_m05,
    pntrate_m18:  form.pntrate_m18,
    pntrate_sec:  form.pntrate_sec,
    pnt_drypay:   form.pnt_drypay,
    xpay:         form.xpay,
    bpay:         form.bpay,
    ppay:         form.ppay,
    expay:        form.expay,
    ebpay:        form.ebpay,
    eppay:        form.eppay,
    w_manname:    form.w_manname,
    pntmix_model: form.pntmix_model,
    pnt_material: form.pnt_material ? "1" : "2",
    est_aosonly:  form.est_aosonly  ? "1" : "0",
    pntcolormix:  form.pntcolormix,
    pntmix_m_oil: form.pntmix_m_oil,
    pntmix_m:     form.pntmix_m,
    pntcotx1: form.pntcotx1,
    pntcotx2: form.pntcotx2,
    pntcotx4: form.pntcotx4,
    pntcotb1: form.pntcotb1,
    pntcotb2: form.pntcotb2,
    pntcotb4: form.pntcotb4,
  };
}

export function useLaborSettings() {
  // ── 조회 ──
  const { data, loading, error, refetch, setData } = useApi({
    path: "/est_codesetitem_s.aspx",
    method: "POST",
    bodyType: "form",
    immediate: true,
    onMap: mapToForm,
  });

  // ── 저장 ──
  const { loading: saving, refetch: saveRequest } = useApi({
    path: "/est_codesetitem_u.aspx",
    method: "POST",
    bodyType: "form",
    immediate: false,
  });

  const save = useCallback(async (form) => {
    const json = await saveRequest(formToParams(form));
    apiOk(json, "공임설정 저장");
    return json;
  }, [saveRequest]);

  return {
    form: data ?? EMPTY_FORM,
    setForm: setData,
    loading,
    saving,
    error,
    refetch,
    save,
  };
}
