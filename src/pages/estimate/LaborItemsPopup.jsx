import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import FixedHeadTable from "../../components/FixedHeadTable";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { X, Wrench } from "lucide-react";
import IconBtn from "../../components/IconBtn";
import { useCodepay, useCodepayHour, useCodepnt, useCodepart } from "../../hooks/useLaborItems";
import { useEstimateClaims } from "../../hooks/useEstimateClaims";
import { formatLocaleNumber } from "../../utils/numberFormat";
import { useLoading } from "../../loading/useLoading";


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

const GROUP_DEFS = {
  "1": "프런트",
  "2": "캐빈",
  "3": "사이드",
  "4": "데크/탑",
  "5": "루프/실내",
  "6": "프레임",
  "7": "리어",
};


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
    keys: ["est_serial", "carno", "codecar", "est_codecar", "carname",
           "paykind", "paint", "outday", "carkind",
           "pntkind", "pntcot_code", "pnt_m", "modelcode"],
    cleanPath: "/labor-items",
  });

  const [estSerial, setEstSerial] = useState(() => ctx.est_serial || "");
  const [carNo, setCarNo] = useState(() => ctx.carno || "");
  const [codecar, setCodecar] = useState(() => ctx.codecar || "");
  const [estCodecar, setEstCodecar] = useState(() => ctx.est_codecar || "");
  const [carName, setCarName] = useState(() => ctx.carname || "");
  const [paykind,     setPaykind]    = useState(() => ctx.paykind     || "");
  const [paint,       setPaint]      = useState(() => ctx.paint       || "");
  const [outday,      setOutday]     = useState(() => ctx.outday      || "");
  const [carkind,     setCarkind]    = useState(() => ctx.carkind     || "");
  const [pntkind,     setPntkind]    = useState(() => ctx.pntkind     || "");
  const [pntcotCode,  setPntcotCode] = useState(() => ctx.pntcot_code || "");
  // pnt_m: '1'=유용성(oil), '2'=수용성(pnt)
  const [pntM,        setPntM]       = useState(() => ctx.pnt_m       || "");
  const [modelcode,   setModelcode]  = useState(() => ctx.modelcode   || "");
  
  const hydratedRef = React.useRef(false);

  useEffect(() => {
    // ctx가 있으면 무조건 저장 (F5 대비)
    if (!ctx.est_serial && !ctx.carno && !ctx.codecar && !ctx.est_codecar) return;

    try {
      sessionStorage.setItem(
        "LaborItemsCtx",
        JSON.stringify({
          est_serial:  ctx.est_serial  || "",
          carno:       ctx.carno       || "",
          codecar:     ctx.codecar     || "",
          est_codecar: ctx.est_codecar || "",
          carname:     ctx.carname     || "",
          paykind:     ctx.paykind     || "",
          paint:       ctx.paint       || "",
          outday:      ctx.outday      || "",
          carkind:     ctx.carkind     || "",
          pntkind:     ctx.pntkind     || "",
          pntcot_code: ctx.pntcot_code || "",
          pnt_m:       ctx.pnt_m       || "",
          modelcode:   ctx.modelcode   || "",
        })
      );
    } catch { /* empty */ }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx.est_serial  && !estSerial)  setEstSerial(ctx.est_serial);
    if (ctx.carno       && !carNo)      setCarNo(ctx.carno);
    if (ctx.codecar     && !codecar)    setCodecar(ctx.codecar);
    if (ctx.est_codecar && !estCodecar) setEstCodecar(ctx.est_codecar);
    if (ctx.carname     && !carName)    setCarName(ctx.carname);
    if (ctx.paykind     && !paykind)    setPaykind(ctx.paykind);
    if (ctx.paint       && !paint)      setPaint(ctx.paint);
    if (ctx.outday      && !outday)     setOutday(ctx.outday);
    if (ctx.carkind     && !carkind)    setCarkind(ctx.carkind);
    if (ctx.pntkind     && !pntkind)    setPntkind(ctx.pntkind);
    if (ctx.pntcot_code && !pntcotCode) setPntcotCode(ctx.pntcot_code);
    if (ctx.pnt_m       && !pntM)       setPntM(ctx.pnt_m);
    if (ctx.modelcode   && !modelcode)  setModelcode(ctx.modelcode);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.est_serial, ctx.carno, ctx.codecar, ctx.est_codecar, ctx.carname,
      ctx.paykind, ctx.paint, ctx.outday, ctx.carkind,
      ctx.pntkind, ctx.pntcot_code, ctx.pnt_m, ctx.modelcode]);

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

  const { fetchCodepay }     = useCodepay();
  const { fetchCodepayHour } = useCodepayHour();
  const { fetchCodepnt }     = useCodepnt();
  const { fetchCodepart }    = useCodepart();
  const { fetchClaims }      = useEstimateClaims();
  const { withLoading }      = useLoading();
  const [workItems, setWorkItems] = useState([]);
  const [workTimes, setWorkTimes] = useState([]);
  const [paints,    setPaints]    = useState([]);
  const [parts,     setParts]     = useState([]);
  const [claims,    setClaims]    = useState([]);

  // 팝업 오픈 시 1회 호출 — carcode 확정 후 실행
  useEffect(() => {
    const carcode  = estCodecar || codecar;
    const ocarcode = codecar;
    if (!carcode) return;

    withLoading(() =>
      Promise.all([
        fetchCodepay({ carcode, ocarcode, paykind }),
        fetchCodepayHour({ carcode, ocarcode, paykind, paint, outday }),
        // 도장: carcode=master.paint, paykind=master.pntkind, ocarcode=master.est_codecar
        fetchCodepnt({ carcode: paint, paykind: pntkind, ocarcode: estCodecar }),
        // 부품: carcode=master.codecar, modelcode=master.modelcode, paykind=master.paykind
        fetchCodepart({ carcode: codecar, modelcode, paykind }),
        // 청구처(보험사 목록): est_serial 기준
        fetchClaims(estSerial),
      ]).then(([wpJson, wtJson, pntJson, ptJson, claimsJson]) => {
        if (wpJson?.result     === "OK") setWorkItems(wpJson.dataset    ?? []);
        if (wtJson?.result     === "OK") setWorkTimes(wtJson.dataset    ?? []);
        if (pntJson?.result    === "OK") setPaints(pntJson.dataset      ?? []);
        if (ptJson?.result     === "OK") setParts(ptJson.dataset        ?? []);
        if (claimsJson?.result === "OK") setClaims(claimsJson.dataset   ?? []);
      })
    , "공임 데이터 불러오는 중...");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estCodecar, codecar]);

  // pnt_m='1'→유용성(oil), pnt_m='2'→수용성(pnt), 기본=수용성
  const paintSolvent = pntM === "1" ? "oil" : "pnt";
  const [coatKind, setCoatKind] = useState("swap");

  const [selectedSec, setSelectedSec] = useState(""); // 기본
  const [secGroup,    setSecGroup]    = useState(""); // '' = 전체
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

  // carkind 기반 영역 필터
  // carkind !== '3' : seccode 첫 글자 1,3,5,7
  // carkind === '3' : seccode 첫 글자 2,4,6
  const visibleAreaTiles = useMemo(() => {
    const allowed =
      carkind !== "3"
        ? new Set(["1", "3", "5", "7"])
        : new Set(["2", "4", "6"]);
    return areaTiles.filter(
      (a) =>
        allowed.has(a.seccode[0]) &&
        (secGroup === "" || a.seccode[0] === secGroup)
    );
  }, [areaTiles, carkind, secGroup]);
  
  const groupButtons = useMemo(() => {
    const keys = carkind !== "3" ? ["1", "3", "5", "7"] : ["2", "4", "6"];
    return keys.map((k) => ({ key: k, label: GROUP_DEFS[k] }));
  }, [carkind]);

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
    const byOrdno = (a, b) => String(a.orderno ?? "").localeCompare(String(b.orderno ?? ""));

    // seccode='SS' payno 중복 제거 (첫 번째 항목 유지)
    const dedupe = (arr) => {
      const seen = new Set();
      return arr.filter((x) => {
        if (x.seccode !== "SS") return true;
        const key = String(x.payno).slice(0, -2);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // 1) 검색이 있으면: "전체"에서 검색 (영역 무시)
    if (q) {
      return dedupe(
        workItems
          .filter((x) => {
            const payno = String(x.payno || "").toLowerCase();
            const name = String(x.payname || "").toLowerCase();
            return payno.includes(q) || name.includes(q);
          })
          .sort(byOrdno)
      );
    }

    // 2) 검색이 없고 영역 선택이 있으면: 영역 필터
    if (selectedSec) {
      return dedupe(workItems.filter((x) => x.seccode === selectedSec).sort(byOrdno));
    }

    // 3) 아무 필터 없으면: 전체
    return dedupe([...workItems].sort(byOrdno));
  }, [workItems, selectedSec, workSearch]);
  
    
  const effectivePayno = useMemo(() => {
    if (selectedPayno && filteredWorkItems.some((x) => x.payno === selectedPayno)) return selectedPayno;
    return filteredWorkItems[0]?.payno ?? "";
  }, [selectedPayno, filteredWorkItems]);

  const selectedWorkItem = useMemo(
    () => filteredWorkItems.find((x) => x.payno === effectivePayno) ?? null,
    [filteredWorkItems, effectivePayno]
  );

  const filteredWorkTimes = useMemo(() => {
    const isSS = String(effectivePayno).startsWith("SS");
    const baseKey = isSS ? String(effectivePayno).slice(0, -2) : null;

    // SS payno: 뒤 2자리 제거한 기본키로 확장 매칭 / 일반: 정확한 payno 매칭
    const byPayno = isSS
      ? workTimes.filter((x) => String(x.payno).slice(0, -2) === baseKey)
      : workTimes.filter((x) => x.payno === effectivePayno);

    // paykind='3': subpayno='' 항목만 (SS 항목은 제외)
    const base = !isSS && paykind === "3"
      ? byPayno.filter((x) => (x.subpayno ?? "") === "")
      : byPayno;

    // SS payno: workcode 기준 중복 제거 (첫 번째 유지)
    if (isSS) {
      const seen = new Set();
      return base.filter((x) => {
        if (seen.has(x.workcode)) return false;
        seen.add(x.workcode);
        return true;
      });
    }

    return base;
  }, [workTimes, effectivePayno, paykind]);

  const filteredPaints = useMemo(() => {
    return paints.filter(
      (x) => x.payno === effectivePayno &&
              String(x.pntcot) === String(pntcotCode)
    );
  }, [paints, effectivePayno, pntcotCode]);
  

  const filteredParts = useMemo(() => {
    const byPayno = parts.filter((x) => x.payno === effectivePayno);
    if (paykind === "3") {
      // paykind='3': payno 일치만
      return byPayno;
    }
    if (paykind === "1") {
      // paykind='1': payno + subpayno 모두 일치
      const sub = String(selectedWorkItem?.subpayno ?? "");
      return byPayno.filter((x) => String(x.subpayno ?? "") === sub);
    }
    return byPayno;
  }, [parts, effectivePayno, paykind, selectedWorkItem]);


  // ── workcode='S' 드롭다운 (Row 클릭 위치 / fixed 포지셔닝) ─────────
  const [wtMenuOpen, setWtMenuOpen] = useState(false);
  const [wtMenuType, setWtMenuType] = useState("");   // "S" | "B"
  const [wtMenuPos,  setWtMenuPos]  = useState({ top: 0, left: 0 });
  const wtDropRef = useRef(null);

  // 판금(B) 시간 선택 목록: 0.5 ~ 9.0 (0.5 단위)
  const PANEL_HOURS = Array.from({ length: 18 }, (_, i) =>
    ((i + 1) * 0.5).toFixed(1)
  );

  useEffect(() => {
    if (!wtMenuOpen) return;
    const handle = (e) => {
      if (!wtDropRef.current?.contains(e.target)) setWtMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [wtMenuOpen]);

  // ── 경미손상 팝업 state ────────────────────────────────────────────
  const [suriOpen,           setSuriOpen]           = useState(false);
  const [suriRows,           setSuriRows]           = useState([]);
  const [selectedSuriRow,    setSelectedSuriRow]    = useState(null);
  const [suriPartPrice,      setSuriPartPrice]      = useState(0);
  const [suriPartPriceInput, setSuriPartPriceInput] = useState("");

  // ── 우수기술료 팝업 state ──────────────────────────────────────────
  const [ssuriOpen,        setSsuriOpen]        = useState(false);
  const [ssuriRows,        setSsuriRows]        = useState([]);
  const [selectedSsuriRow, setSelectedSsuriRow] = useState(null);

  // ── 청구처 bocomcode → bocomname 맵 ───────────────────────────────
  const bocomMap = useMemo(
    () => claims.reduce((m, c) => (m.set(c.bocomcode, c.bocomname), m), new Map()),
    [claims]
  );

  // ── 부품액 헬퍼 (payno 기준 '범퍼' 포함 부품 최대 단가) ──────────
  const getMaxBumperPrice = useCallback((payno) => {
    const bumperParts = parts.filter(
      (p) => p.payno === payno && String(p.partname || "").includes("범퍼")
    );
    if (!bumperParts.length) return 0;
    return Math.max(...bumperParts.map((p) => Number(p.price) || 0));
  }, [parts]);

  // ── 일반 postPick (작업/시간) ──────────────────────────────────────
  const postPickWorkTime = useCallback((row) => {
    if (!row) return;
    postPick({
      type:     "workTime",
      payno:    effectivePayno,
      payname:  selectedWorkItem?.payname ?? "",
      workcode: row.workcode,
      workname: row.workname,
      hour:     row.hour,
    });
  }, [postPick, effectivePayno, selectedWorkItem]);

  // ── 경미손상 팝업 열기 ─────────────────────────────────────────────
  const openSuriModal = useCallback((row) => {
    if (!row) return;
    const candidates = workTimes.filter(
      (x) =>
        x.payno    === row.payno &&
        x.workcode === "S" &&
        (x.subpayno ?? "") !== "" &&
        Number(x.partsum) > 0
    );
    const partPrice = getMaxBumperPrice(row.payno);
    setSuriRows(candidates);
    setSelectedSuriRow(candidates[0] ?? null);
    setSuriPartPrice(partPrice);
    setSuriPartPriceInput(formatLocaleNumber(partPrice));
    setSuriOpen(true);
  }, [workTimes, getMaxBumperPrice]);

  // ── 경미손상 팝업 확인 ─────────────────────────────────────────────
  const confirmSuri = useCallback(() => {
    if (!selectedSuriRow) return;
    postPick({
      type:      "workTime",
      payno:     effectivePayno,
      payname:   selectedWorkItem?.payname ?? "",
      workcode:  selectedSuriRow.workcode,
      workname:  selectedSuriRow.workname,
      hour:      selectedSuriRow.hour,
      subpayno:  selectedSuriRow.subpayno,
      partsum:   selectedSuriRow.partsum,
      info:      selectedSuriRow.info,
      partPrice:  suriPartPrice,
      adjAmt:     Math.floor(suriPartPrice * 0.03),
      totalPrice: Number(selectedSuriRow.partsum || 0) + Math.floor(suriPartPrice * 0.03),
    });
    setSuriOpen(false);
  }, [selectedSuriRow, effectivePayno, selectedWorkItem, suriPartPrice, postPick]);

  // ── 우수기술료 팝업 확인 ──────────────────────────────────────────
  const confirmSsuri = useCallback(() => {
    if (!selectedSsuriRow) return;
    const ssPayname = selectedWorkItem
      ? String(selectedWorkItem.payname || "").split(" - ")[0]
      : "";
    postPick({
      type:     "workTime",
      payno:    selectedSsuriRow.payno,
      payname:  ssPayname,
      workcode: selectedSsuriRow.workcode,
      workname: selectedSsuriRow.workname,
      hour:     selectedSsuriRow.hour,
      subpayno: selectedSsuriRow.subpayno,
      partsum:  selectedSsuriRow.partsum,
      info:     selectedSsuriRow.info,
    });
    setSsuriOpen(false);
  }, [selectedSsuriRow, selectedWorkItem, postPick]);

  // ── 우수기술료 팝업 컬럼 ──────────────────────────────────────────
  const ssuriCols = useMemo(() => [
    {
      key: "subpayno",
      title: "보험사",
      width: "1fr",
      render: (_v, row) => (
        <div className="h-8 flex items-center truncate">
          {bocomMap.get(row.subpayno) ?? row.subpayno}
        </div>
      ),
    },
    {
      key: "info",
      title: "기준",
      width: "1fr",
      render: (v) => <div className="h-8 flex items-center truncate">{v}</div>,
    },
    {
      key: "partsum",
      title: "재료비",
      width: "120px",
      align: "right",
      render: (v) => (
        <div className="h-8 flex items-center justify-end tabular-nums">
          {formatLocaleNumber(v)}
        </div>
      ),
    },
  ], [bocomMap]);

  // ── 경미손상 팝업 컬럼 ─────────────────────────────────────────────
  const suriCols = useMemo(() => [
    { key: "info",  title: "손상범위", width: "1fr" },
    { key: "hour",  title: "수리시간", width: "90px",  align: "right" },
    {
      key: "partsum",
      title: "재료비",
      width: "110px",
      align: "right",
      render: (v) => (
        <div className="h-8 flex items-center justify-end tabular-nums">
          {formatLocaleNumber(v)}
        </div>
      ),
    },
    {
      key: "_totalPrice",
      title: "부품액",
      width: "120px",
      align: "right",
      render: (v) => (
        <div className="h-8 flex items-center justify-end tabular-nums">
          {formatLocaleNumber(v)}
        </div>
      ),
    },
  ], []);

  const suriDisplayRows = useMemo(() => {
    const adjAmt = Math.floor(suriPartPrice * 0.03);
    return suriRows.map((r) => ({
      ...r,
      _totalPrice: Number(r.partsum || 0) + adjAmt,
    }));
  }, [suriRows, suriPartPrice]);

  const workItemCols = useMemo(
    () => [
      {
        key: "payname",
        title: "작업항목명",
        width: "1fr",
        className: "px-2 py-0",
        render: (_v, row) => {
          const name = row.seccode === "SS"
            ? String(row.payname || "").split(" - ")[0]
            : row.payname;
          return <div className="h-8 flex items-center truncate">{name}</div>;
        },
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
              {formatLocaleNumber(m)}
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
          <div className="h-8 flex items-center justify-end tabular-nums">{formatLocaleNumber(row.price)}</div>
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
          </div>

          {/* 그룹 필터 탭 */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-200 flex-wrap">
            <button
              type="button"
              className={[
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                secGroup === ""
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
              ].join(" ")}
              onClick={() => setSecGroup("")}
            >
              전체
            </button>
            {groupButtons.map((g) => (
              <button
                key={g.key}
                type="button"
                className={[
                  "rounded-md px-2.5 py-1 text-xs font-semibold",
                  secGroup === g.key
                    ? "bg-zinc-900 text-white"
                    : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
                onClick={() => setSecGroup((prev) => (prev === g.key ? "" : g.key))}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            <div className="grid grid-cols-3 gap-3">
              {visibleAreaTiles.map((a) => {
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
          <div className="min-h-0 flex-[1.2] grid gap-3" style={{gridTemplateColumns:"3fr 2fr"}}>
            <div className="min-h-0 rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col">
              
              <div className="px-3 py-2 border-b border-zinc-200 flex items-center">
                <div className="text-sm font-semibold text-zinc-800">
                  작업항목
                  <span className="ml-2 text-xs text-zinc-500">
                    (영역: {AREA_DEFS.find((a) => a.seccode === selectedSec)?.label || selectedSec || "-"})
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
                      postPickWorkTime(selectedWorkTimeRow);
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
                  onRowClick={(row, _idx, e) => {
                    setSelectedWorkTimeRow(row);
                    const isSS = String(row.payno).startsWith("SS");
                    if (isSS) {
                      // SS: 우수기술료 팝업
                      const baseKey = String(row.payno).slice(0, -2);
                      const ssRows = workTimes.filter(
                        (x) =>
                          String(x.payno).slice(0, -2) === baseKey &&
                          x.workcode === row.workcode &&
                          bocomMap.has(x.subpayno)
                      );
                      if (ssRows.length > 0) {
                        setSsuriRows(ssRows);
                        setSelectedSsuriRow(ssRows[0]);
                        setSsuriOpen(true);
                      } else {
                        postPickWorkTime(row);
                      }
                      setWtMenuOpen(false);
                    } else if (row.workcode === "S") {
                      const candidates = workTimes.filter(
                        (x) =>
                          x.payno    === row.payno &&
                          x.workcode === "S" &&
                          (x.subpayno ?? "") !== "" &&
                          Number(x.partsum) > 0
                      );
                      if (candidates.length > 0) {
                        const MENU_W = 120;
                        const left = e.clientX + MENU_W > window.innerWidth
                          ? e.clientX - MENU_W
                          : e.clientX;
                        setWtMenuPos({ top: e.clientY + 4, left });
                        setWtMenuType("S");
                        setWtMenuOpen(true);
                      } else {
                        setWtMenuOpen(false);
                      }
                    } else if (row.workcode === "B") {
                      // 판금: 시간 선택 드롭다운 (18항목 + 구분선 + 사용자입력 ≈ 570px)
                      const MENU_W = 130;
                      const MENU_H = 570;
                      const left = e.clientX + MENU_W > window.innerWidth
                        ? e.clientX - MENU_W
                        : e.clientX;
                      const top = e.clientY + 4 + MENU_H > window.innerHeight
                        ? Math.max(4, e.clientY - MENU_H)
                        : e.clientY + 4;
                      setWtMenuPos({ top, left });
                      setWtMenuType("B");
                      setWtMenuOpen(true);
                    } else {
                      setWtMenuOpen(false);
                    }
                  }}
                  onRowDoubleClick={(row) => postPickWorkTime(row)}
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
                {pntcotCode ? ` - ${pntcotCode} 코트` : ""}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* 테스트용 토글: 나중에 공임설정 탭 값으로 자동 세팅 */}
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

      {/* 작업/시간 Row 클릭 드롭다운 (fixed) */}
      {wtMenuOpen && (
        <div
          ref={wtDropRef}
          className="fixed z-[55] rounded-md border border-zinc-200 bg-white shadow-lg py-1 text-sm"
          style={{ top: wtMenuPos.top, left: wtMenuPos.left, minWidth: 130 }}
        >
          {wtMenuType === "S" ? (
            <>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => { setWtMenuOpen(false); openSuriModal(selectedWorkTimeRow); }}
              >
                경미손상
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => { setWtMenuOpen(false); postPickWorkTime(selectedWorkTimeRow); }}
              >
                사용자 입력
              </button>
            </>
          ) : wtMenuType === "B" ? (
            <>
              {PANEL_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="w-full px-3 py-1 text-left tabular-nums hover:bg-zinc-100 active:bg-zinc-200"
                  onClick={() => {
                    setWtMenuOpen(false);
                    const row = selectedWorkTimeRow;
                    if (!row) return;
                    postPick({
                      type:     "workTime",
                      payno:    effectivePayno,
                      payname:  selectedWorkItem?.payname ?? "",
                      workcode: row.workcode,
                      workname: row.workname,
                      hour:     h,
                    });
                  }}
                >
                  {h} H
                </button>
              ))}
              <div className="my-1 border-t border-zinc-100" />
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => { setWtMenuOpen(false); postPickWorkTime(selectedWorkTimeRow); }}
              >
                사용자 입력
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* 경미손상 팝업 */}
      {suriOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden w-[600px]">

            {/* 헤더 */}
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
                  <Wrench className="h-4 w-4" />
                </span>
                <div className="text-base font-semibold text-zinc-900">
                  경미손상 — {selectedWorkItem?.payname}
                </div>
              </div>
              <button
                type="button"
                className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setSuriOpen(false)}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 바디 */}
            <div className="p-4">
              {/* 부품액 입력 + 설명 */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-700 whitespace-nowrap">부품액</span>
                  <input
                    type="text"
                    value={suriPartPriceInput}
                    onChange={(e) => setSuriPartPriceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Number(String(e.target.value).replace(/,/g, "")) || 0;
                        setSuriPartPrice(val);
                        setSuriPartPriceInput(formatLocaleNumber(val));
                      }
                    }}
                    className="h-8 w-[130px] rounded-md border border-zinc-200 px-2 text-sm text-right tabular-nums outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="ml-auto text-xs font-semibold text-red-600 whitespace-nowrap">
                  조정계수금액 : {formatLocaleNumber(Math.floor(suriPartPrice * 0.03))}
                  <span className="ml-1 font-normal text-zinc-500">(부품액 × 3%)</span>
                </div>
              </div>
              <div className="h-[220px] overflow-hidden">
                <FixedHeadTable
                  columns={suriCols}
                  rows={suriDisplayRows}
                  rowKey={(r, i) => r.subpayno || String(i)}
                  rowSize="sm"
                  selectedKey={selectedSuriRow?.subpayno ?? ""}
                  onRowClick={(row) => setSelectedSuriRow(row)}
                  onRowDoubleClick={() => confirmSuri()}
                />
              </div>
            </div>

            {/* 푸터 */}
            <div className="border-t border-zinc-200 px-4 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => setSuriOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={!selectedSuriRow}
                onClick={confirmSuri}
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 우수기술료 팝업 */}
      {ssuriOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden w-[560px]">

            {/* 헤더 */}
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
                  <Wrench className="h-4 w-4" />
                </span>
                <div className="text-base font-semibold text-zinc-900">
                  우수기술료 — {selectedWorkItem ? String(selectedWorkItem.payname || "").split(" - ")[0] : ""}
                </div>
              </div>
              <button
                type="button"
                className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setSsuriOpen(false)}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 바디 */}
            <div className="p-4">
              <div className="h-[220px] overflow-hidden">
                <FixedHeadTable
                  columns={ssuriCols}
                  rows={ssuriRows}
                  rowKey={(r) => `${r.payno}-${r.subpayno}`}
                  rowSize="sm"
                  selectedKey={selectedSsuriRow ? `${selectedSsuriRow.payno}-${selectedSsuriRow.subpayno}` : ""}
                  onRowClick={(row) => setSelectedSsuriRow(row)}
                  onRowDoubleClick={() => confirmSsuri()}
                />
              </div>
            </div>

            {/* 푸터 */}
            <div className="border-t border-zinc-200 px-4 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => setSsuriOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={!selectedSsuriRow}
                onClick={confirmSsuri}
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="px-4 py-2 border-t border-zinc-200 bg-white text-xs text-zinc-600">
        선택영역: <span className="font-semibold text-zinc-800">{selectedSec || "-"}</span> ·
        선택항목: <span className="font-semibold text-zinc-800">{selectedWorkItem?.payname || "-"}</span>
      </div>
      
    </div>
  );
}
