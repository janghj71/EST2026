import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";


export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenu, setOpenMenu] = useState(null);
  const menuWrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(e.target)) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const menus = useMemo(
    () => [
      {
        key: "estimate",
        label: "견적 관리",
        items: [
          { label: "일반 견적", path: "/estimate/normal" },
          { label: "보험 견적", path: "/estimate/insurance" },
        ],
      },
      {
        key: "send",
        label: "전송 / 발송",
        items: [
          { label: "문자 발송 내역", path: "/send/history" },
          { label: "견적서 문자 발송", path: "/send/estimate" },
          { label: "명세서 문자 발송", path: "/send/statement" },
          { label: "국토부 정비이력 전송", path: "/send/mol" },
          { label: "타견적 국토부 이력 전송", path: "/send/mol-other" },
        ],
      },
      {
        key: "data",
        label: "데이터 관리",
        items: [
          { label: "공임 데이터 조회", path: "/data/labor" },
          { label: "케미칼 항목 설정", path: "/data/chemical" },
        ],
      },
      {
        key: "settings",
        label: "설정",
        items: [
          { label: "기초 설정", path: "/settings/basic" },
          { label: "발신번호 등록", path: "/settings/caller" },
        ],
      },
    ],
    []
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* ===== Header (항상 고정) ===== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        {/* <div className="mx-auto max-w-7xl px-4 sm:px-6"> */}
        {/* <div className="mx-auto max-w-[1400px] w-full px-4"> */}
        <div className="app-container">
          {/* 상단 라인: 로고 + 메뉴 */}
          <div className="h-16 flex items-center justify-between">
            {/* 왼쪽: 브랜드 */}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                navigate("/dashboard");
              }}
              className="flex items-center gap-3 text-left hover:opacity-90 transition"
            >
              <img
                src="/EST.ico"
                alt="EST2026"
                className="w-8 h-8"
                draggable={false}
              />
              <AppHeader compact />

              {/* <div className="leading-tight">
                <div className="text-xl font-bold tracking-tight text-gray-900">
                  자동차 정비 견적관리
                  <span className="ml-1 text-green-700">EST2026</span>
                </div>
              </div> */}

            </button>

            {/* 오른쪽: 메뉴 */}
            <div className="flex items-center gap-2" ref={menuWrapRef}>
              
              {menus.map((m) => (
                <Dropdown
                  key={m.key}
                  label={m.label}
                  open={openMenu === m.key}
                  onToggle={() =>
                    setOpenMenu((p) => (p === m.key ? null : m.key))
                  }
                  items={m.items}
                  onPick={(path) => {
                    setOpenMenu(null);
                    navigate(path);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}


function Dropdown({ label, open, onToggle, items, onPick }) {
  const btnRef = useRef(null);
  const [align, setAlign] = useState("center"); // "center" | "right" | "left"

  useLayoutEffect(() => {
    if (!open) return;
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;

    // 버튼 중심 기준으로 드롭다운이 뜬다고 가정했을 때,
    // 화면 밖으로 나갈 가능성이 있으면 정렬을 바꿈
    const preferWidth = 220; // 대략적인 드롭다운 폭(너무 정확할 필요 없음)
    const leftOverflow = r.left + r.width / 2 - preferWidth / 2 < 12;
    const rightOverflow = r.left + r.width / 2 + preferWidth / 2 > vw - 12;

    if (rightOverflow) setAlign("right");
    else if (leftOverflow) setAlign("left");
    else setAlign("center");
  }, [open]);

  const panelCls =
    align === "right"
      ? "absolute right-0 top-10"
      : align === "left"
      ? "absolute left-0 top-10"
      : "absolute left-1/2 top-10 -translate-x-1/2";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={onToggle}
        className={[
          "h-9 px-3 rounded-md text-sm font-medium transition flex items-center gap-1",
          open ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
        ].join(" ")}
      >
        {label}
        <span className={open ? "text-white/80" : "text-gray-400"}>▾</span>
      </button>

      {open && (
        <div
          className={[
            panelCls,
            // "w-56 max-w-[calc(100vw-24px)] z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden",
            "min-w-[100px] w-max max-w-[180px] z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden",
          ].join(" ")}
        >
          <div className="py-1">
            {items.map((it, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onPick(it.path)}
                // className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap truncate"
                className="w-full text-left px-3 py-2 text-sm  text-gray-700 
                  hover:bg-gray-100 hover:text-gray-900 hover:font-semibold whitespace-nowrap truncate"

                title={it.label}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}


// function Dropdown({ label, open, onToggle, items, onPick }) {
//   return (
//     <div className="relative">
//       <button
//         onClick={onToggle}
//         className={[
//           "h-9 px-3 rounded-md text-sm font-medium transition flex items-center gap-1",
//           open ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
//         ].join(" ")}
//       >
//         {label}
//         <span className={open ? "text-white/80" : "text-gray-400"}>▾</span>
//       </button>

//       {open && (
//         // <div className="absolute left-1/2 top-10 -translate-x-1/2 min-w-[180px] max-w-[240px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
//         <div className="absolute left-1/2 top-10 -translate-x-1/2 min-w-[180px] w-max max-w-[calc(100vw-24px)] z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">

//           <div className="py-1">
//             {items.map((it, idx) => (
//               <button
//                 key={idx}
//                 type="button"
//                 onClick={() => onPick(it.path)}
//                 className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                
//               >
//                 {it.label}
//               </button>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
