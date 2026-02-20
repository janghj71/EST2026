// src/hooks/useTbCode.js
import { useState, useEffect, useCallback } from "react";
import { request } from "../api/request";
import { getComcode } from "../api/config";
import { apiOk } from "../api/apiOk";

/** 모듈 레벨 캐시: 앱 전체에서 1회만 호출 */
let _cache = null;    // 전체 dataset 배열
let _promise = null;  // 진행 중인 요청

async function fetchTbCode() {
  // 이미 캐시되었으면 즉시 반환
  if (_cache) return _cache;
  // 진행 중인 요청이 있으면 대기
  if (_promise) return _promise;

  _promise = (async () => {
    const comcode = getComcode();
    const json = await request("/est_tbcode_s.aspx", {
      method: "POST",
      body: { comcode },
      bodyType: "form",
    });
    apiOk(json, "공통코드 조회");
    _cache = json.dataset;
    _promise = null;
    return _cache;
  })();

  return _promise;
}

/** 캐시 강제 초기화 (로그아웃, comcode 변경 시 호출) */
export function clearTbCodeCache() {
  _cache = null;
  _promise = null;
}

/**
 * 공통코드 훅
 * @param {string} maincode - 필터할 maincode (예: "SKD01")
 * @returns {{ codes, loading, error, reload }}
 *   codes = [{ value: subcode, label: codename, ...원본필드 }]
 */
export function useTbCode(maincode) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dataset = await fetchTbCode();
      const filtered = dataset
        .filter((row) => row.maincode === maincode)
        .map((row) => ({
          value: row.subcode,
          label: row.codename,
          def_value: row.def_value,
          state: row.state,
          state_nm: row.state_nm,
          descr: row.descr,
        }));
      setCodes(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [maincode]);

  useEffect(() => {
    load();
  }, [load]);

  /** 캐시 무시하고 다시 호출 */
  const reload = useCallback(() => {
    clearTbCodeCache();
    return load();
  }, [load]);

  return { codes, loading, error, reload };
}
