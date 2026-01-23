// src/pages/estimate/EstimateEditPage.jsx
import React, { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import EstimateHeaderBar from "./EstimateHeaderBar";
import EstimateReception from "./EstimateReception";
import EstimateSidePanel from "./EstimateSidePanel";
import EstimateItemsTable from "./EstimateItemsTable";

import AlertModal from "../../components/AlertModal";
import { formatNumber } from "../../utils/numberFormat";

// 화면만 코딩: 더미 데이터
const seedMaster = {
  carNo: "11가1234",
  carName: "더 뉴 K9",
  modelName: "3.3 GDI",
  mileage: 50000,
  vin: "KMHEU41BP5A046004",

  customerName: "고객명",
  hp0: "010",
  hp1: "3793",
  hp2: "2209",
  email: "format2000@hanmail.net",
  status: "01 작업준비중",

  inDate: "2025-01-09",
  outPlanDate: "2025-06-04",
  outPlanHour: "10",
  outDate: "2025-06-04",
  billDate: "",
  regDate: "2020-07-29",

  // 우측 패널(차량접수/공임설정)
  altCar: "0315014 제네시스 DH",
  paintType: "0315014 승용-고급형",
  estKind: "12 보험",
  writer: "이명기",
  extraAgree: false,

  mhR: 40000,
  mhB: 40000,
  mhP: 40000,
  bakeAmt: 15869,
  coat: "2코트",
  paintMat: "2 수용성",
  detachWork: "3 연합회",
  paintWork: "3 연합회",
  manager: "책임자",
  bakeClaim: true,
};

function seedRows() {
  return [
    { estb_orgseqno: 1001, estb_seqno: 1, payno: "A01", paykind: "1", payname: "프런트범퍼 커버", workcode: "X", workcodename: "교환", qty: 3.94, paysum: 157600, partsum: 0, partCode: "", molit: "B03", state: "" },
    { estb_orgseqno: 1002, estb_seqno: 2, payno: "A01", paykind: "3", payname: "카바 전범퍼", workcode: "", workcodename: "", qty: 1, paysum: 0, partsum: 121000, partCode: "865403T000", molit: "", state: "신품" },
    { estb_orgseqno: 1003, estb_seqno: 3, payno: "A01", paykind: "6", payname: "프런트범퍼 커버", workcode: "P", workcodename: "도장", qty: 2.93, paysum: 117200, partsum: 72300, partCode: "", molit: "B03", state: "외측판금도장" },
    { estb_orgseqno: 1101, estb_seqno: 4, payno: "A02", paykind: "1", payname: "프런트범퍼 레일", workcode: "R", workcodename: "탈착", qty: 0.58, paysum: 23200, partsum: 0, partCode: "", molit: "B03", state: "" },
    { estb_orgseqno: 1102, estb_seqno: 5, payno: "A02", paykind: "4", payname: "스티프너", workcode: "B", workcodename: "판금", qty: 1, paysum: 40000, partsum: 0, partCode: "", molit: "", state: "" },
  ];
}

export default function EstimateEditPage() {
  const navigate = useNavigate();
  const { est_serial } = useParams();

  const [master, setMaster] = useState(seedMaster);
  const [rows, setRows] = useState(seedRows());

  const [sortMode, setSortMode] = useState("block"); // "block" | "free"

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedOrgSeq, setSelectedOrgSeq] = useState(null);

  const selectedRow = useMemo(
    () => rows.find((r) => r.estb_orgseqno === selectedOrgSeq) ?? null,
    [rows, selectedOrgSeq]
  );

  const totals = useMemo(() => {
    const labor = rows.reduce((s, r) => s + (Number(r.paysum) || 0), 0);
    const part = rows.reduce((s, r) => s + (Number(r.partsum) || 0), 0);
    const supply = labor + part;
    const vat = Math.floor(supply * 0.1);
    const total = supply + vat;
    return { labor, part, supply, vat, total };
  }, [rows]);

  // 즉시 행 추가(선택 라인 밑으로)
  // const addRowBelow = useCallback(
  //   (paykindToAdd) => {
  //     if (!selectedRow) return;

  //     const payno = selectedRow.payno;

  //     // 같은 payno 블록 마지막 아래로 붙이기
  //     let lastIdx = -1;
  //     rows.forEach((r, i) => {
  //       if (r.payno === payno) lastIdx = i;
  //     });

  //     const newOrg = Date.now(); // 화면만 코딩
  //     const newRow = {
  //       estb_orgseqno: newOrg,
  //       estb_seqno: 0,
  //       payno,
  //       paykind: String(paykindToAdd), // '4' or '5'
  //       workcode: "",
  //       payname: "",
  //       work: "",
  //       qty: 0,
  //       paysum: 0,
  //       partsum: 0,
  //       partCode: "",
  //       molit: "",
  //       state: "",
  //     };

  //     const next = [...rows];
  //     next.splice(lastIdx + 1, 0, newRow);
  //     setRows(next.map((r, i) => ({ ...r, estb_seqno: i + 1 })));
  //     setSelectedOrgSeq(newOrg);
  //   },
  //   [rows, selectedRow]
  // );

  const removeSelected = useCallback(() => {
    if (!selectedRow) return;
    const next = rows.filter((r) => r.estb_orgseqno !== selectedRow.estb_orgseqno);
    setRows(next.map((r, i) => ({ ...r, estb_seqno: i + 1 })));
    setSelectedOrgSeq(null);
  }, [rows, selectedRow]);

  const movePaintToBottom = useCallback(() => {
    const paint = rows.filter((r) => r.paykind === "6");
    const others = rows.filter((r) => r.paykind !== "6");
    setRows([...others, ...paint].map((r, i) => ({ ...r, estb_seqno: i + 1 })));
  }, [rows]);

  const handleSaveAndList = useCallback(() => {
    // 저장 시 오더 재부여(델파이 방식)
    const seqReNumbered = rows.map((r, i) => ({ ...r, estb_seqno: i + 1 }));
    setRows(seqReNumbered);

    // TODO: master 저장 -> detail 저장 -> 목록 이동
    alert("저장/목록 (화면만)");
    // navigate("/estimate/insurance"); // 실제 목록 라우트에 맞춰서 나중에
  }, [rows]);

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">견적내역</div>
              <div className="text-xs text-zinc-500">견적번호 {est_serial}</div>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => navigate(-1)}
              >
                목록
              </button>
            </div>
          </div>

          <div className="mt-2">
            <EstimateHeaderBar onSaveAndList={handleSaveAndList} />
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}   
      <div className="app-container py-3 mb-16 min-h-0 flex-1 flex flex-col gap-3">
        <div className="min-h-0 flex-1 flex gap-3 min-w-0">
          {/* 좌: 접수 + 테이블 */}
          <div className="min-h-0 flex-1 flex flex-col gap-2 min-w-0">
            <EstimateReception master={master} setMaster={setMaster} />

            <div className="min-h-0 flex-1 flex flex-col min-w-0">
              <EstimateItemsTable
                rows={rows}
                setRows={setRows}
                selectedOrgSeq={selectedOrgSeq}
                setSelectedOrgSeq={setSelectedOrgSeq}
                sortMode={sortMode}
                setSortMode={setSortMode}
                // onAddLabor={() => addRowBelow("4")}
                // onAddPart={() => addRowBelow("5")}
                onDelete={() => setDeleteOpen(true)}
                onMovePaintToBottom={movePaintToBottom}
              />
              
            </div>
            {/* <div className="h-16 flex-none" /> */}
          </div>

          {/* 우: 슬라이드 패널 */}
          <EstimateSidePanel master={master} setMaster={setMaster} />
        </div>
      </div>

      {/* 삭제 confirm */}
      <AlertModal
        open={deleteOpen}
        type="delete"
        title="삭제"
        message="선택한 항목을 삭제할까요?"
        confirmText="삭제"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          removeSelected();
        }}
      />
    </div>
  );
}
