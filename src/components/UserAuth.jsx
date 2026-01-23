import { useState } from "react";
import { inputCls, btnConfirm, btnClose, btnOutlineSky } from "../styles/uiClasses";

export default function UserAuth({ onClose }) {
  const [form, setForm] = useState({
    bizNo: "",
    hpId: "",
    smsCode: "",
    newPassword: "",
    companyName: "",
    ceoName: "",
  });

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSendCode = () => {
    // TODO: useUserAuthSendCode 훅 연결
    console.log("send auth code:", { bizNo: form.bizNo, hpId: form.hpId });
  };

  const onConfirm = () => {
    // TODO: useUserAuthConfirm 훅 연결
    console.log("confirm auth:", form);
  };

  // const inputCls =
  // "w-full h-11 rounded-md border border-gray-300 px-3 " +
  // "text-gray-800 placeholder:text-gray-500 " +
  // "outline-none focus:ring-2 focus:ring-gray-300";

  // const confirmBtn =
  //   "w-28 h-10 rounded-md bg-sky-500 text-white " +
  //   "hover:bg-sky-600 active:bg-sky-700 transition " +
  //   "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

  // const closeBtn =
  //   "w-28 h-10 rounded-md bg-gray-500 text-white " +
  //   "hover:bg-gray-600 active:bg-gray-700 transition " +
  //   "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300";

  return (
    <ModalShell title="사용자 인증" onClose={onClose}>
      <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center">
        <Label>사업자번호</Label>
        <input
          name="bizNo"
          value={form.bizNo}
          onChange={onChange}
          className={inputCls}
          placeholder="- 없이 입력"
        />

        <Label>핸드폰번호(ID)</Label>
        <input
          name="hpId"
          value={form.hpId}
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

        <Label>핸드폰인증번호</Label>
        <input
          name="smsCode"
          value={form.smsCode}
          onChange={onChange}
          className={inputCls}
        />

        <Label>사용 비밀번호</Label>
        <input
          name="newPassword"
          value={form.newPassword}
          onChange={onChange}
          className={inputCls}
          placeholder="영문+숫자+특수문자 포함, 8자 이상"
        />

        <div className="col-span-2 text-x text-red-500">
          [ 비밀번호는 영문+숫자+특수문자 포함하여 8자리 이상으로 합니다. ]
        </div>

        <Label>업체명</Label>
        <input
          name="companyName"
          value={form.companyName}
          onChange={onChange}
          className={inputCls}
        />

        <Label>대표자</Label>
        <input
          name="ceoName"
          value={form.ceoName}
          onChange={onChange}
          className={inputCls}
        />

        <Label>설치 가능 수</Label>
        <div className="text-sm text-slate-700">0</div>
      </div>

      <div className="mt-6 pt-4 flex justify-end gap-2 border-t border-gray-300 -mx-6 px-6">
        <button
          type="button"
          onClick={onConfirm}
          className={btnConfirm}
        >
          인증확인
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
        <div className="py-4 px-6 flex items-center justify-between border-b  border-gray-300">
          <div className="flex items-center gap-3">
            <img
              src="/EST.ico"
              alt="EST2026"
              className="w-6 h-6"
              draggable={false}
            />
            <div className="font-semibold text-xl sm:text-2xl text-slate-800">{title}</div>
          </div>


          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-base text-slate-700">{children}</div>;
}
