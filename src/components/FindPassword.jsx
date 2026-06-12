import { useState } from "react";
import { X } from "lucide-react";
import { inputCls, btnConfirm, btnClose, btnOutlineSky } from "../styles/uiClasses";

export default function FindPassword({ onClose }) {
  const [form, setForm] = useState({
    comcode: "",
    userid: "",
    hp: "",
    smsCode: "",
  });

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSendCode = () => {
    // TODO: useFindPasswordSendCode 훅 연결
    console.log("send pw code:", {
      comcode: form.comcode,
      userid: form.userid,
      hp: form.hp,
    });
  };

  const onConfirm = () => {
    // TODO: useFindPasswordConfirm 훅 연결
    console.log("find password confirm:", form);
  };

  return (
    <ModalShell title="비밀번호 찾기" onClose={onClose}>
      <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center">
        <Label>업체코드</Label>
        <input
          name="comcode"
          value={form.comcode}
          onChange={onChange}
          className={inputCls}
        />

        <Label>아이디</Label>
        <input
          name="userid"
          value={form.userid}
          onChange={onChange}
          autoComplete="username"
          className={inputCls}
        />

        <Label>핸드폰번호</Label>
        <input
          name="hp"
          value={form.hp}
          onChange={onChange}
          className={inputCls}
          placeholder="- 없이 입력"
        />

        <div />
        <button
          type="button"
          onClick={onSendCode}
          className={btnOutlineSky}
        >
          인증번호 받기
        </button>

        <Label>인증번호</Label>
        <input
          name="smsCode"
          value={form.smsCode}
          onChange={onChange}
          className={inputCls}
        />
      </div>

      {/* <div className="mt-6 flex justify-end gap-2"> */}
      <div className="mt-6 pt-4 flex justify-end gap-2 border-t border-gray-300 -mx-6 px-6">

        <button
          type="button"
          onClick={onConfirm}
          className={btnConfirm}
        >
          확인
        </button>
        <button
          type="button"
          onClick={onClose}
          className={btnClose}
        >
          닫기
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="py-4 px-6 flex items-center justify-between border-b border-gray-200">
          <div className="font-bold text-xl text-gray-900">{title}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-base font-medium text-slate-700">{children}</div>;
}
