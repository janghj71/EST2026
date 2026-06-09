import { useMemo, useState, useRef } from "react";
import { inputCls, btnConfirm, btnClose, btnOutlineSky } from "../styles/uiClasses";
import { useEstStep1 } from "../hooks/useEstStep1";
import { useEstStep2 } from "../hooks/useEstStep2";
import { moveFocusOnEnter } from "../utils/focusUtils"; 
import {X, CheckCircle,} from "lucide-react";
import { createMobileno, setComcode, setUserid, setMobileno } from "../api/config"; 

export default function UserAuth({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    idno: "",
    hp: "",
    smsCode: "",
    newPassword: "",
    companyName: "",
    boss: "",
    comcode: "",
  });
  
  const [installable, setInstallable] = useState(0);
  const scopeRef = useRef(null);

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const canSend = useMemo(() => {
    return form.idno.trim().length > 0 && form.hp.trim().length > 0;
  }, [form.idno, form.hp]);
  
  //인증번호 API 
  const step1 = useEstStep1();
  //인증확인 API 
  const step2 = useEstStep2(); 

  const onSendCode = async () => {
    if (!canSend || step1.loading) return;

    const res = await step1.sendAuthNo(form.idno, form.hp);

    // 성공 시 매핑된 결과는 step1.data에도 들어오지만,
    // refetch 직후 즉시 반영을 위해 res.dataset 기준으로 form을 업데이트
    if (res?.result && String(res.result).toUpperCase() === "OK") {
      const row = Array.isArray(res?.dataset) ? res.dataset[0] : null;

      const luseno = row?.luseno ?? "";
      const comname = row?.comname ?? "";
      const boss = row?.boss ?? "";
      const comcode = row?.comcode ?? ""; 

      const userMax = Number(row?.user_max ?? 0);
      const userUse = Number(row?.user_use ?? 0);
      const inst = Math.max(0, userMax - userUse);

      setForm((p) => ({
        ...p,
        companyName: comname,
        boss,
        comcode,
      }));
      setInstallable(inst);
    }
  };

  const canConfirm = useMemo(() => {
    return (
      form.comcode.trim().length > 0 &&
      form.hp.trim().length > 0 &&
      form.newPassword.trim().length > 0 &&
      form.smsCode.trim().length > 0
    );
  }, [form.comcode, form.hp, form.newPassword, form.smsCode]);

  const onConfirm = async () => {
    if (!canConfirm || step2.loading) return;

    const mobileno = createMobileno();

    const res = await step2.confirmAuth({
      comcode: form.comcode,
      userid: form.hp,
      passwd: form.newPassword,
      luseno: form.smsCode,
      mobileno,
    });

    // res.result === "OK" 기준으로 분기하면 됨
    // console.log("est_step2 result:", res);
    if (res.result === 'OK' ) {
      setComcode(form.comcode);
      setUserid(form.hp);
      setMobileno(res.mobileno);

      onSuccess?.({ comcode: form.comcode, hp: form.hp });
      onClose?.(); 
    }


  };

  const onKeyDownMove = (e) => {
    moveFocusOnEnter(e, scopeRef.current);
  };


  return (
    <ModalShell title="사용자 인증" onClose={onClose}>
      <div 
        ref={scopeRef}
        onKeyDownCapture={onKeyDownMove}
        className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center"
      >
        <Label>사업자번호</Label>
        <input
          name="idno"
          value={form.idno}
          onChange={onChange}
          className={inputCls}
          placeholder="- 없이 입력"
        />

        <Label>핸드폰번호(ID)</Label>
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
          disabled={!canSend || step1.loading}
        >
          {step1.loading ? "요청중..." : "인증번호 받기"}
        </button>

        {/* 에러 메시지 */}
        {step1.error ? (
          <div className="col-span-2 text-sm text-red-600">
            {step1.error?.message || "요청 실패"}
          </div>
        ) : null}

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
          name="boss"
          value={form.boss}
          onChange={onChange}
          className={inputCls}
        />

        <Label>설치 가능 수</Label>
        <div className="text-sm text-slate-700">{installable}</div>
      </div>

      <div className="mt-6 pt-4 flex justify-end gap-2 border-t border-gray-300 -mx-6 px-6">
        <button
          type="button"
          onClick={onConfirm}
          className={btnConfirm}
          disabled={!canConfirm || step2.loading}
        >
          <CheckCircle className="w-4 h-4" />
          {step2.loading ? "확인중..." : "인증확인"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={btnClose}
        >
          <X className="w-4 h-4" />
          닫기
        </button>
      </div>

      {step2.error ? (
        <div className="px-6 pb-5 text-sm text-red-600">
          {step2.error?.message || "인증확인 실패"}
        </div>
      ) : null}
      
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
