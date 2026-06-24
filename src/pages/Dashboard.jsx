import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserSettings } from "../hooks/useUserSettings";
import { getUserid } from "../api/config";
import { useWeather } from "../hooks/useWeather";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { getTodayProverb } from "../data/proverbs";
import { useMailHistory } from "../hooks/useMailHistory";
import { useRecentWork } from "../hooks/useEstimate";
import { useDashboardTsErrors } from "../hooks/useAosEstimate";
import { useMainNotice } from "../hooks/useNotice";
import { openCenteredWindow } from "../utils/popup";
import { ymd } from "../utils/dateUtils";

/* ── 히어로 슬라이드 (실사 이미지) ────────────────────────── */
const HERO_SLIDES = [
  "https://images.unsplash.com/photo-1755555707544-5f2cea7413c1?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=1400&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1400&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1485740112426-0c2549fa8c86?w=1400&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1614150797976-9dd24a4667b0?w=1400&q=80&auto=format&fit=crop",
];

/* ── 날짜 포맷 MM-DD ─────────────────────────────────────── */
const fmtDate = (d) => (d ? String(d).slice(5) : "");

/* wdate "2019-10-30 오전 10:34:00" → "2019-10-30" */
const fmtNoticeDate = (wdate) => (wdate ? String(wdate).slice(0, 10) : "");

const STATE_CLS = {
  "견적종결":   "bg-emerald-100 text-emerald-800",
  "종결":       "bg-emerald-100 text-emerald-800",
  "견적청구":   "bg-orange-100 text-orange-800",
  "견적서발행": "bg-blue-100 text-blue-800",
  "작업":       "bg-sky-100 text-sky-800",
};


const adUrl = "http://estservice.goldauto.co.kr/images/adv/banner_login.gif";

/* ── 날씨 코드 → 생활 문구 ───────────────────────────────────── */
const WEATHER_MSG = {
  clear:   "맑은 날씨네요, 기분 좋은 하루 되세요 ☀️",
  cloudy:  "구름이 많은 하루입니다 ⛅",
  fog:     "안개가 꼈어요, 출퇴근 조심하세요 🌫️",
  drizzle: "이슬비가 내려요, 가볍게 우산 챙기세요 🌂",
  rain:    "비가 오고 있어요, 우산 꼭 챙기세요 ☔",
  snow:    "눈이 내려요, 도로가 미끄러울 수 있어요 ❄️",
  shower:  "소나기가 예상돼요, 우산 준비하세요 🌦️",
  thunder: "천둥번개가 칩니다, 안전에 유의하세요 ⛈️",
};

function getWeatherMsg(code) {
  if (code === 0) return WEATHER_MSG.clear;
  if (code <= 2)  return WEATHER_MSG.cloudy;
  if (code === 3) return WEATHER_MSG.cloudy;
  if (code <= 48) return WEATHER_MSG.fog;
  if (code <= 55) return WEATHER_MSG.drizzle;
  if (code <= 65) return WEATHER_MSG.rain;
  if (code <= 77) return WEATHER_MSG.snow;
  if (code <= 82) return WEATHER_MSG.shower;
  return WEATHER_MSG.thunder;
}


