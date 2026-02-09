import React, { useCallback, useMemo, useState } from "react";
import MoneyInput from "../../components/MoneyInput";
import IconBtn from "../../components/IconBtn";
import { Plus, X } from "lucide-react";

/**
 * 견적정산 (화면 코딩)
 * - 보험사(청구처) 선택 시 해당 보험사의 정산 항목을 편집/표시
 * - 데이터 저장 위치: master.claims[idx] 내부에 정산 필드들을 같이 저장(간단/실용)
 *
 * 요구 필드:
 * labor: rxao, bs, tg, p2, p4
 * part : newpart, oldpart, p1
 * dc   : depreci_amt, rem_amt
 * sum  : pendpay, endpaysum, endpartsum, dcsum, endtotal, endvat, totalvat
 * mis  : misrate, mis
 * ex   : insura_exemp
 * req  : reqtotal
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
        // className="text-sm text-gray-600 whitespace-nowrap"
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


export default function EstimateSettlePanel({ master, setMaster, inputCls, selectCls }) {
  const claims = Array.isArray(master?.claims) ? master.claims : [];
  const [selectedIdx, setSelectedIdx] = useState(() => (claims.length ? 0 : -1));

  const safeSelectedIdx = useMemo(() => {
    if (!claims.length) return -1;
    if (selectedIdx < 0) return 0;
    if (selectedIdx >= claims.length) return claims.length - 1;
    return selectedIdx;
  }, [claims.length, selectedIdx]);

  const current = safeSelectedIdx >= 0 ? claims[safeSelectedIdx] : null;

  const setClaim = useCallback(
    (idx, key, value) => {
      setMaster((m) => {
        const prev = Array.isArray(m?.claims) ? m.claims : [];
        const next = prev.map((c, i) => (i === idx ? { ...(c || {}), [key]: value } : c));
        return { ...m, claims: next };
      });
    },
    [setMaster]
  );

  // 숫자 안전 파싱
  const n = (v) => {
    if (v == null || v === "") return 0;
    const s = String(v).replace(/,/g, "").trim();
    const x = Number(s);
    return Number.isFinite(x) ? x : 0;
  };


  const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString() : "0");

  // 상단 목록 버튼(청구처와 동일 UX)
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
                    담당자 {c?.boman_nm || "-"} · 접수 {c?.regno || "-"}
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

              <SettleStat label="탈착교환" value={n(current.rxao)} />
              <SettleStat label="순정부품" value={n(current.newpart)} />

              <SettleStat label="판금교정" value={n(current.bs)} />
              <SettleStat label="중고부품" value={n(current.oldpart)} />

              <SettleStat label="견인,기타" value={n(current.tg)} />
              <SettleStat label="도장재료대" value={n(current.p1)} />

              <SettleStat label="도장공임" value={n(current.p2)} />

              <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                <div className="text-sm font-semibold text-zinc-800 whitespace-nowrap">차감</div>
                <div className="h-9" />
              </div>

              <SettleStat label="가열건조비" value={n(current.p4)} />
              <SettleRow label="감가상각">
                <MoneyInput
                  value={current.depreci_amt ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "depreci_amt", v)}
                />
              </SettleRow>

              <SettleStat label="도장정산" value={n(current.pendpay)} emphasize />
              <SettleRow label="잔존물">
                <MoneyInput
                  value={current.rem_amt ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "rem_amt", v)}
                />
              </SettleRow>
            </div>

          </div>

          <div className={boxCls}>
            <div className="text-sm font-semibold text-zinc-800 mb-2">합계</div>

            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <SettleStat label="공임소계" value={n(current.endpaysum)} emphasize />
              <SettleStat label="부품소계" value={n(current.endpartsum)} emphasize />

              <SettleStat label="차감소계" value={n(current.dcsum)} emphasize />
              <SettleStat label="소계" value={n(current.endtotal)} emphasize />

              <div className="col-span-2">
                <div className="grid grid-cols-[92px_123px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-sm text-gray-600 whitespace-nowrap">부가세</div>

                  <select
                    className={selectCls}
                    value={String(current.vatRate ?? 10)}
                    onChange={(e) => setClaim(safeSelectedIdx, "vatRate", e.target.value)}
                  >
                    <option value="0">0</option>
                    <option value="10">10</option>
                    <option value="9.5">9.5</option>
                    <option value="9">9</option>
                    <option value="8">8</option>
                  </select>

                  <div className="h-9 w-full min-w-0 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-700">
                    {fmt(n(current.endvat))}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-sm text-gray-600 whitespace-nowrap">합계</div>
                  <div className="h-9 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm font-semibold text-zinc-900">
                    {fmt(n(current.totalvat))}
                  </div>
                </div>
              </div>
            </div>


            <div className="mt-2 border-t border-zinc-200 pt-2 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <SettleStat label="과실상계율" valueText={`${fmt(n(current.misrate))} %`} />
                <SettleStat label="과실상계금액" valueText={fmt(n(current.mis))} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <SettleRow label="면책금">
                  <MoneyInput
                    value={current.insura_exemp ?? ""}
                    onChange={(v) => setClaim(safeSelectedIdx, "insura_exemp", v)}
                  />
                </SettleRow>

                <SettleStat label="청구금액" value={n(current.reqtotal)} emphasize red labelRed />
              </div>
            </div>


          </div>
        </div>
      )}
    </div>
  );
}
