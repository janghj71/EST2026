import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AppHeader from "../components/AppHeader";
import UserAuth from "../components/UserAuth";
import FindPassword from "../components/FindPassword";
import { useEstLogin } from "../hooks/useEstLogin";
import { getComcode, getUserid } from "../api/config";
import { useAlert } from "../alerts";

const adUrl = "http://estservice.goldauto.co.kr/images/adv/banner_login.gif";

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
  

  const actionBtn =
  "h-10 px-6 rounded-md " +
  "border border-gray-400 " +
  "bg-white text-gray-600 " +
  "transition-all duration-150 " +
  "hover:bg-gray-500 hover:text-white hover:border-gray-500 " +
  "active:bg-gray-600 " ;
  
  return (
    // <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
    <div className="min-h-screen bg-slate-50">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">

        <div className="w-full max-w-6xl -translate-y-6 sm:-translate-y-10">
          <div className="mb-5 sm:mb-6">
            <AppHeader />
          </div>

          <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Ad */}
              <div className="bg-slate-100 p-6 flex items-center justify-center">
                <div className="w-full max-w-md rounded-xl overflow-hidden shadow">
                  <img
                    src={adUrl}
                    alt="login banner"
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Right Login */}
              <div className="p-8 md:p-10 flex flex-col">

                <h1 className="text-2xl font-bold text-center tracking-tight">
                  로그인
                </h1>

                <form className="mt-8 space-y-4" onSubmit={onSubmit}>
                  <input
                    name="comcode"
                    value={form.comcode}
                    onChange={onChange}
                    placeholder="업체코드"
                    className="w-full h-11 rounded-md border border-gray-300 px-3
                              text-gray-800 placeholder:text-gray-500
                              outline-none focus:focus:ring-2 focus:ring-gray-300"
                  />

                  <input
                    name="userid"
                    value={form.userid}
                    onChange={onChange}
                    placeholder="아이디"
                    autoComplete="username"
                    className="w-full h-11 rounded-md border border-gray-300 px-3
                              text-gray-800 placeholder:text-gray-500
                              outline-none focus:focus:ring-2 focus:ring-gray-300"
                  />

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="비밀번호"
                    autoComplete="current-password"
                    className="w-full h-11 rounded-md border border-gray-300 px-3
                              text-gray-800 placeholder:text-gray-500
                              outline-none focus:focus:ring-2 focus:ring-gray-300"
                  />

                  <button
                    type="submit"
                    className="w-full h-11 rounded-md bg-green-700 text-white font-semibold
                              hover:bg-green-800 active:bg-green-900 transition"
                  >
                    로그인
                  </button>
                  
                </form>

                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setOpenAuth(true)}
                    // className="h-10 px-5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 transition"
                    className={actionBtn}
                  >
                    사용자 인증
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPw(true)}
                    // className="h-10 px-5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 transition"
                    className={actionBtn}
                  >
                    비밀번호 찾기
                  </button>
                </div>

                <div className="mt-auto pt-10 text-center text-xs text-slate-500">
                  Copyright © 2026 by Highway Co., Ltd. All Rights Reserved.
                </div>
              </div>
            </div>
          </div>
        </div>
        

        {/* Modals (파일은 분리) */}
        {openAuth && 
          <UserAuth 
            onClose={() => setOpenAuth(false)} 
            onSuccess={(data) => {
              // console.log("UserAuth success:", data);
              setForm((p) => ({ ...p, comcode: data.comcode, userid: data.hp }));
              setOpenAuth(false);
            }}
          />}
        {openPw && <FindPassword onClose={() => setOpenPw(false)} />}
      </div>
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
