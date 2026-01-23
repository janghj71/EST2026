import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import IconBtn from "../components/IconBtn";
import MoneyInput from "../components/MoneyInput";
import { moveFocusOnEnter } from "../utils/focusUtils";
import CheckBox from "../components/CheckBox"; 
import { useAlert } from "../alerts";

const OPT_WORK_BASE = [
    { value: "1", label: "1 건교부" },
    { value: "2", label: "2 연합회" },
  ];


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
  const [form, setForm] = useState({
    // 상단
    기본탈부착작업: "1건공부",
    기본도장작업: "1건공부",
    "2005도장재료비인상율": "0",
    "2018도장재료비인상율": "0",
    부분판금율: "80",
    "가열건조비": "15869",

    // [국산차공임]
    공임_탈착_MH: "36650",
    공임_판금_MH: "36650",
    공임_도장_MH: "36650",

    // [외제차 공임]
    외제_탈착_MH: "50000",
    외제_판금_MH: "50000",
    외제_도장_MH: "50000",

    // 하단
    작성자: "이명기",
    조색기기모델: "안녕",

    // 체크옵션
    도장재료대공임액에합산하기: false,
    aos국토부정비이력전송기본설정: true,
  });

  // const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const set = (k) => (v) => {
    // MoneyInput은 raw string을 넘기고,
    // select/input 같은 기본 컨트롤은 이벤트를 넘길 수 있으니 둘 다 처리
    const value = v && v.target ? v.target.value : v;
    setForm((p) => ({ ...p, [k]: value }));
  };
  
  // const setCheck = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.checked }));
  const setCheck = (k) => (checked) => setForm((p) => ({ ...p, [k]: checked }));
  const onSave = () => console.log("저장(더미)", form);
  
  return (
    <div 
      className="space-y-4"
      onKeyDown={(e) => {
        // if (e.target.tagName === "TEXTAREA") return;
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
                value={form.기본탈부착작업} 
                onChange={set("기본탈부착작업")}
              >
              {OPT_WORK_BASE.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
                ))}
              </select>
            </Field>

            <Field label="기본 도장작업">
              <select 
                className="w-full select-base" 
                value={form.기본도장작업} 
                onChange={set("기본도장작업")}
              >
                {OPT_WORK_BASE.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="2005 도장재료비 인상율">
              <PercentInput
                value={form["2005도장재료비인상율"]}
                onChange={set("2005도장재료비인상율")}
              />
            </Field>

            <Field label="2018 도장재료비 인상율">
              <PercentInput
                value={form["2018도장재료비인상율"]}
                onChange={set("2018도장재료비인상율")}
              />
            </Field>

            <Field label="부분판금율">
              <PercentInput
                value={form.부분판금율}
                onChange={set("부분판금율")}
              />
            </Field>

            <Field label="가열건조비">
              <MoneyInput value={form["가열건조비"]} onChange={set("가열건조비")} />
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
              <RateRow labelLeft="탈착 M/H" value={form.공임_탈착_MH} onChange={set("공임_탈착_MH")} />
              <RateRow labelLeft="판금 M/H" value={form.공임_판금_MH} onChange={set("공임_판금_MH")} />
              <RateRow labelLeft="도장 M/H" value={form.공임_도장_MH} onChange={set("공임_도장_MH")} />
            </RateGroup>

            <RateGroup title="[ 외제차 공임 ]">
              <RateRow labelLeft="탈착 M/H" value={form.외제_탈착_MH} onChange={set("외제_탈착_MH")} />
              <RateRow labelLeft="판금 M/H" value={form.외제_판금_MH} onChange={set("외제_판금_MH")} />
              <RateRow labelLeft="도장 M/H" value={form.외제_도장_MH} onChange={set("외제_도장_MH")} />
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
                value={form.작성자} 
                onChange={set("작성자")} 
                onKeyDown={moveFocusOnEnter}
              />
            </Field>

            <Field label="조색기기 모델">
              <input 
                className={inputBase} 
                value={form.조색기기모델} 
                onChange={set("조색기기모델")} 
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
              checked={form.도장재료대공임액에합산하기}
              onChange={setCheck("도장재료대공임액에합산하기")}
              labelClassName="text-gray-800 font-medium"
            />

            <CheckBox
              label="aos 국토부 정비이력전송을 기본으로 설정"
              checked={form.aos국토부정비이력전송기본설정}
              onChange={setCheck("aos국토부정비이력전송기본설정")}
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
      {/* ✅ 요청: 한 줄씩 배치 → space-y */}
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