/* ── Main ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [slideIdx, setSlideIdx] = useState(0);
  const { fetchRecentWork } = useRecentWork();
  const [recentWork, setRecentWork] = useState([]);

  const { fetchMainNotice } = useMainNotice();
  const [notices, setNotices] = useState([]);
  const noticeListWinRef = useRef(null);
  const noticeViewWinRef = useRef(null);

  useEffect(() => {
    fetchMainNotice().then((json) => setNotices((json?.dataset ?? []).slice(0, 4))).catch(() => {});
  }, [fetchMainNotice]);

  const openNoticeList = () => {
    if (noticeListWinRef.current && !noticeListWinRef.current.closed) {
      noticeListWinRef.current.focus();
      return;
    }
    noticeListWinRef.current = openCenteredWindow("/notice", "noticeList", 1100, 800, {
      scrollbars: "yes", resizable: "yes",
    });
  };

  const openNoticeView = (n) => {
    const payload = { num: n.num, title: n.title, wdate: n.wdate, contents: n.contents };
    sessionStorage.setItem("noticeViewCtx", JSON.stringify(payload));
    const msg = { type: "NOTICE_VIEW_SET_CTX", payload };
    if (noticeViewWinRef.current && !noticeViewWinRef.current.closed) {
      try {
        noticeViewWinRef.current.postMessage(msg, window.location.origin);
        noticeViewWinRef.current.focus();
        return;
      } catch { noticeViewWinRef.current = null; }
    }
    noticeViewWinRef.current = openCenteredWindow("/notice-view", "noticeView", 800, 640, {
      scrollbars: "yes", resizable: "yes",
      postMessage: msg,
    });
  };

  useEffect(() => {
    fetchRecentWork().then((json) => {
      const rows = json?.dataset ?? [];
      setRecentWork(rows.map((r) => ({
        est_serial: r.est_serial,
        seccode:    r.seccode,
        carno:      r.carno,
        custname:   r.custom_name,
        indayFull:  r.inday ?? "",
        inday:      fmtDate(r.inday),
        outday:     fmtDate(r.outday),
        state:      r.statename,
        preoutdate: (r.preoutdate ?? "").trim(),
        tsStatus: (() => {
          if (!r.ts_serial) return null;
          if (r.ts_rstcode === "MSG50000") return "성공";
          if (!r.ts_rstcode) return "전송중";
          return "오류";
        })(),
      })));
    }).catch(() => {});
  }, [fetchRecentWork]);

  const { users } = useUserSettings();
  const loginName = users.find((u) => u.hp === getUserid())?.username ?? getUserid();
  const { form: companyForm } = useCompanyInfo();
  const { weather, city: weatherCity } = useWeather(companyForm.addr1);

  const { fetchTsErrors } = useDashboardTsErrors();
  const [tsErrorCount, setTsErrorCount] = useState(0);
  const [tsErrorTabs,  setTsErrorTabs]  = useState({ aos: false, adl: false });
  const tsErrorDateRange = useMemo(() => {
    const now  = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { ts_send_dt1: ymd(from), ts_send_dt2: ymd(now) };
  }, []);

  useEffect(() => {
    const { ts_send_dt1, ts_send_dt2 } = tsErrorDateRange;
    fetchTsErrors(ts_send_dt1, ts_send_dt2).then(({ aosErrors, adlErrors }) => {
      setTsErrorCount(aosErrors.length + adlErrors.length);
      setTsErrorTabs({ aos: aosErrors.length > 0, adl: adlErrors.length > 0 });
    }).catch(() => {});
  }, [fetchTsErrors, tsErrorDateRange]);

  const openTsErrors = () => {
    const { aos, adl } = tsErrorTabs;
    const tab = !aos && adl ? "adl" : "aos";
    navigate("/send/repair", {
      state: { onlyError: true, activeTab: tab, ...tsErrorDateRange },
    });
  };

  const { fetchMailList } = useMailHistory();
  const [mailFails, setMailFails] = useState([]);
  const mailDateRange = useMemo(() => {
    const now  = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { day1: ymd(from), day2: ymd(now) };
  }, []);
  const mailHistWinRef = useRef(null);

  const openMailHistory = () => {
    const { day1, day2 } = mailDateRange;
    const payload = { day1, day2, filterFailOnly: true };
    if (mailHistWinRef.current && !mailHistWinRef.current.closed) {
      try {
        mailHistWinRef.current.postMessage(
          { type: "MAIL_HISTORY_SET_CTX", payload },
          window.location.origin
        );
        mailHistWinRef.current.focus();
        return;
      } catch { mailHistWinRef.current = null; }
    }
    mailHistWinRef.current = openCenteredWindow("/mail-history", "mailHistory", 1100, 800, {
      scrollbars: "yes", resizable: "yes",
      postMessage: { type: "MAIL_HISTORY_SET_CTX", payload },
    });
  };

  useEffect(() => {
    const { day1, day2 } = mailDateRange;
    fetchMailList({ day1, day2 }).then((json) => {
      const rows = json?.dataset ?? [];
      setMailFails(rows.filter((r) => r.smtp_result !== "250"));
    }).catch(() => {});
  }, [fetchMailList, mailDateRange]);

  useEffect(() => {
    const t = setInterval(() => {
      setSlideIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className="h-full overflow-hidden">
      <main className="app-container py-6 h-full flex flex-col gap-2">

        {/* ① HERO ─────────────────────────────────────── */}
        <section
          className="relative bg-white rounded-xl border border-gray-200 overflow-hidden"
          style={{ height: "44%" }}
        >
          {/* 배경 슬라이드 */}
          {HERO_SLIDES.map((src, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
              style={{
                backgroundImage: `url('${src}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: slideIdx === i ? 1 : 0,
                animation: slideIdx === i ? "kenburns 12s ease-in-out forwards" : "none",
              }}
            />
          ))}
          {/* 좌측 흰색 그라데이션 오버레이 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.85) 35%, rgba(255,255,255,.35) 60%, rgba(255,255,255,0) 80%)",
            }}
          />
          {/* 우측 비넷 */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, transparent 50%, rgba(15,23,42,.15) 100%)" }}
          />

          {/* 콘텐츠 */}
          <div className="relative h-full px-8 py-6 flex flex-col justify-between" style={{ zIndex: 2, maxWidth: "62%" }}>
            <div>
              {weather && (
                <div className="inline-flex items-center gap-2 text-[13px] text-gray-700 font-medium">
                  {weatherCity && <span className="font-bold text-gray-800">{weatherCity}</span>}
                  {weatherCity && <span className="text-gray-300">|</span>}
                  <span className="text-lg leading-none">{weather.icon}</span>
                  <span>{weather.label}</span>
                  <span className="font-bold text-indigo-600">{weather.temp}°C</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">바람 {weather.wind}km/h</span>
                </div>
              )}
              <div className="mt-1 text-[28px] leading-tight font-black text-gray-900">
                안녕하세요, <span className="text-indigo-600">{loginName}</span>님 👋
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{today}</div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                {weather ? getWeatherMsg(weather.code) : "좋은 하루 되세요"}
              </div>
              <div className="text-xs text-indigo-500 mt-1 italic">"{getTodayProverb()}"</div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {tsErrorCount > 0 && (
                  <button
                    onClick={openTsErrors}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur border border-red-200 text-red-700 text-xs font-semibold hover:bg-white animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    국토부 전송오류 <span className="font-bold">{tsErrorCount}</span>건
                  </button>
                )}
                {mailFails.length > 0 && (
                  <button
                    onClick={openMailHistory}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    메일 발송실패 <span className="font-bold">{mailFails.length}</span>건
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/estimate/insurance", { state: { openNew: true } })}
                  className="group h-11 px-5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <span>+ 보험견적 신규</span>
                  <span className="group-hover:translate-x-0.5 transition">→</span>
                </button>
                <button
                  onClick={() => navigate("/estimate/normal", { state: { openNew: true } })}
                  className="group h-11 px-5 rounded-xl bg-white border border-gray-300 text-gray-800 text-sm font-bold hover:border-gray-500 hover:shadow-md transition flex items-center gap-2"
                >
                  <span>+ 일반견적 신규</span>
                  <span className="text-gray-400 group-hover:translate-x-0.5 transition">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* 인디케이터 */}
          <div className="absolute bottom-3 right-5 flex gap-1.5" style={{ zIndex: 3 }}>
            {HERO_SLIDES.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: slideIdx === i ? 20 : 6,
                  background: slideIdx === i ? "rgba(17,24,39,.8)" : "rgba(107,114,128,.5)",
                }}
              />
            ))}
          </div>
        </section>

        {/* ② MAIN 2분할 ──────────────────────────────── */}
        <section className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* 좌: 최근 작업 */}
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col min-h-0">
            <div className="shrink-0 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IcClock />
                <span className="text-sm font-semibold text-gray-900">최근 작업</span>
                <span className="text-[11px] text-gray-400">최근 수정순</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
              {recentWork.map((r, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const path = r.seccode === "11" ? "/estimate/normal" : "/estimate/insurance";
                    navigate(path, { state: { selectedSerial: r.est_serial, inday: r.indayFull } });
                  }}
                  className={`px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${r.tsStatus === "오류" ? "bg-red-50/30" : ""}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{r.carno}</span>
                      {r.state && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATE_CLS[r.state] ?? "bg-zinc-100 text-zinc-700"}`}>
                          {r.state}
                        </span>
                      )}
                      {r.tsStatus === "오류"  && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold">전송오류</span>}
                      {r.tsStatus === "전송중" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-semibold">전송중</span>}
                      {r.tsStatus === "성공"  && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-semibold">전송완료</span>}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {r.custname} · 입고 {r.inday}
                      {r.preoutdate && <> · <span className="text-purple-500">출고예정 {r.preoutdate}</span></>}
                      {r.outday && <> · 출고 {r.outday}</>}
                    </div>
                  </div>
                  <span className="text-gray-300">›</span>
                </div>
              ))}
            </div>
          </div>

          {/* 우: 공지사항 + 광고 (1fr 1fr) */}
          <div className="grid gap-2 min-h-0" style={{ gridTemplateRows: "1fr 1fr" }}>
            {/* 공지사항 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
              <div className="shrink-0 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IcBell />
                  <span className="text-sm font-semibold text-gray-900">공지사항</span>
                </div>
                <button
                  onClick={openNoticeList}
                  className="text-[11px] text-gray-500 hover:text-gray-900">
                  더보기 →
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
                {notices.map((n) => (
                  <div
                    key={n.num}
                    onClick={() => openNoticeView(n)}
                    className="px-5 py-2 flex items-start gap-2 cursor-pointer hover:bg-slate-50"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-800 truncate">{n.title}</div>
                      <div className="text-[10px] text-gray-400">{fmtNoticeDate(n.wdate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 광고 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
              <div className="shrink-0 px-5 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900">서비스 안내</span>
                <span className="text-[10px] text-gray-300">광고</span>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-100">
                <img src={adUrl} alt="banner" className="w-full h-full object-contain" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* ③ FOOTER ──────────────────────────────────── */}
        <footer className="shrink-0 bg-white rounded-lg border border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img src="/intravan_logo.png" alt="INTRAVAN" className="h-20 w-auto object-contain" draggable={false} />
            <div className="w-px h-16 bg-gray-200" />
            <div>
              <div className="text-sm font-semibold text-gray-900">고객센터</div>
              <div className="text-[11px] text-gray-500 mt-0.5">평일 09:00~18:00 · 점심 12:00~13:00 · 토/일/공휴일 휴무</div>
              <div className="text-2xl font-extrabold text-green-700 leading-tight mt-0.5">1522-3840</div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => window.open("/pt_menual.pdf", "_blank")}
              className="h-11 px-5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 transition">
              <IcDownload /> 매뉴얼 다운로드
            </button>
            <button
              onClick={() => window.open("https://939.co.kr/", "_blank")}
              className="h-11 px-5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 transition">
              <IcHeadset /> 원격지원 요청
            </button>
          </div>
        </footer>
      </main>

      {/* Ken Burns keyframes */}
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1) translate(0,0); }
          100% { transform: scale(1.08) translate(-1%,-1%); }
        }
      `}</style>
    </div>
  );
}

/* ── 아이콘 ──────────────────────────────────────────────── */
function IcClock() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IcBell() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
    </svg>
  );
}
function IcDownload() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}
function IcHeadset() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
    </svg>
  );
}
