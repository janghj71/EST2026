import { useEffect, useRef, useLayoutEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import IconBtn from "../components/IconBtn";
import MoneyInput from "../components/MoneyInput";
import { moveFocusOnEnter } from "../utils/focusUtils";
import { useAlert } from "../alerts";
import { useInsurers } from "../hooks/useInsurers";

export default function InsurersPage() {
  const { confirm, warning, error, info } = useAlert();
  const { insurers, setInsurers, loading, saving, error: insError, save, refetch } = useInsurers();

  // 조회 에러 → 메시지 표시
  useEffect(() => {
    if (insError) warning(insError.message || "조회에 실패했습니다.");
  }, [insError]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedCode, setSelectedCode] = useState("");
  const [rightHeight, setRightHeight] = useState(undefined);

  const rightPanelRef = useRef(null);
  // 우측 패널 렌더 높이를 측정 → 좌측 section max-height로 사용
  useLayoutEffect(() => {
    const right = rightPanelRef.current;
    if (!right) return;

    const calc = () => {
      const h = right.getBoundingClientRect().height;
      if (h > 0) setRightHeight(h);
    };

    calc();

    const ro = new ResizeObserver(calc);
    ro.observe(right);
    return () => ro.disconnect();
  }, []);

  // derived: selectedCode가 비어있으면 첫 번째 보험사
  const effectiveCode = selectedCode || insurers[0]?.bocomcode || "";

  const selectedInsurer = useMemo(
    () => insurers.find((x) => x.bocomcode === effectiveCode) || null,
    [insurers, effectiveCode]
  );

  // 선택된 보험사의 필드 수정
  const setField = (field) => (v) => {
    const value = v && v.target ? v.target.value : v;
    setInsurers((prev) =>
      prev.map((r) =>
        r.bocomcode === effectiveCode ? { ...r, [field]: value } : r
      )
    );
  };

  const onSave = async () => {
    if (!selectedInsurer) {
      await warning("보험사를 선택하세요.");
      return;
    }
    try {
      await save(selectedInsurer);
      await info("저장 완료");
    } catch (err) {
      await warning(err?.message || "저장에 실패했습니다.");
    }
  };

  // FixedHeadTable columns
  const columns = useMemo(
    () => [
      {
        key: "bocomcode",
        title: "코드",
        width: "30%",
        align: "left",
        className: "font-mono",
        render: (val) => <span className="font-mono text-gray-700">{val}</span>,
      },
      {
        key: "bocomname",
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
            보험사별 시간당 공임(국산/수입차) 금액 설정
          </div>
        </div>

        <div className="ml-auto">
          <IconBtn
            icon={Save}
            label="저장"
            variant="primary"
            className="h-10 w-28 justify-center whitespace-nowrap"
            onClick={onSave}
            disabled={!!insError}
          />
        </div>
      </div>

      {/* Body */}
      {/* <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 xl:auto-rows-[1fr]"> */}
      <div 
        className="grid grid-cols-1 xl:grid-cols-12 gap-0 xl:gap-3"
      >
        {/* Left: 보험사 목록 — 우측 높이에 맞춰 max-height 제한 */}
        <section
          className="xl:col-span-4 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0 flex flex-col"
          style={rightHeight ? { maxHeight: rightHeight } : undefined}
        >
          <div className="p-4 border-b border-gray-200 shrink-0">
            <div className="text-base font-semibold text-gray-900">보험사</div>
          </div>

          <div className="relative min-h-0 flex-1">
            <TableLoadingOverlay loading={loading} />
            <FixedHeadTable
              columns={columns}
              rows={insurers}
              rowKey={(r) => r.bocomcode}
              selectedKey={effectiveCode}
              onRowClick={(row) => setSelectedCode(row.bocomcode)}
              className="min-h-0 w-full h-full"
              emptyText="보험사가 없습니다."
              rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-50"
              gutterHoverClass="!bg-gray-50"
            />
          </div>
        </section>

        {/* Right: 공임 입력 */}
        <section 
          ref={rightPanelRef} 
          className="xl:col-span-8 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0 flex flex-col self-stretch"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="text-base font-semibold text-gray-900">
              {selectedInsurer ? `보험사: ${selectedInsurer.bocomcode} ${selectedInsurer.bocomname}` : "보험사 선택"}
            </div>
          </div>

          <div className="p-5 space-y-6">
            <RateBox title="[ 공임사항 ]">
              <RateRow label="탈착 M/H">
                <MoneyInput value={selectedInsurer?.xpay ?? ""} onChange={setField("xpay")} />
              </RateRow>
              <RateRow label="판금 M/H">
                <MoneyInput value={selectedInsurer?.bpay ?? ""} onChange={setField("bpay")} />
              </RateRow>
              <RateRow label="도장 M/H">
                <MoneyInput value={selectedInsurer?.ppay ?? ""} onChange={setField("ppay")} />
              </RateRow>
            </RateBox>

            <RateBox title="[ 수입차 공임 ]">
              <RateRow label="탈착 M/H">
                <MoneyInput value={selectedInsurer?.expay ?? ""} onChange={setField("expay")} />
              </RateRow>
              <RateRow label="판금 M/H">
                <MoneyInput value={selectedInsurer?.ebpay ?? ""} onChange={setField("ebpay")} />
              </RateRow>
              <RateRow label="도장 M/H">
                <MoneyInput value={selectedInsurer?.eppay ?? ""} onChange={setField("eppay")} />
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
