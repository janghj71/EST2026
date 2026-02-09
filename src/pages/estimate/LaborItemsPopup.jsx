import React, { useEffect, useMemo, useState, useCallback } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { X, Trash2,  Save,} from "lucide-react";
import IconBtn from "../../components/IconBtn";


const AREA_DEFS = [
  { label: "프런트범퍼", seccode: "1A" },
  { label: "엔진", seccode: "1B" },
  { label: "트랜스미션", seccode: "1C" },
  { label: "흡기", seccode: "1D" },
  { label: "배기", seccode: "1E" },
  { label: "일반", seccode: "1F" },
  { label: "후드", seccode: "1G" },
  { label: "헤드램프", seccode: "1H" },
  { label: "프런트펜더", seccode: "1I" },
  { label: "프런트패널", seccode: "1J" },
  { label: "휠하우스및사이드멤버", seccode: "1K" },
  { label: "카울 및 대쉬", seccode: "1L" },
  { label: "프런트서스펜션", seccode: "1M" },
  { label: "서브프레임", seccode: "1N" },
  { label: "트랙션모터(프런트)", seccode: "1P" },
  { label: "감속기(프런트)", seccode: "1Q" },
  { label: "프레임(프런트)", seccode: "1R" },
  { label: "프런트범퍼", seccode: "2A" },
  { label: "콘솔박스", seccode: "2B" },
  { label: "시트", seccode: "2C" },
  { label: "루프", seccode: "2D" },
  { label: "바닥패널", seccode: "2E" },
  { label: "백패널", seccode: "2F" },
  { label: "유리", seccode: "2G" },
  { label: "후드및헤드램프", seccode: "2H" },
  { label: "프런트패널", seccode: "2I" },
  { label: "프런트도어", seccode: "2J" },
  { label: "프런트필러", seccode: "2K" },
  { label: "사이드", seccode: "2L" },
  { label: "리어필러", seccode: "2M" },
  { label: "스티어링컬럼", seccode: "2N" },
  { label: "크러쉬패드", seccode: "2O" },
  { label: "리어도어", seccode: "2P" },
  { label: "센터필러", seccode: "2Q" },
  { label: "프런트필러", seccode: "3A" },
  { label: "프런트도어", seccode: "3B" },
  { label: "리어도어", seccode: "3C" },
  { label: "센터필러", seccode: "3D" },
  { label: "사이드스텝", seccode: "3E" },
  { label: "사이드프레임", seccode: "3F" },
  { label: "리어게이트", seccode: "4A" },
  { label: "사이드게이트", seccode: "4B" },
  { label: "로드레스트", seccode: "4C" },
  { label: "리어데크", seccode: "4D" },
  { label: "루프", seccode: "5A" },
  { label: "기타유리", seccode: "5B" },
  { label: "앞유리", seccode: "5C" },
  { label: "뒷유리", seccode: "5D" },
  { label: "크러쉬패드", seccode: "5E" },
  { label: "콘솔박스", seccode: "5F" },
  { label: "스티어링컬럼", seccode: "5G" },
  { label: "시트", seccode: "5H" },
  { label: "바닥패널", seccode: "5I" },
  { label: "연료탱크", seccode: "5J" },
  { label: "고전압배터리", seccode: "5K" },
  { label: "프레임(센터)", seccode: "5L" },
  { label: "프런트", seccode: "6A" },
  { label: "연료", seccode: "6B" },
  { label: "일반", seccode: "6C" },
  { label: "프런트서스펜션", seccode: "6D" },
  { label: "엔진", seccode: "6E" },
  { label: "흡기", seccode: "6F" },
  { label: "배기", seccode: "6G" },
  { label: "트랜스미션", seccode: "6H" },
  { label: "센터", seccode: "6J" },
  { label: "리어", seccode: "6K" },
  { label: "리어서스펜션", seccode: "6L" },
  { label: "리어범퍼", seccode: "7A" },
  { label: "백도어", seccode: "7B" },
  { label: "리어쿼터패널및백패널", seccode: "7C" },
  { label: "패키지트레이패널", seccode: "7D" },
  { label: "리어사이드멤버", seccode: "7E" },
  { label: "트렁크바닥", seccode: "7F" },
  { label: "리어서스펜션", seccode: "7G" },
  { label: "트랙션모터(리어)", seccode: "7H" },
  { label: "감속기(리어)", seccode: "7J" },
  { label: "리어데크", seccode: "7K" },
  { label: "프레임(리어)", seccode: "7L" },
];
const AREA_ORDER_STORAGE_KEY = "LaborItems_AreaOrder_v1";


