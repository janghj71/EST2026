// src/pages/RepairHistorySend.jsx
import React, {useEffect, useMemo, useRef, useState } from "react";
import FixedHeadTable from "../components/FixedHeadTable";
import { X , Save,  Pen, Tag , Wrench, RefreshCw, Send, Trash2, Search, Download, ClipboardList, Plus } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { moveFocusOnEnter } from "../utils/focusUtils";
import { pad2, ymd } from "../utils/dateUtils";


const inputCls =
  "h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none " +
  "focus:outline-none focus:ring-2 focus:ring-gray-900/10"

// ====== 국토부(ts_payno) 마스터(나중에 API로 교체) ======
const PAYNO_MASTER = [
  {
    payno: "B01",
    payno_name: "B01 : 헤드램프(전조등)(좌/우)",
    payname: "헤드램프(전조등)(좌/우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B02",
    payno_name: "B02 : 컴비네이션램프(후미등)(좌/우)",
    payname: "컴비네이션램프(후미등)(좌/우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B03",
    payno_name: "B03 : 프론트범퍼(전면범퍼)",
    payname: "프론트범퍼(전면범퍼)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B04",
    payno_name: "B04 : 리어범퍼(후면범퍼)",
    payname: "리어범퍼(후면범퍼)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B05",
    payno_name: "B05 : 후드(본넷)",
    payname: "후드(본넷)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B06",
    payno_name: "B06 : 전.후패널",
    payname: "전.후패널",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B07",
    payno_name: "B07 : 전.후펜더(좌/우)",
    payname: "전.후펜더(좌/우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B08",
    payno_name: "B08 : 프론트도어(좌/우)",
    payname: "프론트도어(좌/우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B09",
    payno_name: "B09 : 사이드미러(좌/우)",
    payname: "사이드미러(좌/우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B10",
    payno_name: "B10 : 리어도어(좌,우)",
    payname: "리어도어(좌,우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B11",
    payno_name: "B11 : 트렁크리드",
    payname: "트렁크리드",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B12",
    payno_name: "B12 : 백도어",
    payname: "백도어",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B13",
    payno_name: "B13 : 윈도우모터",
    payname: "윈도우모터",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B14",
    payno_name: "B14 : 트렁크플로워",
    payname: "트렁크플로워",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B15",
    payno_name: "B15 : 휠하우스(좌.우)",
    payname: "휠하우스(좌.우)",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B16",
    payno_name: "B16 : 필러패널",
    payname: "필러패널",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B17",
    payno_name: "B17 : 사이드패널",
    payname: "사이드패널",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B18",
    payno_name: "B18 : 대쉬패널",
    payname: "대쉬패널",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B19",
    payno_name: "B19 : 크로스멤버",
    payname: "크로스멤버",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "B20",
    payno_name: "B20 : 루프패널",
    payname: "루프패널",
    payno_kind: "B",
    payno_kind_nm: "바디"
  },
  {
    payno: "D01",
    payno_name: "D01 : 대쉬보드(크러쉬패드)",
    payname: "대쉬보드(크러쉬패드)",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D02",
    payno_name: "D02 : 계기판",
    payname: "계기판",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D03",
    payno_name: "D03 : 히터유니트",
    payname: "히터유니트",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D04",
    payno_name: "D04 : 컴비네이션스위치",
    payname: "컴비네이션스위치",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D05",
    payno_name: "D05 : ECU(컴퓨터)",
    payname: "ECU(컴퓨터)",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D06",
    payno_name: "D06 : 와이퍼모터/링케이지",
    payname: "와이퍼모터/링케이지",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D07",
    payno_name: "D07 : 에어백모듈",
    payname: "에어백모듈",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D08",
    payno_name: "D08 : 안전벨트",
    payname: "안전벨트",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "D09",
    payno_name: "D09 : 침수차량정비(엔진.전기.하체)",
    payname: "침수차량정비(엔진.전기.하체)",
    payno_kind: "D",
    payno_kind_nm: "의장"
  },
  {
    payno: "E01",
    payno_name: "E01 : 엔진",
    payname: "엔진",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E02",
    payno_name: "E02 : 엔진커버(타이밍커버)",
    payname: "엔진커버(타이밍커버)",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E03",
    payno_name: "E03 : 드로틀바디",
    payname: "드로틀바디",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E04",
    payno_name: "E04 : 인젝터",
    payname: "인젝터",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E05",
    payno_name: "E05 : 타이밍벨트",
    payname: "타이밍벨트",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E06",
    payno_name: "E06 : 에어컴프레서",
    payname: "에어컴프레서",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E07",
    payno_name: "E07 : 디스트리뷰터(배전기)",
    payname: "디스트리뷰터(배전기)",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E08",
    payno_name: "E08 : 에어컨컨덴서",
    payname: "에어컨컨덴서",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E09",
    payno_name: "E09 : 에어컨컴프레서",
    payname: "에어컨컴프레서",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E10",
    payno_name: "E10 : 라디에이터",
    payname: "라디에이터",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E11",
    payno_name: "E11 : 발전기",
    payname: "발전기",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E12",
    payno_name: "E12 : 시동전동기",
    payname: "시동전동기",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E13",
    payno_name: "E13 : 헤드가스켓",
    payname: "헤드가스켓",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "E14",
    payno_name: "E14 : 연료분사펌프",
    payname: "연료분사펌프",
    payno_kind: "E",
    payno_kind_nm: "엔진"
  },
  {
    payno: "H01",
    payno_name: "H01 : 구동축전지",
    payname: "구동축전지",
    payno_kind: "H",
    payno_kind_nm: "고전원전기장치"
  },
  {
    payno: "H02",
    payno_name: "H02 : 전력변환장치",
    payname: "전력변환장치",
    payno_kind: "H",
    payno_kind_nm: "고전원전기장치"
  },
  {
    payno: "H03",
    payno_name: "H03 : 구동전동기",
    payname: "구동전동기",
    payno_kind: "H",
    payno_kind_nm: "고전원전기장치"
  },
  {
    payno: "H04",
    payno_name: "H04 : 연료전지",
    payname: "연료전지",
    payno_kind: "H",
    payno_kind_nm: "고전원전기장치"
  },
  {
    payno: "H05",
    payno_name: "H05 : 감속기",
    payname: "감속기",
    payno_kind: "H",
    payno_kind_nm: "고전원전기장치"
  },
  {
    payno: "S01",
    payno_name: "S01 : 트랜스미션",
    payname: "트랜스미션",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S02",
    payno_name: "S02 : 등속조인트(CV조인트)",
    payname: "등속조인트(CV조인트)",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S03",
    payno_name: "S03 : 프로펠러샤프트",
    payname: "프로펠러샤프트",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S04",
    payno_name: "S04 : 프론트서스펜션",
    payname: "프론트서스펜션",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S05",
    payno_name: "S05 : 리어서스펜션",
    payname: "리어서스펜션",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S06",
    payno_name: "S06 : 제동마스터백/실린더",
    payname: "제동마스터백/실린더",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S07",
    payno_name: "S07 : 쇽업소버",
    payname: "쇽업소버",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S08",
    payno_name: "S08 : ABS",
    payname: "ABS",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S09",
    payno_name: "S09 : 파워스티어링기어",
    payname: "파워스티어링기어",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S10",
    payno_name: "S10 : 스티어링샤프트",
    payname: "스티어링샤프트",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S11",
    payno_name: "S11 : 로우암",
    payname: "로우암",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S12",
    payno_name: "S12 : 파워스티어링펌프",
    payname: "파워스티어링펌프",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S13",
    payno_name: "S13 : 캘리퍼/휠실린더",
    payname: "캘리퍼/휠실린더",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  },
  {
    payno: "S14",
    payno_name: "S14 : 차동기어",
    payname: "차동기어",
    payno_kind: "S",
    payno_kind_nm: "샤시"
  }
];

