// src/api/request.js
import { API_ESTSERVICE, API_NEOSERVICE, API_AXSERVICE, API_IVSERVICE, getServiceKey } from './config'

/**
 * bodyType: 'form' | 'json' | 'raw'
 *  - 'form' (기본): application/x-www-form-urlencoded
 *  - 'json'       : application/json
 *  - 'raw'        : 문자열 그대로 보냄(헤더는 호출자가 직접 지정)
 */
export async function request(
  path,
  { method = 'POST', body, bodyType = 'form', headers = {}, ...rest } = {}
) {
  const isDev = import.meta.env.DEV

  let url
  if (/^https?:\/\//i.test(path)) {
    url = path
  } else if (isDev) {
    url = `/api${path}`;

  } else {
    if (path.startsWith('/neoservice')) {
      url = `${API_NEOSERVICE}${path.replace('/neoservice', '')}`;
    } else if (path.startsWith('/axservice')) {
      url = `${API_AXSERVICE}${path.replace('/axservice', '')}`;
    } else if (path.startsWith('/ivservice')) {
      url = `${API_IVSERVICE}${path.replace('/ivservice', '')}`;
    } else {
      url = `${API_ESTSERVICE}${path}`;
    }
  }

  const serviceKey = getServiceKey()
  const opts = { method, headers: { ...headers }, ...rest }

  // body 구성
  if (body instanceof FormData) {
    
    if (serviceKey) body.append('servicekey', serviceKey)
    // FormData는 Content-Type 제거(브라우저가 boundary 자동 지정)
    delete opts.headers['Content-Type']
    opts.body = body

  } else if (bodyType === 'json') {
    
    const payload = (typeof body === 'object' && body) ? { ...body } : {}
    if (serviceKey) payload.servicekey = serviceKey
    opts.headers['Content-Type'] = 'application/json;charset=utf-8'
    opts.body = JSON.stringify(payload)

  } else if (bodyType === 'raw') {
    
    // 문자열 전문 그대로 전송
    if (!opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8'
    }
    opts.body = typeof body === 'string' ? body : ''

  } else {
    // 'form'
    const payload = (typeof body === 'object' && body) ? { ...body } : {}
    if (serviceKey) payload.servicekey = serviceKey
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8'
    opts.body = new URLSearchParams(payload).toString()
  }
  if (import.meta.env.DEV) {
    console.log('opts: '+opts.body);
    console.log('url: '+url);
  }
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  // body stream은 1회만 읽을 수 있으므로 text로 1회 읽고 JSON 파싱 시도
  const raw = await res.text()
  let json
  try {
    json = raw ? JSON.parse(raw) : {}
  } catch {
    return raw
  }

  // 서버 표준 오류 포맷 대응 (프로젝트 규칙에 맞게)
  if (json?.result === 'false') {
    // 서버에서 msg 제공 시 예외로 올림
    throw new Error(json?.msg || 'API 오류')
  }

  return json
}

// 편의 함수
export const postForm = (path, formObj, opts) => request(path, { method: 'POST', body: formObj, bodyType: 'form', ...opts })
export const postJSON = (path, jsonObj, opts) => request(path, { method: 'POST', body: jsonObj, bodyType: 'json', ...opts })
export const postRaw  = (path, rawStr,  opts) => request(path, { method: 'POST', body: rawStr,  bodyType: 'raw',  ...opts })
