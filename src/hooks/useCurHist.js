import { useCallback } from "react";
import { getComcode, getUserid, getMobileno, getServiceKey, API_ESTSERVICE } from "../api/config";

async function postForm(path, params) {
  const body = new URLSearchParams({
    ...params,
    servicekey: getServiceKey(),
  });
  const res = await fetch(`${API_ESTSERVICE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

/**
 * 동시 편집 방지 훅
 * - checkAndLock : 체크 + 락 동시 (est_curhist_check_s.aspx)
 * - unlock       : 락 해제        (est_curhist_u.aspx)
 */
export function useCurHist() {
  /**
   * 편집 진입 전 호출. 다른 사용자가 사용 중이면 그 사용자 ID를 반환, 없으면 null.
   * @param {string} est_serial
   * @returns {Promise<string|null>}
   */
  const checkAndLock = useCallback(async (est_serial) => {
    try {
      const res = await postForm("/est_curhist_check_s.aspx", {
        comcode:    getComcode(),
        cur_table:  "est_masterestimate",
        cur_serial: est_serial,
        update_id:  getUserid(),
        mobileno:   getMobileno(),
      });
      const row = res?.dataset?.[0];
      const useUserid   = row?.use_userid   || "";
      const useMobileno = row?.use_mobileno || "";

      // 둘 다 빈값 → 미사용 중 → 진입 허용
      if (!useUserid && !useMobileno) return null;

      // 내 userid + 내 mobileno 모두 일치 → 본인 → 진입 허용
      if (useUserid === getUserid() && useMobileno === getMobileno()) return null;

      // 그 외 → 타인 사용 중 → 차단
      return { userid: useUserid || "다른 사용자", mobileno: useMobileno };
    } catch (e) { console.error("[checkAndLock] 오류:", e); }
    return null;
  }, []);

  /**
   * 편집 화면 종료 시 호출.
   * @param {string} est_serial
   */
  const unlock = useCallback(async (est_serial) => {
    try {
      await postForm("/est_curhist_u.aspx", {
        comcode:    getComcode(),
        cur_table:  "est_masterestimate",
        cur_serial: est_serial,
        update_id:  getUserid(),
        mobileno:   getMobileno(),
        state:      "0",
      });
    } catch { /* 무시 */ }
  }, []);

  return { checkAndLock, unlock };
}
