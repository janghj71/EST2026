import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../alerts";


/**
 * Dashboard layout (renewal)
 * - React + Tailwind only
 * - 메뉴/리스트는 더미 데이터 (추후 API 연결)
 */

export default function Dashboard() {
  const navigate = useNavigate();
  // 더미 데이터 (추후 API)
  const notices = [
    { title: "사용자 부품 조회 기능 개선 안내", date: "2019-10-30 10:34" },
    { title: "공임 삭제 및 컬러매칭 기능 추가", date: "2019-09-17 11:19" },
  ];

  const sendLogs = [
    { title: "11가1234 차량의 사진입니다.", date: "2025-07-07 10:17" },
    { title: "11가1234 차량의 사진입니다.", date: "2025-07-04 15:31" },
    { title: "11가1234 차량의 사진입니다.", date: "2025-07-04 15:24" },
  ];

  // 광고/배너 (기존과 동일 사용 가능)
  const adUrl = "http://estservice.goldauto.co.kr/images/adv/banner_login.gif";

  return (
    // <div className="min-h-screen bg-slate-50">
    <div className="h-full overflow-y-scroll no-scrollbar">
      <main className="app-container py-6">
      {/* <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6"> */}
        {/* Hero row: 광고 + Quick actions */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:min-h-[460px]">
          {/* Banner / 광고 */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              
              <div className="bg-slate-100  flex items-center justify-center h-[360px] sm:h-[420px] lg:h-[460px]">
                <img
                  src={adUrl}
                  alt="banner"
                  // className="w-full h-full object-contain block"
                  className="w-full h-full object-cover block"
                  loading="lazy"
                />
              </div>

            </div>
          </div>

          {/* Quick actions */}
          <div className="lg:col-span-6">
            {/* 우측은 퀵카드 4개만, 아래 “바로가기” 섹션 삭제 */}
            <div className="grid grid-cols-2 gap-4 lg:h-[460px]">
              <QuickCard
                title="일반 견적"
                desc="신규 작성 / 조회"
                icon="doc"
                accent="green"
              />
              <QuickCard
                title="보험 견적"
                desc="신규작성 / 보험 청구 / 조회"
                icon="pen"
                accent="green"
                onClick={() => navigate("/estimate/insurance")}
              />
              <QuickCard
                title="국토부 이력 전송"
                desc="전송 / 오류 확인"
                icon="upload"
                accent="blue"
              />
              <QuickCard
                title="자주 묻는 질문"
                desc="도움말 / 가이드"
                icon="chat"
                accent="gray"
              />
            </div>
          </div>
        </section>

        {/* Notice / Send logs */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel
            title="공지사항"
            right={<a className={moreLink} href="#">더보기</a>}
          >
            <ListTable
              icon="megaphone"
              rows={notices.map((n) => ({ left: n.title, right: n.date }))}
            />
          </Panel>

          <Panel
            title="발송 / 전송 알림"
            right={<a className={moreLink} href="#">더보기</a>}
          >
            <ListTable
              icon="mail"
              rows={sendLogs.map((n) => ({ left: n.title, right: n.date }))}
            />
          </Panel>
        </section>
      </main>

      {/* ===== Footer support ===== */}
      <footer className="mt-0 bg-white border-t border-gray-200">
        {/* <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6"> */}
        <div className="app-container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-3 flex items-center gap-3">
              
              <div className="lg:col-span-3 flex items-center">
                <img
                  src="/intravan_logo.png"
                  alt="INTRAVAN"
                  className=" h-10 sm:h-12 w-auto object-contain  scale-[2.2] origin-left  -ml-2"
                  draggable={false}
                />
              </div>


              {/* <div>
                <div className="text-sm font-semibold text-gray-900">INTRAVAN</div>
                <div className="text-xs text-gray-500">Estimate Platform</div>
              </div>
               */}
            </div>

            <div className="lg:col-span-5">
              <div className="text-sm font-semibold text-gray-900">고객센터</div>
              <div className="mt-1 text-sm text-gray-600">
                평일 09:00 ~ 18:00 · 점심 12:00 ~ 13:00 · 토/일/공휴일 휴무
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-green-700">
                1522-3840
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button className={supportBtn}>
                <Icon name="download" />
                매뉴얼 다운로드
              </button>
              <button className={supportBtn}>
                <Icon name="headset" />
                원격지원 요청하기
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =======================
   Components
======================= */

function NavLink({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "h-9 px-3 rounded-md text-sm font-medium transition",
        active
          ? "bg-gray-900 text-white"
          : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Dropdown({ label, open, onToggle, items }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={[
          "h-9 px-3 rounded-md text-sm font-medium transition flex items-center gap-1",
          open ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
        ].join(" ")}
      >
        {label}
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="py-2">
            {items.map((it, idx) => (
              <a
                key={idx}
                href={it.href}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {it.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickCard({ title, desc, icon, accent = "gray", onClick  }) {
  const accentMap = {
    green: "border-green-200 hover:border-green-300",
    blue: "border-sky-200 hover:border-sky-300",
    gray: "border-gray-200 hover:border-gray-300",
  };

  const badgeMap = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <button
      onClick={onClick}
      className={[
        "text-left bg-white rounded-2xl shadow-sm border p-4 transition h-full",
        "hover:shadow-md",
        accentMap[accent] || accentMap.gray,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-gray-900">{title}</div>
          <div className="mt-1 text-sm text-gray-500">{desc}</div>
        </div>
        <div
          className={[
            "shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center",
            badgeMap[accent] || badgeMap.gray,
          ].join(" ")}
        >
          <Icon name={icon} />
        </div>
      </div>
    </button>
  );
}

function Panel({ title, right, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="text-base font-semibold text-gray-900">{title}</div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ListTable({ rows, icon }) {
  return (
    <div className="space-y-3">
      {rows.map((r, idx) => (
        <div key={idx} className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <Icon name={icon} />
            </span>
            <div className="text-sm text-gray-800 truncate">{r.left}</div>
          </div>
          <div className="text-xs text-gray-500 shrink-0">{r.right}</div>
        </div>
      ))}
    </div>
  );
}

/* =======================
   Icons (inline, no lib)
======================= */
function Icon({ name }) {
  // 간단 inline svg
  switch (name) {
    case "doc":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z" />
        </svg>
      );
    case "pen":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.06 9.02 15.5 10.46 7.96 18H6.5v-1.46l7.56-7.52zM17.66 3a2 2 0 0 1 1.41.59l1.34 1.34a2 2 0 0 1 0 2.82l-1.9 1.9-4.24-4.24 1.9-1.9A2 2 0 0 1 17.66 3z" />
        </svg>
      );
    case "upload":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 20h14v-2H5v2zM12 2l5 5h-3v6h-4V7H7l5-5z" />
        </svg>
      );
    case "chat":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm4 6h8v2H8v-2zm0-3h8v2H8V7z" />
        </svg>
      );
    case "mail":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      );
    case "megaphone":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 10v4a2 2 0 0 0 2 2h1l3 4h2l-1.5-4H19a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-7l-5-3H5a2 2 0 0 0-2 2z" />
        </svg>
      );
    case "download":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 20h14v-2H5v2zM12 2v12l4-4 1.4 1.4L12 17.8 6.6 11.4 8 10l4 4V2h0z" />
        </svg>
      );
    case "headset":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a8 8 0 0 0-8 8v7a2 2 0 0 0 2 2h3v-6H6v-3a6 6 0 0 1 12 0v3h-3v6h3a2 2 0 0 0 2-2v-7a8 8 0 0 0-8-8z" />
        </svg>
      );
    default:
      return <span className="text-gray-400">•</span>;
  }
}

/* =======================
   Class tokens
======================= */

const topActionBtn =
  "h-9 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition";

const ghostBtn =
  "h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium";

const pillBtn =
  "h-8 px-3 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition text-xs font-semibold";

const moreLink =
  "text-sm text-gray-600 hover:text-gray-900 transition font-medium";

const supportBtn =
  "h-11 px-4 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition font-medium inline-flex items-center justify-center gap-2";
