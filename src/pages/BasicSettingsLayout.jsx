import { NavLink, Outlet } from "react-router-dom";

const menus = [
  { to: "company",          label: "업체정보" },
  { to: "labor",            label: "일반공임 및 옵션" },
  { to: "work-status",      label: "작업상태 등록" },
  { to: "insurers",         label: "보험사 M/H설정" },
  { to: "insurer-contacts", label: "보험담당자 등록" },
  { to: "users",            label: "사용자 등록" },
  { to: "sms-sender",       label: "문자발신번호 등록" },
];

export default function BasicSettingsLayout() {
  return (
    <div className="h-full bg-zinc-50 flex flex-col overflow-hidden">

      {/* 헤더 — 다른 페이지와 동일 */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="text-lg font-semibold text-zinc-900">기초설정</div>
          <div className="text-xs text-zinc-500">업체 · 공임 · 작업상태 · 보험 · 사용자 관리</div>
        </div>
      </div>

      {/* 본문 */}
      <div className="app-container flex-1 overflow-hidden flex flex-col pt-5">

        {/* 탭 */}
        <nav className="flex overflow-x-auto no-scrollbar shrink-0">
          {menus.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                [
                  "shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap",
                  isActive
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300",
                ].join(" ")
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>

        {/* 콘텐츠 */}
        <div className="flex-1 min-h-0 overflow-hidden py-4">
          <div className="bg-white border border-zinc-200 rounded-md h-full overflow-y-auto no-scrollbar p-5">
            <Outlet />
          </div>
        </div>

      </div>

    </div>
  );
}
