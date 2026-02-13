// src/api/apiOk.js
export function apiOk(json, actionLabel = "처리") {
  const r = (json?.result ?? "").toString().toUpperCase();
  if (r !== "OK") {
   
    const err = new Error(json?.msg || `${actionLabel} 실패`);
    err.payload = json;
    throw err;
  }
  return json;
}
