// src/pages/estimate/EstimateClaimPanel.jsx
import React, { useMemo, useState, useCallback } from "react";
import Field from "../../components/Field";
import FormRow from "../../components/FormRow";
import MoneyInput from "../../components/MoneyInput";
import IconBtn from "../../components/IconBtn";
import { Plus, X,Trash2 } from "lucide-react";
import ComboInput from "../../components/ComboInput";

/**
 * 청구처 (화면만 코딩)
 * - master.claims: 최대 2개
 * - 필드:
 *   bocomname, boman_nm, regno, misrate, dambo, accday, driver_nm,
 *   insura_exemp, insura_person, insura_carno, carsale_amt, xpay, bpay, ppay
 */
export default function EstimateClaimPanel({ master, setMaster, inputCls, selectCls }) {
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

  const addClaim = useCallback(() => {
    setMaster((m) => {
      const prev = Array.isArray(m?.claims) ? m.claims : [];
      if (prev.length >= 2) return m;
      const next = [
        ...prev,
        {
          bocomname: "",
          boman_nm: "",
          regno: "",
          misrate: "",
          dambo: "",
          accday: "",
          driver_nm: "",
          insura_exemp: "",
          insura_person: "",
          insura_carno: "",
          carsale_amt: "",
          xpay: "",
          bpay: "",
          ppay: "",
        },
      ];
      return { ...m, claims: next };
    });
    setSelectedIdx((v) => (v < 0 ? 0 : v));
  }, [setMaster]);

  const removeClaim = useCallback(() => {
    if (safeSelectedIdx < 0) return;
    setMaster((m) => {
      const prev = Array.isArray(m?.claims) ? m.claims : [];
      const next = prev.filter((_, i) => i !== safeSelectedIdx);
      return { ...m, claims: next };
    });
    setSelectedIdx((v) => (v > 0 ? v - 1 : 0));
  }, [setMaster, safeSelectedIdx]);

  // 화면만: 옵션 더미
  const insuranceOptions = useMemo(
    () => ["", "택시공제", "ERGO다음다이렉트", "현대해상", "삼성화재", "DB손해보험", "KB손해보험"],
    []
  );
  const misrateOptions = useMemo(
    () => Array.from({ length: 21 }).map((_, i) => String(100 - i * 5)),
    []
  );

  const leftItemCls = (isSel) =>
    `w-full text-left px-2 py-2 rounded-md border ${
      isSel ? "border-zinc-400 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
    }`;


return (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <IconBtn icon={Plus} label="보험사 추가" onClick={addClaim} disabled={claims.length >= 2} />
      <IconBtn icon={Trash2} label="보험사 삭제" onClick={removeClaim} disabled={safeSelectedIdx < 0} />
      {/* <div className="ml-auto text-xs text-zinc-500">청구 보험사 최대 2개</div> */}
    </div>

    {/* 상단: 목록 (FULL WIDTH) */}
    <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
      <div className="px-2 py-2 border-b border-zinc-200 text-sm font-semibold text-zinc-800">
        청구 보험사
      </div>

      <div className="p-2">
        {claims.length === 0 ? (
          <div className="text-sm text-zinc-500 px-1 py-2">보험사 없음</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {claims.map((c, idx) => (
              <button
                key={idx}
                type="button"
                className={leftItemCls(idx === safeSelectedIdx)}
                onClick={() => setSelectedIdx(idx)}
              >
                <div className="text-sm font-semibold text-zinc-900 truncate">
                  {c?.bocomname || `보험사 ${idx + 1}`}
                </div>
                <div className="mt-1 text-xs text-zinc-500 truncate">
                접수번호 {c?.regno || "--"}  · 담당자 {c?.boman_nm || "--"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* 하단: 상세 (FULL WIDTH) */}
    {!current ? (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
        상단에서 보험사를 추가/선택하세요.
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2">
            <FormRow label="보험사명">
              <select
                className={selectCls}
                value={current?.bocomname ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "bocomname", e.target.value)}
              >
                {insuranceOptions.map((x) => (
                  <option key={x} value={x}>
                    {x || "선택"}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="담당자">
              <input
                className={inputCls}
                value={current?.boman_nm ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "boman_nm", e.target.value)}
                placeholder="담당자"
              />
            </FormRow>
          </div>

          <div className="mt-2 border-t border-zinc-200" />

          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
            <FormRow label="접수번호">
              <input
                className={inputCls}
                value={current?.regno ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "regno", e.target.value)}
                placeholder="접수번호"
              />
            </FormRow>

            {/* <FormRow label="과실율">
              <select
                className={selectCls}
                value={String(current?.misrate ?? "")}
                onChange={(e) => setClaim(safeSelectedIdx, "misrate", e.target.value)}
              >
                {misrateOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </FormRow> */}

            <FormRow label="과실율">
              <ComboInput
                value={String(current?.misrate ?? "")}
                onChange={(v) => {
                  let n = Number(String(v ?? "").replace(/[^\d]/g, ""));
                  if (!Number.isFinite(n)) n = 0;
                  if (n > 100) n = 100;
                  setClaim(safeSelectedIdx, "misrate", String(n));
                }}
                options={misrateOptions}      
                placeholder="0~100"
                inputClassName={inputCls}     
                maxHeightClassName="max-h-64"
                showAllWhenNoMatch
              />
            </FormRow>
            
            <FormRow label="담보">
              <select
                className={selectCls}
                value={current?.dambo ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "dambo", e.target.value)}
              >
                <option value="">선택</option>
                <option value="자차">자차</option>
                <option value="대물">대물</option>
              </select>
            </FormRow>


            <FormRow label="사고일자">
              <input
                className={inputCls}
                type="date"
                value={current?.accday ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "accday", e.target.value)}
              />
            </FormRow>

            <FormRow label="운전자">
              <input
                className={inputCls}
                value={current?.driver_nm ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "driver_nm", e.target.value)}
                placeholder="운전자"
              />
            </FormRow>

            <FormRow label="면책금">
              <MoneyInput
                value={current?.insura_exemp ?? ""}
                onChange={(v) => setClaim(safeSelectedIdx, "insura_exemp", v)}
              />
            </FormRow>

            <FormRow label="피보험자">
              <input
                className={inputCls}
                value={current?.insura_person ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "insura_person", e.target.value)}
                placeholder="피보험자"
              />
            </FormRow>

            <FormRow label="피보험차">
              <input
                className={inputCls}
                value={current?.insura_carno ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "insura_carno", e.target.value)}
                placeholder="피보험차"
              />
            </FormRow>

            <FormRow label="차량가액">
              <MoneyInput
                value={current?.carsale_amt ?? ""}
                onChange={(v) => setClaim(safeSelectedIdx, "carsale_amt", v)}
              />
            </FormRow>
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2">
            <FormRow label="탈착M/H">
              <div className="w-full min-w-0">
                <MoneyInput
                  value={current?.xpay ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "xpay", v)}
                />
              </div>
            </FormRow>

            <FormRow label="판금M/H">
              <div className="w-full min-w-0">
                <MoneyInput
                  value={current?.bpay ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "bpay", v)}
                />
              </div>
            </FormRow>

            {/* <FormRow label=""/> */}

            <FormRow label="도장M/H">
              <div className="w-full min-w-0">
                <MoneyInput
                  value={current?.ppay ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "ppay", v)}
                />
              </div>
            </FormRow>
          </div>
        </div>
      </div>
    )}
  </div>
);


}
