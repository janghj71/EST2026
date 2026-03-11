// src/hooks/useAlimtalkTemplate.js
import { useCallback } from 'react';
import { useApi } from './useApi';
import { apiOk } from '../api/apiOk';
import { replaceTemplate_alimtalk } from '../utils/replaceTemplate_alimtalk';

/**
 * 알림톡 템플릿 조회 훅
 *
 * API: est_alimtalk_sample_s.aspx (comcode는 useApi 자동 주입)
 * isest === '1' → altkindcode '03' (견적서)
 * isest !== '1' → altkindcode '02' (명세서)
 */
export function useAlimtalkTemplate() {
  const { loading, refetch } = useApi({
    path: '/est_alimtalk_sample_s.aspx',
    immediate: false,
  });

  /**
   * 템플릿 조회 + 변수 치환
   * @param {Object} params
   * @param {string} params.isest      - '1' → altkindcode '03' (견적서)
   * @param {string} params.carno      - 차량번호
   * @param {string} params.inday      - 입고일자
   * @param {string} params.comname    - 업체명
   * @param {string} params.tel0       - 업체전화 앞자리
   * @param {string} params.tel1       - 업체전화 중간자리
   * @param {string} params.tel2       - 업체전화 끝자리
   * @param {string} [params.address1] - 주소1
   * @param {string} [params.address2] - 주소2
   * @returns {Promise<string>} 변수가 치환된 알림톡 메시지 문자열
   */
  const fetchTemplate = useCallback(async ({ isest, smskind, ...data }) => {
    const json = await refetch();
    apiOk(json, '알림톡 템플릿 조회');

    const altkindcode = smskind || (isest === '1' ? '03' : '02');
    const item = json.dataset?.find((d) => d.altkindcode === altkindcode);
    if (!item) throw new Error(`알림톡 템플릿이 없습니다. (altkindcode: ${altkindcode})`);

    const text = replaceTemplate_alimtalk(item.altmsg, data);

    return {
      text,
      template: item,
      altkindcode,
    };
  }, [refetch]);

  return { loading, fetchTemplate };
}
