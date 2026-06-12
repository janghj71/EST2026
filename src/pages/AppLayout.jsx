import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { getComcode, getUserid, setServiceKey } from "../api/config";
import { useTbCode, clearTbCodeCache } from "../hooks/useTbCode";
import { User, LogOut } from "lucide-react";

export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [openMenu,    setOpenMenu]    = useState(null); // top 드롭다운
  const [openAccord,  setOpenAccord]  = useState(null); // left 아코디언
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

  const menus = useMemo(
    () => [
      { key: "estimate-normal",    label: "일반견적",       path: "/estimate/normal" },
      { key: "estimate-insurance", label: "보험견적",       path: "/estimate/insurance" },
      {
        key: "send",
        label: "문자발송",
        items: [
          { label: "문자 발송 내역",    path: "/send/history" },
          { label: "견적서 문자 발송",  path: "/send/estimate" },
          { label: "명세서 문자 발송",  path: "/send/statement" },
        ],
      },
      { key: "mol",      label: "국토부 정비이력", path: "/send/repair" },
      { key: "chemical", label: "케미칼 설정",     path: "/chemical" },
      { key: "settings", label: "기초설정",         path: "/settings/basic" },
    ],
    []
  );

  const goHome = () => { setOpenMenu(null); navigate("/dashboard"); };

  const onLogout = () => {
    setServiceKey(null);
    localStorage.removeItem("usertype");
    clearTbCodeCache();
    navigate("/");
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col min-[1600px]:flex-row overflow-hidden">

      {/* ===== Top Header — 1600px 미만 ===== */}
      <header className="min-[1600px]:hidden shrink-0 sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="app-container">
          <div className="h-16 flex items-center justify-between">
            {/* 로고 */}
            <button type="button" onClick={goHome}
              className="flex items-center gap-3 text-left hover:opacity-90 transition">
              <AppHeader compact />
            </button>

            {/* 메뉴 */}
            <div className="flex items-center gap-2" ref={menuWrapRef}>
              {menus.map((m) =>
                m.path ? (
                  <button key={m.key} type="button"
                    onClick={() => { setOpenMenu(null); navigate(m.path); }}
                    className="h-9 px-3 rounded-md text-sm font-medium transition text-gray-700 hover:bg-gray-100">
                    {m.label}
                  </button>
                ) : (
                  <Dropdown key={m.key} label={m.label}
                    open={openMenu === m.key}
                    onToggle={() => setOpenMenu((p) => (p === m.key ? null : m.key))}
                    items={m.items}
                    onPick={(path) => { setOpenMenu(null); navigate(path); }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== 사이드바 + 컨텐츠 묶음 — 1600px 이상 ===== */}
      <div className="hidden min-[1600px]:flex flex-1 min-h-0 mx-auto w-full max-w-[1608px]">

        {/* 사이드바 */}
        <aside className="flex flex-col w-52 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {/* 로고 */}
          <button type="button" onClick={goHome}
            className="flex flex-col items-center gap-1 py-5 hover:bg-gray-50 transition border-b border-gray-100">
            <AppHeader compact />
          </button>

          {/* 메뉴 */}
          <nav className="flex flex-col py-2 flex-1">
            {menus.map((m) =>
              m.path ? (
                <SideItem key={m.key} label={m.label} path={m.path}
                  active={location.pathname === m.path}
                  onClick={() => navigate(m.path)}
                />
              ) : (
                <SideAccordion key={m.key} label={m.label}
                  open={openAccord === m.key}
                  onToggle={() => setOpenAccord((p) => (p === m.key ? null : m.key))}
                  items={m.items}
                  currentPath={location.pathname}
                  onPick={(path) => navigate(path)}
                />
              )
            )}
          </nav>

          {/* 로그인 정보 + 로그아웃 */}
          <div className="shrink-0 bg-neutral-900 px-4 py-4">
            {/* 사용자 정보 */}
            <div className="flex items-center gap-3 mb-5">
              {/* 아이콘 */}
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                <User size={13} className="text-white" />
              </div>
              {/* 텍스트 */}
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm truncate">{getComcode()}</div>
                <div className="text-gray-400 text-xs truncate">{getUserid()}</div>
                {usertypeLabel && (
                  <div className="text-gray-500 text-xs truncate">{usertypeLabel}</div>
                )}
              </div>
            </div>

            {/* 로그아웃 */}
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

      {/* ===== 컨텐츠 전용 — 1600px 미만 ===== */}
      <div className="flex-1 min-h-0 min-[1600px]:hidden">
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

// ── Left 사이드바 아코디언 (서브메뉴) ────────────────────────
function SideAccordion({ label, open, onToggle, items, currentPath, onPick }) {
  const hasActive = items.some((it) => it.path === currentPath);

  return (
    <div>
      <button type="button" onClick={onToggle}
        className={[
          "w-full text-left pl-4 pr-2 py-2.5 text-sm font-medium transition flex items-center gap-1",
          hasActive
            ? "text-gray-900 font-semibold"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        ].join(" ")}>
        <span className="flex-1">{label}</span>
        <span className="text-gray-400 text-xs mr-2">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="bg-gray-50 border-t border-gray-100">
          {items.map((it, idx) => (
            <button key={idx} type="button" onClick={() => onPick(it.path)}
              className={[
                "w-full text-left pl-6 pr-2 py-2 text-sm transition",
                currentPath === it.path
                  ? "bg-gray-200 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              ].join(" ")}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
