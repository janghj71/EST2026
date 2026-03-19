import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, CarFront, Plus } from "lucide-react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { useTbCode } from "../../hooks/useTbCode";
import { useCarcode } from "../../hooks/useCarcode";
import { useModelcode } from "../../hooks/useModelcode";

/**
 * CarNameHelpModal.jsx (single file)
 * - 제작사 -> 차량 -> 모델 3단 선택
 * - 차종(라디오) + 등급(멀티) 필터
 * - 제작사 선택 시: 차량 첫행 자동선택 -> 모델 첫행 자동선택
 * - 모델 선택바 표시되도록 rowKey/selectedKey 정합
 * - 제작사: 수정/삭제 없음
 * - 차량/모델: 차량코드에 'U' 포함 시에만 수정/삭제 노출
 */

function gradeOptionsByKind(carkind) {
  switch (carkind) {
    case 1:
      return [
        { value: 1, label: "경차" },
        { value: 2, label: "소형" },
        { value: 3, label: "중형" },
        { value: 4, label: "대형" },
        { value: 5, label: "고급형" },
      ];
    case 2:
      return [
        { value: 1, label: "승용지프" },
        { value: 2, label: "승합지프" },
      ];
    case 3:
      return [
        { value: 1, label: "경화물" },
        { value: 2, label: "소형화물" },
        { value: 3, label: "중형화물" },
        { value: 4, label: "대형화물" },
        { value: 5, label: "특대형" },
      ];
    case 4:
      return [
        { value: 1, label: "경승합" },
        { value: 2, label: "소형승합" },
        { value: 3, label: "중형승합" },
        { value: 4, label: "대형승합" },
        { value: 5, label: "고속형" },
      ];
    case 5:
      return [
        { value: 1, label: "RV등급1" },
        { value: 2, label: "RV등급2" },
        { value: 3, label: "RV등급3" },
        { value: 4, label: "RV등급4" },
        { value: 5, label: "RV등급5" },
      ];
    default:
      return [];
  }
}

function kindLabel(k) {
  switch (k) {
    case 1:
      return "승용";
    case 2:
      return "지프";
    case 3:
      return "화물";
    case 4:
      return "승합";
    case 5:
      return "RV";
    default:
      return "-";
  }
}

