// src/hooks/useApi.js
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { getComcode } from "../api/config";
import { request } from '../api/request'

function mergeBodyWithComcode(baseBody, overrideBody, bodyType) {
  const comcode = getComcode();
  const body = overrideBody ?? baseBody;

  // 로그인 전이면 comcode가 없으니 그대로 반환
  if (!comcode) return body;

  // FormData면 append(이미 있으면 중복 방지)
  if (body instanceof FormData) {
    if (!body.has("comcode")) body.append("comcode", comcode);
    return body;
  }

  // raw는 건드리지 않음(문자열 전문 전송)
  if (bodyType === "raw") return body;

  // object(form/json)면 병합(호출자가 comcode 주면 그걸 우선)
  if (typeof body === "object" && body) {
    if (body.comcode == null || body.comcode === "") {
      return { ...body, comcode };
    }
    return body;
  }

  // body가 없거나 비정상 타입이면 새로 만들어서 comcode만
  return { comcode };
}


export function useApi({ 
  path, 
  method = 'POST', 
  body, 
  bodyType = 'form', 
  immediate = true, 
  onMap, 
  requestKey 
}) {

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const optRef = useRef({ path, method, body, bodyType });
  useEffect(() => {
    optRef.current = { path, method, body, bodyType };
  }, [path, method, body, bodyType]);

  const mapRef = useRef(onMap);

  useEffect(() => {
    mapRef.current = onMap;
  }, [onMap]);

  const key = useMemo(() => {
    if (requestKey) return requestKey;
    return JSON.stringify({ path, method, bodyType, body: body ?? null });
  }, [requestKey, path, method, bodyType, body]);


  const run = useCallback(async (override = {}) => {
    setLoading(true)
    setError(null)
    
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {

      const { path, method, body, bodyType } = optRef.current;
      
      const effectiveBodyType = override.bodyType ?? bodyType;
      const mergedBody = mergeBodyWithComcode(body, override.body, effectiveBodyType);

      const { body: _ignored, bodyType: _ignoredBt, ...restOverride } = override;

      const res = await request(path, {
        method,
        // body,
        // bodyType,
        body: mergedBody,
        bodyType: effectiveBodyType,
        signal: ctrl.signal,
        // ...override,
        ...restOverride,
      })

      setData(mapRef.current ? mapRef.current(res) : res)
      return res
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(err)
        const payload = err?.payload ?? { result: 'false', msg: err?.message || '요청 실패' }
        return payload
      }
      return { result: 'false', msg: 'aborted' }
    } finally {
      setLoading(false)
    }
  }, [key]) ;

  useEffect(() => {
    if (immediate) run()
    return () => abortRef.current?.abort()
  }, [run, immediate])

  const refetch = useCallback((overrideBody) => {
    return run(overrideBody ? { body: overrideBody } : {})
  }, [run])

  return { data, loading, error, refetch, setData }
}
