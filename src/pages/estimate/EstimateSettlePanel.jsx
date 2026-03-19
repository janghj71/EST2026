import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MoneyInput from "../../components/MoneyInput";
import ComboInput from "../../components/ComboInput";
import { useEstimateClaims } from "../../hooks/useEstimateClaims";

/**
 * 견적정산
 * - 보험사(청구처) 선택 시 해당 보험사의 정산 항목을 표시/편집
 * - 계산 필드(rxao, bs, tg 등): est_bocal1_s.aspx (settle) 에서 읽기 전용
 * - 편집 필드(depreci_amt, rem_amt, insura_exemp, vatrate): 로컬 editValues, blur 시 est_bocal1_s.aspx 재호출
 */

function SettleRow({ label, children }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <div className="text-sm text-gray-600 whitespace-nowrap">{label}</div>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}

function SettleStat({ label, valueText, emphasize = false, red = false, labelRed = false }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <div
        className={[
          "text-sm whitespace-nowrap",
          labelRed ? "font-semibold text-red-600" : "text-gray-600",
        ].join(" ")}
      >
        {label}
      </div>
      <div
        className={[
          "h-9 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm",
          emphasize ? "font-semibold text-zinc-900" : "text-zinc-700",
          red ? "text-red-600" : "",
        ].join(" ")}
      >
        {valueText}
      </div>
    </div>
  );
}

