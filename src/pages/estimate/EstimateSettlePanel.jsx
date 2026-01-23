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

  // 부가세율(기본 10)
  const vatRate = useMemo(() => n(current?.vatRate ?? 10), [current]);

  // 화면 계산(원 단위 반올림)
  const endpaysum = useMemo(() => {
    if (!current) return 0;
    return n(current.rxao) + n(current.bs) + n(current.tg) + n(current.p2) + n(current.p4);
  }, [current]);

  const endpartsum = useMemo(() => {
    if (!current) return 0;
    return n(current.newpart) + n(current.oldpart) + n(current.p1);
  }, [current]);

  const dcsum = useMemo(() => {
    if (!current) return 0;
    return n(current.depreci_amt) + n(current.rem_amt);
  }, [current]);

  // 도장정산(pendpay)도 화면에서 계산 값으로 보여주되, 입력 가능하게 유지(델파이처럼 별도 박스)
  const pendpayCalc = useMemo(() => {
    if (!current) return 0;
    // 도장정산 = 도장공임(p2) + 도장재료대(p1) + 가열건조비(p4) ? (이미지상 도장정산은 별도)
    // 여기선 화면용으로 p2 + p1 + p4 로 잡음 (원하면 규칙 바꿔줌)
    return n(current.p2) + n(current.p1) + n(current.p4);
  }, [current]);

  const endtotal = useMemo(() => {
    if (!current) return 0;
    return endpaysum + endpartsum - dcsum;
  }, [current, endpaysum, endpartsum, dcsum]);

  const endvat = useMemo(() => {
    if (!current) return 0;
    return Math.round((endtotal * vatRate) / 100);
  }, [current, endtotal, vatRate]);

  const totalvat = useMemo(() => {
    if (!current) return 0;
    return endtotal + endvat;
  }, [current, endtotal, endvat]);

  const misrate = useMemo(() => n(current?.misrate ?? 0), [current]);
  const mis = useMemo(() => {
    if (!current) return 0;
    return Math.round((totalvat * misrate) / 100);
  }, [current, totalvat, misrate]);

  const exemp = useMemo(() => n(current?.insura_exemp ?? 0), [current]);

  const reqtotal = useMemo(() => {
    if (!current) return 0;
    return totalvat - mis - exemp;
  }, [current, totalvat, mis, exemp]);

  const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString() : "0");

  // 상단 목록 버튼(청구처와 동일 UX)
  const leftItemCls = (isSel) =>
    `w-full text-left px-2 py-2 rounded-md border ${
      isSel ? "border-zinc-400 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
    }`;

  // “화면만”이므로 추가/삭제는 claims를 그대로 사용(청구처에서 추가/삭제하는 게 정상)
  const addHint = () => alert("청구처에서 보험사 추가 후 정산에서 선택하세요.");
  const delHint = () => alert("청구처에서 보험사 삭제 후 정산이 따라갑니다.");

  // Row 레이아웃(라벨/인풋 간격을 좁게)
  const Row = ({ label, children, right }) => (
    <div className={`grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2 ${right ? "justify-items-end" : ""}`}>
      <div className="text-sm text-gray-600 whitespace-nowrap">{label}</div>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );

  const Stat = ({ label, value, emphasize, red }) => (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <div className="text-sm text-gray-600 whitespace-nowrap">{label}</div>
      <div
        className={[
          "h-9 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm",
          emphasize ? "font-semibold text-zinc-900" : "text-zinc-700",
          red ? "text-red-600" : "",
        ].join(" ")}
      >
        {fmt(value)}
      </div>
    </div>
  );

  const boxCls = "rounded-md border border-zinc-200 bg-white p-3 shadow-xs";

  return (
    <div className="flex flex-col gap-3">
      {/* 상단 버튼/안내 */}
      {/* <div className="flex items-center gap-2">
        <IconBtn icon={Plus} label="보험사 추가" onClick={addHint} />
        <IconBtn icon={X} label="보험사 삭제" onClick={delHint} />
        <div className="ml-auto text-xs text-zinc-500">보험사 선택 시 정산 금액이 바뀜</div>
      </div> */}

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
          {/* 좌측(공임/부품/차감) + 우측(합계/과실/면책/청구) 를 “상하로” 2박스 구성 */}
          <div className={boxCls}>
            <div className="text-sm font-semibold text-zinc-800 mb-2">정산 항목</div>

            {/* 공임/부품/차감: 2열(520px에서도 안정) */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-zinc-500">공임</div>
                <Row label="탈착교환">
                  <MoneyInput value={current.rxao ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "rxao", v)} />
                </Row>
                <Row label="판금교정">
                  <MoneyInput value={current.bs ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "bs", v)} />
                </Row>
                <Row label="견인,기타">
                  <MoneyInput value={current.tg ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "tg", v)} />
                </Row>
                <Row label="도장공임">
                  <MoneyInput value={current.p2 ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "p2", v)} />
                </Row>
                <Row label="가열건조비">
                  <MoneyInput value={current.p4 ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "p4", v)} />
                </Row>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-zinc-500">부품</div>
                <Row label="순정부품">
                  <MoneyInput value={current.newpart ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "newpart", v)} />
                </Row>
                <Row label="중고부품">
                  <MoneyInput value={current.oldpart ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "oldpart", v)} />
                </Row>
                <Row label="도장재료대">
                  <MoneyInput value={current.p1 ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "p1", v)} />
                </Row>

                <div className="mt-2 text-xs font-semibold text-zinc-500">차감</div>
                <Row label="감가상각">
                  <MoneyInput
                    value={current.depreci_amt ?? ""}
                    onChange={(v) => setClaim(safeSelectedIdx, "depreci_amt", v)}
                  />
                </Row>
                <Row label="잔존물">
                  <MoneyInput value={current.rem_amt ?? ""} onChange={(v) => setClaim(safeSelectedIdx, "rem_amt", v)} />
                </Row>
              </div>
            </div>
          </div>

          <div className={boxCls}>
            <div className="text-sm font-semibold text-zinc-800 mb-2">합계</div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* 좌: 소계류 */}
              <div className="flex flex-col gap-2">
                <Stat label="도장정산" value={n(current.pendpay ?? pendpayCalc)} emphasize />
                <Stat label="공임소계" value={n(current.endpaysum ?? endpaysum)} emphasize />
                <Stat label="부품소계" value={n(current.endpartsum ?? endpartsum)} emphasize />
                <Stat label="차감소계" value={n(current.dcsum ?? dcsum)} emphasize />
              </div>

              {/* 우: 소계/부가세/합계 */}
              <div className="flex flex-col gap-2">
                <Stat label="소계" value={n(current.endtotal ?? endtotal)} emphasize />

                <Row label="부가세">
                  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 items-center">
                    <select
                      className={selectCls}
                      value={String(current.vatRate ?? 10)}
                      onChange={(e) => setClaim(safeSelectedIdx, "vatRate", e.target.value)}
                    >
                      <option value="0">0</option>
                      <option value="10">10</option>
                    </select>
                    <div className="h-9 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-700">
                      {fmt(n(current.endvat ?? endvat))}
                    </div>
                  </div>
                </Row>

                <Stat label="합계" value={n(current.totalvat ?? totalvat)} emphasize />
              </div>
            </div>

            <div className="mt-3 border-t border-zinc-200 pt-3 grid grid-cols-2 gap-x-6 gap-y-3">
              {/* 과실/면책/청구 */}
              <div className="flex flex-col gap-2">
                <Row label="과실상계">
                  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 items-center">
                    <select
                      className={selectCls}
                      value={String(current.misrate ?? 0)}
                      onChange={(e) => setClaim(safeSelectedIdx, "misrate", e.target.value)}
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const v = i * 5;
                        return (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        );
                      })}
                    </select>
                    <div className="h-9 flex items-center justify-end rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-700">
                      {fmt(n(current.mis ?? mis))}
                    </div>
                  </div>
                </Row>

                <Row label="면책금">
                  <MoneyInput
                    value={current.insura_exemp ?? ""}
                    onChange={(v) => setClaim(safeSelectedIdx, "insura_exemp", v)}
                  />
                </Row>
              </div>

              <div className="flex flex-col gap-2">
                <Stat label="청구액" value={n(current.reqtotal ?? reqtotal)} emphasize red />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
