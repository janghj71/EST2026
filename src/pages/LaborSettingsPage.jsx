import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import IconBtn from "../components/IconBtn";
import MoneyInput from "../components/MoneyInput";
import { moveFocusOnEnter } from "../utils/focusUtils";
import CheckBox from "../components/CheckBox"; 
import { useAlert } from "../alerts";
import { useLaborSettings } from "../hooks/useLaborSettings";
import { useTbCode } from "../hooks/useTbCode";

function PercentInput({ value, onChange }) {
  return (
    <div className="relative">
      <input
        className={inputBase + " pr-8 text-right"}
        value={value}
        onChange={onChange}
        onKeyDown={moveFocusOnEnter}
        inputMode="numeric"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
        %
      </span>
    </div>
  );
}
  
export default function LaborSettingsPage() {
  const { confirm, success, info } = useAlert();
  const { form, setForm, loading, saving, error, refetch, save } = useLaborSettings();
  const { codes: paykindList } = useTbCode("PYK01");
  const { codes: pntkindList } = useTbCode("PNK01");

  const set = (k) => (v) => {
    // MoneyInput은 raw string을 넘기고,
    // select/input 같은 기본 컨트롤은 이벤트를 넘길 수 있으니 둘 다 처리
    const value = v && v.target ? v.target.value : v;
    setForm((p) => ({ ...p, [k]: value }));
  };
  
  const setCheck = (k) => (checked) => setForm((p) => ({ ...p, [k]: checked }));
  const onSave = async () => {
    try {
      await save(form);
      await info("저장 완료");
    } catch (err) {
      await info(err.message || "저장 실패");
    }
  };
  
  return (
    <div 
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === "Enter") moveFocusOnEnter(e);
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">일반공임 및 옵션</div>
        </div>

        <div className="ml-auto flex gap-2">
          <IconBtn
            icon={Save}
            label="저장"
            variant="primary"
            className="h-10 w-28 justify-center whitespace-nowrap"
            onClick={onSave}
            disabled={saving}
          />
        </div>
      </div>

      {/* 상단 2열 카드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 기본 설정 */}
        <section className="rounded-md border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">기본 설정</div>

          <div className="mt-4 space-y-3">
            <Field label="기본 탈부착작업">
              <select 
                className="w-full select-base" 
                value={form.paykind} 
                onChange={set("paykind")}
              >
              {/* {OPT_WORK_BASE.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
              ))} */}
                {paykindList.filter((o) => o.state === "1").map((o) => (
                  <option key={o.value} value={o.value}>{o.value} {o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="기본 도장작업">
              <select 
                className="w-full select-base" 
                value={form.pntkind} 
                onChange={set("pntkind")}
              >
                {/* {OPT_WORK_BASE.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))} */}
                {pntkindList.filter((o) => o.state === "1").map((o) => (
                  <option key={o.value} value={o.value}>{o.value} {o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="2005 도장재료비 인상율">
              <PercentInput
                value={form.pntrate_m05}
                onChange={set("pntrate_m05")}
              />
            </Field>

            <Field label="2018 도장재료비 인상율">
              <PercentInput
                value={form.pntrate_m18}
                onChange={set("pntrate_m18")}
              />
            </Field>

            <Field label="부분판금율">
              <PercentInput
                value={form.pntrate_sec}
                onChange={set("pntrate_sec")}
              />
            </Field>

            <Field label="가열건조비">
              <MoneyInput value={form.pnt_drypay} onChange={set("pnt_drypay")} />
            </Field>
          </div>
        </section>

        {/* 공임 */}
        <section className="rounded-md border border-gray-200 bg-white p-5">
          <div className="flex items-center">
            <div className="text-base font-semibold text-gray-900">공임</div>
            <div className="ml-auto text-xs text-gray-500">단위: 원</div>
          </div>

          <div className="mt-4 space-y-4">
            <RateGroup title="[ 국산차공임 ]">
              <RateRow labelLeft="탈착 M/H" value={form.xpay} onChange={set("xpay")} />
              <RateRow labelLeft="판금 M/H" value={form.bpay} onChange={set("bpay")} />
              <RateRow labelLeft="도장 M/H" value={form.ppay} onChange={set("ppay")} />
            </RateGroup>

            <RateGroup title="[ 외제차 공임 ]">
              <RateRow labelLeft="탈착 M/H" value={form.expay} onChange={set("expay")} />
              <RateRow labelLeft="판금 M/H" value={form.ebpay} onChange={set("ebpay")} />
              <RateRow labelLeft="도장 M/H" value={form.eppay} onChange={set("eppay")} />
            </RateGroup>
          </div>
        </section>
      </div>

      {/* 구분선 */}
      <div className="border-t border-blue-500/80" />

      {/* 하단 2열 카드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-md border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">기타 정보</div>
          <div className="mt-4 space-y-3">
            <Field label="작성자">
              <input 
                className={inputBase} 
                value={form.w_manname}  
                onChange={set("w_manname")} 
                onKeyDown={moveFocusOnEnter}
              />
            </Field>

            <Field label="조색기기 모델">
              <input 
                className={inputBase} 
                value={form.pntmix_model} 
                onChange={set("pntmix_model")} 
                onKeyDown={moveFocusOnEnter}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">옵션</div>
          {/* <div className="mt-4 space-y-2"> */}
          <div className="mt-4 flex flex-col gap-2">
            <CheckBox
              label="도장재료대 공임액에 합산하기"
              checked={form.pnt_material}
              onChange={setCheck("pnt_material")}
              labelClassName="text-gray-800 font-medium"
            />

            <CheckBox
              label="aos 국토부 정비이력전송을 기본으로 설정"
              checked={form.est_aosonly}
              onChange={setCheck("est_aosonly")}
              labelClassName="text-gray-800 font-medium"
            />

          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- UI ---------- */

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center">
      <div className="col-span-4 text-sm text-gray-600 whitespace-nowrap">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}

function RateGroup({ title, children }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="text-sm font-semibold text-gray-900 mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RateRow({ labelLeft, value, onChange }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2">
      <div className="col-span-4 text-sm text-gray-700 whitespace-nowrap">{labelLeft}</div>
      <div className="col-span-6">
        <MoneyInput value={value} onChange={onChange} />
      </div>
      
    </div>
  );
}

const inputBase =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