// assets/areas 폴더의 모든 이미지 자동 로드 (gif/png/jpg/webp)
const areaImageModules = import.meta.glob("../../assets/areas/*.gif", {
  eager: true,
});

function buildAreaImageMap() {
  const map = {};
  for (const path in areaImageModules) {
    const mod = areaImageModules[path];
    const url = mod?.default;
    const filename = path.split("/").pop() || "";
    const code = filename.split(".")[0]; 
    if (code && url) map[code] = url;
  }
  return map;
}

const AREA_IMG_MAP = buildAreaImageMap();

function seedWorkItems() {
  // 작업항목명 목록(샘플) : payno, payname, seccode
  const sec = (code) => code; // 가독성용

  return [
    // 1A: 프런트범퍼
    { payno: "A01", payname: "프런트범퍼 커버", seccode: sec("1A") },
    { payno: "A02", payname: "프런트범퍼 레일", seccode: sec("1A") },

    // 1B: 엔진
    { payno: "B11", payname: "엔진 커버", seccode: sec("1B") },
    { payno: "B12", payname: "엔진 마운트", seccode: sec("1B") },

    // 1C: 트랜스미션
    { payno: "C11", payname: "트랜스미션 하우징", seccode: sec("1C") },
    { payno: "C12", payname: "클러치 커버", seccode: sec("1C") },

    // 1D: 하체
    { payno: "D11", payname: "서브프레임", seccode: sec("1D") },
    { payno: "D12", payname: "로어암(좌)", seccode: sec("1D") },

    // 1E: 배기
    { payno: "E11", payname: "촉매", seccode: sec("1E") },
    { payno: "E12", payname: "머플러", seccode: sec("1E") },

    // 1F: 일반
    { payno: "F11", payname: "일반 점검", seccode: sec("1F") },
    { payno: "F12", payname: "기타 작업", seccode: sec("1F") },
  ];
}


function seedWorkTimes() {
  // 작업/시간(샘플): payno, workcode, workname, hour
  return [
    { payno: "A01", workcode: "X", workname: "교환", hour: 3.94 },
    { payno: "A01", workcode: "R", workname: "탈착", hour: 1.2 },
    { payno: "A02", workcode: "R", workname: "탈착", hour: 0.58 },
    { payno: "A02", workcode: "B", workname: "판금", hour: 1.0 },
    // { payno: "C21", workcode: "S", workname: "판금", hour: 0.8 },
    // { payno: "C21", workcode: "P", workname: "도장", hour: 2.1 },
    { payno: "B11", workcode: "R", workname: "탈착", hour: 0.5 },
    { payno: "B12", workcode: "X", workname: "교환", hour: 0.9 },
    { payno: "C11", workcode: "S", workname: "판금", hour: 0.8 },
    // { payno: "C12", workcode: "P", workname: "도장", hour: 2.1 },
    { payno: "D11", workcode: "B", workname: "판금", hour: 1.4 },
    { payno: "E11", workcode: "R", workname: "탈착", hour: 0.7 },
    { payno: "F11", workcode: "O", workname: "점검", hour: 0.3 },
  ];
}

