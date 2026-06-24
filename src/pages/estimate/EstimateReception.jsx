// EST2026/src/pages/estimate/EstimateReception.jsx
import React, { useState, useEffect, useRef } from "react";
import Field from "../../components/Field";
import { Info } from "lucide-react";
import IconBtn from "../../components/IconBtn";
import { moveFocusOnEnter } from "../../utils/focusUtils";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import CarNameHelpModal from "./CarNameHelpModal";
import CarnoSearchModal from "./CarnoSearchModal";
import { useTbCode } from "../../hooks/useTbCode";
import { useLaborSettings } from "../../hooks/useLaborSettings";
import { useCarnoSearch } from "../../hooks/useCarnoSearch";

/**
 * 접수 요약 (첨부2/3 입력 순서 기준)
 * - Field는 "라벨 + children" 레이아웃 컴포넌트라서
 *   실제 input/select는 children으로 넣어야 함.
 */
export default function EstimateReception({ master, setMaster, laborWinOpen = false, readOnly = false, itemCount = 0 }) {
  const [carHelpOpen, setCarHelpOpen] = useState(false);
  const { form: laborForm } = useLaborSettings();

  // 차량번호 검색 모달
  const { loading: carnoLoading, searchByCarno } = useCarnoSearch();
  const [carnoModalOpen,  setCarnoModalOpen]  = useState(false);
  const [carnoSearchRows, setCarnoSearchRows] = useState([]);

  // 사용자가 직접 입력을 변경했는지 추적 (외부에서 master.carno가 바뀌면 dirty 해제)
  const carnoDirtyRef = useRef(false);
  const carnoBaseRef  = useRef(master?.carno ?? "");
  useEffect(() => {
    // master가 외부에서 바뀌면 (견적 불러오기 등) dirty 초기화
    carnoBaseRef.current  = master?.carno ?? "";
    carnoDirtyRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master?.est_serial]); // est_serial 변경 = 새 견적 로드

  const openCarnoSearch = async (e) => {
    const carno = master?.carno?.trim();
    if (!carno || readOnly) return;
    if (itemCount > 0) { moveFocusOnEnter(e); return; } // 견적 명세 Row 존재 시 다음 인풋으로 이동
    const rows = await searchByCarno(carno);
    if (rows.length === 0) {
      moveFocusOnEnter(e);                    // 0건 — 다음 인풋으로 포커스 이동
      return;
    }
    if (rows.length === 1) {
      applyCarnoRow(rows[0]);                 // 1건 — 팝업 없이 바로 적용
      return;
    }
    setCarnoSearchRows(rows);                 // 2건 이상 — 모달 표시
    setCarnoModalOpen(true);
  };

  const applyCarnoRow = (row) => {
    setCarnoModalOpen(false);
    setMaster((m) => ({
      ...m,
      carno:         row.carno         ?? m.carno,
      codecar:       row.codecar        ?? "",
      carname:       row.carname        ?? "",
      makercode:     row.makercode      ?? "",
      carkind:       row.carkind        ?? "",
      cargrade:      row.cargrade       ?? "",
      carcode:       row.carcode        ?? "",
      modelcode:     row.modelcode      ?? "",
      modelname:     row.modelname      ?? "",
      vinno:         row.vinno          ?? "",
      car_registday: row.car_registday  ?? "",
      custom_name:   row.custom_name    ?? "",
      hp0:           row.hp0            ?? "",
      hp1:           row.hp1            ?? "",
      hp2:           row.hp2            ?? "",
      email_acc:     row.email_acc      ?? "",
      email_smtp:    row.email_smtp     ?? "",
      paint:         row.paint          ?? "",
      pntcolor_code: row.pntcolor_code  ?? "",
      pntcot_code:   row.pntcot_code    ?? "",
      est_codecar:   row.est_codecar    ?? "",
      est_carname:   row.est_carname    ?? "",
      caryear:       row.caryear        ?? "",
    }));
  };

  // 이메일 로컬 raw 상태 — 타이핑 중 '@' 가 사라지는 문제 방지
  const [emailInput, setEmailInput] = useState("");
  useEffect(() => {
    const acc  = master?.email_acc  ?? "";
    const smtp = master?.email_smtp ?? "";
    const reconstructed = acc && smtp ? `${acc}@${smtp}` : acc;
    // 현재 입력값에서 역산한 acc/smtp 와 master 값이 다를 때만 업데이트 (외부 변경 시만)
    const atIdx  = emailInput.indexOf("@");
    const curAcc  = atIdx >= 0 ? emailInput.slice(0, atIdx) : emailInput;
    const curSmtp = atIdx >= 0 ? emailInput.slice(atIdx + 1) : "";
    if (curAcc !== acc || curSmtp !== smtp) setEmailInput(reconstructed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master?.email_acc, master?.email_smtp]);
  const { codes: statusCodes } = useTbCode('UKND02');

  const applyCarHelpSelection = (sel) => {
    // sel: { maker, car, model, carkind, cargrades }
    const car   = sel?.car   ?? {};
    const model = sel?.model ?? {};

    // 메이커코드 변경에 따른 공임 자동 변경 (국산↔외제 전환 감지, '05' 기준)
    const prevMaker = master?.makercode ?? "";
    const newMaker  = car.makercode ?? "";

    let payUpdates = {};
    if (prevMaker <= "05" && newMaker > "05") {
      // 국산 → 외제
      payUpdates = { xpay: laborForm.expay, bpay: laborForm.ebpay, ppay: laborForm.eppay };
    } else if (prevMaker > "05" && newMaker <= "05") {
      // 외제 → 국산
      payUpdates = { xpay: laborForm.xpay, bpay: laborForm.bpay, ppay: laborForm.ppay };
    }

    setMaster((m) => ({
      ...m,
      codecar:     car.codecar    ?? "",
      carname:     car.carname    ?? "",
      makercode:   car.makercode  ?? "",
      carkind:     car.carkind    ?? "",
      cargrade:    car.cargrade   ?? "",
      carcode:     car.carcode    ?? "",
      modelcode:   model.modelcode ?? "",
      modelname:   model.modelname ?? "",
      // pntkind='3'이면 paint3, 아니면 paint
      paint:       m.pntkind === "3" ? (car.paint3 ?? "") : (car.paint ?? ""),
      est_codecar: car.est_codecar ?? "",
      est_carname: car.est_carname ?? "",
      ...payUpdates,               // 국산↔외제 전환 시에만 공임 덮어쓰기
    }));
  };

  const set = (k) => (v) => setMaster((m) => ({ ...m, [k]: v }));

  // 공통 인풋/셀렉트 스타일 (프로젝트 톤에 맞춘 기본값)
  const inputCls =
    "w-full h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";
  const codeInputCls  =
    "h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 " +
    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";
  // 빈 날짜 인풋은 브라우저 포맷 힌트(연도-월-일)를 숨김
  // text-transparent는 Chrome의 ::-webkit-datetime-edit 내부 요소에 상속 안 됨
  // → pseudo-element를 직접 opacity-0으로 처리
  const dateCls = (val) => `${inputCls}${!val ? " [&::-webkit-datetime-edit]:opacity-0" : ""}`;

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
            <Field label="차량번호" required>
              <input
                className={inputCls}
                value={master?.carno ?? ""}
                onChange={(e) => {
                  set("carno")(e.target.value);
                  carnoDirtyRef.current = true; // 사용자가 직접 변경
                }}
                disabled={readOnly}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation(); // moveFocusOnEnter 방지
                    if (carnoDirtyRef.current) {   // 변동 있을 때만 검색
                      carnoDirtyRef.current = false;
                      openCarnoSearch(e);
                    }
                  }
                }}
              />
            </Field>

            <Field label="차량명" required>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex items-center">
                  <input
                    className={`${codeInputCls} w-[10ch] `}
                    value={master?.codecar ?? ""}
                    onChange={(e) => set("codecar")(e.target.value)}
                    placeholder="코드"
                    disabled={readOnly}
                  />

                  <IconBtn
                    icon={Info}
                    title={laborWinOpen ? "공임항목 팝업 열려 있음" : "차량코드 선택"}
                    size="sm"
                    disabled={readOnly || laborWinOpen}
                    className="h-9 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 ms-2"
                    onClick={() => !readOnly && !laborWinOpen && setCarHelpOpen(true)}
                  />
                </div>

                <input
                  className={inputCls}
                  value={master?.carname ?? ""}
                  onChange={(e) => set("carname")(e.target.value)}
                  placeholder="차량명"
                  disabled={readOnly}
                />
              </div>
            </Field>

            <Field label="모델명">
              <input
                className={inputCls}
                value={master?.modelname ?? ""}
                onChange={(e) => set("modelname")(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="주행거리" required>
              <input
                className={inputCls}
                value={formatNumber(master?.lastkm)}
                onChange={(e) => set("lastkm")(unformatNumber(e.target.value))}
                inputMode="numeric"
                disabled={readOnly}
              />
            </Field>

            <Field label="차대번호">
              <input
                className={inputCls}
                value={master?.vinno ?? ""}
                onChange={(e) => set("vinno")(e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>

          {/* ===================== 중: 고객 ===================== */}
          <div className="flex flex-col gap-2">
            <Field label="고객명">
              <input
                className={inputCls}
                value={master?.custom_name ?? ""}
                onChange={(e) => set("custom_name")(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="연락처">
              <div className="grid grid-cols-[72px_1fr_1fr] gap-2">
                <input
                  className={inputCls}
                  value={master?.hp0 ?? ""}
                  onChange={(e) => set("hp0")(e.target.value)}
                  inputMode="numeric"
                  disabled={readOnly}
                />
                <input
                  className={inputCls}
                  value={master?.hp1 ?? ""}
                  onChange={(e) => set("hp1")(e.target.value)}
                  inputMode="numeric"
                  disabled={readOnly}
                />
                <input
                  className={inputCls}
                  value={master?.hp2 ?? ""}
                  onChange={(e) => set("hp2")(e.target.value)}
                  inputMode="numeric"
                  disabled={readOnly}
                />
              </div>
            </Field>

            <Field label="이메일">
              <input
                className={inputCls}
                value={emailInput}
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmailInput(v);
                  const atIdx = v.indexOf("@");
                  const acc  = atIdx >= 0 ? v.slice(0, atIdx) : v;
                  const smtp = atIdx >= 0 ? v.slice(atIdx + 1) : "";
                  setMaster((m) => ({ ...m, email_acc: acc, email_smtp: smtp }));
                }}
              />
            </Field>

            <Field label="상태">
              <select
                className={'select-base w-full h-9 focus:ring-2 focus:ring-zinc-200'}
                value={master?.state ?? ""}
                onChange={(e) => set("state")(e.target.value)}
                disabled={readOnly}
              >
                <option value="">상태 선택</option>
                {statusCodes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ===================== 우: 일자 ===================== */}
          <div className="flex flex-col gap-2">
            <Field label="입고일자">
              <input
                className={dateCls(master?.inday)}
                type="date"
                value={master?.inday ?? ""}
                onChange={(e) => set("inday")(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="출고예정">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(64px,84px)] gap-2">
                <div className="relative flex items-center min-w-0">
                  <input
                    className={dateCls(master?.preoutday)}
                    type="date"
                    value={master?.preoutday ?? ""}
                    onChange={(e) => set("preoutday")(e.target.value)}
                    disabled={readOnly}
                  />
                  {!readOnly && master?.preoutday && (
                    <button
                      type="button"
                      onClick={() => set("preoutday")("")}
                      className="absolute left-24 text-zinc-400 hover:text-zinc-600 text-base leading-none"
                      tabIndex={-1}
                    >×</button>
                  )}
                </div>
                <select
                  className={'select-base w-full h-9 focus:ring-2 focus:ring-zinc-200 min-w-0'}
                  value={master?.preouttime ?? "10"}
                  onChange={(e) => set("preouttime")(e.target.value)}
                  disabled={readOnly}
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
              <div className="relative flex items-center">
                <input
                  className={dateCls(master?.outday)}
                  type="date"
                  value={master?.outday ?? ""}
                  onChange={(e) => set("outday")(e.target.value)}
                  disabled={readOnly}
                />
                {!readOnly && master?.outday && (
                  <button
                    type="button"
                    onClick={() => set("outday")("")}
                    className="absolute left-24 text-zinc-400 hover:text-zinc-600 text-base leading-none"
                    tabIndex={-1}
                  >×</button>
                )}
              </div>
            </Field>

            <Field label="청구일자">
              <input
                className={dateCls(master?.reqday)}
                type="date"
                value={master?.reqday ?? ""}
                onChange={(e) => set("reqday")(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="차량등록일">
              <input
                className={dateCls(master?.car_registday)}
                type="date"
                value={master?.car_registday ?? ""}
                onChange={(e) => set("car_registday")(e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>
        </div>
      </div>

      <CarNameHelpModal
        open={carHelpOpen}
        onClose={() => setCarHelpOpen(false)}
        onSelect={applyCarHelpSelection}
        initial={{
          makercode: master?.makercode ?? "",
          codecar:   master?.codecar   ?? "",
          modelcode: master?.modelcode ?? "",
          carkind:   master?.carkind   ?? 1,
        }}
      />

      <CarnoSearchModal
        open={carnoModalOpen}
        loading={carnoLoading}
        rows={carnoSearchRows}
        carno={master?.carno ?? ""}
        onConfirm={applyCarnoRow}
        onClose={() => setCarnoModalOpen(false)}
      />

    </div>
  );
}
