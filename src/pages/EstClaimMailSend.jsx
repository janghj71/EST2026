// src/pages/EstClaimMailSend.jsx
import React, { useEffect, useRef, useState } from "react";
import { Mail, Phone, X } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useInsurerContacts } from "../hooks/useInsurerContacts";
import { useEstimate } from "../hooks/useEstimate";
import { useMailSend } from "../hooks/useMailSend";
import { useAlert } from "../alerts";
import { useLoading } from "../loading/useLoading";

import { API_HOST } from "../api/config";
const STORAGE_KEY = "estClaimSendCtx";
const MSG_TYPE = "EST_CLAIM_SEND_SET_CTX";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-start gap-2 py-1">
      <div className="text-sm font-semibold text-zinc-700 pt-2">{label}</div>
      {children}
    </div>
  );
}

function emptyTab() {
  return { email: "", subject: "", body: "", fax: "", hp: "", sendSms: true };
}

function buildAutoEntry(claim, contacts, carno, isest) {
  const bocomContacts = contacts.filter((c) => c.bocomcode === claim?.bocomcode);
  const matched =
    bocomContacts.find((c) => c.boman_nm === claim?.boman_nm) ?? bocomContacts[0];
  const email = matched
    ? [matched.email_acc, matched.email_smtp].filter(Boolean).join("@")
    : "";
  const fax = matched
    ? [matched.fax0, matched.fax1, matched.fax2].filter(Boolean).join("-")
    : "";
  const hp = matched
    ? [matched.hp0, matched.hp1, matched.hp2].filter(Boolean).join("-")
    : "";
  const docName = String(isest) === "1" ? "점검정비견적서" : "청구서";
  const subject = `${carno}_${claim?.regno ?? ""} ${docName}입니다`;
  return { email, subject, body: "", fax, hp, sendSms: true };
}