function SimpleModal({ open, title, onClose, children, widthClass = "w-[980px]" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
      <div className={`rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden ${widthClass}`}>
        <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
              <CarFront className="h-4 w-4" />
            </span>
            <div className="text-base font-semibold text-zinc-900">{title}</div>
          </div>

          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function SmallModal({ open, title, onClose, children, widthClass = "w-[560px]" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/30">
      <div className={`rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden ${widthClass}`}>
        <div className="flex items-center border-b border-zinc-200 bg-sky-100/60 px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
              <CarFront className="h-4 w-4" />
            </span>
            <div className="text-base font-semibold text-zinc-900">{title}</div>
          </div>

          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}


function InlineActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        className="rounded-md px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
      >
        수정
      </button>
      <button
        type="button"
        className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
      >
        삭제
      </button>
    </div>
  );
}


export default function CarNameHelpModal({
  open,
  onClose,
  onSelect,
  initial = null,
  disableNew = false,      // 차량/모델 신규 버튼 비활성화
  estCodecarOnly = false,  // est_codecar === codecar 인 차량만 표시
}) {
  // ── API 데이터 로딩 ──────────────────────────────────────────
  // 제작사: useTbCode CMA01 (subcode=makercode, codename=제작사명)
  const { codes: makerCodes } = useTbCode('CMA01');
  const makers = useMemo(
    () => makerCodes.map((c) => ({ subcode: c.value, codename: c.label })),
    [makerCodes]
  );
  // 차량: est_carcode_s.aspx 전체 → 제작사/차종/등급 필터는 클라이언트
  const { cars } = useCarcode();
  // 모델: est_modelcode_s.aspx 전체 → codecar 기준 클라이언트 필터
  const { models } = useModelcode();
  const [carkind, setCarkind] = useState(1);
  
  // 신규 모달 오픈 상태
  const [openCarNew, setOpenCarNew] = useState(false);
  const [openModelNew, setOpenModelNew] = useState(false);

  // 차량 신규 폼
  const [newCarGrade, setNewCarGrade] = useState("");
  const [newCarName, setNewCarName] = useState("");

  // 모델 신규 폼
  const [newModelName, setNewModelName] = useState("");
  

  // 등급: 기본 전부 체크
  const [cargrades, setCargrades] = useState(() => gradeOptionsByKind(1).map((x) => x.value));
  const gradeOptions = useMemo(() => gradeOptionsByKind(carkind), [carkind]);

  const [findText, setFindText] = useState("");

  const [selectedMaker, setSelectedMaker] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  // 초기값 포커스 이동용 refs
  const initialRef        = useRef(null);  // cascade 효과에서 참조할 초기값
  const initialAppliedRef = useRef(false); // 1회만 적용 방지

  // deps 안정화를 위한 원시값
  const selectedMakerSubcode = selectedMaker?.subcode ?? null;
  const selectedCarCodecar = selectedCar?.codecar ?? null;

  // 차종 변경 시: 등급 전부 체크로 리셋 + 선택 정리
  useEffect(() => {
    setCargrades(gradeOptionsByKind(carkind).map((x) => x.value));
    setSelectedCar(null);
    setSelectedModel(null);
  }, [carkind]);

  // 제작사 변경 시: 선택 정리
  useEffect(() => {
    setSelectedCar(null);
    setSelectedModel(null);
  }, [selectedMakerSubcode]);


  // 모달 닫힐 때 초기값 적용 플래그 리셋 / initial 없으면 첫 제작사 선택
  useEffect(() => {
    if (!open) { initialAppliedRef.current = false; return; }
    if (!initial && !selectedMaker && makers.length > 0) setSelectedMaker(makers[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // initial 있을 때: makers 로드 후 1회만 제작사·차종 설정
  useEffect(() => {
    if (!open || !initial || initialAppliedRef.current || makers.length === 0) return;
    initialAppliedRef.current = true;
    initialRef.current = initial;

    // 차종 먼저 설정 (carkind 필터가 맞아야 차량이 carRows에 포함됨)
    if (initial.carkind) setCarkind(Number(initial.carkind));

    // maker/carkind가 이전 세션과 같아도 cascade가 다시 돌도록 강제 초기화
    setSelectedCar(null);
    setSelectedModel(null);

    // 제작사 찾아서 선택 (없으면 첫 번째)
    const maker = initial.makercode
      ? makers.find((m) => m.subcode === initial.makercode)
      : null;
    setSelectedMaker(maker ?? makers[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, makers, initial]);

  const makerRows = useMemo(() => {
    // 차량명 검색 중에는 제작사 필터 없이 전체 표시
    return makers;
  }, [makers]);

  const carRows = useMemo(() => {
    const ft = findText.trim();

    // 대체차종 모드: est_codecar === codecar 인 차량만 (모든 필터에 AND)
    let list = estCodecarOnly
      ? cars.filter((c) => c.est_codecar && c.est_codecar === c.codecar)
      : cars;

    // 검색어가 있으면 검색어 필터만 (제작사·차종·등급 제외)
    if (ft) {
      return list.filter((c) => (c.carname || "").includes(ft));
    }

    // 검색어 없으면 기존 제작사·차종·등급 필터 적용
    if (selectedMakerSubcode) list = list.filter((c) => c.subcode === selectedMakerSubcode);

    // 차종
    list = list.filter((c) => Number(c.carkind) === Number(carkind));

    // 등급(멀티) - 기본 전부 체크라서 항상 필터로 작동
    if (cargrades.length > 0) {
      const gs = new Set(cargrades.map(Number));
      list = list.filter((c) => gs.has(Number(c.cargrade)));
    }

    return list;
  }, [cars, selectedMakerSubcode, carkind, cargrades, findText, estCodecarOnly]);

  const modelRows = useMemo(() => {
    if (!selectedCarCodecar) return [];
    return models.filter((m) => m.codecar === selectedCarCodecar);
  }, [models, selectedCarCodecar]);

  // 제작사 선택 -> 차량 첫행 자동선택
  useEffect(() => {
    if (carRows.length === 0) {
      if (selectedCar) setSelectedCar(null);
      return;
    }
    const exists = selectedCarCodecar && carRows.some((r) => r.codecar === selectedCarCodecar);
    if (!exists) {
      const initCodecar = initialRef.current?.codecar;
      const target = initCodecar ? carRows.find((r) => r.codecar === initCodecar) : null;
      setSelectedCar(target ?? carRows[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMakerSubcode, carRows, selectedCarCodecar]);

  // 차량 선택 -> 모델 자동선택 (차량이 바뀌면 항상 모델 재설정)
  useEffect(() => {
    if (modelRows.length === 0) {
      setSelectedModel(null);
      return;
    }
    const initModelCode = initialRef.current?.modelcode;
    const target = initModelCode
      ? modelRows.find((r) => r.modelcode === initModelCode)
      : null;
    setSelectedModel(target ?? modelRows[0]);
    if (initModelCode) initialRef.current = null; // 초기값 소비 완료
  }, [selectedCarCodecar, modelRows]);

  useEffect(() => {
    const first = gradeOptionsByKind(carkind)[0]?.value ?? "";
    setNewCarGrade(String(first));
  }, [carkind]);


  const isUCar = String(selectedCarCodecar || "").includes("U");

  const selectedText = useMemo(() => {
    const a = selectedMaker?.codename ? selectedMaker.codename : "-";
    const b = selectedCar?.carname ? selectedCar.carname : "-";
    const c = selectedModel?.modelname ? selectedModel.modelname : "-";
    return `${a} > ${b} > ${c}`;
  }, [selectedMaker, selectedCar, selectedModel]);

  const toggleGrade = (v) => {
    const nv = Number(v);
    setCargrades((prev) => (prev.includes(nv) ? prev.filter((x) => x !== nv) : [...prev, nv]));
  };

  const resetAll = () => {
    setFindText("");
    setCarkind(1);
    setCargrades(gradeOptionsByKind(1).map((x) => x.value));
    setSelectedMaker(null);
    setSelectedCar(null);
    setSelectedModel(null);
  };

  /** [선택] 버튼 / 더블클릭 공통 핸들러 */
  const doSelect = useCallback((car, model) => {
    if (!selectedMaker || !car) return;
    if (!estCodecarOnly && !model) return;
    onSelect?.({ maker: selectedMaker, car, model, carkind, cargrades });
    onClose?.();
  }, [selectedMaker, estCodecarOnly, onSelect, onClose, carkind, cargrades]);

  // FixedHeadTable columns (프로젝트 스펙: { key, title, width, align, render })
  const makerCols = useMemo(
    () => [
      { key: "subcode", title: "코드", width: "25%", align: "center" },
      { key: "codename", title: "제작사명", width: "auto" },
    ],
    []
  );

  const carCols = useMemo(
    () => [
      { key: "codecar", title: "코드", width: "30%", align: "center" },
      { key: "carname", title: "차량명", width: "55%", className: "!whitespace-normal" },
      {
        key: "_act",
        title: "",
        width: "35%",
        align: "center",
        render: (val, row) =>
          String(row?.codecar || "").includes("U") ? (
            <InlineActions onEdit={() => {}} onDelete={() => {}} />
          ) : null,
      },
    ],
    []
  );

  const modelCols = useMemo(
    () => [
      { key: "modelcode", title: "코드", width: "25%", align: "center" },
      { key: "modelname", title: "모델명", width: "55%", className: "!whitespace-normal" },
      {
        key: "_act",
        title: "",
        width: "40%",
        align: "center",
        render: () => (isUCar ? <InlineActions onEdit={() => {}} onDelete={() => {}} /> : null),
      },
    ],
    [isUCar]
  );

  const tableBodyH = 460;

  return (
    <>
      <SimpleModal open={open} onClose={onClose} title="차명코드 도움" widthClass="w-[980px]">
        {/* 1) 차종 + 등급 */}
        <div className="mb-2 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-zinc-200 bg-white px-3 py-2">
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold text-zinc-700 whitespace-nowrap">차종</div>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((k) => {
                  const active = carkind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={[
                        "rounded-md border px-3 py-1 text-sm",
                        "whitespace-nowrap break-keep min-w-[56px]",
                        active
                          ? "bg-green-700 text-white border-green-700"
                          : "bg-white text-green-700 border-green-700 hover:bg-green-50",
                      ].join(" ")}
                      onClick={() => setCarkind(k)}
                    >
                      {kindLabel(k)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white px-3 py-2">
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold text-zinc-700 whitespace-nowrap">등급</div>
              <div className="flex flex-wrap items-center gap-2">
                {gradeOptions.map((g) => {
                  const checked = cargrades.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      type="button"
                      className={[
                        "rounded-md border px-2 py-1 text-sm",
                        "whitespace-nowrap break-keep",
                        "w-[72px] text-center", //  동일 폭
                        checked
                          ? "bg-green-700 text-white border-green-700"
                          : "bg-white text-green-700 border-green-700 hover:bg-green-50",
                      ].join(" ")}
                      onClick={() => toggleGrade(g.value)}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 2) 검색 */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2">
            <input
              className="w-full text-sm text-zinc-900 outline-none"
              placeholder="차량명을 입력하세요"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            onClick={resetAll}
          >
            초기화
          </button>
        </div>

        {/* 3) 목록 */}
        <div className="grid h-[520px] grid-cols-[0.85fr_1.15fr_1.15fr] gap-3">

          {/* 제작사 */}
          <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 h-12">
              <div className="text-sm font-semibold text-zinc-800">제작사</div>
            </div>
            <div className="min-h-0 flex-1">
              <FixedHeadTable
                rows={makerRows}
                columns={makerCols}
                height={tableBodyH}
                rowKey={(r) => r.subcode}
                selectedKey={selectedMakerSubcode}
                onRowClick={(row) => setSelectedMaker(row)}
                rowHoverClass="hover:!bg-gray-50"
                rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
                gutterSelectedClass="!bg-blue-100"
                gutterHoverClass="!bg-gray-50"
              />
            </div>
          </div>

          {/* 차량 */}
          <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 h-12">
              <div className="text-sm font-semibold text-zinc-800">차량</div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={disableNew}
                  className={[
                    "inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm font-medium",
                    disableNew
                      ? "border-zinc-200 bg-white text-zinc-300 cursor-not-allowed"
                      : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
                  ].join(" ")}
                  onClick={() => {
                    setNewCarName("");
                    const first = gradeOptionsByKind(carkind)[0]?.value ?? "";
                    setNewCarGrade(String(first));
                    setOpenCarNew(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  신규
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <FixedHeadTable
                rows={carRows}
                columns={carCols}
                height={tableBodyH}
                rowKey={(r) => r.codecar}
                selectedKey={selectedCarCodecar}
                onRowClick={(row) => setSelectedCar(row)}
                onRowDoubleClick={(row) => {
                  setSelectedCar(row);
                  // 현재 선택 모델이 같은 차량 소속이면 유지, 아니면 첫 모델 사용
                  const carModels = models.filter((m) => m.codecar === row.codecar);
                  const keepModel = (selectedModel && carModels.some((m) => m.modelcode === selectedModel.modelcode))
                    ? selectedModel
                    : (carModels[0] ?? null);
                  doSelect(row, keepModel);
                }}
                rowHoverClass="hover:!bg-gray-50"
                rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
                gutterSelectedClass="!bg-blue-100"
                gutterHoverClass="!bg-gray-50"
              />
            </div>
          </div>

          {/* 모델 */}
          <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
            {/* <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2"> */}
            <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 h-12">

              <div className="text-sm font-semibold text-zinc-800">모델</div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={disableNew || !selectedCar}
                  className={[
                    "inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm font-medium",
                    disableNew || !selectedCar
                      ? "border-zinc-200 bg-white text-zinc-300 cursor-not-allowed"
                      : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
                  ].join(" ")}
                  onClick={() => {
                    setNewModelName("");
                    setOpenModelNew(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  신규
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <FixedHeadTable
                rows={modelRows}
                columns={modelCols}
                height={tableBodyH}
                rowKey={(r) => `${r.codecar}-${r.modelcode}`}                // 안정 키
                selectedKey={selectedModel ? `${selectedCarCodecar}-${selectedModel.modelcode}` : null} 
                onRowClick={(row) => setSelectedModel(row)}
                onRowDoubleClick={(row) => {
                  setSelectedModel(row);
                  doSelect(selectedCar, row);
                }}
                rowHoverClass="hover:!bg-gray-50"
                rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"           // 모델 선택바 표시
                gutterSelectedClass="!bg-blue-100"
                gutterHoverClass="!bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* 하단 */}
        <div className="mt-3 flex items-center gap-3">
          <div className="text-sm text-zinc-600">
            선택된 항목: <span className="font-semibold text-zinc-900">{selectedText}</span>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              disabled={!selectedMaker || !selectedCar || (!estCodecarOnly && !selectedModel)}
              onClick={() => doSelect(selectedCar, selectedModel)}
            >
              선택
            </button>
          </div>
        </div>
      </SimpleModal>

      <SmallModal
        open={openCarNew}
        onClose={() => setOpenCarNew(false)}
        title="차량 등록"
        widthClass="w-[560px]"
      >
        <div className="space-y-3">
          {/* 제작사 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">제작사</div>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none"
              value={selectedMaker?.codename ?? ""}
              readOnly
            />
          </div>

          {/* 차종 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">차종</div>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none"
              value={kindLabel(carkind)}
              readOnly
            />
          </div>

          {/* 등급 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">등급</div>
            <select
              className="select-base h-10 "
              value={newCarGrade}
              onChange={(e) => setNewCarGrade(e.target.value)}
            >
              {gradeOptionsByKind(carkind).map((g) => (
                <option key={g.value} value={String(g.value)}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 차량명 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">차량명</div>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none"
              placeholder="차량명을 입력하세요"
              value={newCarName}
              onChange={(e) => setNewCarName(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-4 flex justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={() => setOpenCarNew(false)}
          >
            취소
          </button>
          <button
            type="button"
            className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={!selectedMaker || !newCarName.trim()}
            onClick={() => {
              // TODO: API 연결
              const payload = {
                makerSubcode: selectedMaker?.subcode,
                makerName: selectedMaker?.codename,
                carkind,
                cargrade: Number(newCarGrade || 0),
                carname: newCarName.trim(),
              };
              console.log("차량 신규 저장", payload);
              alert("차량 신규 저장(TODO)");
              setOpenCarNew(false);
            }}
          >
            저장
          </button>
        </div>
      </SmallModal>

      {/* 모델 신규 등록 */}
      <SmallModal
        open={openModelNew}
        onClose={() => setOpenModelNew(false)}
        title="모델 신규 등록"
        widthClass="w-[560px]"
      >
        <div className="space-y-3">
          {/* 제작사 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">제작사</div>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none"
              value={selectedMaker?.codename ?? ""}
              readOnly
            />
          </div>

          {/* 차명 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">차명</div>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none"
              value={selectedCar?.carname ?? ""}
              readOnly
            />
          </div>

          {/* 모델명 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <div className="text-sm font-semibold text-zinc-700">모델명</div>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none"
              placeholder="모델명을 입력하세요"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-4 flex justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={() => setOpenModelNew(false)}
          >
            취소
          </button>
          <button
            type="button"
            className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={!selectedMaker || !selectedCar || !newModelName.trim()}
            onClick={() => {
              // TODO: API 연결
              const payload = {
                makerSubcode: selectedMaker?.subcode,
                makerName: selectedMaker?.codename,
                codecar: selectedCar?.codecar,
                carname: selectedCar?.carname,
                modelname: newModelName.trim(),
              };
              console.log("모델 신규 저장", payload);
              alert("모델 신규 저장(TODO)");
              setOpenModelNew(false);
            }}
          >
            저장
          </button>
        </div>
      </SmallModal>

      
    </>
  );

  
    

  


}