function seedPaints() {
  // 도장 목록(샘플): payno, pntcot_nm, oilpnt_m, oilpnt_h, pnt_m, pnt_h
  return [
    { payno:"A01", pntcot:"2", pntcot_nm: "2코트",
      oilpnt_m:12000, oilpnt_h:0.4,
      oilpnt_mb:11000, oilpnt_hb:0.38,
      oilextr21_m:8000, oilextr21_h:0.30,
      oilextr22_m:15000, oilextr22_h:0.50,
      pnt_m:9000, pnt_h:0.35,
      pnt_mb:8500, pnt_hb:0.33,
      extr21_m:6000, extr21_h:0.25,
      extr22_m:11000, extr22_h:0.45
    },
    { payno: "A01", pntcot:"3", pntcot_nm: "3코트", oilpnt_m: 8000, oilpnt_h: 0.3, pnt_m: 6000, pnt_h: 0.25 },
    { payno: "C21", pntcot:"2", pntcot_nm: "2코트", oilpnt_m: 15000, oilpnt_h: 0.5, pnt_m: 11000, pnt_h: 0.45 },
    { payno: "B12", pntcot:"2", pntcot_nm: "2코트", oilpnt_m: 12000, oilpnt_h: 0.4, pnt_m: 9000, pnt_h: 0.35 },
    { payno: "B12", pntcot:"3", pntcot_nm: "3코트", oilpnt_m: 8000, oilpnt_h: 0.3, pnt_m: 6000, pnt_h: 0.25 },
    { payno: "D11", pntcot:"2", pntcot_nm: "2코트", oilpnt_m: 15000, oilpnt_h: 0.5, pnt_m: 11000, pnt_h: 0.45 },

  ];
}

function seedParts() {
  // 부품 목록(샘플): payno, partno, partname, price
  return [
    { payno: "A01", partno: "865403T000", partname: "카바 전범퍼", price: 121000 },
    { payno: "A02", partno: "0000000001", partname: "스티프너", price: 35000 },
    { payno: "C21", partno: "0000000002", partname: "후드 인슐레이터", price: 28000 },
    { payno: "B12", partno: "865403T000", partname: "카바 전범퍼", price: 121000 },
    { payno: "B12", partno: "0000000001", partname: "스티프너", price: 35000 },
    { payno: "B12", partno: "0000000002", partname: "후드 인슐레이터", price: 28000 },

  ];
}


function formatNumber(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString();
}

function getPaintMH(row, solvent, coatKind) {
  const map = {
    oil: {
      swap:    { h: "oilpnt_h",    m: "oilpnt_m" },
      outer:   { h: "oilpnt_hb",   m: "oilpnt_mb" },
      surface: { h: "oilextr21_h", m: "oilextr21_m" },
      front:   { h: "oilextr22_h", m: "oilextr22_m" },
    },
    pnt: {
      swap:    { h: "pnt_h",    m: "pnt_m" },
      outer:   { h: "pnt_hb",   m: "pnt_mb" },
      surface: { h: "extr21_h", m: "extr21_m" },
      front:   { h: "extr22_h", m: "extr22_m" },
    },
  };

  const f = map[solvent]?.[coatKind];
  if (!f) return { h: 0, m: 0 };

  return {
    h: Number(row?.[f.h] ?? 0),
    m: Number(row?.[f.m] ?? 0),
  };
}