export default function EstClaimMailSend() {
  const [estSerial, setEstSerial] = useState("");
  const [carno, setCarno] = useState("");
  const [comcode, setComcode] = useState("");
  const [isest, setIsest] = useState("");
  const [claims, setClaims] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [tabState, setTabState] = useState({});

  const initializedRef = useRef(new Set());

  const { contacts } = useInsurerContacts();
  const { info, error: alertError } = useAlert();
  const { withLoading } = useLoading();
  const { sendEstimateMail } = useMailSend();
  const { requestEstimate } = useEstimate();

  // sessionStorage 복원 (F5 대비)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.est_serial) setEstSerial(saved.est_serial);
      if (saved.carno) setCarno(saved.carno);
      if (saved.comcode) setComcode(saved.comcode);
      if (saved.isest != null) setIsest(saved.isest);
      if (Array.isArray(saved.claims) && saved.claims.length) setClaims(saved.claims);
    } catch {}
  }, []);

  // 부모창 postMessage 수신
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== MSG_TYPE) return;
      const p = msg.payload || {};

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      } catch {}

      // 컨텍스트 교체 시 탭 초기화 리셋
      initializedRef.current = new Set();
      setTabState({});
      setActiveTab(0);

      if (p.est_serial != null) setEstSerial(p.est_serial);
      if (p.carno != null) setCarno(p.carno);
      if (p.comcode != null) setComcode(p.comcode);
      if (p.isest != null) setIsest(p.isest);
      if (Array.isArray(p.claims)) setClaims(p.claims);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // 탭 진입 시 1회 자동 입력
  useEffect(() => {
    if (!claims.length || !contacts.length) return;
    if (initializedRef.current.has(activeTab)) return;
    const claim = claims[activeTab];
    if (!claim) return;

    initializedRef.current.add(activeTab);
    setTabState((prev) => ({
      ...prev,
      [activeTab]: buildAutoEntry(claim, contacts, carno, isest),
    }));
  }, [activeTab, claims, contacts, carno]);

  const current = tabState[activeTab] ?? emptyTab();

  const setField = (field, value) =>
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] ?? emptyTab()), [field]: value },
    }));

  const activeClaim = claims[activeTab];
  const reportPath = String(isest) === "1" ? "est_report03.aspx" : "est_report01.aspx";
  const iframeUrl = activeClaim?.estbo_seqno
    ? `${API_HOST}/report/${reportPath}?comcode=${encodeURIComponent(comcode)}&est_serial=${encodeURIComponent(estSerial)}&estbo_seqno=${encodeURIComponent(activeClaim.estbo_seqno)}`
    : "";

  const doEmailSend = async () => {
    if (!claims.length) {
      alertError("청구처를 선택하세요.");
      return;
    }

    const allTabs = claims.map((claim, idx) =>
      tabState[idx] ?? buildAutoEntry(claim, contacts, carno, isest)
    );

    const missingIdx = allTabs.findIndex((t) => !t.email);
    if (missingIdx >= 0) {
      setActiveTab(missingIdx);
      alertError(`${claims[missingIdx]?.bocomname || `청구처 ${missingIdx + 1}`}의 메일주소를 입력하세요.`);
      return;
    }

    const mailkind = String(isest) === "1" ? "03" : "01";

    for (let idx = 0; idx < claims.length; idx++) {
      const claim = claims[idx];
      const tab = allTabs[idx];
      if (!claim?.estbo_seqno) continue;

      await sendEstimateMail({
        comcode,
        est_serial: estSerial,
        estbo_seqno: claim.estbo_seqno,
        mailkind,
        mail_addr: tab.email,
        mail_subject: tab.subject,
        mail_text: tab.body,
        hp: tab.hp,
        lsms: tab.sendSms ? "1" : "0",
      });
    }

    await requestEstimate(estSerial);

    try {
      window.opener?.postMessage(
        { type: "EST_MASTER_REFRESH", payload: { est_serial: estSerial } },
        window.location.origin
      );
    } catch {}

    await info("메일청구가 완료되었습니다.");
  };

  const onEmailSend = () =>
    withLoading(doEmailSend, "메일 전송 중...").catch((err) =>
      alertError(err?.message ?? "메일청구 실패")
    );

  const onFaxSend = () => {
    console.log("팩스청구", {
      est_serial: estSerial,
      claim: activeClaim,
      fax: current.fax,
      sendSms: current.sendSms,
      hp: current.hp,
    });
    alert("팩스청구(샘플)");
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">청구서 발송</div>
            <div className="mt-1 text-sm text-zinc-500">
              차량번호 <span className="text-zinc-800 font-semibold">{carno || "-"}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={Mail} label="메일청구" variant="orange" onClick={onEmailSend} />
            <IconBtn icon={Phone} label="팩스청구" onClick={onFaxSend} />
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-zinc-200 bg-white px-6">
        {claims.length === 0 ? (
          <span className="py-2.5 text-sm text-zinc-400">청구처 데이터 없음</span>
        ) : (
          claims.map((c, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={[
                "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
                activeTab === idx
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600",
              ].join(" ")}
            >
              {c.bocomname || `청구처 ${idx + 1}`}
            </button>
          ))
        )}
      </div>

      {/* 입력 폼 */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-white">
        <Row label="받는사람 메일주소">
          <input
            value={current.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="example@domain.com"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
        <Row label="제목">
          <input
            value={current.subject}
            onChange={(e) => setField("subject", e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
        <Row label="내용">
          <textarea
            value={current.body}
            onChange={(e) => setField("body", e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
        <Row label="받는사람 팩스번호">
          <input
            value={current.fax}
            onChange={(e) => setField("fax", e.target.value)}
            placeholder="02-0000-0000"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
        <Row label="받는사람 휴대번호">
          <div className="flex items-center gap-3">
            <input
              value={current.hp}
              onChange={(e) => setField("hp", e.target.value)}
              placeholder="010-0000-0000"
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            <label className="inline-flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                checked={current.sendSms}
                onChange={(e) => setField("sendSms", e.target.checked)}
              />
              <span className="text-sm text-zinc-700">청구서 발송 문자 보내기</span>
            </label>
          </div>
        </Row>
      </div>

      {/* 청구서 미리보기 (iframe) */}
      <div className="flex-1 min-h-0 bg-zinc-50">
        {iframeUrl ? (
          <iframe
            key={iframeUrl}
            src={iframeUrl}
            className="w-full h-full border-0"
            title="청구서 미리보기"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
            청구처를 선택하면 청구서가 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
