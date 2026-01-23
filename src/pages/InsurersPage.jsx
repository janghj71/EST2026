import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable"; 
import IconBtn from "../components/IconBtn"; 
import MoneyInput from "../components/MoneyInput"; 
import { moveFocusOnEnter } from "../utils/focusUtils"; 
import { useAlert } from "../alerts";

// 화면 전용(더미) 보험사 목록
const seedInsurers = [
  { code: "01", name: "메리츠" },
  { code: "02", name: "한화" },
  { code: "03", name: "롯데" },
  { code: "04", name: "MG" },
  { code: "05", name: "흥국" },
  { code: "06", name: "삼성" },
  { code: "07", name: "현대" },
  { code: "08", name: "KB" },
  { code: "09", name: "DB" },
  { code: "10", name: "NH농협손해보험" },
  { code: "11", name: "AIG" },
  { code: "12", name: "택시공제" },
  { code: "13", name: "버스공제" },
  { code: "14", name: "화물공제" },
  { code: "15", name: "개인택시공제" },
  { code: "16", name: "전세버스공제" },
  { code: "17", name: "렌터카공제" },
  { code: "18", name: "대리운전공제" },
  { code: "19", name: "교보-AXA" },
  { code: "20", name: "하나손해보험" },
  { code: "21", name: "ERGO다음다이렉트" },
];

// 보험사별 공임(더미)
function makeDefaultLabor() {
  return {
    // 국산
    dom: { 탈착: "35000", 판금: "35000", 도장: "35000" },
    // 외제
    for: { 탈착: "45000", 판금: "45000", 도장: "45000" },
  };
}

export default function InsurersPage() {
  const { confirm, warning, error, info } = useAlert();
  const [insurers] = useState(seedInsurers);
  const [selectedCode, setSelectedCode] = useState("01");

  // 보험사별 공임 데이터(화면용)
  const [laborByInsurer, setLaborByInsurer] = useState(() => {
    const map = {};
    for (const it of seedInsurers) map[it.code] = makeDefaultLabor();
    return map;
  });

  const selectedInsurer = useMemo(
    () => insurers.find((x) => x.code === selectedCode) || null,
    [insurers, selectedCode]
  );

  const labor = laborByInsurer[selectedCode] || makeDefaultLabor();

  // const setLabor = (section, key) => (e) => {
  //   const v = e.target.value; // MoneyInput: 숫자만 들어옴
  //   setLaborByInsurer((prev) => ({
  //     ...prev,
  //     [selectedCode]: {
  //       ...prev[selectedCode],
  //       [section]: { ...prev[selectedCode][section], [key]: v },
  //     },
  //   }));
  // };

  const setLabor = (section, key) => (v) => {
    const value = v && v.target ? v.target.value : v;
  
    setLaborByInsurer((prev) => ({
      ...prev,
      [selectedCode]: {
        ...prev[selectedCode],
        [section]: { ...prev[selectedCode][section], [key]: value },
      },
    }));
  };
  

  const onSave = async () => {
    // 화면만: 저장 로그
    // console.log("저장(더미)", { insurer: selectedInsurer, labor });
    // alert("저장(더미) 완료");
    await info("저장 완료");

  };

  // ✅ FixedHeadTable columns
  const columns = useMemo(
    () => [
      {
        key: "code",
        title: "코드",
        width: "30%",
        align: "left",
        className: "font-mono",
        render: (val) => <span className="font-mono text-gray-700">{val}</span>,
      },
      {
        key: "name",
        title: "보험사",
        width: "70%",
        align: "left",
        render: (val) => <span className="font-medium text-gray-900">{val}</span>,
      },
    ],
    []
  );


  return (
    // 모든 인풋 Enter/Shift+Enter 이동: 부모에서 위임
    <div className="space-y-4" onKeyDown={moveFocusOnEnter}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">보험사 M/H설정</div>
          <div className="text-sm text-gray-500 mt-0.5">
            보험사별 시간당 공임(국산/외제) 금액 설정
          </div>
        </div>

        <div className="ml-auto">
          <IconBtn
            icon={Save}
            label="저장"
            variant="primary"
            className="h-10 w-28 justify-center whitespace-nowrap"
            onClick={onSave}
          />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        {/* Left: 보험사 목록 */}
        <section className="xl:col-span-4 rounded-l-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="text-base font-semibold text-gray-900">보험사</div>
          </div>

          {/* ✅ FixedHeadTable */}
          <div className="p-0 min-h-0">
            <FixedHeadTable
              columns={columns}
              rows={insurers}
              rowKey={(r) => r.code}
              selectedKey={selectedCode}
              onRowClick={(row) => setSelectedCode(row.code)}
              height={560}
              className="min-h-0 w-full"
              emptyText="보험사가 없습니다."
              rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-50"
              gutterHoverClass="!bg-gray-50"
            />
          </div>
        </section>

        {/* Right: 공임 입력 */}
        <section className="xl:col-span-8 rounded-r-md border border-gray-200 border-l-0 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="text-base font-semibold text-gray-900">
              {selectedInsurer ? `보험사: ${selectedInsurer.code} ${selectedInsurer.name}` : "보험사 선택"}
            </div>
          </div>

          <div className="p-5 space-y-6">
            <RateBox title="[ 공임사항 ]">
              <RateRow label="탈착 M/H">
                {/* ✅ MoneyInput: 천단위 콤마 */}
                <MoneyInput value={labor.dom.탈착} onChange={setLabor("dom", "탈착")} />
              </RateRow>
              <RateRow label="판금 M/H">
                <MoneyInput value={labor.dom.판금} onChange={setLabor("dom", "판금")} />
              </RateRow>
              <RateRow label="도장 M/H">
                <MoneyInput value={labor.dom.도장} onChange={setLabor("dom", "도장")} />
              </RateRow>
            </RateBox>

            <RateBox title="[ 외제차 공임 ]">
              <RateRow label="탈착 M/H">
                <MoneyInput value={labor.for.탈착} onChange={setLabor("for", "탈착")} />
              </RateRow>
              <RateRow label="판금 M/H">
                <MoneyInput value={labor.for.판금} onChange={setLabor("for", "판금")} />
              </RateRow>
              <RateRow label="도장 M/H">
                <MoneyInput value={labor.for.도장} onChange={setLabor("for", "도장")} />
              </RateRow>
            </RateBox>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */

function RateBox({ title, children }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="text-sm font-semibold text-gray-900 mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RateRow({ label, children }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-4 text-sm text-gray-700 whitespace-nowrap">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}