const PAYNO_KINDS = ["바디", "의장", "엔진", "고전원전기장치", "샤시"];


function RepairHistoryEditModal({ open, initial, onClose, onSave }) {
  const modalRef = useRef(null);
  const [form, setForm] = useState(() => initial || {});
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;

    // 모달 내부에서만 이동
    const moved = moveFocusOnEnter(e, modalRef.current);
    // (원하면) 마지막에서 Enter면 저장
    if (!e.shiftKey && !moved) {
      onSave(form);
    }
  };

  useEffect(() => {
    if (open) setForm(initial || {});
  }, [open, initial]);

  if (!open) return null;

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50">
      {/* dim */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div 
          ref={modalRef}
          onKeyDown={handleKeyDown}
          className="w-full max-w-[860px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden"
        >
          {/* header */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <Pen className="h-4 w-4 text-zinc-700" />
              <span>정비이력 수정</span>
            </div>

            <button
              type="button"
              className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-2 hover:bg-zinc-50"
              onClick={onClose}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>

          </div>

          {/* body */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {/* 좌측 */}
              <Field label="차량번호">
                <input
                  value={form.carno || ""}
                  onChange={set("carno")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              {/* 우측 */}
              <Field label="고객명">
                <input
                  value={form.custom_name || ""}
                  onChange={set("custom_name")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="차량명">
                <input
                  value={form.carname || ""}
                  onChange={set("carname")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="연락처">
                <div className="flex items-center gap-2">
                  <input 
                    value={form.hp0 || ""} 
                    onChange={set("hp0")} 
                    className={`${inputCls} w-[75px]`}
                  />
                  <span className="text-zinc-500">-</span>
                  <input 
                    value={form.hp1 || ""} 
                    onChange={set("hp1")} 
                    className={`${inputCls} w-[80px]`}
                  />
                  <span className="text-zinc-500">-</span>
                  <input 
                    value={form.hp2 || ""} 
                    onChange={set("hp2")} 
                    className={`${inputCls} w-[80px]`}
                  />
                </div>
              </Field>

              <Field label="주행거리">
                <input
                  value={form.lastkm || ""}
                  onChange={set("lastkm")}
                  className={`${inputCls} w-full text-right`}
                  inputMode="numeric"
                />
              </Field>

              <Field label="등록일자">
                <input
                  type="date"
                  value={form.car_registday || ""}
                  onChange={set("car_registday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="차대번호">
                <input
                  value={form.vinno || ""}
                  onChange={set("vinno")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="입고일자">
                <input
                  type="date"
                  value={form.inday || ""}
                  onChange={set("inday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="정비책임자">
                <input
                  value={form.w_manname || ""}
                  onChange={set("w_manname")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              <Field label="출고일자">
                <input
                  type="date"
                  value={form.outday || ""}
                  onChange={set("outday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              {/* 우측 하단 */}
              <Field label="사고일자">
                <input
                  type="date"
                  value={form.accday || ""}
                  onChange={set("accday")}
                  className={`${inputCls} w-full`}
                />
              </Field>

              {/* 좌측 하단 자리 맞춤용 빈칸 */}
              <div />
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 bg-white">
            <IconBtn
              icon={X}
              label="닫기"
              className="h-10 w-25 justify-center"
              onClick={onClose}
            />

            <IconBtn
              icon={Save}
              label="저장"
              variant="primary"
              className="h-10 w-25 justify-center"
              onClick={onSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PaynoPickerModal({ open, onClose, onSelect, recent = [] }) {
  const [kind, setKind] = useState("바디");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setKind("바디");
    setQ("");
  }, [open]);

  // ✅ 훅 이후에 계산(조건 없이 항상 동일한 위치에서 실행)
  const qq = q.trim().toLowerCase();
  const list = PAYNO_MASTER
    .filter((x) => x.payno_kind_nm === kind)
    .filter((x) => {
      if (!qq) return true;
      return (
        (x.payno || "").toLowerCase().includes(qq) ||
        (x.payname || "").toLowerCase().includes(qq) ||
        (x.payno_name || "").toLowerCase().includes(qq)
      );
    });

  // ✅ “return null”은 반드시 훅/계산 뒤에
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[720px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <Wrench className="h-4 w-4 text-zinc-700" />
              <span>국토부 코드 선택</span>
            </div>

            <button
              type="button"
              className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-2 hover:bg-zinc-50"
              onClick={onClose}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* body */}
          <div className="p-4">
            {recent.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs font-semibold text-zinc-500">최근 사용</div>
                <div className="flex flex-wrap gap-2">
                  {recent.slice(0, 8).map((x) => (
                    <button
                      key={x.payno}
                      type="button"
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm hover:bg-zinc-50"
                      onClick={() => onSelect(x)}
                    >
                      {x.payno} · {x.payname}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="코드/작업명 검색"
                  className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[200px_1fr] gap-3">
              {/* left kinds */}
              <div className="rounded-md border border-zinc-200 overflow-hidden">
                <div className="bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">구분</div>
                {/* <div className="p-1"> */}
                <div className="h-[420px] overflow-auto p-1">
                  {PAYNO_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                        kind === k ? "bg-blue-50 text-blue-700 font-semibold" : "text-zinc-800"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* right list */}
              <div className="rounded-md border border-zinc-200 overflow-hidden">
                <div className="flex items-center bg-zinc-50 px-3 py-2">
                  <div className="text-sm font-semibold text-zinc-700">{kind}</div>
                  <div className="ml-auto text-xs text-zinc-500">{list.length}건</div>
                </div>

                {/* <div className="max-h-[420px] overflow-auto"> */}
                <div className="h-[420px] overflow-auto">
                  {list.map((x) => (
                    <button
                      key={x.payno}
                      type="button"
                      onClick={() => onSelect(x)}
                      className="w-full border-b border-zinc-100 px-3 py-2 text-left hover:bg-zinc-50"
                    >
                      <div className="text-sm text-zinc-900">
                        {x.payno} · {x.payname}
                      </div>
                    </button>
                  ))}

                  {list.length === 0 && (
                    // <div className="p-6 text-center text-sm text-zinc-500">검색 결과가 없습니다.</div>
                    <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 bg-white">
            
            <IconBtn
              icon={X}
              label="닫기"
              variant="primary"
              className="h-10 w-25 justify-center"
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


function Field({ label, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <div className="text-sm font-semibold text-zinc-700">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Badge({ tone = "zinc", children }) {
  const toneCls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "err"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-zinc-50 text-zinc-700 border-zinc-200";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${toneCls}`}>
      {children}
    </span>
  );
}

function SendStatusBadge({ code }) {
  // ts_rstcode 예시 매핑(프로젝트 코드에 맞게 수정)
  // 0:대기, 1:성공, 9:실패 ...
  if (code === "1" || code === 1) return <Badge tone="ok">성공</Badge>;
  if (code === "9" || code === 9) return <Badge tone="err">실패</Badge>;
  if (code === "2" || code === 2) return <Badge tone="warn">진행중</Badge>;
  return <Badge>대기</Badge>;
}

function TopBtn({ icon: Icon, children, onClick, variant = "dark" }) {
  const base =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition border";
  const cls =
    variant === "dark"
      ? `${base} bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800`
      : variant === "light"
      ? `${base} bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50`
      : `${base} bg-sky-200 text-zinc-900 border-sky-200 hover:bg-sky-100`;

  return (
    <button type="button" className={cls} onClick={onClick}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function SmallBtn({ children, onClick }) {
  // InsuranceEstimate.jsx의 SmallBtn 톤 유지
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-200"
    >
      {children}
    </button>
  );
}

function InlineRowActions({ onModify, onDelete }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SmallBtn onClick={onModify}>수정</SmallBtn>
      <SmallBtn onClick={onDelete}>삭제</SmallBtn>
    </div>
  );
}

export default function RepairHistorySend() {
  const { info, success, warning } = useAlert();

  const today = useMemo(() => new Date(), []);
  const [outFrom, setOutFrom] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [outTo, setOutTo] = useState(ymd(today));
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState("1"); // 1~6
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInit, setEditInit] = useState(null);

  // ====== 선택/상세 ======
  const detailBodyElRef = useRef(null);
  const [focusedId, setFocusedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [detailRows, setDetailRows] = useState([]);
  const [paynoOpen, setPaynoOpen] = useState(false);
  const [paynoTargetId, setPaynoTargetId] = useState(null);
  const [recentPaynos, setRecentPaynos] = useState([]);
  


  // ====== Demo 데이터(화면만) ======
  const rows = useMemo(() => {
    const cars = ["더 뉴 K7", "K9", "쏘나타", "K5", "아반떼", "그랜저"];
    const names = ["장희정", "고객2", "고객3", "고객4", "고객5"];
    const rst = ["0", "1", "2", "9"]; // 대기/성공/진행/실패
    return Array.from({ length: 20 }).map((_, i) => {
      const inD = new Date(today.getFullYear(), today.getMonth(), Math.max(1, (i % 28) + 1));
      const outD = new Date(today.getFullYear(), today.getMonth(), Math.max(1, (i % 28) + 2));
      return {
        id: `M-${pad2(Math.floor(i / 10))}${pad2(i)}`,
        inday: ymd(inD),
        outday: ymd(outD),
        carno: `${10 + (i % 80)}가${1000 + i}`,
        carname: cars[i % cars.length],
        lastkm: 12000 + i * 137,
        custom_name: names[i % names.length],
        tel: `010-37${pad2(i)}-****`,
        ts_send_dt: i % 3 === 0 ? `${ymd(outD)} ${pad2((9 + i) % 24)}:${pad2((10 + i) % 60)}` : "",
        ts_rstcode: rst[i % rst.length],

        // 상태 정보 라인(요청: 경정상태, 전송일시, 국토부 전송상태)
        ts_corr_state: i % 4 === 0 ? "경정" : "정상", // 예시
        ts_payno: `PAY-${100000 + i}`, // 국토부(상세에 쓰임)
      };
    });
  }, [today]);

  const filteredRows = useMemo(() => {
    let r = [...rows];
  
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      r = r.filter((x) => {
        return (
          (x.carno || "").toLowerCase().includes(q) ||
          (x.carname || "").toLowerCase().includes(q) ||
          (x.custom_name || "").toLowerCase().includes(q) ||
          (x.tel || "").toLowerCase().includes(q)
        );
      });
    }
  
    if (onlyUnsent) {
      r = r.filter((x) => !x.ts_send_dt);
    }
  
    const cmp = {
      "1": (a, b) => (a.id > b.id ? 1 : -1), // 입력순(예시)
      "2": (a, b) => (a.inday > b.inday ? 1 : -1), // 입고일자순
      "3": (a, b) => (a.carno > b.carno ? 1 : -1), // 차량번호순
      "4": (a, b) => (a.custom_name > b.custom_name ? 1 : -1), // 고객명순
      "5": (a, b) => (a.carname > b.carname ? 1 : -1), // 차량명순
      "6": (a, b) => (a.tel > b.tel ? 1 : -1), // 연락처순
    }[sortKey];
  
    if (cmp) r.sort(cmp);
    return r;
  }, [rows, searchText, sortKey, onlyUnsent]);
  
  const focusedRow = useMemo(() => {
    const id = focusedId ?? filteredRows[0]?.id ?? null;
    if (!id) return null;
    return filteredRows.find((r) => r.id === id) || null;
  }, [focusedId, filteredRows]);
  
  const toggleChecked = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredIds = useMemo(() => filteredRows.map((r) => r.id), [filteredRows]);
  const allChecked = useMemo(
    () => filteredIds.length > 0 && filteredIds.every((id) => checkedIds.has(id)),
    [filteredIds, checkedIds]
  );

  const toggleAllFiltered = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (filteredIds.length === 0) return next;

      if (allChecked) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const mainColumns = useMemo(
    () => [
      {
        key: "__sel",
        title: (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allChecked}
              onChange={toggleAllFiltered}
              onClick={(e) => e.stopPropagation()}
              aria-label="전체 선택"
            />
          </div>
        ),
        width: "5%",
        align: "center",
        render: (_, row) => {
          const checked = checkedIds.has(row.id);
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={checked}
                onChange={() => toggleChecked(row.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label="선택"
              />
            </div>
          );
        },
      },
      { key: "inday", title: "입고일자", width: "9%", align: "left" },
      { key: "outday", title: "출고일자", width: "9%", align: "left" },
      { key: "carno", title: "차량번호", width: "10%", align: "left" },
      { key: "carname", title: "차량명", width: "12%", align: "left" },
      {
        key: "lastkm",
        title: "주행거리",
        width: "8%",
        align: "right",
        render: (v) => (v ?? 0).toLocaleString(),
      },
      { key: "custom_name", title: "고객명", width: "9%", align: "left" },
      { key: "tel", title: "연락처", width: "11%", align: "left" },
      { key: "ts_send_dt", title: "전송일시", width: "12%", align: "left", render: (v) => v || "-" },
      {
        key: "ts_rstcode",
        title: "상태",
        width: "7%",
        align: "left",
        render: (v) => <SendStatusBadge code={v} />,
      },
    ],
    [checkedIds, allChecked, toggleAllFiltered, sortKey] // sortKey는 없어도 되지만 두는 게 안전
  );
  
  const detailColumns = [
    {
      key: "ts_payno",
      title: "국토부",
      width: "10%",
      align: "left",
      render: (v, row) => (
        <button
          type="button"
          // className="text-left text-sky-700 hover:underline"
          className="w-full text-left text-sky-700 hover:underline"
          onClick={() => openPaynoPicker(row.id)}      // 클릭
          onContextMenu={(e) => {                      // 우클릭도 지원
            e.preventDefault();
            openPaynoPicker(row.id);
          }}
          title="클릭(또는 우클릭)하여 변경"
        >
          {/* {v || "-"} */}
          {v ? v : <span className="text-zinc-400">선택</span>}
        </button>
      ),
    },
    { key: "part_makercode", title: "부품코드", width: "10%", align: "left" },
    { key: "payname", title: "작업내용", width: "22%", align: "left" },
    { key: "workcodename", title: "작업", width: "10%", align: "left" },
    { key: "qty", title: "시간", width: "6%", align: "right" },
    { key: "paysum", title: "공임액", width: "9%", align: "right", render: (v) => (v ?? 0).toLocaleString() },
    { key: "partsum", title: "부품액", width: "9%", align: "right", render: (v) => (v ?? 0).toLocaleString() },
    { key: "part_state", title: "부품구분", width: "8%", align: "left" },
    { key: "statename", title: "작업상태", width: "8%", align: "left" },
  ];
  
  
  useEffect(() => {
    if (!focusedRow) {
      setDetailRows([]);
      return;
    }
    // 화면용 더미(나중에 API로 교체)
    const demo = Array.from({ length: 8 }).map((_, i) => ({
      id: `${focusedRow.id}-D-${i}`,
      ts_payno: focusedRow.ts_payno, // 초기값
      part_makercode: `P-${1000 + i}`,
      payname: i % 2 === 0 ? "범퍼 탈착/교환" : "도장(부분)",
      workcodename: i % 2 === 0 ? "판금" : "도장",
      qty: (0.5 + i * 0.2).toFixed(1),
      paysum: 35000 + i * 12000,
      partsum: 22000 + i * 9000,
      part_state: i % 3 === 0 ? "순정부품" : "대체부품",
      statename: i % 3 === 0 ? "완료" : "진행",
    }));
    setDetailRows(demo);
  }, [focusedRow]);

  const openPaynoPicker = (detailRowId) => {
    setPaynoTargetId(detailRowId);
    setPaynoOpen(true);
  };
  
  const applyPayno = (item) => {
    // detailRows의 특정 행 ts_payno 변경
    setDetailRows((prev) =>
      prev.map((r) => (r.id === paynoTargetId ? { ...r, ts_payno: item.payno } : r))
    );
  
    // 최근 사용 업데이트
    setRecentPaynos((prev) => {
      const next = [item, ...prev.filter((x) => x.payno !== item.payno)];
      return next.slice(0, 10);
    });
  
    setPaynoOpen(false);
    setPaynoTargetId(null);
    // info(`국토부 코드 변경: ${item.payno} · ${item.payname}`);
  };
  


  // ====== 액션(연결은 나중에) ======
  const requireFocused = () => {
    if (!focusedRow) {
      // info("목록에서 먼저 선택하세요.");
      info("목록에서 먼저 선택하세요.");
      return false;
    }
    return true;
  };

  const onNew = () => info("신규");
  const onAosLoad = () => info("AOS 견적 불러오기");
  const onSend = () => {
    if (checkedIds.size === 0) return warning("전송할 건을 체크하세요.");
    const ids = Array.from(checkedIds);
    info(`정비이력 전송 ${ids.length}건: ${ids.join(", ")}`);
  };
  
  const onRefresh = () => info("새로고침");
  const onSendDelete = () => requireFocused() && info(`정비이력 삭제(국토부): ${focusedRow.id}`);
  const onSendInquiry = () => requireFocused() && info(`정비이력 전송조회: ${focusedRow.id}`);
  const onQuery = () => info(`조회: ${outFrom} ~ ${outTo}`);
  // const onModify = () => requireFocused() && info(`수정: ${focusedRow.id}`);
  const onDelete  = () => requireFocused() && info(`삭제: ${focusedRow.id}`);

  const onModify = () => {
    if (!requireFocused()) return;
    setEditInit({
      carno: focusedRow.carno || "",
      carname: focusedRow.carname || "",
      lastkm: focusedRow.lastkm ?? "",
      vinno: focusedRow.vinno || "",
      w_manname: focusedRow.w_manname || "",
      custom_name: focusedRow.custom_name || "",
      hp0: focusedRow.hp0 || "",
      hp1: focusedRow.hp1 || "",
      hp2: focusedRow.hp2 || "",
      car_registday: focusedRow.car_registday || "",
      inday: focusedRow.inday || "",
      outday: focusedRow.outday || "",
      accday: focusedRow.accday || "",
    });
    setEditOpen(true);
  };
  


  return (
    // <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
    <div className="bg-zinc-50 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">국토부 정비이력 전송</div>
              <div className="text-xs text-zinc-500">정비이력 조회 · 전송 · 전송상태 확인</div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              onClick={() => info("[국토부전송] 퀵버튼")}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              국토부전송
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full px-4 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* 2) Global Action (버튼 나열: 보험견적처럼 별도 라인) */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={onNew}
            >
              + 신규
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onAosLoad}
            >
              AOS 견적 불러오기
            </button>

            <button
              className="rounded-md bg-sky-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-sky-100"
              onClick={onSend}
            >
              정비이력 전송
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onSendDelete}
            >
              정비이력 삭제
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onRefresh}
            >
              새로고침
            </button>

            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onSendInquiry}
            >
              정비이력 전송조회
            </button>
          </div>
        </div>

        {/* 3) 조회/검색 (보험견적 카드 스타일 그대로) */}
        <div className="mb-3 rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-zinc-800">출고일자</div>

              <input
                type="date"
                value={outFrom}
                onChange={(e) => setOutFrom(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
              />
              <span className="text-zinc-400">~</span>
              <input
                type="date"
                value={outTo}
                onChange={(e) => setOutTo(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
              />

              <button
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={onQuery}
              >
                조회
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="차량번호/차량명/고객명/연락처 검색"
                className="w-[520px] max-w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
              />

              <button
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => info("검색")}
              >
                검색
              </button>

              <label className="ml-1 inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyUnsent}
                  onChange={(e) => setOnlyUnsent(e.target.checked)}
                />
                미전송건
              </label>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="select-base ml-auto"
              >
                <option value="1">1.입력순</option>
                <option value="2">2. 입고일자순</option>
                <option value="3">3. 차량번호순</option>
                <option value="4">4. 고객명순</option>
                <option value="5">5. 차량명순</option>
                <option value="6">6. 연락처순</option>
              </select>
            </div>

          </div>
        </div>


        {/* ===== 메인 목록 ===== */}
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">견적 목록</div>
              <div className="text-xs text-zinc-500">{filteredRows.length}건</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <FixedHeadTable
              columns={mainColumns}
              rows={filteredRows}
              rowKey={(r) => r.id}
              selectedKey={focusedId}
              onRowClick={(r) => setFocusedId(r.id)}
              height="100%"
              bodyClassName="min-h-0 flex-1"
              rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-100"
              gutterHoverClass="!bg-gray-50"
              expandedKey={focusedId}

              expandedRowRender={() => (
                <InlineRowActions
                  onModify={onModify}
                  onDelete={onDelete}
                />
              )}
            />
          </div>

          {/* ===== 국토부 전송 상태 정보 라인 ===== */}
          <div className="border-t border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800">
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <span className="font-semibold">경정상태 :</span>
                <span className="ml-1">{focusedRow?.ts_corr_state || "-"}</span>
              </div>

              <div className="ml-auto">
                <span className="font-semibold ">전송일시 :</span>
                <span className="ml-1">{focusedRow?.ts_send_dt || "2020-03-04 오전 10:20:43"}</span>
              </div>
            </div>

            <div className="mt-1 flex">
              <span className="font-semibold whitespace-nowrap">
                국토부 전송상태 :
              </span>
              <span className="ml-1 text-zinc-700">
                {focusedRow?.ts_result_msg ||
                  "등록되지 않은 관리사업자이거나 관리사업자 사업자정보가 없습니다. 사업자정보는 관할 지자체에 문의하시기 바랍니다."}
              </span>
            </div>
          </div>


        </div>

        {/* ===== 정비상세 목록 ===== */}
        {/* <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0 overflow-hidden" style={{ height: 320 }}> */}
        <div className="mt-3 rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col overflow-hidden h-[320px] min-h-0">

          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">정비상세</div>
              <div className="text-xs text-zinc-500">{focusedRow ? "선택 건 기준" : "목록에서 건을 선택하세요"}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <FixedHeadTable
              columns={detailColumns}
              rows={focusedRow ? detailRows : []}
              rowKey={(r) => r.id}
              emptyText={focusedRow ? "정비상세가 없습니다." : "목록에서 선택하면 정비상세가 표시됩니다."}
              height="100%"
              bodyClassName="min-h-0 flex-1"
              bodyScrollRef={detailBodyElRef}
            />
          </div>
        </div>

      </div>

      <RepairHistoryEditModal
        open={editOpen}
        initial={editInit}
        onClose={() => setEditOpen(false)}
        onSave={(form) => {
          // TODO: 실제 저장 API 연결(useApi 훅)
          // useAlert().success("저장되었습니다.");
          setEditOpen(false);
        }}
      />


      <PaynoPickerModal
        open={paynoOpen}
        onClose={() => {
          setPaynoOpen(false);
          setPaynoTargetId(null);
        }}
        onSelect={applyPayno}
        recent={recentPaynos}
      />

    </div>

    
  );

  
}

