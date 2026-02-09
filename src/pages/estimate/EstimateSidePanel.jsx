// EST2026/src/pages/estimate/EstimateSidePanel.jsx
import React, { useMemo, useState } from "react";
import { Info } from "lucide-react";

import FormRow from "../../components/FormRow";
import CheckBox from "../../components/CheckBox";
import MoneyInput from "../../components/MoneyInput";
import IconBtn from "../../components/IconBtn";
import { moveFocusOnEnter } from "../../utils/focusUtils";
import ComboInput from "../../components/ComboInput";
import EstimateClaimPanel from "./EstimateClaimPanel";
import EstimateSettlePanel from "./EstimateSettlePanel";


export default function EstimateSidePanel({ master, setMaster }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("labor");  // labor | claim | settle
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

  const colorOptions = useMemo(
    () => ["1W", "AH3", "AJ", "AJT", "AK", "ALM", "ANB", "ARG", "ASY"],
    []
  );

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
          onClick={() => setOpen((v) => !v)}
          title="열기/닫기"
        >
          {open ? "«" : "»"}
        </button>
        
        <button
          type="button"
          className={`rounded-md px-2 py-3 text-sm text-white ${
            active === "labor" ? "bg-zinc-900" : "bg-zinc-700 hover:bg-zinc-800"
          }`}
          onClick={() => {
            setActive("labor");
            setOpen(true);
          }}
          style={{ writingMode: "vertical-rl" }}
        >
          공임설정
        </button>

        <button
          type="button"
          className={`rounded-md px-2 py-3 text-sm text-white ${
            active === "claim" ? "bg-zinc-900" : "bg-zinc-700 hover:bg-zinc-800"
          }`}
          onClick={() => {
            setActive("claim");
            setOpen(true);
          }}
          style={{ writingMode: "vertical-rl" }}
        >
          청구처
        </button>

        <button
          type="button"
          className={`rounded-md px-2 py-3 text-sm text-white ${
            active === "settle" ? "bg-zinc-900" : "bg-zinc-700 hover:bg-zinc-800"
          }`}
          onClick={() => {
            setActive("settle");
            setOpen(true);
          }}
          style={{ writingMode: "vertical-rl" }}
        >
          견적정산
        </button>
      </div>

      {open && (
        <div className="ml-2 w-[520px] rounded-md border border-zinc-200 bg-white p-3 shadow-xs overflow-auto">
          {active === "labor" && (
            <LaborPanel
              master={master}
              set={set}
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
            />
          )}
          {active === "settle" && (
            <EstimateSettlePanel
              master={master}
              setMaster={setMaster}
              inputCls={inputCls}
              selectCls={selectCls}
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
  inputCls,
  selectCls,
  estKindSelectCls,
  codeInputCls,
  colorOptions,
  ReadonlyBox,
}) {

  const normalizePaintColor = (v) =>
    (v ?? "")
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ""); // ★ 대문자 영숫자만 허용

  return (
    <div className="flex flex-col gap-2 p-1 ms-2 me-2">
      <FormRow label="대체차종">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="flex items-center">
            <input
              className={`${codeInputCls} w-[10ch]`}
              value={master?.altCarCode ?? ""}
              onChange={(e) => set("altCarCode")(e.target.value)}
              placeholder="0315014"
            />
            <IconBtn
              icon={Info}
              title="대체차종 선택"
              onClick={() => alert("대체차종 선택(TODO)")}
              className="h-9 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 ms-2"
            />
          </div>

          <input
            className={inputCls}
            value={master?.altCarName ?? ""}
            onChange={(e) => set("altCarName")(e.target.value)}
            placeholder="제네시스 DH"
          />
        </div>
      </FormRow>

      <FormRow label="도장종류">
        <select
          className={selectCls}
          value={master?.paintType ?? ""}
          onChange={(e) => set("paintType")(e.target.value)}
        >
          <option value="">선택</option>
          <option value="0315014 승용-고급형">0315014 승용-고급형</option>
          <option value="0315014 승용-일반형">0315014 승용-일반형</option>
        </select>
      </FormRow>

      <FormRow label="견적구분">
        <div className="flex items-center gap-3">
          <select
            className={estKindSelectCls}
            value={master?.estKind ?? "12"}
            onChange={(e) => set("estKind")(e.target.value)}
          >
            <option value="11">11 일반</option>
            <option value="12">12 보험</option>
          </select>

          <div className="whitespace-nowrap mt-1">
            <CheckBox
              checked={!!master?.printEstimate}
              onChange={(v) => set("printEstimate")(v)}
              label="견적서"
            />
          </div>
        </div>
      </FormRow>

      <FormRow label="작성자">
        <input
          className={inputCls}
          value={master?.writer ?? ""}
          onChange={(e) => set("writer")(e.target.value)}
          placeholder="이명기"
        />
      </FormRow>

      <FormRow label="정비책임자">
        <input
          className={inputCls}
          value={master?.manager ?? ""}
          onChange={(e) => set("manager")(e.target.value)}
          placeholder="책임자"
        />
      </FormRow>

      <div className="grid grid-cols-[90px_1fr] items-start">
        <div />
        <div className="flex flex-col gap-2 pl-2">
          <CheckBox
            checked={!!master?.extraAgree}
            onChange={(v) => set("extraAgree")(v)}
            label="추가정비 동의함"
          />
        </div>
      </div>

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

      <FormRow label="도장칼라">
        <ComboInput
          value={master?.paintColor ?? ""}
          // onChange={set("paintColor")}
          onChange={(v) => set("paintColor")(v)} 
          normalize={normalizePaintColor}
          options={colorOptions}
          placeholder="예: 1W / AH3"
          inputClassName={inputCls}
          showAllWhenNoMatch
        />
      </FormRow>

      <FormRow label="가열건조비">
        <div className="flex items-center gap-3">
          <div className="w-[200px]">
            <MoneyInput value={master?.bakeAmt ?? 15869} onChange={set("bakeAmt")} />
          </div>
          <div className="whitespace-nowrap mt-1">
            <CheckBox
              checked={!!master?.bakeClaim}
              onChange={(v) => set("bakeClaim")(v)}
              label="가열건조비 청구함"
            />
          </div>
        </div>
      </FormRow>

      <FormRow label="탈착M/H">
        <MoneyInput value={master?.mhR ?? 40000} onChange={set("mhR")} />
      </FormRow>
      <FormRow label="판금M/H">
        <MoneyInput value={master?.mhB ?? 40000} onChange={set("mhB")} />
      </FormRow>
      <FormRow label="도장M/H">
        <MoneyInput value={master?.mhP ?? 40000} onChange={set("mhP")} />
      </FormRow>

      <FormRow label="탈부착작업">
        <ReadonlyBox value={master?.detachWork ?? ""} />
      </FormRow>
      <FormRow label="도장작업">
        <ReadonlyBox value={master?.paintWork ?? ""} />
      </FormRow>
    </div>
  );
}