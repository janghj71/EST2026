import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { getComcode, getUserid, setServiceKey } from "../api/config";
import { useTbCode, clearTbCodeCache } from "../hooks/useTbCode";
import { User, LogOut } from "lucide-react";

export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [openMenu, setOpenMenu] = useState(null); // top 드롭다운
  const LOGOS = ["/logo_mom_test01.svg", "/logo_mom_test02.svg", null]; // null = AppHeader
  const [logoIdx, setLogoIdx] = useState(0);
  const cycleLogo = (e) => { e.stopPropagation(); setLogoIdx((i) => (i + 1) % LOGOS.length); };
  const menuWrapRef = useRef(null);
  const { codes: roleOptions } = useTbCode("STATE1");
  const usertype     = localStorage.getItem("usertype") || "";
  const usertypeLabel = roleOptions.find((r) => r.value === usertype)?.label || usertype;

  useEffect(() => {
    const onDown = (e) => {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(e.target)) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // 1600px 기준 레이아웃 분기 — Outlet을 한 번만 마운트하기 위해 JS로 제어
  // (CSS hidden 으로 두 Outlet을 동시에 두면 라우트 페이지가 2번 마운트됨)
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1600px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1600px)");
    const onChange = (e) => setIsWide(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const menuGroups = useMemo(
    () => [
      {
        group: "견적 관리",
        items: [
          { key: "estimate-normal",    label: "일반견적", path: "/estimate/normal" },
          { key: "estimate-insurance", label: "보험견적", path: "/estimate/insurance" },
        ],
      },
      {
        group: "문자발송",
        items: [
          { key: "send-history",   label: "문자 발송 내역",   path: "/send/history" },
          { key: "send-estimate",  label: "견적서 문자 발송", path: "/send/estimate" },
          { key: "send-statement", label: "명세서 문자 발송", path: "/send/statement" },
        ],
      },
      {
        group: "관리",
        items: [
          { key: "mol",      label: "국토부 정비이력", path: "/send/repair" },
          { key: "chemical", label: "케미칼 설정",     path: "/chemical" },
          { key: "settings", label: "기초설정",        path: "/settings/basic" },
        ],
      },
    ],
    []
  );

  const menus = useMemo(
    () => menuGroups.flatMap((g) => g.items),
    [menuGroups]
  );

  const goHome = () => { setOpenMenu(null); navigate("/dashboard"); };

  const onLogout = () => {
    setServiceKey(null);
    localStorage.removeItem("usertype");
    clearTbCodeCache();
    navigate("/");
  };

  if (isWide) {
    // ===== 1600px 이상: 사이드바 레이아웃 =====
    return (
      <div className="h-screen bg-slate-50 flex flex-row overflow-hidden">
        <div className="flex flex-1 min-h-0 mx-auto w-full max-w-[1608px]">

          {/* 사이드바 */}
          <aside className="flex flex-col w-52 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <button type="button" onClick={goHome}
              className="flex items-center justify-center py-4 hover:bg-gray-50 transition border-b border-gray-100 relative group">
              {LOGOS[logoIdx]
                ? <img src={LOGOS[logoIdx]} alt="MOM" className="h-14 w-auto" />
                : <AppHeader compact />
              }
              <span onClick={cycleLogo}
                className="absolute bottom-1 right-1 text-[9px] text-gray-300 group-hover:text-gray-500 cursor-pointer select-none">
                {logoIdx + 1}/3
              </span>
            </button>

            <nav className="flex flex-col py-3 flex-1">
              {menuGroups.map((g) => (
                <div key={g.group} className="mb-3">
                  <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {g.group}
                  </div>
                  {g.items.map((m) => (
                    <SideItem key={m.key} label={m.label}
                      active={
                        location.pathname === m.path ||
                        location.pathname.startsWith(m.path + "/") ||
                        location.state?.fromMenu === m.path
                      }
                      onClick={() => navigate(m.path)}
                    />
                  ))}
                </div>
              ))}
            </nav>

            <div className="shrink-0 bg-neutral-900 px-4 py-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  <User size={13} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{getComcode()}</div>
                  <div className="text-gray-400 text-xs truncate">{getUserid()}</div>
                  {usertypeLabel && (
                    <div className="text-gray-500 text-xs truncate">{usertypeLabel}</div>
                  )}
                </div>
              </div>
              <button type="button" onClick={onLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition w-full pl-2">
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
          </aside>

          {/* 컨텐츠 */}
          <div className="flex-1 min-h-0">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  // ===== 1600px 미만: 상단 헤더 레이아웃 =====
  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">

      <header className="shrink-0 sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="app-container">
          <div className="h-16 flex items-center justify-between">
            <button type="button" onClick={goHome}
              className="flex items-center gap-3 text-left hover:opacity-90 transition">
              <AppHeader compact />
            </button>

            <div className="flex items-center gap-1" ref={menuWrapRef}>
              {menus.map((m) => (
                <button key={m.key} type="button"
                  onClick={() => { setOpenMenu(null); navigate(m.path); }}
                  className="h-9 px-3 rounded-md text-sm font-medium transition text-gray-700 hover:bg-gray-100">
                  {m.label}
                </button>
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

// ── Top 드롭다운 ─────────────────────────────────────────────
function Dropdown({ label, open, onToggle, items, onPick }) {
  const btnRef = useRef(null);
  const [align, setAlign] = useState("center");

  useLayoutEffect(() => {
    if (!open) return;
    const el = btnRef.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const preferWidth = 220;
    const leftOverflow  = r.left + r.width / 2 - preferWidth / 2 < 12;
    const rightOverflow = r.left + r.width / 2 + preferWidth / 2 > vw - 12;
    if (rightOverflow)     setAlign("right");
    else if (leftOverflow) setAlign("left");
    else                   setAlign("center");
  }, [open]);

  const panelCls =
    align === "right"  ? "absolute right-0 top-10" :
    align === "left"   ? "absolute left-0 top-10"  :
                         "absolute left-1/2 top-10 -translate-x-1/2";

  return (
    <div className="relative">
      <button ref={btnRef} onClick={onToggle}
        className={[
          "h-9 px-3 rounded-md text-sm font-medium transition flex items-center gap-1",
          open ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
        ].join(" ")}>
        {label}
        <span className={open ? "text-white/80" : "text-gray-400"}>▾</span>
      </button>

      {open && (
        <div className={[
          panelCls,
          "min-w-[100px] w-max max-w-[180px] z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden",
        ].join(" ")}>
          <div className="py-1">
            {items.map((it, idx) => (
              <button key={idx} type="button" onClick={() => onPick(it.path)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700
                  hover:bg-gray-100 hover:text-gray-900 hover:font-semibold whitespace-nowrap truncate"
                title={it.label}>
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Left 사이드바 단일 메뉴 ───────────────────────────────────
function SideItem({ label, onClick, active }) {
  return (
    <button type="button" onClick={onClick}
      className={[
        "w-full text-left pl-4 pr-2 py-2.5 text-sm font-medium transition",
        active
          ? "bg-gray-900 text-white"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
      ].join(" ")}>
      {label}
    </button>
  );
}