export default function LaborItemsPopup() {
  const ctx = useUrlContextSnapshot({
    storageKey: "LaborItemsCtx",
    keys: ["est_serial", "carno","codecar","est_codecar","carname"],
    cleanPath: "/labor-items",
  });

  const [estSerial, setEstSerial] = useState(() => ctx.est_serial || "");
  const [carNo, setCarNo] = useState(() => ctx.carno || "");
  const [codecar, setCodecar] = useState(() => ctx.codecar || "");
  const [estCodecar, setEstCodecar] = useState(() => ctx.est_codecar || "");
  const [carName, setCarName] = useState(() => ctx.carname || "");
  
  const hydratedRef = React.useRef(false);

  useEffect(() => {
    // ctx가 있으면 무조건 저장 (F5 대비)
    if (!ctx.est_serial && !ctx.carno && !ctx.codecar && !ctx.est_codecar) return;

    try {
      sessionStorage.setItem(
        "LaborItemsCtx",
        JSON.stringify({
          est_serial: ctx.est_serial || "",
          carno: ctx.carno || "",
          codecar: ctx.codecar || "",
          est_codecar: ctx.est_codecar || "",
          carname: ctx.carname || "",
        })
      );
    } catch { /* empty */ }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx.est_serial && !estSerial) setEstSerial(ctx.est_serial);
    if (ctx.carno && !carNo) setCarNo(ctx.carno);
    if (ctx.codecar && !codecar) setCodecar(ctx.codecar);
    if (ctx.est_codecar && !estCodecar) setEstCodecar(ctx.est_codecar);
    if (ctx.carname && !carName) setCarName(ctx.carname);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.est_serial, ctx.carno, ctx.codecar, ctx.est_codecar, ctx.carname]);

  const postPick = useCallback((payload) => {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "LABOR_ITEMS_PICK", payload },
          window.location.origin
        );
      }
    } catch {}
  }, []);

  const [selectedWorkTimeRow, setSelectedWorkTimeRow] = useState(null);
  const [selectedPaintRow, setSelectedPaintRow] = useState(null);
  const [selectedPartRow, setSelectedPartRow] = useState(null);
    
  const [workItems] = useState(seedWorkItems);
  const [workTimes] = useState(seedWorkTimes);
  const [paints] = useState(seedPaints);
  const [parts] = useState(seedParts);

  const [paintSolvent, setPaintSolvent] = useState("pnt"); // "pnt"=수용성, "oil"=유용성
  const [coatKind, setCoatKind] = useState("swap");

  const [selectedSec, setSelectedSec] = useState(""); // 기본
  const [selectedPayno, setSelectedPayno] = useState("");
  const [workSearch, setWorkSearch] = useState("");

  const [areaOrder, setAreaOrder] = useState(() => {
    try {
      const raw = localStorage.getItem(AREA_ORDER_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
  
      // saved가 ["1A","1B",...] 형태라고 가정
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return AREA_DEFS.map((a) => a.seccode); // 기본순서
  });
  
  const [dragSec, setDragSec] = useState("");
  
  // const areaTiles = useMemo(() => {
  //   return AREA_DEFS.map((a) => ({
  //     ...a,
  //     img: AREA_IMG_MAP[a.seccode] || null,
  //   }));
  // }, []);

  const areaTiles = useMemo(() => {
    // 1) 정의를 맵으로 만들어서
    const byCode = new Map(AREA_DEFS.map((a) => [a.seccode, a]));
  
    // 2) 저장된 순서(areaOrder)를 우선 적용
    const ordered = [];
  
    for (const code of areaOrder) {
      const def = byCode.get(code);
      if (def) {
        ordered.push({
          ...def,
          img: AREA_IMG_MAP[def.seccode] || null,
        });
        byCode.delete(code);
      }
    }
  
    // 3) 새로 추가된 영역(저장에 없는 것)은 뒤에 붙임
    for (const def of byCode.values()) {
      ordered.push({
        ...def,
        img: AREA_IMG_MAP[def.seccode] || null,
      });
    }
  
    return ordered;
  }, [areaOrder]);
  
  const moveArea = useCallback((fromCode, toCode) => {
    if (!fromCode || !toCode || fromCode === toCode) return;
  
    setAreaOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromCode);
      const toIdx = next.indexOf(toCode);
      if (fromIdx < 0 || toIdx < 0) return prev;
  
      // from을 빼서 to 위치로 삽입 (드래그 이동)
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromCode);
      return next;
    });
  }, []);
  

  const onPickArea = (sec) => {
    setSelectedSec(sec);
    setWorkSearch(""); 
    const first = workItems.find((x) => x.seccode === sec);
    if (first) setSelectedPayno(first.payno);
  };
  



  const filteredWorkItems = useMemo(() => {
    const q = workSearch.trim().toLowerCase();
  
    // 1) 검색이 있으면: "전체"에서 검색 (영역 무시)
    if (q) {
      return workItems.filter((x) => {
        const payno = String(x.payno || "").toLowerCase();
        const name = String(x.payname || "").toLowerCase();
        return payno.includes(q) || name.includes(q);
      });
    }
  
    // 2) 검색이 없고 영역 선택이 있으면: 영역 필터
    if (selectedSec) {
      return workItems.filter((x) => x.seccode === selectedSec);
    }
  
    // 3) 아무 필터 없으면: 전체
    return workItems;
  }, [workItems, selectedSec, workSearch]);
  
    
  const effectivePayno = useMemo(() => {
    if (selectedPayno && filteredWorkItems.some((x) => x.payno === selectedPayno)) return selectedPayno;
    return filteredWorkItems[0]?.payno ?? "";
  }, [selectedPayno, filteredWorkItems]);

  const selectedWorkItem = useMemo(
    () => filteredWorkItems.find((x) => x.payno === effectivePayno) ?? null,
    [filteredWorkItems, effectivePayno]
  );

  const filteredWorkTimes = useMemo(
    () => workTimes.filter((x) => x.payno === effectivePayno),
    [workTimes, effectivePayno]
  );

  const filteredPaints = useMemo(() => {
    return paints.filter((x) => x.payno === effectivePayno);
  }, [paints, effectivePayno]);
  

  const filteredParts = useMemo(
    () => parts.filter((x) => x.payno === effectivePayno),
    [parts, effectivePayno]
  );


  const workItemCols = useMemo(
    () => [
      {
        key: "payname",
        title: "작업항목명",
        width: "1fr",
        className: "px-2 py-0",
        render: (_v, row) => <div className="h-8 flex items-center truncate">{row.payname}</div>,
      },
      // {
      //   key: "pick",
      //   title: "",
      //   width: "76px",
      //   align: "center",
      //   className: "px-2 py-0",
      //   render: (_v, row) =>
      //     colBtn(() =>
      //       postPick({
      //         type: "workItem",
      //         payno: row.payno,
      //         payname: row.payname,
      //         seccode: row.seccode,
      //       })
      //     ),
      // },
    ],
    // [postPick]
    []
  );

  const workTimeCols = useMemo(
    () => [
      {
        key: "workname",
        title: "작업",
        width: "1fr",
        className: "px-2 py-0",
        render: (_v, row) => <div className="h-8 flex items-center truncate">{row.workname}</div>,
      },
      {
        key: "hour",
        title: "시간",
        width: "90px",
        align: "right",
        className: "px-2 py-0",
        render: (_v, row) => <div className="h-8 flex items-center justify-end tabular-nums">{row.hour}</div>,
      },
      
    ],
    []
  );

  
  const paintCols = useMemo(
    () => [
      {
        key: "pntcot_nm",
        title: "코트명",
        width: "120px",
        className: "px-2 py-0",
        render: (_v, row) => (
          <div className="h-8 flex items-center truncate">{row.pntcot_nm}</div>
        ),
      },
      {
        key: "payname",
        title: "도장명",
        width: "1fr",
        className: "px-2 py-0",
        render: () => (
          <div className="h-8 flex items-center truncate">
            {selectedWorkItem?.payname ?? ""}
          </div>
        ),
      },
      {
        key: "mat",
        title: "재료대",
        width: "110px",
        align: "right",
        className: "px-2 py-0",
        render: (_v, row) => {
          const { m } = getPaintMH(row, paintSolvent, coatKind);
          return (
            <div className="h-8 flex items-center justify-end tabular-nums">
              {formatNumber(m)}
            </div>
          );
        },
      },
      {
        key: "hour",
        title: "시간",
        width: "90px",
        align: "right",
        className: "px-2 py-0",
        render: (_v, row) => {
          const { h } = getPaintMH(row, paintSolvent, coatKind);
          return (
            <div className="h-8 flex items-center justify-end tabular-nums">
              {h}
            </div>
          );
        },
      },
    ],
    [paintSolvent, coatKind, selectedWorkItem]
  );
  

  const partCols = useMemo(
    () => [
      {
        key: "partno",
        title: "부품코드",
        width: "140px",
        className: "px-2 py-0",
        render: (_v, row) => <div className="h-8 flex items-center truncate">{row.partno}</div>,
      },
      {
        key: "partname",
        title: "부품명",
        width: "1fr",
        className: "px-2 py-0",
        render: (_v, row) => <div className="h-8 flex items-center truncate">{row.partname}</div>,
      },
      {
        key: "price",
        title: "부품단가",
        width: "120px",
        align: "right",
        className: "px-2 py-0",
        render: (_v, row) => (
          <div className="h-8 flex items-center justify-end tabular-nums">{formatNumber(row.price)}</div>
        ),
      },
      
    ],
    []
  );

 
  useEffect(() => {
    setSelectedWorkTimeRow(filteredWorkTimes[0] ?? null);
  }, [effectivePayno, filteredWorkTimes]);
  
  useEffect(() => {
    setSelectedPaintRow(filteredPaints[0] ?? null);
  }, [effectivePayno, filteredPaints]);
  
  useEffect(() => {
    setSelectedPartRow(filteredParts[0] ?? null);
  }, [effectivePayno, filteredParts]);
  
  useEffect(() => {
    try {
      localStorage.setItem(AREA_ORDER_STORAGE_KEY, JSON.stringify(areaOrder));
    } catch { /* empty */ }
  }, [areaOrder]);
  
  return (
  
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">공임항목</div>
            <div className="text-sm text-zinc-500">
              수리차명: {carName || "-"} / 차량번호: {carNo || "-"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
            
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 flex gap-3 p-3 bg-zinc-50">
        {/* 좌: 영역 */}
        <div className="w-[340px] min-h-0 rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col">

          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200">
            <div className="text-sm font-semibold text-zinc-800">영역</div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={() => setSelectedSec("")}
                title="영역 필터 해제"
              >
                영역 필터 해제
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            <div className="grid grid-cols-3 gap-3">
              {areaTiles.map((a) => {
                const active = a.seccode === selectedSec;
                
                return (
                  <button
                    key={a.seccode}
                    type="button"
                    draggable
                    className={[
                      "h-[130px] rounded-md border-2 p-2 text-left bg-white",
                      active
                        ? "border-red-400"
                        : "border-zinc-200 hover:border-zinc-400",
                      dragSec === a.seccode ? "opacity-60" : "",
                    ].join(" ")}
                    onClick={() => onPickArea(a.seccode)}
                    onDragStart={(e) => {
                      setDragSec(a.seccode);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", a.seccode);
                    }}

                    onDragEnd={() => setDragSec("")}
                    onDragOver={(e) => {
                      // drop 허용
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}

                    onDrop={(e) => {
                      e.preventDefault();
                      const from = e.dataTransfer.getData("text/plain") || dragSec;
                      const to = a.seccode;
                      moveArea(from, to);
                      setDragSec("");
                    }}
                  >
                    <div 
                      className="h-[90px] w-full rounded-md bg-white/60 flex items-center justify-center overflow-hidden"
                    >
                      {a.img ? (
                        <img
                          src={a.img}
                          alt={a.label}
                          className="h-[84px] w-auto object-contain"
                          draggable={false}
                        />
                      ) : (
                        <div className="text-xs text-zinc-400">{a.seccode}</div>
                      )}
                    </div>
            
                    <div
                      className={[
                        "mt-2 text-sm font-semibold",
                        "truncate whitespace-nowrap",
                        "text-zinc-900",
                      ].join(" ")}
                      title={a.label}  
                    >
                      {a.label}
                    </div>

                  </button>
                );  


              })}
            </div>
          </div>
        </div>

        {/* 우: 3단(상/중/하) */}
        <div className="min-w-0 min-h-0 flex-1 flex flex-col gap-2">
          {/* 우(상단): 작업항목 + 작업/시간 (쌍) */}
          <div className="min-h-0 flex-[1.2] grid grid-cols-2 gap-3">
            <div className="min-h-0 rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col">
              
              <div className="px-3 py-2 border-b border-zinc-200 flex items-center">
                <div className="text-sm font-semibold text-zinc-800">
                  작업항목
                  <span className="ml-2 text-xs text-zinc-500">
                    (영역: {selectedSec || "-"})
                  </span>
                </div>

                <div className="ml-auto">
                  <button
                    type="button"
                    disabled={!selectedWorkItem}
                    className={[
                      "rounded-md px-3 py-1.5 text-xs font-semibold",
                      selectedWorkItem
                        ? "bg-zinc-900 text-white hover:bg-zinc-800"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                    ].join(" ")}
                    onClick={() =>
                      selectedWorkItem &&
                      postPick({
                        type: "workItem",
                        payno: selectedWorkItem.payno,
                        payname: selectedWorkItem.payname,
                        seccode: selectedWorkItem.seccode,
                      })
                    }
                  >
                    선택
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <FixedHeadTable
                  columns={workItemCols}
                  rows={filteredWorkItems}
                  rowKey={(r) => r.payno}
                  rowSize="sm"
                  selectedKey={effectivePayno}
                  onRowClick={(row) => setSelectedPayno(row.payno)}
                  onRowDoubleClick={(row) =>
                    postPick({ type: "workItem", payno: row.payno, payname: row.payname, seccode: row.seccode })
                  }
                />
              </div>
            </div>

            <div className="min-h-0 rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col">

              <div className="px-3 py-2 border-b border-zinc-200 flex items-center">
                <div className="text-sm font-semibold text-zinc-800">
                  작업 / 시간
                </div>

                <div className="ml-auto">
                  <button
                    type="button"
                    disabled={!selectedWorkTimeRow}
                    className={[
                      "rounded-md px-3 py-1.5 text-xs font-semibold",
                      selectedWorkTimeRow
                        ? "bg-zinc-900 text-white hover:bg-zinc-800"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                    ].join(" ")}
                    onClick={() => {
                      if (!selectedWorkTimeRow) return;
                      postPick({
                        type: "workTime",
                        payno: effectivePayno,
                        payname: selectedWorkItem?.payname ?? "",
                        workcode: selectedWorkTimeRow.workcode,
                        workname: selectedWorkTimeRow.workname,
                        hour: selectedWorkTimeRow.hour,
                      });
                    }}
                  >
                    선택
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <FixedHeadTable
                  columns={workTimeCols}
                  rows={filteredWorkTimes}
                  rowKey={(r, i) => `${r.payno}-${r.workcode}-${i}`}
                  rowSize="sm"
                  selectedKey={
                    selectedWorkTimeRow
                      ? `${selectedWorkTimeRow.payno}-${selectedWorkTimeRow.workcode}-${filteredWorkTimes.indexOf(selectedWorkTimeRow)}`
                      : ""
                  }
                  onRowClick={(row) => setSelectedWorkTimeRow(row)}
                  onRowDoubleClick={(row) =>
                    postPick({
                      type: "workTime",
                      payno: effectivePayno,
                      payname: selectedWorkItem?.payname ?? "",
                      workcode: row.workcode,
                      workname: row.workname,
                      hour: row.hour,
                    })
                  }
                />
              </div>
            </div>
          </div>
          
          {/* 검색바(작업항목) */}
          <div className="flex-none rounded-md border border-zinc-200 bg-white px-3 py-2 flex items-center gap-2">
            <div className="text-sm font-semibold text-zinc-700">작업항목 검색</div>

            <input
              value={workSearch}
              onChange={(e) => setWorkSearch(e.target.value)}
              placeholder="작업항목명 검색"
              className="h-8 flex-1 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-400"
              onKeyDown={(e) => {
                if (e.key === "Escape") setWorkSearch("");
                if (e.key === "Enter") {
                  // Enter 시 첫 항목으로 이동(원하면)
                  const first = filteredWorkItems[0];
                  if (first) setSelectedPayno(first.payno);
                }
              }}
            />

            {workSearch ? (
              <button
                type="button"
                className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs hover:bg-zinc-50"
                onClick={() => setWorkSearch("")}
              >
                지우기
              </button>
            ) : null}
          </div>



          {/* 우(중): 도장 */}
          <div className="flex-none h-[160px] rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col">

            <div className="px-3 py-2 border-b border-zinc-200 flex items-center gap-3">
              <div className="text-sm font-semibold text-zinc-800">도장</div>

              {/* 라디오 그룹 */}
              <div className="ml-2 flex items-center gap-3 text-xs text-zinc-700">
                <label className="flex items-center gap-1 select-none">
                  <input
                    type="radio"
                    name="coatKind"
                    checked={coatKind === "swap"}
                    onChange={() => setCoatKind("swap")}
                  />
                  교환도장
                </label>

                <label className="flex items-center gap-1 select-none">
                  <input
                    type="radio"
                    name="coatKind"
                    checked={coatKind === "outer"}
                    onChange={() => setCoatKind("outer")}
                  />
                  외측판금
                </label>

                <label className="flex items-center gap-1 select-none">
                  <input
                    type="radio"
                    name="coatKind"
                    checked={coatKind === "surface"}
                    onChange={() => setCoatKind("surface")}
                  />
                  표면판금
                </label>

                <label className="flex items-center gap-1 select-none">
                  <input
                    type="radio"
                    name="coatKind"
                    checked={coatKind === "front"}
                    onChange={() => setCoatKind("front")}
                  />
                  전면판금
                </label>
              </div>

              {/* 도료 타입은 “둘 중 하나만” 표시 */}
              <div className="ml-2 text-xs font-semibold text-zinc-600">
                {paintSolvent === "oil" ? "유용성" : "수용성"}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* 테스트용 토글: 나중에 공임설정 탭 값으로 자동 세팅 */}
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                  onClick={() => setPaintSolvent((v) => (v === "oil" ? "pnt" : "oil"))}
                  title="도장도료 선택(공임설정 탭 값으로 교체 예정)"
                >
                  도료변경
                </button>

                <button
                  type="button"
                  disabled={!selectedPaintRow}
                  className={[
                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                    selectedPaintRow ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                  ].join(" ")}
                  onClick={() => {
                    if (!selectedPaintRow) return;
                    const { h, m } = getPaintMH(selectedPaintRow, paintSolvent, coatKind);

                    postPick({
                      type: "paint",
                      payno: effectivePayno,
                      payname: selectedWorkItem?.payname ?? "",
                      pntcot_nm: selectedPaintRow.pntcot_nm,
                      solvent: paintSolvent, // oil|pnt
                      coatKind,              // swap|outer|surface|front
                      hour: h,
                      material: m,
                    });
                  }}
                >
                  선택
                </button>
              </div>
            </div>


            <div className="min-h-0 flex-1 overflow-hidden">
              <FixedHeadTable
                columns={paintCols}
                rows={filteredPaints}
                rowKey={(r, i) => `${r.payno}-${r.pntcot_nm}-${i}`}
                rowSize="sm"
                selectedKey={
                  selectedPaintRow
                    ? `${selectedPaintRow.payno}-${selectedPaintRow.pntcot_nm}-${filteredPaints.indexOf(selectedPaintRow)}`
                    : ""
                }
                onRowClick={(row) => setSelectedPaintRow(row)}
                onRowDoubleClick={(row) =>
                  postPick({
                    type: "paint",
                    payno: effectivePayno,
                    payname: selectedWorkItem?.payname ?? "",
                    pntcot_nm: row.pntcot_nm,
                    pnt_m: row.pnt_m,
                    pnt_h: row.pnt_h,
                    oilpnt_m: row.oilpnt_m,
                    oilpnt_h: row.oilpnt_h,
                  })
                }
              />
            </div>
          </div>

          {/* 우(하): 부품 */}
          {/* <div className="min-h-0 flex-1 rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col"> */}
          <div className="flex-none h-[260px] rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col">

            <div className="px-3 py-2 border-b border-zinc-200 flex items-center">
              <div className="text-sm font-semibold text-zinc-800">부품</div>

              <div className="ml-auto">
                <button
                  type="button"
                  disabled={!selectedPartRow}
                  className={[
                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                    selectedPartRow
                      ? "bg-zinc-900 text-white hover:bg-zinc-800"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                  ].join(" ")}
                  onClick={() => {
                    if (!selectedPartRow) return;
                    postPick({
                      type: "part",
                      payno: effectivePayno,
                      payname: selectedWorkItem?.payname ?? "",
                      partno: selectedPartRow.partno,
                      partname: selectedPartRow.partname,
                      price: selectedPartRow.price,
                    });
                  }}
                >
                  선택
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <FixedHeadTable
                columns={partCols}
                rows={filteredParts}
                rowKey={(r, i) => `${r.payno}-${r.partno}-${i}`}
                rowSize="sm"
                selectedKey={
                  selectedPartRow
                    ? `${selectedPartRow.payno}-${selectedPartRow.partno}-${filteredParts.indexOf(selectedPartRow)}`
                    : ""
                }
                onRowClick={(row) => setSelectedPartRow(row)}
                onRowDoubleClick={(row) =>
                  postPick({
                    type: "part",
                    payno: effectivePayno,
                    payname: selectedWorkItem?.payname ?? "",
                    partno: row.partno,
                    partname: row.partname,
                    price: row.price,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-zinc-200 bg-white text-xs text-zinc-600">
        선택영역: <span className="font-semibold text-zinc-800">{selectedSec || "-"}</span> ·
        선택항목: <span className="font-semibold text-zinc-800">{selectedWorkItem?.payname || "-"}</span>
      </div>
      
    </div>
  );
}
