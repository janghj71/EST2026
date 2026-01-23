import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FixedHeadTable from "../components/FixedHeadTable";
import { openCenteredWindow } from "../utils/popup";
import CheckBox from "../components/CheckBox";
import { useAlert } from "../alerts";

/**
 * 보험 견적일지 (UI 샘플)
 * - Row Action: 행 선택 시 화면 하단 슬라이드업
 * - 분할바: "견적상세" 바로 위 (드래그로 상세 영역 높이 조절)
 * - 테이블 컬럼은 그대로(예시로만 렌더). 실제 컬럼/데이터는 그대로 꽂으면 됨.
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}
function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthRange(baseDate) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth(); // 0~11
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return { from: ymd(from), to: ymd(to) };
}
function addMonths(baseDate, delta) {
  // "해당 월의 1일"로 정규화해서 월 이동 안전하게
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + delta, 1);
}


export default function InsuranceEstimate() {
  const navigate = useNavigate();
  const { confirm, info } = useAlert();
  const workBodyElRef = useRef(null);      // FixedHeadTable 바디 DOM
  const workScrollPosRef = useRef({ top: 0, left: 0 });      // 닫기 전 scrollTop 저장
  const photoWinRef = useRef(null);
  const smsWinRef = useRef(null);
  const memoWinRef = useRef(null);
  const depositWinRef = useRef(null);

  const childWinsRef = useRef(new Set());

  const registerChildWin = (w) => {
    if (!w) return;
    childWinsRef.current.add(w);

    // 닫힌 창은 정리
    try {
      if (w.closed) childWinsRef.current.delete(w);
    } catch { /* empty */ }
  };

  const closeAllChildWins = () => {
    childWinsRef.current.forEach((w) => {
      try {
        if (w && !w.closed) w.close();
      } catch { /* empty */ }
    });
    childWinsRef.current.clear();
  };

  const openEstimateEdit = (row, mode = "edit") => {
    const est_serial = row?.id || "0000000000"; 
    navigate(`/estimate-edit/${encodeURIComponent(est_serial)}`, {
      state: {
        mode, // "new" | "edit"
        // EstimateEditPage에서 필요하면 꺼내 쓰기
        ctx: {
          est_serial,
          carno: row?.carno || "",
        },
      },
    });
  };

  // ====== 검색/조회 ======
  const [dateFrom, setDateFrom] = useState("2026-01-02");
  const [dateTo, setDateTo] = useState("2026-01-02");
  const [searchText, setSearchText] = useState("");
  const [chkEstimate, setChkEstimate] = useState(true);
  const [chkWork, setChkWork] = useState(true);
  const [chkClosed, setChkClosed] = useState(false);
  const [sortKey, setSortKey] = useState("입고일자 역순");
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(dateTo));


  // ====== 선택/상세 ======
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ====== 분할바 (견적상세 바로 위) ======
  const [detailHeight, setDetailHeight] = useState(260);
  const splitDragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  // ====== Row Action Bar ======
  const [printOpen, setPrintOpen] = useState(false);

  // ====== 예시 데이터 (실제는 API로 교체) ======
  const estimateRows = useMemo(() => {
    const statuses = ["작업", "종결", "도장대기", "입고"];
    const insurers = ["택시공제", "ERGO다음다이렉트", "삼성화재", "현대해상", "DB손해보험"];
    const cars = ["더 뉴 K7", "K9", "쏘나타", "K5", "아반떼", "그랜저"];
    const rows = [];
    for (let i = 1; i <= 10; i++) {
      const inD = new Date(2025, (i % 12), (i % 28) + 1);
      const outD = i % 4 === 0 ? new Date(2025, (i % 12), (i % 28) + 2) : null;
      rows.push({
        id: `E-${pad2(Math.floor(i / 10))}${pad2(i)}`,
        seccodename: i % 3 === 0 ? "작업" : "견적",
        carno: `${10 + (i % 80)}가${1000 + i}`,
        carname: cars[i % cars.length],
        custom_name: i % 5 === 0 ? "장희정" : `고객${i}`,
        tel: `010-37${pad2(i)}-****`,
        bocomname: insurers[i % insurers.length],
        saletotal: 100000 + i * 23944,
        inday: ymd(inD),
        outday: outD ? ymd(outD) : "",
        preoutdate: `${ymd(new Date(2025, (i % 12), (i % 28) + 3))} ${pad2(i % 24)} 시`,
        statename: statuses[i % statuses.length],
      });
    }
    return rows;
  }, []);
  

  const claimRows = useMemo(() => {
    const insurers = ["택시공제", "ERGO다음다이렉트", "삼성화재", "현대해상", "DB손해보험"];
    const rows = [];
  
    // 60개 견적에 대해, 각 견적당 0~4건 청구 생성
    for (let e = 1; e <= 60; e++) {
      const claimCount = (e % 5); // 0~4
      for (let c = 1; c <= claimCount; c++) {
        rows.push({
          estimateId: `E-${pad2(Math.floor(e / 10))}${pad2(e)}`,   // 어떤 견적의 청구인지 연결
          bocomname: insurers[(e + c) % insurers.length],
          regno: `202501${pad2((e % 28) + 1)}-${pad2(e)}-${pad2(c)}`,
          dambo: c % 2 ? "대물" : "자차",
          misrate: `${((e * 10) + c * 5) % 90}`,
          insura_exemp: c % 2 ? 0 : 70000,
          endpaysum: 500000 + e * 12000 + c * 27000,
          endpartsum: 150000 + e * 6000 + c * 9000,
          boman_nm: c % 2 ? "다이렉" : "택공남",
          boman_hp: `010-${1000 + e}-${pad2(c)}**`,
          boman_fax: `070-${3000 + e}-****`,
          reqtotal: 600000 + e * 15000 + c * 33333,
          incom: c % 3 === 0 ? 200000 : 0,
          inday: c % 3 === 0 ? ymd(new Date(2025, e % 12, (e % 28) + 2)) : "",
        });
      }
    }
  
    return rows;
  }, []);

  const estimateColumns = useMemo(
    () => [
      { key: "seccodename", title: "구분", width: "6%", align: "left" },
      { key: "carno", title: "차량번호", width: "9%", align: "left" },
      { key: "carName", title: "차량명", width: "12%", align: "left" },
      { key: "custom_name", title: "고객명", width: "9%", align: "left" },
      { key: "tel", title: "연락처", width: "11%", align: "left" },
      { key: "bocomname", title: "보험사", width: "11%", align: "left" },
      { key: "saletotal", title: "견적금액", width: "8%", align: "right", render: (v) => fmt(v) },
      { key: "inday", title: "입고일자", width: "8%", align: "left" },
      { key: "outday", title: "출고일자", width: "8%", align: "left", render: (v) => v || "-" },
      { key: "preoutdate", title: "출고예정일시", width: "10%", align: "left" },
      { key: "statename", title: "상태", width: "8%", align: "left", render: (v) => <StatusBadge value={v} /> },
    ],
    []
  );

  const claimColumns = useMemo(
    () => [
      { key: "bocomname", title: "보험사", width: "12%", align: "left" },
      { key: "regno", title: "접수번호", width: "10%", align: "left" },
      { key: "dambo", title: "담보", width: "6%", align: "left" },
      { key: "misrate", title: "과실율", width: "5%", align: "left" },
      { key: "insura_exemp", title: "면책금", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "endpaysum", title: "공임계", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "endpartsum", title: "부품계", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "boman_nm", title: "담당자", width: "6%", align: "left" },
      { key: "boman_hp", title: "담당HP", width: "9%", align: "left" },
      { key: "boman_fax", title: "담당FAX", width: "9%", align: "left" },
      { key: "reqtotal", title: "청구액", width: "8%", align: "right", render: (v) => fmt(v) },
      { key: "incom", title: "입금액", width: "7%", align: "right", render: (v) => fmt(v) },
      { key: "inday", title: "입금일자", width: "7%", align: "left", render: (v) => v || "-" },
    ],
    []
  );

  const workColumns = useMemo(
    () => [
      { key: "gubun", title: "구분", width: "7%", align: "left" },
      { key: "name", title: "작업내용", width: "25%", align: "left" },
      { key: "kind", title: "작업", width: "8%", align: "left" },
      { key: "qty", title: "시간", width: "8%", align: "right" },
      { key: "paysum", title: "공임액", width: "10%", align: "right", render: (v) => fmt(v) },
      { key: "partsum", title: "부품액", width: "10%", align: "right", render: (v) => fmt(v) },
      { key: "partCode", title: "부품코드", width: "14%", align: "left" },
      { key: "nation", title: "국토부", width: "8%", align: "left" },
      { key: "status", title: "상태", width: "10%", align: "left" },
    ],
    []
  );
  

  const workRows = useMemo(() => {
    const kinds = ["교환", "도장", "탈착", "판금"];
    const gubuns = ["주체", "부품", "#부품", "도장"];
    const rows = [];
    for (let i = 1; i <= 200; i++) {
      rows.push({
        gubun: gubuns[i % gubuns.length],
        name: `프론트 범퍼 작업 ${i}`,
        kind: kinds[i % kinds.length],
        qty: (Math.round(((i % 400) / 100) * 100) / 100).toFixed(2),
        paysum: (i % 5 === 0 ? 0 : 1200 + i * 37),
        partsum: (i % 3 === 0 ? 50000 : 0),
        partCode: i % 7 === 0 ? `865${i}T000` : "",
        nation: i % 4 === 0 ? "B03" : "",
        status: i % 6 === 0 ? "중고재생" : i % 5 === 0 ? "외측판금" : "신품",
      });
    }
    return rows;
  }, []);
  

  // ====== 분할바 드래그 핸들러 ======
  useEffect(() => {
    const onMove = (e) => {
      if (!splitDragging.current) return;
      const dy = startY.current - e.clientY; // 위로 드래그하면 증가
      const next = Math.min(800, Math.max(160, startH.current + dy));
      setDetailHeight(next);
    };

    const onUp = () => {
      splitDragging.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onSplitDown = (e) => {
    splitDragging.current = true;
    startY.current = e.clientY;
    startH.current = detailHeight;
  };

  // ====== Row Action 동작 (샘플) ======
  const requireSelected = async () => {
    if (!selected) {
      // alert("견적을 선택하세요.");
      await info("저장이 완료되었습니다.");
      return false;
    }
    return true;
  };

  const onNew = () => {
    //신규: 화면만 코딩이니 임시 est_serial로 진입
    openEstimateEdit(null, "new");
  };
  const onExcel = () => alert("엑셀내보내기");

  const onModify = () => {
    if (!requireSelected()) return;
    openEstimateEdit(selected, "edit");
  };
  const onDelete = () => requireSelected() && alert(`견적삭제: ${selected.id}`);
  const onClose = () => requireSelected() && alert(`견적종결: ${selected.id}`);
  
  const openPhotoViewer = () => {
    const estId = selected?.id || "";
    const carNo = selected?.carno || "";
    
    const url =
    `/photo-viewer?est_serial=${encodeURIComponent(estId)}` +
    `&carno=${encodeURIComponent(carNo)}`;

    // 1) 이미 열려있는 창이면: 재사용 + estId만 갱신
    if (photoWinRef.current && !photoWinRef.current.closed) {
      try {
        photoWinRef.current.focus();
        photoWinRef.current.postMessage(
          { type: "PHOTO_VIEWER_SET_CTX", payload: { est_serial:estId, carno:carNo } },
          window.location.origin
        );
        registerChildWin(photoWinRef.current);
        return;
      } catch (e) {
        // 핸들이 꼬였으면 새로 열기
        photoWinRef.current = null;
      }
    }

    // 2) 없거나 닫혔으면: 새로 열기 (name 고정 = 중복 방지)
    const win = openCenteredWindow(url, "photoViewer", 1200, 800, {
      scrollbars: "yes",
      resizable: "yes",
    });
    photoWinRef.current = win;
    registerChildWin(win);
  };

  // const onSms = () => requireSelected() && alert(`문자발송: ${selected.id}`);
  const openSmsPopup = () => {
    const est_serial = selected?.id || "";       // 실제 est_serial 키로 교체
    const carno = selected?.carno || "";
    const hp = (selected?.tel || "").replaceAll("*", ""); // 예시
    const isset = selected?.seccodename === "견적" ? "1" : "0"; // 예시
    const inday = selected?.inday || "";
  
    const url =
      `/estsmsend?est_serial=${encodeURIComponent(est_serial)}` +
      `&carno=${encodeURIComponent(carno)}` +
      `&hp=${encodeURIComponent(hp)}` +
      `&isset=${encodeURIComponent(isset)}` +
      `&inday=${encodeURIComponent(inday)}`;
  
    // 이미 열려있으면 재사용 + ctx만 갱신
    if (smsWinRef.current && !smsWinRef.current.closed) {
      try {
        smsWinRef.current.focus();
        smsWinRef.current.postMessage(
          {
            type: "SMS_SEND_SET_CTX",
            payload: { est_serial, carno, hp, isset: isset === "1", inday },
          },
          window.location.origin
        );
        registerChildWin(smsWinRef.current);
        return;
      } catch {
        smsWinRef.current = null;
      }
    }
  
    const win = openCenteredWindow(url, "smsSend", 640, 760, {
      scrollbars: "yes",
      resizable: "yes",
    });
    smsWinRef.current = win;
    registerChildWin(win);
  };
  
  const openMemoPopup = () => {
    const est_serial = selected?.id || "";
    const carno = selected?.carno || "";
  
    const url =
      `/estimate-memo?est_serial=${encodeURIComponent(est_serial)}` +
      `&carno=${encodeURIComponent(carno)}`;
  
    // 이미 열려있으면 재사용 + ctx 갱신
    if (memoWinRef.current && !memoWinRef.current.closed) {
      try {
        memoWinRef.current.focus();
        memoWinRef.current.postMessage(
          { type: "ESTIMATE_MEMO_SET_CTX", payload: { est_serial, carno } },
          window.location.origin
        );
        registerChildWin(memoWinRef.current);
        return;
      } catch {
        memoWinRef.current = null;
      }
    }
  
    // 없거나 닫혔으면 새로 열기
    const win = openCenteredWindow(url, "estimateMemo", 900, 820, {
      scrollbars: "yes",
      resizable: "yes",
    });
    memoWinRef.current = win;
    registerChildWin(win);
  };

  const onPrint = (kind) =>
    requireSelected() && alert(`인쇄(${kind}): ${selected.id}`);

  // ====== 조회 버튼 ======
  const onSearch = () => {
    console.log({ dateFrom, dateTo, searchText, chkEstimate, chkWork, chkClosed, sortKey });
    alert("조회");
  };

  useEffect(() => {
    setMonthAnchor(new Date(dateTo));
  }, [dateTo]);

  const filteredClaimRows = useMemo(() => {
    if (!selected) return [];
    return claimRows.filter((r) => r.estimateId === selected.id);
  }, [claimRows, selected]);
  
  const saveWorkScroll = () => {
    const el = workBodyElRef.current;
    if (!el) return;
    workScrollPosRef.current = { top: el.scrollTop || 0, left: el.scrollLeft || 0 };
  };
  
  const restoreWorkScroll = () => {
    const el = workBodyElRef.current;
    if (!el) return;
  
    const { top, left } = workScrollPosRef.current || { top: 0, left: 0 };
    el.scrollTop = top;
    el.scrollLeft = left;
  };

  const openDepositPopup = () => {
    if (!requireSelected()) return;

    const est_serial = selected?.id || "";
    const carno = selected?.carno || "";

    sessionStorage.setItem(
      "depositCtx",
      JSON.stringify({
        est_serial,
        carno,
        claims: filteredClaimRows.slice(0, 2),
      })
    );

    const url =
      `/estimate-deposit?est_serial=${encodeURIComponent(est_serial)}` +
      `&carno=${encodeURIComponent(carno)}`;

    // 이미 열려있으면 재사용 + ctx 갱신
    if (depositWinRef.current && !depositWinRef.current.closed) {
      try {
        depositWinRef.current.focus();
        depositWinRef.current.postMessage(
          {
            type: "ESTIMATE_DEPOSIT_SET_CTX",
            payload: {
              est_serial,
              carno,
              claims: filteredClaimRows.slice(0, 2), // 핵심
            },
          },
          window.location.origin
        );
        registerChildWin(depositWinRef.current);
        return;
      } catch {
        depositWinRef.current = null;
      }
    }

    const win = openCenteredWindow(url, "estimateDeposit", 900, 620, {
      scrollbars: "yes",
      resizable: "yes",
    });

    const payload = {
      est_serial,
      carno,
      claims: filteredClaimRows.slice(0, 2),
    };

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "ESTIMATE_DEPOSIT_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */ }
    }, 200);

    setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.postMessage({ type: "ESTIMATE_DEPOSIT_SET_CTX", payload }, window.location.origin);
        }
      } catch { /* empty */ }
    }, 700);

    depositWinRef.current = win;
    registerChildWin(win);
  };


  useEffect(() => {
    const w = smsWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.id || "",
      carno: selected?.carno || "",
      hp: (selected?.tel || "").replaceAll("*", ""),
      isset: selected?.seccodename === "견적",   // boolean
      inday: selected?.inday || "",
    };
  
    try {
      w.postMessage(
        { type: "SMS_SEND_SET_CTX", payload },  window.location.origin);
    } catch {}
  }, [selected?.id,
    selected?.carno,
    selected?.tel,
    selected?.seccodename,
    selected?.inday,]);

  useEffect(() => {
    const w = photoWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.id || "",
      carno: selected?.carno || "",
    };
  
    try {
      w.postMessage(
        { type: "PHOTO_VIEWER_SET_CTX", payload },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [
    // id만이 아니라 PhotoViewer에 영향 있는 값이 바뀌면 갱신되게
    selected?.id,
    selected?.carno,
  ]);
    
  useEffect(() => {
    const w = memoWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.id || "",
      carno: selected?.carno || "",
    };
  
    try {
      w.postMessage(
        { type: "ESTIMATE_MEMO_SET_CTX", payload },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [selected?.id, selected?.carno]);

  useEffect(() => {
    const w = depositWinRef.current;
    if (!w || w.closed) return;
    if (!selected) return;
  
    const payload = {
      est_serial: selected?.id || "",
      carno: selected?.carno || "",
      claims: filteredClaimRows.slice(0, 2),
    };
  
    try {
      w.postMessage(
        { type: "ESTIMATE_DEPOSIT_SET_CTX", payload },
        window.location.origin
      );
    } catch { /* empty */ }
  }, [selected?.id, selected?.carno, filteredClaimRows]);
  
  useEffect(() => {
    if (!detailOpen) return;
    
    // 열릴 때: 렌더 완료 후 복원(세로/가로)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreWorkScroll();
      });
    });  
  }, [detailOpen]);

  // 새 견적 선택 시: 상세 스크롤은 항상 TOP으로
  useEffect(() => {
    // 선택 해제(null)면 그냥 초기화만
    workScrollPosRef.current = { top: 0, left: 0 };

    // 상세가 열려 있고 DOM이 살아있으면 즉시/렌더 후 스크롤을 0으로
    if (!detailOpen) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = workBodyElRef.current;
        if (!el) return;
        el.scrollTop = 0;
        el.scrollLeft = 0; // 가로도 같이 초기화(원치 않으면 제거)
      });
    });
  }, [selected?.id, detailOpen]);

  useEffect(() => {
    const onBeforeUnload = () => closeAllChildWins();
    const onUnload = () => closeAllChildWins();

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unload", onUnload);

    return () => {
      // 라우트 이동/언마운트 시에도 자식 정리
      closeAllChildWins();
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("unload", onUnload);
    };
  }, []);

  
  return (
    // <div className="min-h-screen bg-zinc-50">
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">

      {/* 1) 타이틀 */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">보험 견적일지</div>
              <div className="text-xs text-zinc-500">견적 · 청구 · 작업 내역을 한 화면에서 관리</div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              onClick={() => alert("[보험견적] 퀵버튼")}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              보험견적
            </button>
          </div>
        </div>
      </div>

      {/* <div className="mx-auto max-w-[1400px] px-4 py-4 pb-28"> */}
      <div className="mx-auto max-w-[1400px] w-full px-4 py-4 flex-1 overflow-hidden flex flex-col">
        {/* 2) Global Action (신규견적, 엑셀만 상단 고정) */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={onNew}
            >
              + 신규견적
            </button>
            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onExcel}
            >
              엑셀내보내기
            </button>
          </div>

        </div>

        {/* 3) 조회/검색 */}
        <div className="mb-4 rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-zinc-800">입고일자</div>

              <DateInput
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                }}
              />
              <span className="text-zinc-400">~</span>

              <div className="flex items-center gap-2">
                <DateInput
                  value={dateTo}
                  onChange={(v) => {
                    setDateTo(v);
                  }}
                />

                {/* 전달 / 금월 / < > */}
                <div className="flex items-center gap-1">
                  <MiniBtn
                    onClick={() => {
                      const d = addMonths(monthAnchor, -1);
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(d);
                    }}
                  >
                    전월
                  </MiniBtn>

                  <MiniBtn
                    onClick={() => {
                      const d = new Date(); // 금월
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
                    }}
                  >
                    금월
                  </MiniBtn>

                  <MiniBtn
                    title="-1개월"
                    onClick={() => {
                      const d = addMonths(monthAnchor, -1);
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(d);
                    }}
                  >
                    {"<"}
                  </MiniBtn>

                  <MiniBtn
                    title="+1개월"
                    onClick={() => {
                      const d = addMonths(monthAnchor, +1);
                      const r = monthRange(d);
                      setDateFrom(r.from);
                      setDateTo(r.to);
                      setMonthAnchor(d);
                    }}
                  >
                    {">"}
                  </MiniBtn>
                </div>
              </div>

              <button
                className="ml-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={onSearch}
              >
                조회
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="검색내용"
                  className="w-[280px] rounded-md border border-zinc-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-zinc-400"
                />
                
              </div>

              <CheckBox label="견적" checked={chkEstimate} onChange={setChkEstimate} />
              <CheckBox label="작업" checked={chkWork} onChange={setChkWork} />
              <CheckBox label="종결" checked={chkClosed} onChange={setChkClosed} />

              <div className="ml-auto">
                <select
                  // className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none hover:bg-zinc-50"
                  className="select-base" 
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                >
                  <option>입고일자 역순</option>
                  <option>입고일자 정순</option>
                  <option>출고예정일 순</option>
                  <option>상태 순</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 아래부터: 리스트(상단) + 분할바 + 상세(하단) ===== */}
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
          {/* 상단: 견적/청구 목록 영역 (detailHeight가 커지면 자동으로 줄어듦) */}
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden gap-3">

            {/* 4) 견적목록 */}
            <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0 flex-1">
              <div className="border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">견적목록</div>
                  <div className="text-xs text-zinc-500">{estimateRows.length}건</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <FixedHeadTable
                  columns={estimateColumns}
                  rows={estimateRows}
                  rowKey={(r) => r.id}
                  selectedKey={selected?.id}
                  onRowClick={(r) => setSelected(r)}
                  // 선택 행 아래에 인라인 액션 표시 (기존 UX 그대로)
                  expandedKey={selected?.id}
                  expandedRowRender={() => (
                    <InlineActions
                      onModify={onModify}
                      onDelete={onDelete}
                      onClose={onClose}
                      onPhoto={openPhotoViewer}
                      onSms={openSmsPopup}
                      onMemo={openMemoPopup}
                      onDeposit={openDepositPopup}
                      printOpen={printOpen}
                      setPrintOpen={setPrintOpen}
                      onPrint={onPrint}
                    />
                  )}
                  // 카드 안에서 바디만 스크롤
                  height="100%"
                  bodyClassName="min-h-0 flex-1"
                  rowSelectedClass="!bg-blue-100 hover:!bg-blue-100"
                  rowHoverClass="hover:!bg-gray-50"
                  gutterSelectedClass="!bg-blue-100"
                  gutterHoverClass="!bg-gray-50"
                />
              </div>


            </div>

            {/* 5) 청구보험목록 (높이 제한해서 상단 영역 내에서 자연스럽게) */}
            <div className="rounded-md border border-zinc-200 bg-white shadow-sm flex flex-col min-h-0"
                style={{ height: 160 }}>
              <div className="border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">청구보험 목록</div>
                  <div className="text-xs text-zinc-500">{selected ? "선택 견적 기준" : "견적을 선택하세요"}</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <FixedHeadTable
                  columns={claimColumns}
                  rows={selected ? filteredClaimRows : []}
                  rowKey={(r, idx) => `${r.estimateId}-${idx}`}
                  emptyText={selected ? "청구 내역이 없습니다." : "견적을 선택하면 청구보험 목록이 표시됩니다."}
                  headerClassName=""
                  bodyClassName="min-h-0 flex-1"
                  height="100%"
                />

              </div>
            </div>
          </div>

          {/* 6) 분할바: 하단 상세 패널 높이 조절 (상단 목록이 줄어듦) */}
          <div
            className={[
              "group border border-zinc-200 bg-zinc-50 px-4 py-2",
              detailOpen ? "cursor-row-resize" : "",
            ].join(" ")}
            title={detailOpen ? "드래그해서 상세 영역 높이 조절" : "상세를 펼친 뒤 드래그 가능"}
          >
            <div className="flex items-center justify-between">
              {/* 가운데 핸들(드래그 영역) */}
              <div
                onMouseDown={detailOpen ? onSplitDown : undefined}
                className={[
                  "flex-1 flex items-center justify-center gap-2 text-xs text-zinc-500",
                  detailOpen ? "cursor-row-resize" : "cursor-not-allowed opacity-60",
                ].join(" ")}
              >
                <span className="h-1 w-10 rounded-full bg-zinc-300 group-hover:bg-zinc-400" />
                <span>분할바</span>
                <span className="h-1 w-10 rounded-full bg-zinc-300 group-hover:bg-zinc-400" />
              </div>

              {/* 항상 보이는 상세 토글 버튼 */}
              <button
                className="ml-3 rounded-md bg-sky-200 px-3 py-1.5 text-sm text-blue font-semibold hover:bg-sky-100"
                onClick={() => {
                  // 닫는 순간에는 언마운트 되기 전에 저장해야 안전
                  if (detailOpen) saveWorkScroll();
                  setDetailOpen((v) => !v);
                }}
                type="button"
              >
                {detailOpen ? "견적상세 접기" : "견적상세 열기"}
              </button>
            </div>
          </div>


          {/* 7) 견적상세 패널 (detailHeight가 커지면 상단 리스트가 줄어듦) */}
          <div
            className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col"
            style={{ height: detailOpen ? detailHeight : 52 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div className="text-sm font-semibold text-zinc-900">견적상세</div>
            </div>


            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
              {!detailOpen ? (
                <div className="px-4 py-4 text-sm text-zinc-500">
                  기본은 접힘 상태입니다. <b>상세작업 보기</b>를 눌러 펼치세요.
                </div>
              ) : !selected ? (
                <div className="px-4 py-10 text-center text-zinc-500">
                  견적을 선택하면 상세가 표시됩니다.
                </div>
              ) : (
                <FixedHeadTable
                  columns={workColumns}
                  rows={workRows}
                  rowKey={(r, idx) => idx}
                  height="100%"
                  bodyClassName="min-h-0 flex-1"
                  bodyScrollRef={workBodyElRef}
                />
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

/* =================== UI Components =================== */
function InlineActions({
  onModify,
  onDelete,
  onClose,
  onPhoto,
  onSms,
  onMemo,
  onDeposit,
  printOpen,
  setPrintOpen,
  onPrint,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SmallBtn onClick={onModify}>수정</SmallBtn>
      <SmallBtn onClick={onDelete}>삭제</SmallBtn>
      <SmallBtn onClick={onClose}>종결</SmallBtn>
      <span className="mx-1 h-5 w-px bg-zinc-200" />

      <SmallBtn onClick={onPhoto}>사진</SmallBtn>
      <SmallBtn onClick={onSms}>문자</SmallBtn>

      <div className="relative">
        <SmallBtn onClick={() => setPrintOpen(!printOpen)}>인쇄 ▾</SmallBtn>
        {printOpen && (
          <div className="absolute left-0 top-9 w-44 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg z-10">
            <MenuItem onClick={() => { setPrintOpen(false); onPrint("견적서"); }}>견적서 인쇄</MenuItem>
            <MenuItem onClick={() => { setPrintOpen(false); onPrint("거래명세서"); }}>거래명세서</MenuItem>
            <MenuItem onClick={() => { setPrintOpen(false); onPrint("보험청구서"); }}>보험청구서</MenuItem>
          </div>
        )}
      </div>
      <SmallBtn onClick={onMemo}>메모</SmallBtn>
      <SmallBtn onClick={onDeposit}>입금</SmallBtn>
    </div>
  );
}


function SmallBtn({ children, onClick }) {
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


function Btn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 active:translate-y-[1px]"
    >
      {children}
    </button>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none hover:bg-zinc-50 focus:border-zinc-400"
    />
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "rounded-md border px-3 py-2 text-sm font-semibold",
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StatusBadge({ value }) {
  const cls =
    value === "종결"
      ? "bg-emerald-100 text-emerald-800"
      : value === "작업"
      ? "bg-sky-100 text-sky-800"
      : "bg-zinc-100 text-zinc-700";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {value}
    </span>
  );
}

function fmt(n) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function MiniBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

