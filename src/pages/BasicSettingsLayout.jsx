import { NavLink, Outlet } from "react-router-dom";

const menus = [
  { to: "company", label: "업체정보" },
  { to: "labor", label: "일반공임 및 옵션" },
  { to: "work-status", label: "작업상태 등록" },
  { to: "insurers", label: "보험사 M/H설정" },
  { to: "insurer-contacts", label: "보험담당자 등록" },
  { to: "users", label: "사용자 등록" },
  { to: "sms-sender", label: "문자발송 발신번호 등록" },

];

export default function BasicSettingsLayout() {
  return (
    <div className="h-full bg-zinc-50 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="text-lg font-semibold text-zinc-900">
            기초설정
          </div>
          <div className="text-xs text-zinc-500">업체 · 공임 · 작업상태 · 보험 · 사용자 관리</div>
        </div>
      </div>

      {/* 본문 */}
      <div className="app-container py-4 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0">
          
          {/* Left : 메뉴만 */}
          <aside className="w-64 shrink-0 h-full min-h-0">
            <div className="bg-white border border-zinc-200 border-r-0 rounded-l-md
                            h-full min-h-0 overflow-y-auto no-scrollbar p-4">
              <nav className="space-y-1">
                {menus.map((m) => (
                  <NavLink
                    key={m.to}
                    to={m.to}
                    className={({ isActive }) =>
                      [
                        "block px-3 py-3 rounded-md text-sm font-medium transition whitespace-nowrap",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "gray-700 hover:bg-gray-100",
                      ].join(" ")
                    }
                  >
                    {m.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right : 서브페이지 */}
          <section className="flex-1 min-w-0 h-full min-h-0">
            <div className="bg-white border border-zinc-200 rounded-r-md
                            h-full min-h-0 flex flex-col overflow-hidden">
              {/* 좌/우 경계선 */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                              border-l border-zinc-200 p-5">
                <Outlet />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
