// React 밖(api/request.js 등)에서 공용 알럿을 쓰기 위한 브릿지
// AlertProvider 마운트 시 api 등록, 언마운트 시 해제
let alertApi = null;

export function setAlertApi(api) {
  alertApi = api;
}

export function getAlertApi() {
  return alertApi;
}
