// EST2026/src/pages/estimate/EstimateSidePanel.jsx
import React, { useMemo, useState, useCallback } from "react";
import { Info } from "lucide-react";

import FormRow from "../../components/FormRow";
import CheckBox from "../../components/CheckBox";
import MoneyInput from "../../components/MoneyInput";
import IconBtn from "../../components/IconBtn";
import { moveFocusOnEnter } from "../../utils/focusUtils";
import ComboInput from "../../components/ComboInput";
import EstimateClaimPanel from "./EstimateClaimPanel";
import EstimateSettlePanel from "./EstimateSettlePanel";
import CarNameHelpModal from "./CarNameHelpModal";
import { useTbCode } from "../../hooks/useTbCode";
import { usePntcot } from "../../hooks/usePntcot";


export default function EstimateSidePanel({ master, setMaster, active, onTabChange, onClaimLeave, onClaimDirty, onClaimClean, onRateChange, onOpenChange, onSettleEnter, settleRefreshKey, laborWinOpen = false }) {
  const [open, setOpen] = useState(false);
  const changeOpen = (next) => { setOpen(next); onOpenChange?.(next); };
  const set = (k) => (vOrEvent) => {
    const v =
      vOrEvent && typeof vOrEvent === "object" && "target" in vOrEvent
        ? vOrEvent.target.value
        : vOrEvent;

    setMaster((m) => ({ ...m, [k]: v }));
  };


  const inputCls =
    "w-full h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";

  const selectCls = "select-base w-full h-9 focus:ring-2 focus:ring-zinc-200";

  // - w-full 대신 고정폭(min/max)으로 잡고 shrink 방지
  const estKindSelectCls =
    "select-base h-9 focus:ring-2 focus:ring-zinc-200 w-[140px] shrink-0";

  const codeInputCls =
    "h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";

  // 도장칼라: usePntcot 훅으로 전체 조회 → makercode 필터
  const { pntcotList } = usePntcot();
  const colorOptions = useMemo(() => {
    const mk = master?.makercode ?? '';
    return pntcotList
      .filter(r => r.makercode === mk)
      .map(r => r.pntcolor_code);
  }, [pntcotList, master?.makercode]);

  const ReadonlyBox = ({ value }) => (
    <div className="h-9 flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-700">
      {value || "-"}
    </div>
  );

  return (
    <div
      className="flex items-stretch"
      onKeyDown={(e) => {
        if (e.key === "Enter") moveFocusOnEnter(e);
      }}
    >
      {/* 토글 레일: 공임설정만 */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="rounded-md bg-zinc-800 text-white px-2 py-2 text-sm"
          onClick={async () => {
            if (active === "claim" && open) await onClaimLeave?.();
            changeOpen(!open);
          }}
          title="열기/닫기"
        >
          {open ? "«" : "»"}
        </button>

        <button
          type="button"
          disabled={laborWinOpen}
          className={[
            "rounded-md px-2 py-3 text-sm text-white",
            laborWinOpen
              ? "bg-zinc-500 opacity-60 cursor-not-allowed"
              : active === "labor" ? "bg-zinc-900" : "bg-zinc-700 hover:bg-zinc-800",
          ].join(" ")}
          onClick={async () => {
            if (laborWinOpen) return;
            if (active === "claim") await onClaimLeave?.();
            onTabChange("labor");
            changeOpen(true);
          }}
          style={{ writingMode: "vertical-rl" }}
          title={laborWinOpen ? "공임항목 팝업 열려 있음" : undefined}
        >
          공임설정
        </button>

        <button
          type="button"
          disabled={laborWinOpen}
          className={[
            "rounded-md px-2 py-3 text-sm text-white",
            laborWinOpen
              ? "bg-zinc-500 opacity-60 cursor-not-allowed"
              : active === "claim" ? "bg-zinc-900" : "bg-zinc-700 hover:bg-zinc-800",
          ].join(" ")}
          onClick={() => {
            if (laborWinOpen) return;
            onTabChange("claim");
            changeOpen(true);
          }}
          style={{ writingMode: "vertical-rl" }}
          title={laborWinOpen ? "공임항목 팝업 열려 있음" : undefined}
        >
          청구처
        </button>

        <button
          type="button"
          className={`rounded-md px-2 py-3 text-sm text-white ${
            active === "settle" ? "bg-zinc-900" : "bg-zinc-700 hover:bg-zinc-800"
          }`}
          onClick={async () => {
            if (active === "claim") await onClaimLeave?.();
            await onSettleEnter?.();          // 저장 선행
            onTabChange("settle");
            changeOpen(true);
          }}
          style={{ writingMode: "vertical-rl" }}
        >
          견적정산
        </button>
      </div>

      {open && (
        <div className="ml-2 w-[520px] rounded-md border border-zinc-200 bg-white p-3 shadow-xs overflow-auto relative">
          {laborWinOpen && (active === "labor" || active === "claim") && (
            <div className="absolute inset-0 z-10 rounded-md bg-white/70 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-zinc-500 bg-white/90 px-3 py-1 rounded-md border border-zinc-200">
                공임항목 팝업 열려 있음
              </span>
            </div>
          )}
          {active === "labor" && (
            <LaborPanel
              master={master}
              set={set}
              setMaster={setMaster}
              inputCls={inputCls}
              selectCls={selectCls}
              estKindSelectCls={estKindSelectCls}
              codeInputCls={codeInputCls}
              colorOptions={colorOptions}
              ReadonlyBox={ReadonlyBox}
            />
          )}
          {active === "claim" && (
            <EstimateClaimPanel
              master={master}
              setMaster={setMaster}
              inputCls={inputCls}
              selectCls={selectCls}
              onClaimDirty={onClaimDirty}
              onClaimClean={onClaimClean}
              onRateChange={onRateChange}
            />
          )}
          {active === "settle" && (
            <EstimateSettlePanel
              master={master}
              setMaster={setMaster}
              inputCls={inputCls}
              selectCls={selectCls}
              refreshKey={settleRefreshKey}
            />
          )}
        </div>
      )}
    </div>
  );
}


function LaborPanel({
  master,
  set,
  setMaster,
  inputCls,
  selectCls,
  estKindSelectCls,
  codeInputCls,
  colorOptions,
  ReadonlyBox,
}) {
  // ── 공통코드 로딩 ──────────────────────────────────────────
  const { codes: pgr31Codes } = useTbCode('PGR31');  // 도장종류
  const { codes: _pyk01Codes } = useTbCode('PYK01');  // 탈부착작업 (disabled)
  const { codes: _pnk01Codes } = useTbCode('PNK01');  // 도장작업

  // ── 대체차종 모달 ──────────────────────────────────────────
  const [altCarHelpOpen, setAltCarHelpOpen] = useState(false);

  const applyAltCarSelection = useCallback((sel) => {
    const car = sel?.car ?? {};
    setMaster((m) => ({
      ...m,
      est_codecar: car.est_codecar ?? "",
      est_carname: car.est_carname ?? "",
      est_paint:   m.pntkind === "3" ? (car.paint3 ?? "") : (car.paint ?? ""),
    }));
  }, [setMaster]);
  // state='1' 활성 항목만 필터
  const pyk01Codes = useMemo(() => _pyk01Codes.filter(c => c.state === '1'), [_pyk01Codes]);
  const pnk01Codes = useMemo(() => _pnk01Codes.filter(c => c.state === '1'), [_pnk01Codes]);
  const estCodeCar = master?.est_codecar ?? "";
  const estCarName = master?.est_carname ?? "";

  // 도장종류 옵션: PGR31 목록 + est_codecar/est_carname 추가 항목
  const paintTypeOptions = useMemo(() => {
    const base = pgr31Codes.map(c => ({
      value: c.value,
      label: `${c.value} ${c.label}`,
    }));
    if (estCodeCar && !base.some((o) => o.value === estCodeCar)) {
      base.push({
        value: estCodeCar,
        label: estCodeCar,
      });
    }
    return base;
  }, [pgr31Codes, estCodeCar]);

  // pntkind='3'일 때만 도장종류 콤보 활성화
  const isPnt3 = master?.pntkind === '3';

  const normalizePaintColor = (v) =>
    (v ?? "")
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ""); // ★ 대문자 영숫자만 허용

  return (
    <div className="flex flex-col gap-2 p-1 ms-2 me-2">
      {/* 대체차종 */}
      <FormRow label="대체차종">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="flex items-center">
            <input
              className={`${codeInputCls} w-[10ch]`}
              value={master?.est_codecar ?? ""}
              onChange={(e) => set("est_codecar")(e.target.value)}
              // placeholder="0315014"
            />
            <IconBtn
              icon={Info}
              title="대체차종 선택"
              onClick={() => setAltCarHelpOpen(true)}
              className="h-9 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 ms-2"
            />
          </div>

          <input
            className={inputCls}
            value={master?.est_carname ?? ""}
            onChange={(e) => set("est_carname")(e.target.value)}
            // placeholder="제네시스 DH"
          />
        </div>
      </FormRow>

      {/* 도장종류: pntkind='3'일 때 활성, PGR31 + est_codecar/est_carname → paint 필드에 저장 */}
      <FormRow label="도장종류">
        <select
          className={selectCls}
          value={master?.paint ?? ""}
          onChange={(e) => set("paint")(e.target.value)}
          disabled={!isPnt3}
        >
          <option value="">선택</option>
          {paintTypeOptions.map(o => {
            const label =
              estCodeCar && o.value === estCodeCar
                ? `${estCodeCar} ${estCarName}`.trim()
                : o.label;
            return <option key={o.value} value={o.value}>{label}</option>;
          })}
        </select>
      </FormRow>

      {/* 견적구분 + 견적서(readonly) */}
      <FormRow label="견적구분">
        <div className="flex items-center gap-3">
          <select
            className={estKindSelectCls}
            value={master?.seccode ?? "12"}
            onChange={(e) => set("seccode")(e.target.value)}
          >
            <option value="11">11 일반</option>
            <option value="12">12 보험</option>
          </select>

          <div className="whitespace-nowrap mt-1">
            <CheckBox
              checked={master?.isest === '1'}
              onChange={() => {}} // readonly — no-op
              label="견적서"
            />
          </div>
        </div>
      </FormRow>

      {/* 작성자 */}
      <FormRow label="작성자">
        <input
          className={inputCls}
          value={master?.w_manname ?? ""}
          onChange={(e) => set("w_manname")(e.target.value)}
          placeholder="이명기"
        />
      </FormRow>

      {/* 정비책임자 */}
      <FormRow label="정비책임자">
        <input
          className={inputCls}
          value={master?.supman ?? ""}
          onChange={(e) => set("supman")(e.target.value)}
          placeholder="책임자"
        />
      </FormRow>

      {/* 추가정비 동의함 */}
      <div className="grid grid-cols-[90px_1fr] items-start">
        <div />
        <div className="flex flex-col gap-2 pl-2">
          <CheckBox
            checked={master?.add_repair === '1'}
            onChange={(v) => set("add_repair")(v ? '1' : '0')}
            label="추가정비 동의함"
          />
        </div>
      </div>

      {/* 도장코트 */}
      <FormRow label="도장코트">
        <select
          className={selectCls}
          value={master?.pntcot_code ?? "2"}
          onChange={(e) => set("pntcot_code")(e.target.value)}
        >
          <option value="1">1 코트</option>
          <option value="2">2 코트</option>
          <option value="3">3 코트</option>
          <option value="4">4 코트</option>
        </select>
      </FormRow>

      {/* 도장도료 */}
      <FormRow label="도장도료">
        <select
          className={selectCls}
          value={master?.pnt_m ?? "2"}
          onChange={(e) => set("pnt_m")(e.target.value)}
        >
          <option value="1">1 유용성</option>
          <option value="2">2 수용성</option>
        </select>
      </FormRow>

      {/* 도장칼라 */}
      <FormRow label="도장칼라">
        <ComboInput
          value={master?.pntcolor_code ?? ""}
          onChange={(v) => set("pntcolor_code")(v)}
          normalize={normalizePaintColor}
          options={colorOptions}
          placeholder="예: 1W / AH3"
          inputClassName={inputCls}
          showAllWhenNoMatch
        />
      </FormRow>

      {/* 가열건조비 + 청구함 */}
      <FormRow label="가열건조비">
        <div className="flex items-center gap-3">
          <div className="w-[200px]">
            <MoneyInput
              value={Number(master?.pnt_drypay ?? 15869)}
              onChange={set("pnt_drypay")}
            />
          </div>
          <div className="whitespace-nowrap mt-1">
            <CheckBox
              checked={master?.req_pnt_drypay === '1'}
              onChange={(v) => set("req_pnt_drypay")(v ? '1' : '0')}
              label="가열건조비 청구함"
            />
          </div>
        </div>
      </FormRow>

      {/* M/H 단가 — seccode='12'(보험): 청구처 첫 레코드 값 표시(수정불가) / '11'(일반): master 값 표시(수정가능) */}
      {(() => {
        const isInsurance = master?.seccode === "12";
        const claim0 = master?.claims?.[0];
        const xpay = isInsurance ? (claim0?.xpay ?? 0) : (master?.xpay ?? 0);
        const bpay = isInsurance ? (claim0?.bpay ?? 0) : (master?.bpay ?? 0);
        const ppay = isInsurance ? (claim0?.ppay ?? 0) : (master?.ppay ?? 0);
        const mhCls = isInsurance ? "bg-zinc-100" : "";
        return (
          <>
            <FormRow label="탈착M/H">
              <MoneyInput value={Number(xpay)} onChange={set("xpay")} readOnly={isInsurance} className={mhCls} />
            </FormRow>
            <FormRow label="판금M/H">
              <MoneyInput value={Number(bpay)} onChange={set("bpay")} readOnly={isInsurance} className={mhCls} />
            </FormRow>
            <FormRow label="도장M/H">
              <MoneyInput value={Number(ppay)} onChange={set("ppay")} readOnly={isInsurance} className={mhCls} />
            </FormRow>
          </>
        );
      })()}
      {master?.paykind === "1" && (() => {
        const isInsurance = master?.seccode === "12";
        const claim0 = master?.claims?.[0];
        const pntrate_sec = isInsurance
          ? (claim0?.pntrate_sec ?? "")
          : (master?.pntrate_sec ?? "");
        return (
          <FormRow label="부분판금율">
            <input
              className={inputCls + (isInsurance ? " bg-zinc-100" : "")}
              value={pntrate_sec}
              onChange={(e) => set("pntrate_sec")(e.target.value)}
              readOnly={isInsurance}
            />
          </FormRow>
        );
      })()}

      {/* 탈부착작업: paykind, PYK01, 항상 disabled */}
      <FormRow label="탈부착작업">
        <select
          className={selectCls}
          value={master?.paykind ?? ""}
          disabled
        >
          {pyk01Codes.map(c => (
            <option key={c.value} value={c.value}>{c.value} {c.label}</option>
          ))}
        </select>
      </FormRow>

      {/* 도장작업: pntkind, PNK01, 편집 가능 */}
      <FormRow label="도장작업">
        <select
          className={selectCls}
          value={master?.pntkind ?? ""}
          // onChange={(e) => set("pntkind")(e.target.value)}
          disabled
        >
          {pnk01Codes.map(c => (
            <option key={c.value} value={c.value}>{c.value} {c.label}</option>
          ))}
        </select>
      </FormRow>

      {/* 대체차종 선택 모달 */}
      <CarNameHelpModal
        open={altCarHelpOpen}
        onClose={() => setAltCarHelpOpen(false)}
        onSelect={applyAltCarSelection}
        disableNew={true}
        estCodecarOnly={true}
        initial={{
          makercode: master?.est_codecar?.slice(0, 2) ?? "",
          codecar:   master?.est_codecar ?? "",
          modelcode: "",
          carkind:   Number(master?.est_codecar?.charAt(2)) || 1,
        }}
      />
    </div>
  );
}
