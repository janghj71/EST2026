import { useCallback } from 'react';
import { useApi } from './useApi';
import { apiOk } from '../api/apiOk';
import { useAlert } from '../alerts';
import { getComcode, getServiceKey, API_ESTSERVICE } from '../api/config';

export function useEstimateMemo() {
  const { warning } = useAlert();
  const { loading, refetch } = useApi({
    path: '/est_masterestimate_memo_s.aspx',
    immediate: false,
  });

  // est_serial로 메모 30개 조회 → rows 배열 반환 (실패 시 null)
  const fetchRows = useCallback(async (est_serial) => {
    try {
      const json = await refetch({ est_serial });
      apiOk(json, '메모 조회');
      const base = Array.from({ length: 30 }).map((_, i) => ({ seq: i + 1, text: '' }));
      for (const item of json.dataset || []) {
        const s = Number(item.seqno); // "001" → 1
        if (s >= 1 && s <= 30) base[s - 1].text = item.memo ?? '';
      }
      return base;
    } catch (e) {
      warning(e.message || '메모 조회 실패');
      return null;
    }
  }, [refetch, warning]);

  const { refetch: saveRefetch } = useApi({
    path: '/est_masterestimate_memo_c.aspx',
    bodyType: 'raw',
    immediate: false,
  });

  const saveRows = useCallback(async (est_serial, rows) => {
    if (!est_serial) return;
    const comcode = getComcode();
    const dataset = rows
      .filter(r => r.text?.trim() !== '')
      .map((r, idx) => ({
        memo: `${(idx + 1).toString().padStart(3, '0')}${r.text}`,
      }));
    try {
      const body = JSON.stringify({ comcode, est_serial, dataset });
      const json = await saveRefetch(body);
      apiOk(json, '메모 저장');
    } catch (e) {
      warning(e.message || '메모 저장 실패');
    }
  }, [saveRefetch, warning]);

  // 창 닫힐 때 전용 — keepalive: true로 언로드 중에도 요청 완료 보장
  const saveRowsBeacon = useCallback((est_serial, rows) => {
    if (!est_serial) return;
    const comcode = getComcode();
    const servicekey = getServiceKey();
    const dataset = rows
      .filter(r => r.text?.trim() !== '')
      .map((r, idx) => ({
        memo: `${(idx + 1).toString().padStart(3, '0')}${r.text}`,
      }));
    const body = JSON.stringify({
      comcode,
      est_serial,
      dataset,
      ...(servicekey && { servicekey }),
    });
    const url = import.meta.env.DEV
      ? `/api/est_masterestimate_memo_c.aspx`
      : `${API_ESTSERVICE}/est_masterestimate_memo_c.aspx`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body,
      keepalive: true,
    }).catch(() => {});
  }, []);

  return { loading, fetchRows, saveRows, saveRowsBeacon };
}