export default function EstimateSettlePanel({ master, inputCls }) {
  const claims = Array.isArray(master?.claims) ? master.claims : [];
  const [selectedIdx, setSelectedIdx] = useState(() => (claims.length ? 0 : -1));

  const safeSelectedIdx = useMemo(() => {
    if (!claims.length) return -1;
    if (selectedIdx < 0) return 0;
    if (selectedIdx >= claims.length) return claims.length - 1;
    return selectedIdx;
  }, [claims.length, selectedIdx]);

  const current = safeSelectedIdx >= 0 ? claims[safeSelectedIdx] : null;

  // ── est_bocal1_s.aspx: 견적정산 계산 결과 로드 ────────────────────
  const { fetchSettle } = useEstimateClaims();
  const [settleMap, setSettleMap] = useState({});  // { estbo_seqno: row }

  useEffect(() => {
    const serial = master?.est_serial;
    if (!serial) return;
    fetchSettle({ est_serial: serial }).then((json) => {
      const rows = json?.dataset ?? [];
      const map = {};
      rows.forEach((r) => { map[r.estbo_seqno] = r; });
      setSettleMap(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master?.est_serial]);

  // 현재 선택된 정산 row (계산 결과)
  const settle = settleMap[current?.estbo_seqno] ?? {};

  // ── 편집 가능 4개 필드 로컬 state + ref ──────────────────────────
  const editRef = useRef({ depreci_amt: "", rem_amt: "", vatrate: "10", insura_exemp: "" });
  const [editValues, setEditValues] = useState({ depreci_amt: "", rem_amt: "", vatrate: "10", insura_exemp: "" });

  // claim 선택 변경 시 settle 에서 초기화 (blur API 후 settleMap 갱신엔 반응 안 함)
  // { seqno, hasData } — hasData=true 일 때만 blur 업데이트를 무시
  const initStateRef = useRef({ seqno: null, hasData: false });
  useEffect(() => {
    const seqno = current?.estbo_seqno;
    if (!seqno) return;

    const s = settleMap[seqno];
    const prev = initStateRef.current;

    // 같은 seqno + 실제 데이터로 이미 초기화됨 → blur API 갱신 무시 (사용자 입력 보존)
    if (seqno === prev.seqno && prev.hasData) return;

    // seqno 변경(다른 청구처 선택) 또는 settle 데이터가 새로 도착한 경우
    const vals = {
      depreci_amt:  s?.depreci_amt  ?? "",
      rem_amt:      s?.rem_amt      ?? "",
      vatrate:      String(s?.vatrate ?? 10),
      insura_exemp: s?.insura_exemp ?? "",
    };
    editRef.current = vals;
    setEditValues(vals);
    initStateRef.current = { seqno, hasData: !!s };
  }, [current?.estbo_seqno, settleMap]);

  const setEditField = useCallback((key, val) => {
    editRef.current = { ...editRef.current, [key]: val };
    setEditValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  // blur 시 해당 필드 하나만 파라미터로 전송
  const refreshSettleField = useCallback(async (key, val) => {
    const serial = master?.est_serial;
    const seqno  = current?.estbo_seqno;
    if (!serial || !seqno) return;
    const json = await fetchSettle({
      est_serial:  serial,
      estbo_seqno: seqno,
      [key]: val,
    });
    const rows = json?.dataset ?? [];
    const row = rows.find((r) => String(r.estbo_seqno) === String(seqno));
    if (row) {
      setSettleMap((prev) => ({ ...prev, [seqno]: row }));
    }
  }, [master?.est_serial, current?.estbo_seqno, fetchSettle]);

  // ── 유틸 ─────────────────────────────────────────────────────────
  const n = (v) => {
    if (v == null || v === "") return 0;
    const s = String(v).replace(/,/g, "").trim();
    const x = Number(s);
    return Number.isFinite(x) ? x : 0;
  };
  const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString() : "0");

  const leftItemCls = (isSel) =>
    `w-full text-left px-2 py-2 rounded-md border ${
      isSel ? "border-zinc-400 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
    }`;

  const boxCls = "rounded-md border border-zinc-200 bg-white p-3 shadow-xs";

  return (
    <div className="flex flex-col gap-3">

      {/* 상단: 보험사 목록 */}
      <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
        <div className="px-2 py-2 border-b border-zinc-200 text-sm font-semibold text-zinc-800">보험사</div>
        <div className="p-2">
          {claims.length === 0 ? (
            <div className="text-sm text-zinc-500 px-1 py-2">청구처 보험사가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {claims.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={leftItemCls(idx === safeSelectedIdx)}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <div className="text-sm font-semibold text-zinc-900 truncate">{c?.bocomname || `보험사 ${idx + 1}`}</div>
                  <div className="mt-1 text-xs text-zinc-500 truncate">
                    접수번호 {c?.regno || "--"} · 담보 {c?.dambo || "--"} · 담당자 {c?.boman_nm || "--"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      {!current ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          상단에서 보험사를 선택하세요.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className={boxCls}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="text-sm font-semibold text-zinc-800">공임</div>
              <div className="text-sm font-semibold text-zinc-800">부품</div>

              <SettleStat label="탈착교환"  valueText={fmt(n(settle.rxao))} />
              <SettleStat label="순정부품"  valueText={fmt(n(settle.newpart))} />

              <SettleStat label="판금교정"  valueText={fmt(n(settle.bs))} />
              <SettleStat label="중고부품"  valueText={fmt(n(settle.oldpart))} />

              <SettleStat label="견인,기타" valueText={fmt(n(settle.tg))} />
              <SettleStat label="도장재료대" valueText={fmt(n(settle.p1))} />

              <SettleStat label="도장공임"  valueText={fmt(n(settle.p2))} />

              <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                <div className="text-sm font-semibold text-zinc-800 whitespace-nowrap">차감</div>
                <div className="h-9" />
              </div>

              <SettleStat label="가열건조비" valueText={fmt(n(settle.p4))} />
              <SettleRow label="감가상각">
                <MoneyInput
                  value={editValues.depreci_amt}
                  onChange={(v) => setEditField("depreci_amt", v)}
                  onBlur={() => refreshSettleField("depreci_amt", editRef.current.depreci_amt)}
                />
              </SettleRow>

              <SettleStat label="도장정산"  valueText={fmt(n(settle.pendpay))} emphasize />
              <SettleRow label="잔존물">
                <MoneyInput
                  value={editValues.rem_amt}
                  onChange={(v) => setEditField("rem_amt", v)}
                  onBlur={() => refreshSettleField("rem_amt", editRef.current.rem_amt)}
                />
              </SettleRow>
            </div>
          </div>

          <div className={boxCls}>
            <div className="text-sm font-semibold text-zinc-800 mb-2">합계</div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <SettleStat label="공임소계" valueText={fmt(n(settle.endpaysum))} emphasize />
              <SettleStat label="부품소계" valueText={fmt(n(settle.endpartsum))} emphasize />

              <SettleStat label="차감소계" valueText={fmt(n(settle.dcsum))} emphasize />
              <SettleStat label="소계"     valueText={fmt(n(settle.endtotal))} emphasize />

              <div className="col-span-2">
                <div className="grid grid-cols-[92px_120px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-sm text-gray-600 whitespace-nowrap">부가세율</div>
                  <ComboInput
                    value={editValues.vatrate}
                    onChange={(v) => {
                      setEditField("vatrate", v);
                      refreshSettleField("vatrate", v);
                    }}
                    options={["0", "5", "8", "9", "9.5", "10"]}
                    inputClassName={inputCls}
                  />
                  <div className="h-9 w-full min-w-0 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-700">
                    {fmt(n(settle.endvat))}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-sm text-gray-600 whitespace-nowrap">합계</div>
                  <div className="h-9 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm font-semibold text-zinc-900">
                    {fmt(n(settle.totalvat))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 border-t border-zinc-200 pt-2 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <SettleStat label="과실상계율"  valueText={`${fmt(n(settle.misrate))} %`} />
                <SettleStat label="과실상계금액" valueText={fmt(n(settle.mis))} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <SettleRow label="면책금">
                  <MoneyInput
                    value={editValues.insura_exemp}
                    onChange={(v) => setEditField("insura_exemp", v)}
                    onBlur={() => refreshSettleField("insura_exemp", editRef.current.insura_exemp)}
                  />
                </SettleRow>

                <SettleStat label="청구금액" valueText={fmt(n(settle.reqtotal))} emphasize red labelRed />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
