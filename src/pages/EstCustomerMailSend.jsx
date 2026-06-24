// src/pages/EstCustomerMailSend.jsx
import React, { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useMailSend } from "../hooks/useMailSend";
import { useAlert } from "../alerts";
import { useLoading } from "../loading/useLoading";

import { API_HOST } from "../api/config";
const STORAGE_KEY = "estCustomerSendCtx";
const MSG_TYPE = "EST_CUSTOMER_SEND_SET_CTX";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-start gap-2 py-1">
      <div className="text-sm font-semibold text-zinc-700 pt-2">{label}</div>
      {children}
    </div>
  );
}

function buildAutoEntry(ctx) {
  const { email_acc, email_smtp, carno, isest } = ctx;
  const email =
    email_acc && email_smtp ? `${email_acc}@${email_smtp}` : email_acc ?? "";
  const docName =
    String(isest) === "1" ? "점검정비견적서" : "점검정비명세서";
  const subject = carno ? `차량번호 ${carno} ${docName}입니다` : "";
  return { email, subject, body: "" };
}

export default function EstCustomerMailSend() {
  const [estSerial, setEstSerial] = useState("");
  const [carno, setCarno] = useState("");
  const [comcode, setComcode] = useState("");
  const [isest, setIsest] = useState("");
  const [estboSeqno, setEstboSeqno] = useState("");
  const [emailAcc, setEmailAcc] = useState("");
  const [emailSmtp, setEmailSmtp] = useState("");

  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const initializedRef = useRef(false);

  const { info, error: alertError } = useAlert();
  const { withLoading } = useLoading();
  const { sendEstimateMail } = useMailSend();

  function applyCtx(p) {
    const est_serial = p.est_serial ?? "";
    const carnoVal = p.carno ?? "";
    const comcodeVal = p.comcode ?? "";
    const isestVal = p.isest ?? "";
    const estboSeqnoVal = p.estbo_seqno ?? "";
    const emailAccVal = p.email_acc ?? "";
    const emailSmtpVal = p.email_smtp ?? "";

    setEstSerial(est_serial);
    setCarno(carnoVal);
    setComcode(comcodeVal);
    setIsest(isestVal);
    setEstboSeqno(estboSeqnoVal);
    setEmailAcc(emailAccVal);
    setEmailSmtp(emailSmtpVal);

    const entry = buildAutoEntry({
      email_acc: emailAccVal,
      email_smtp: emailSmtpVal,
      carno: carnoVal,
      isest: isestVal,
    });
    setEmail(entry.email);
    setSubject(entry.subject);
    setBody("");
  }

  // sessionStorage 복원 (F5 대비)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      applyCtx(saved);
      initializedRef.current = true;
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

      initializedRef.current = false;
      applyCtx(p);
      initializedRef.current = true;
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const reportPath =
    String(isest) === "1" ? "est_report03.aspx" : "est_report02.aspx";

  const iframeUrl =
    estboSeqno && estSerial
      ? `${API_HOST}/report/${reportPath}?comcode=${encodeURIComponent(comcode)}&est_serial=${encodeURIComponent(estSerial)}&estbo_seqno=${encodeURIComponent(estboSeqno)}`
      : "";

  const onSend = async () => {
    if (!email) {
      alertError("받는사람 메일주소를 입력하세요.");
      return;
    }
    const mailkind = String(isest) === "1" ? "03C" : "02C";
    let failed = false;
    await withLoading(async () => {
      const res = await sendEstimateMail({
        comcode,
        est_serial: estSerial,
        mailkind,
        mail_addr: email,
        mail_subject: subject,
        mail_text: body,
      });
      if (String(res?.result) === 'false') { failed = true; alertError(res?.msg ?? "메일 발송 실패"); }
    }, "메일 전송 중...");
    // 로딩 종료 후 알럿 표시 — 로딩 오버레이와 겹치지 않음
    if (!failed) await info("메일이 발송되었습니다.");
  };

  const docTitle =
    String(isest) === "1" ? "점검정비 견적서 - 고객용" : "점검정비 명세서 - 고객용";

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">{docTitle}</div>
            <div className="mt-1 text-sm text-zinc-500">
              차량번호 <span className="text-zinc-800 font-semibold">{carno || "-"}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={Mail} label="메일발송" variant="orange" onClick={onSend} />
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
          </div>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-white">
        <Row label="받는사람 메일주소">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@domain.com"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
        <Row label="제목">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
        <Row label="내용">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </Row>
      </div>

      {/* 미리보기 (iframe) */}
      <div className="flex-1 min-h-0 bg-zinc-50">
        {iframeUrl ? (
          <iframe
            key={iframeUrl}
            src={iframeUrl}
            className="w-full h-full border-0"
            title="미리보기"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
            미리보기를 표시하려면 데이터가 필요합니다.
          </div>
        )}
      </div>
    </div>
  );
}
