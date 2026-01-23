// EST2026/src/pages/estimate/EstimateReception.jsx
import React from "react";
import Field from "../../components/Field";
import { Info } from "lucide-react";
import IconBtn from "../../components/IconBtn"; 
import { moveFocusOnEnter } from "../../utils/focusUtils";

/**
 * 접수 요약 (첨부2/3 입력 순서 기준)
 * - Field는 "라벨 + children" 레이아웃 컴포넌트라서
 *   실제 input/select는 children으로 넣어야 함.
 */
export default function EstimateReception({ master, setMaster }) {
  const set = (k) => (v) => setMaster((m) => ({ ...m, [k]: v }));

  // 공통 인풋/셀렉트 스타일 (프로젝트 톤에 맞춘 기본값)
  const inputCls =
    "w-full h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";
  const selectCls =
    "w-full h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "focus:outline-none focus:ring-2 focus:ring-zinc-200";
  const codeInputCls  =
    "h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";

  return (
    <div 
      className="rounded-md border border-zinc-200 bg-white shadow-xs"
      onKeyDown={(e) => {
        if (e.key === "Enter") moveFocusOnEnter(e);
      }}
    >
      <div className="p-3">
        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          {/* ===================== 좌: 차량 ===================== */}
          <div className="flex flex-col gap-2">
            <Field label="차량번호">
              <input
                className={inputCls}
                value={master?.carNo ?? ""}
                onChange={(e) => set("carNo")(e.target.value)}
              />
            </Field>

            <Field label="차량명">
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex items-center">
                  <input
                    className={`${codeInputCls} w-[10ch] `}
                    value={master?.carCode ?? ""}
                    onChange={(e) => set("carCode")(e.target.value)}
                    placeholder="코드"
                    // inputMode="numeric"
                  />
                  
                  <IconBtn
                    icon={Info}
                    title="차량코드 선택"
                    size="sm"          
                    // variant="ghost"    
                    className="h-9 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 ms-2"
                    onClick={() => alert("차량코드 선택(TODO)")}
                  />
                </div>

                <input
                  className={inputCls}
                  value={master?.carName ?? ""}
                  onChange={(e) => set("carName")(e.target.value)}
                  placeholder="차량명"
                />
              </div>
            </Field>

            <Field label="모델명">
              <input
                className={inputCls}
                value={master?.modelName ?? ""}
                onChange={(e) => set("modelName")(e.target.value)}
              />
            </Field>

            <Field label="주행거리">
              <input
                className={inputCls}
                value={master?.mileage ?? ""}
                onChange={(e) => set("mileage")(e.target.value)}
                inputMode="numeric"
              />
            </Field>

            <Field label="차대번호">
              <input
                className={inputCls}
                value={master?.vin ?? ""}
                onChange={(e) => set("vin")(e.target.value)}
              />
            </Field>
          </div>

          {/* ===================== 중: 고객 ===================== */}
          <div className="flex flex-col gap-2">
            <Field label="고객명">
              <input
                className={inputCls}
                value={master?.customerName ?? ""}
                onChange={(e) => set("customerName")(e.target.value)}
              />
            </Field>

            <Field label="연락처">
              <div className="grid grid-cols-[72px_1fr_1fr] gap-2">
                <input
                  className={inputCls}
                  value={master?.hp0 ?? ""}
                  onChange={(e) => set("hp0")(e.target.value)}
                  inputMode="numeric"
                />
                <input
                  className={inputCls}
                  value={master?.hp1 ?? ""}
                  onChange={(e) => set("hp1")(e.target.value)}
                  inputMode="numeric"
                />
                <input
                  className={inputCls}
                  value={master?.hp2 ?? ""}
                  onChange={(e) => set("hp2")(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </Field>

            <Field label="이메일">
              <input
                className={inputCls}
                value={master?.email ?? ""}
                onChange={(e) => set("email")(e.target.value)}
              />
            </Field>

            <Field label="상태">
              <select
                className={'select-base w-full h-9 focus:ring-2 focus:ring-zinc-200'}
                // className={selectCls}
                value={master?.status ?? ""}
                onChange={(e) => set("status")(e.target.value)}
              >
                <option value="">상태 선택</option>
                <option value="01 작업준비중">01 작업준비중</option>
                <option value="02 작업중">02 작업중</option>
                <option value="03 완료">03 완료</option>
              </select>
            </Field>
          </div>

          {/* ===================== 우: 일자 ===================== */}
          <div className="flex flex-col gap-2">
            <Field label="입고일자">
              <input
                className={inputCls}
                type="date"
                value={master?.inDate ?? ""}
                onChange={(e) => set("inDate")(e.target.value)}
              />
            </Field>

            <Field label="출고예정">
              {/* <div className="grid grid-cols-[1fr_84px] gap-2"> */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(64px,84px)] gap-2">
                <input
                  className={inputCls}
                  type="date"
                  value={master?.outPlanDate ?? ""}
                  onChange={(e) => set("outPlanDate")(e.target.value)}
                />
                <select
                  className={'select-base w-full h-9 focus:ring-2 focus:ring-zinc-200 min-w-0'}
                  value={master?.outPlanHour ?? "10"}
                  onChange={(e) => set("outPlanHour")(e.target.value)}
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const v = String(i).padStart(2, "0");
                    return (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    );
                  })}
                </select>
              </div>
            </Field>

            <Field label="출고일자">
              <input
                className={inputCls}
                type="date"
                value={master?.outDate ?? ""}
                onChange={(e) => set("outDate")(e.target.value)}
              />
            </Field>

            <Field label="청구일자">
              <input
                className={inputCls}
                type="date"
                value={master?.billDate ?? ""}
                onChange={(e) => set("billDate")(e.target.value)}
              />
            </Field>

            <Field label="차량등록일">
              <input
                className={inputCls}
                type="date"
                value={master?.regDate ?? ""}
                onChange={(e) => set("regDate")(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
