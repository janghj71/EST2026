import { useState } from "react";
import { useNavigate } from "react-router-dom";

import UserAuth from "../components/UserAuth";
import FindPassword from "../components/FindPassword";
import { useEstLogin } from "../hooks/useEstLogin";
import { getComcode, getUserid } from "../api/config";
import { useAlert } from "../alerts";


export default function Login() {
  const navigate = useNavigate();
  const estLogin = useEstLogin();

  const [openAuth, setOpenAuth] = useState(false);
  const [openPw, setOpenPw] = useState(false);
  const alert = useAlert();


  const [form, setForm] = useState(() => {
    const savedComcode = getComcode() ;
    const savedUserid = getUserid();
    return { comcode: savedComcode, userid: savedUserid, password: "" };
  });
  
  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.comcode.trim()) {
      await alert.warning("업체코드를 입력하세요.");
      return;
    }
  
    if (!form.userid.trim()) {
      await alert.warning("아이디를 입력하세요.");
      return;
    }
  
    if (!form.password.trim()) {
      await alert.warning("비밀번호를 입력하세요.");
      return;
    }

    const res = await estLogin.login({
      comcode: form.comcode,
      userid: form.userid,
      passwd: form.password,
    });

    if (import.meta.env.DEV) console.log("res", res);

    if (String(res?.result).toUpperCase() === "OK") {
      // 필요하면 usertype 저장 (권한 분기 등에 사용)
      localStorage.setItem("usertype", res?.usertype ?? "");

      navigate("/dashboard");
      return;
    }
    
    await alert.error(res?.msg || estLogin.error?.message || "로그인 실패");
  };
  

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl flex rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: 640 }}>

        {/* ── 왼쪽 브랜드 패널 ── */}
        <div className="hidden md:flex md:w-5/12 bg-neutral-900 flex-col justify-between p-12 text-white">
          <div>
            <div className="text-4xl font-black tracking-tight">MOM</div>
            <div className="text-gray-400 text-sm mt-1 font-medium">Mobility Online Management</div>
          </div>

          <div>
            <p className="text-2xl font-bold leading-snug text-white mb-4">
              자동차 정비<br />견적 관리 시스템
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              보험 · 일반 견적부터<br />
              문자 발송 · 국토부 이력 전송까지<br />
              한 곳에서 관리합니다.
            </p>
          </div>

          <div className="text-gray-600 text-xs">
            Copyright © 2026 Highway Co., Ltd.
          </div>
        </div>

        {/* ── 오른쪽 로그인 폼 ── */}
        <div className="flex-1 bg-white flex flex-col justify-center px-10 md:px-14 py-12">

          {/* 모바일용 브랜드 */}
          <div className="md:hidden mb-8 text-center">
            <div className="text-3xl font-black text-gray-900">MOM</div>
            <div className="text-gray-400 text-xs mt-1">Mobility Online Management</div>
          </div>

              {/* Right Login */}
              <div className="flex flex-col w-full max-w-sm mx-auto">

                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                  로그인
                </h1>
                <p className="text-sm text-gray-400 mb-8">계정 정보를 입력하세요</p>

                <form className="space-y-4" onSubmit={onSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">업체코드</label>
                    <input
                      name="comcode"
                      value={form.comcode}
                      onChange={onChange}
                      placeholder="업체코드를 입력하세요"
                      className="w-full h-11 rounded-md border border-gray-300 px-3
                                text-gray-800 placeholder:text-gray-400 bg-gray-50
                                outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">아이디</label>
                    <input
                      name="userid"
                      value={form.userid}
                      onChange={onChange}
                      placeholder="아이디를 입력하세요"
                      autoComplete="username"
                      className="w-full h-11 rounded-md border border-gray-300 px-3
                                text-gray-800 placeholder:text-gray-400 bg-gray-50
                                outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="비밀번호를 입력하세요"
                      autoComplete="current-password"
                      className="w-full h-11 rounded-md border border-gray-300 px-3
                                text-gray-800 placeholder:text-gray-400 bg-gray-50
                                outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-md bg-neutral-900 text-white font-semibold
                              hover:bg-neutral-700 active:bg-neutral-950 transition mt-1"
                  >
                    로그인
                  </button>
                </form>

                <div className="mt-5 flex gap-4 justify-center">
                  <button type="button" onClick={() => setOpenAuth(true)}
                    className="text-sm text-gray-400 hover:text-gray-700 transition">
                    사용자 인증
                  </button>
                  <span className="text-gray-200">|</span>
                  <button type="button" onClick={() => setOpenPw(true)}
                    className="text-sm text-gray-400 hover:text-gray-700 transition">
                    비밀번호 찾기
                  </button>
                </div>

        </div>
        </div>
      </div>

      {/* Modals */}
      {openAuth &&
        <UserAuth
          onClose={() => setOpenAuth(false)}
          onSuccess={(data) => {
            setForm((p) => ({ ...p, comcode: data.comcode, userid: data.hp }));
            setOpenAuth(false);
          }}
        />}
      {openPw && <FindPassword onClose={() => setOpenPw(false)} />}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="block text-sm text-slate-700 mb-1">{label}</div>
      {children}
    </div>
  );
}
