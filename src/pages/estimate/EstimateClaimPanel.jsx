// src/pages/estimate/EstimateClaimPanel.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useEstimateClaims } from "../../hooks/useEstimateClaims";
import { useBocomList } from "../../hooks/useBocomList";
import { useInsurerContacts } from "../../hooks/useInsurerContacts";
import { useAlert } from "../../alerts";
import Field from "../../components/Field";
import FormRow from "../../components/FormRow";
import MoneyInput from "../../components/MoneyInput";
import IconBtn from "../../components/IconBtn";
import { Plus, X,Trash2 } from "lucide-react";
import ComboInput from "../../components/ComboInput";
import { toInt } from "../../utils/numberFormat";

/**
 * 청구처 (화면만 코딩)
 * - master.claims: 최대 2개
 * - 필드:
 *   bocomname, boman_nm, regno, misrate, dambo, accday, driver_nm,
 *   insura_exemp, insura_person, insura_carno, carsale_amt, xpay, bpay, ppay
 */
export default function EstimateClaimPanel({ master, setMaster, inputCls, selectCls, onClaimDirty, onClaimClean, onRateChange }) {
  const claims = Array.isArray(master?.claims) ? master.claims : [];

  const [selectedIdx, setSelectedIdx] = useState(() => (claims.length ? 0 : -1));

  // ── API: 청구처 목록 로드 ──────────────────────────────────────────
  const { fetchClaims, deleteClaim } = useEstimateClaims();

  useEffect(() => {
    const serial = master?.est_serial;
    if (!serial) return;
    fetchClaims(serial).then((json) => {
      const rows = json?.dataset ?? [];
      setMaster((m) => ({ ...m, claims: rows }));
      onClaimClean?.();  // 초기 로드 완료 → clean
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master?.est_serial]);

  const safeSelectedIdx = useMemo(() => {
    if (!claims.length) return -1;
    if (selectedIdx < 0) return 0;
    if (selectedIdx >= claims.length) return claims.length - 1;
    return selectedIdx;
  }, [claims.length, selectedIdx]);

  const current = safeSelectedIdx >= 0 ? claims[safeSelectedIdx] : null;

  const setClaim = useCallback(
    (idx, key, value) => {
      onClaimDirty?.();
      setMaster((m) => {
        const prev = Array.isArray(m?.claims) ? m.claims : [];
        const next = prev.map((c, i) => (i === idx ? { ...(c || {}), [key]: value } : c));
        return { ...m, claims: next };
      });
    },
    [setMaster, onClaimDirty]
  );

  const { warning } = useAlert();

  const addClaim = useCallback(() => {
    if (claims.length >= 2) return;
    onClaimDirty?.();
    const newIdx = claims.length; // 추가될 항목 인덱스
    setMaster((m) => {
      const prev = Array.isArray(m?.claims) ? m.claims : [];
      if (prev.length >= 2) return m;
      return {
        ...m,
        claims: [
          ...prev,
          {
            bocomname: "", boman_nm: "", regno: "", misrate: "",
            dambo: "", insura_exemp: "", insura_person: "",
            insura_carno: "", xpay: "", bpay: "", ppay: "",
          },
        ],
      };
    });
    setSelectedIdx(newIdx); // 신규 항목 자동 선택
  }, [setMaster, claims.length, onClaimDirty]);

  const removeClaim = useCallback(async () => {
    if (safeSelectedIdx < 0) return;
    if (claims.length <= 1) {
      warning("청구처가 1개일 때는 삭제할 수 없습니다.");
      return;
    }
    const claim = claims[safeSelectedIdx];
    if (claim?.estbo_seqno) {
      await deleteClaim(master?.est_serial ?? "", claim.estbo_seqno);
    }
    setMaster((m) => {
      const prev = Array.isArray(m?.claims) ? m.claims : [];
      return { ...m, claims: prev.filter((_, i) => i !== safeSelectedIdx) };
    });
    setSelectedIdx((v) => (v > 0 ? v - 1 : 0));
  }, [setMaster, safeSelectedIdx, claims, master?.est_serial, deleteClaim, warning]);

  // 보험사 목록 API
  const { bocomOptions, findBocom } = useBocomList();

  // 보험사 담당자 목록 (bocomcode 필터)
  const { contacts } = useInsurerContacts();
  const contactOptions = useMemo(() => {
    const bocomcode = current?.bocomcode ?? "";
    if (!bocomcode) return [];
    return contacts
      .filter((c) => c.bocomcode === bocomcode)
      .map((c) => c.boman_nm);
  }, [contacts, current?.bocomcode]);

  const misrateOptions = useMemo(
    () => Array.from({ length: 21 }).map((_, i) => String(100 - i * 5)),
    []
  );

  const dateCls = (val) =>
    `${inputCls}${!val ? " [&::-webkit-datetime-edit]:opacity-0" : ""}`;

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
                접수번호 {c?.regno || "--"} · 담보 {c?.dambo || "--"} · 담당자 {c?.boman_nm || "--"}
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
                id="claim-panel-first"
                className={selectCls}
                value={current?.bocomcode ?? ""}
                onChange={(e) => {
                  const bocom = findBocom(e.target.value);
                  if (!bocom) return;
                  const isDomestic = (master?.makercode ?? "") <= "05";
                  setMaster((m) => {
                    const prev = Array.isArray(m?.claims) ? m.claims : [];
                    const next = prev.map((c, i) =>
                      i === safeSelectedIdx
                        ? {
                            ...c,
                            bocomcode:   bocom.bocomcode   ?? "",
                            bocomname:   bocom.bocomname   ?? "",
                            boman_nm:    "",
                            xpay:        isDomestic ? (bocom.xpay  ?? "") : (bocom.expay  ?? ""),
                            bpay:        isDomestic ? (bocom.bpay  ?? "") : (bocom.ebpay  ?? ""),
                            ppay:        isDomestic ? (bocom.ppay  ?? "") : (bocom.eppay  ?? ""),
                            pntrate_sec: bocom.pntrate_sec ?? "",
                          }
                        : c
                    );
                    return { ...m, claims: next };
                  });
                }}
              >
                <option value="">선택</option>
                {bocomOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="담당자">
              <ComboInput
                value={current?.boman_nm ?? ""}
                onChange={(v) => setClaim(safeSelectedIdx, "boman_nm", v)}
                options={contactOptions}
                inputClassName={inputCls}
                showAllWhenNoMatch
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
                // placeholder="접수번호"
              />
            </FormRow>

            <FormRow label="과실율">
              <ComboInput
                value={current?.misrate != null && current?.misrate !== "" ? String(toInt(current.misrate)) : ""}
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
                className={dateCls(master?.accday)}
                type="date"
                value={master?.accday ?? ""}
                onChange={(e) => setMaster((m) => ({ ...m, accday: e.target.value }))}
              />
            </FormRow>

            <FormRow label="운전자">
              <input
                className={inputCls}
                value={master?.driver_nm ?? ""}
                onChange={(e) => setMaster((m) => ({ ...m, driver_nm: e.target.value }))}
                // placeholder="운전자"
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
                // placeholder="피보험자"
              />
            </FormRow>

            <FormRow label="피보험차">
              <input
                className={inputCls}
                value={current?.insura_carno ?? ""}
                onChange={(e) => setClaim(safeSelectedIdx, "insura_carno", e.target.value)}
                // placeholder="피보험차"
              />
            </FormRow>

            <FormRow label="차량가액">
              <MoneyInput
                value={master?.carsale_amt ?? ""}
                onChange={(v) => setMaster((m) => ({ ...m, carsale_amt: v }))}
              />
            </FormRow>

            {master?.paykind === "1" && (
              <FormRow label="부분판금율">
                <input
                  className={inputCls}
                  value={current?.pntratesec ?? ""}
                  onChange={(e) => setClaim(safeSelectedIdx, "pntratesec", e.target.value)}
                />
              </FormRow>
            )}
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2">
            <FormRow label="탈착M/H">
              <div className="w-full min-w-0">
                <MoneyInput
                  value={current?.xpay ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "xpay", v)}
                  {...(safeSelectedIdx === 0 ? { onBlur: onRateChange } : {})}
                />
              </div>
            </FormRow>

            <FormRow label="판금M/H">
              <div className="w-full min-w-0">
                <MoneyInput
                  value={current?.bpay ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "bpay", v)}
                  {...(safeSelectedIdx === 0 ? { onBlur: onRateChange } : {})}
                />
              </div>
            </FormRow>

            {/* <FormRow label=""/> */}

            <FormRow label="도장M/H">
              <div className="w-full min-w-0">
                <MoneyInput
                  value={current?.ppay ?? ""}
                  onChange={(v) => setClaim(safeSelectedIdx, "ppay", v)}
                  {...(safeSelectedIdx === 0 ? { onBlur: onRateChange } : {})}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("claim-panel-first")?.focus();
                    }
                  }}
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
