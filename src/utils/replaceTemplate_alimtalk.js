/**
 * replaceTemplate_alimtalk.js
 * 알림톡 템플릿 문자열의 플레이스홀더를 data 값으로 치환합니다.
 *
 * @param {string} text - 치환 대상 템플릿 문자열 (altmsg)
 * @param {Object} data - 치환에 사용할 데이터 객체
 * @returns {string} 치환 완료된 문자열
 */
export function replaceTemplate_alimtalk(text = '', data = {}) {
  if (!text) return '';
  let result = text;

  // 주소, 전화번호 결합 helper
  const joinAddr = () => [data.address1, data.address2].filter(Boolean).join(' ');
  const joinTel  = () => [data.tel0, data.tel1, data.tel2].filter(Boolean).join('-');

  // 플레이스홀더 및 매핑 정의
  const mappings = [
    { regex: /#\{업체명\}/g,       value: data.comname },
    { regex: /#\{정비업체명\}/g,   value: data.comname },
    { regex: /#\{주소\}/g,         value: joinAddr() || undefined },
    { regex: /#\{연락처\}/g,       value: joinTel() || undefined },
    { regex: /#\{업체전화\}/g,     value: joinTel() || undefined },
    { regex: /#\{업체전화번호\}/g, value: joinTel() || undefined },
    { regex: /#\{업체위치\}/g,     value: data.hostUrl != null && data.comcode != null ? `${data.hostUrl}${data.comcode}` : undefined },
    { regex: /#\{차량번호\}/g,     value: data.carno },
    { regex: /#\{차량명\}/g,       value: [data.carname, data.modelname].filter(Boolean).join(' ') || undefined },
    { regex: /#\{고객명\}/g,       value: data.custom_name || data.carno },
    { regex: /#\{입고일자\}/g,     value: data.inday },
    { regex: /#\{입고일시\}/g,     value: data.inday },
    { regex: /#\{정비일자\}/g,     value: data.inday },
    { regex: /#\{출고일자\}/g,     value: data.outday },
    { regex: /#\{출고예정\}/g,     value: data.preoutdate },
    { regex: /#\{예상수리비\}/g,   value: data.saletotal != null ? Number(data.saletotal).toLocaleString() : undefined },
    { regex: /#\{사고번호\}/g,     value: data.regno },
  ];

  // 정의된 값(빈 문자열 제외)만 치환
  mappings.forEach(({ regex, value }) => {
    if (value !== undefined && value !== '') {
      result = result.replace(regex, value);
    }
  });

  return result;
}
