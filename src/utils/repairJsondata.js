// src/utils/repairJsondata.js
// 국토부 정비이력 전송 jsondata 빌더 (RepairHistorySend / EstimateEditPage 공용)

/** codecar 3번째 문자 → 차종코드 */
export function resolveVhctyAsortCode(codecar) {
  const ch = (codecar || "").charAt(2);
  if (["1", "2", "5"].includes(ch)) return "1";
  if (ch === "4") return "2";
  if (ch === "3") return "3";
  return "";
}

/** paykind → cmpnt_se_code */
export function resolveCmpntSeCode(d) {
  const pk = String(d.paykind ?? "");
  if (["1", "2", "4", "6"].includes(pk)) return "X";
  if (["3", "5"].includes(pk))           return d.part_state || d.state || "";
  return "";
}

/**
 * 국토부 API jsondata 빌더
 * @param {{ master, details, imprmn_entnum: string, supman?: string, inner_imprmn_no?: string }} param
 *   inner_imprmn_no — 명시적으로 넘기면 master.ts_serial 대신 사용 (upd_code='D' 시 '' 전달)
 */
export function buildRepairJsondata({ master, details, imprmn_entnum, supman = "", inner_imprmn_no, upd_code, upd_reason = "" }) {
  const innerNo    = inner_imprmn_no !== undefined ? inner_imprmn_no : (master.ts_serial || "");
  const updCode    = upd_code        !== undefined ? upd_code        : (master.ts_serial ? "U" : "N");

  const jsondata = JSON.stringify({
    ot_vhcle_imprmn_hist: [
      {
        imprmn_entnum:       imprmn_entnum                    || "",
        prgcom:              "01_EST",
        upd_code:            updCode,
        upd_reason:          upd_reason,
        vhrno:               master.carno                     || "",
        cnm:                 master.carname                   || "",
        wrhousng_de:         (master.inday  || "").slice(0, 10),
        imprmn_compt_de:     (master.outday || "").slice(0, 10),
        dlivy_de:            (master.outday || "").slice(0, 10),
        imprmn_dt:           (master.inday  || "").slice(0, 10),
        vhcty_asort_code:    resolveVhctyAsortCode(master.codecar),
        imprmn_rspnber_nm:   supman,
        mber_nm:             master.custom_name               || "",
        telno:               [master.hp0, master.hp1, master.hp2].filter(Boolean).join(""),
        trvl_dstnc:          String(master.lastkm             || "0"),
        inner_imprmn_no:     innerNo,
        adit_imprmn_agre_at: "Y",
        acdnt_at:            master.seccode === "12" ? "Y" : "N",
      },
    ],
    ot_vhcle_imprmn_hist_dtls: details.filter((d) => d.ts_payno).map((d) => ({
      cmpnt_se_code:        resolveCmpntSeCode(d),
      cmpnt_detail_nm:      d.payname                        || "",
      work_id:              d.ts_payno                       || "",
      car_maker_part_cls:   d.part_makercode                 || "",
      cmpnt_co:             parseInt(d.qty     || 0, 10)     || 0,
      cmpnt_by_wage_amount: parseInt(d.paysum  || 0, 10)     || 0,
      cmpnt_amount_tot:     parseInt(d.partsum || 0, 10)     || 0,
      insurance_yn:         master.seccode === "12" ? "Y" : "N",
    })),
  });
  console.log("[buildRepairJsondata]", jsondata);
  return jsondata;
}
