import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import { X } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { useLoading } from "../loading/useLoading";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useAlimtalkTemplate } from "../hooks/useAlimtalkTemplate";
import { useSms } from "../hooks/useSms";
import { useSmsSender } from "../hooks/useSmsSender";
import { getComcode } from "../api/config";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[90px_1fr] items-center gap-3">
      <div className="text-sm font-semibold text-zinc-800">{label}</div>
      {children}
    </div>
  );
}

export default function SmsSend() {
  const { warning, success } = useAlert();
  const { withLoading } = useLoading();
  const { form: companyForm, loading: companyLoading } = useCompanyInfo();
  const { fetchTemplate } = useAlimtalkTemplate();
  const { sendSms, sendAlimtalk, sendingSms } = useSms();
  const { senders } = useSmsSender();

  /**
   * est_serial, carno, hp, isest, inday
   */
  const snap = useUrlContextSnapshot({
    storageKey: "smsSendCtx",
    keys: ["est_serial", "carno", "hp", "isest", "inday"],
    cleanPath: "/estsmsend",
  });

  const [estSerial, setEstSerial] = useState(() => snap?.est_serial || "");
  const [carNo, setCarNo] = useState(() => snap?.carno || "");
  const [hp, setHp] = useState(() => snap?.hp || "");
  const [isest, setIsest] = useState(() => (snap?.isest === "1" ? "1" : "0"));
  const [inDay, setInDay] = useState(() => snap?.inday || "");

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (
      !snap?.est_serial &&
      !snap?.carno &&
      !snap?.hp &&
      !snap?.inday &&
      typeof snap?.isest === "undefined"
    ) {
      return;
    }

    try {
      sessionStorage.setItem(
        "smsSendCtx",
        JSON.stringify({
          est_serial: snap?.est_serial || "",
          carno: snap?.carno || "",
          hp: snap?.hp || "",
          isest: snap?.isest === "1" ? "1" : "0",
          inday: snap?.inday || "",
        })
      );
    } catch {
      // ignore
    }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (snap?.est_serial && !estSerial) setEstSerial(snap.est_serial);
    if (snap?.carno && !carNo) setCarNo(snap.carno);
    if (snap?.hp && !hp) setHp(snap.hp);
    if (typeof snap?.isest !== "undefined") setIsest(snap.isest === "1" ? "1" : "0");
    if (snap?.inday && !inDay) setInDay(snap.inday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.est_serial, snap?.carno, snap?.hp, snap?.isest, snap?.inday]);

  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "SMS_SEND_SET_CTX") return;

      const next = msg.payload || {};
      const nextEstSerial = next?.est_serial || "";
      const nextCarNo = next?.carno || "";
      const nextHp = next?.hp || "";
      const nextIsest = next?.isest === "1" ? "1" : "0";
      const nextInDay = next?.inday || "";

      try {
        sessionStorage.setItem(
          "smsSendCtx",
          JSON.stringify({
            est_serial: nextEstSerial || estSerial,
            carno: nextCarNo || carNo,
            hp: nextHp || hp,
            isest: typeof next?.isest === "undefined" ? isest : nextIsest,
            inday: nextInDay || inDay,
          })
        );
      } catch {
        // ignore
      }

      if (nextEstSerial) setEstSerial(nextEstSerial);
      if (nextCarNo) setCarNo(nextCarNo);
      if (nextHp) setHp(nextHp);
      if (typeof next?.isest !== "undefined") {
        setIsest(nextIsest);
      }
      if (nextInDay) setInDay(nextInDay);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [estSerial, carNo, hp, isest, inDay]);

  const today = useMemo(() => ymd(new Date()), []);
  const [recvHp, setRecvHp] = useState("");
  const [sendNo, setSendNo] = useState("");
  const [sendDay, setSendDay] = useState(today);
  const [sendHour, setSendHour] = useState("08");
  const [includeEstimateUrl, setIncludeEstimateUrl] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setRecvHp(hp || "");
  }, [hp, estSerial]);

  useEffect(() => {
    const firstCallback = senders?.[0]?.callback || "";
    if (!firstCallback) return;
    setSendNo(firstCallback);
  }, [senders]);

  const loadAlimtalkMsg = useCallback(async ({ smskind } = {}) => {
    if (companyLoading) return null;
    if (!carNo && !inDay) return null;
    if (!companyForm.comName) return null;

    try {
      const templateResult = await fetchTemplate({
        isest,
        smskind,
        carno: carNo,
        inday: inDay,
        comname: companyForm.comName,
        tel0: companyForm.tel0,
        tel1: companyForm.tel1,
        tel2: companyForm.tel2,
        address1: companyForm.addr1,
        address2: companyForm.addr2,
      });
      setMsg(templateResult?.text || "");
      return templateResult;
    } catch (e) {
      warning(e?.message || "Failed to load alimtalk template.");
      return null;
    }
  }, [companyLoading, carNo, inDay, isest, companyForm, fetchTemplate, warning]);

  useEffect(() => {
    loadAlimtalkMsg();
  }, [loadAlimtalkMsg]);

  const onSendSms = async () => {
    if (!estSerial) return warning("견적번호가 없습니다.");
    if (!recvHp) return warning("수신번호를 입력하세요.");
    if (!sendNo) return warning("발신번호를 입력하세요.");
    if (!msg) return warning("메시지 내용을 입력하세요.");

    const smskind = includeEstimateUrl ? (isest === "1" ? "03" : "02") : "";

    try {
      const comcode = getComcode();
      await sendSms({
        comcode,
        est_serial: estSerial,
        hp: recvHp,
        callback: sendNo,
        smskind,
        smstxt: msg,
      });
      success("문자발송 했습니다.");
    } catch (e) {
      warning(e?.message || "문자발송에 실패했습니다.");
    }
  };

  const onSendAlimtalk = async () => {
    if (!estSerial) return warning("견적번호가 없습니다.");
    if (!recvHp) return warning("수신번호를 입력하세요.");
    if (!sendNo) return warning("발신번호를 입력하세요.");

    const smskind = includeEstimateUrl ? (isest === "1" ? "03" : "02") : "";

    try {
      const templateResult = await loadAlimtalkMsg({ smskind });
      if (!templateResult) return;

      const { text, template, altkindcode } = templateResult;
      const comcode = getComcode();
      const hpClean = (recvHp || "").replace(/-/g, "");

      const now = new Date();
      const yyyymm = `${now.getFullYear()}${pad2(now.getMonth() + 1)}`;
      const effectiveSmsKind = altkindcode || smskind;
      const sNew = `a|comcode=${comcode}|sale_serial=${estSerial}|smskind=${effectiveSmsKind}|yyyymm=${yyyymm}|prgcode=208`;

      const link1Mob = template?.link1_mob || "";
      const link1Pc = template?.link1_pc || "";
      const btn_01_url_01 = link1Mob ? link1Mob.replace(/#\{인쇄물정보\}/g, sNew) : "";
      const btn_01_url_02 = link1Pc ? link1Pc.replace(/#\{인쇄물정보\}/g, sNew) : "";

      const alimtalkParams = {
        comcode,
        est_serial: estSerial,
        hp: hpClean,
        callback: sendNo,
        smskind: effectiveSmsKind,
        smstxt: text || "",
        biztype: "at",
        yellowid_key: companyForm.yellowidKeyJmt || "",
        templatecode: template?.templatecode || "",
        resend: "Y",
      };

      if (template?.link1_name) {
        alimtalkParams.btn_type_01 = template?.link1_type || "";
        alimtalkParams.btn_nm_01 = template?.link1_name || "";
        alimtalkParams.btn_01_url_01 = btn_01_url_01;
        alimtalkParams.btn_01_url_02 = btn_01_url_02;
      }

      await sendAlimtalk(alimtalkParams);
      success("알림톡 발송 성공");
    } catch (e) {
      warning(e?.message || "알림톡 발송 실패");
    }
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">문자발송</div>
            <div className="mt-1 text-sm text-zinc-500">
              {carNo ? `차량번호: ${carNo}` : "차량번호: -"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn
              icon={X}
              label="닫기"
              variant="primary"
              onClick={() => window.close()}
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-5 min-h-0 flex-1 overflow-auto space-y-4">
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="p-3">
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={10}
              className="w-full resize-none bg-white text-sm leading-6 text-zinc-900 outline-none"
            />
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white shadow-sm p-4 space-y-3">
          <Row label="수신번호">
            <input
              value={recvHp}
              onChange={(e) => setRecvHp(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </Row>

          <Row label="발신번호">
            <select
              value={sendNo}
              onChange={(e) => setSendNo(e.target.value)}
              className="select-base"
            >
              {(senders ?? []).map((s) => (
                <option key={s.orderno || s.callback} value={s.callback || ""}>
                  {s.callback || ""}
                </option>
              ))}
            </select>
          </Row>

          <Row label="발송일시">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={sendDay}
                onChange={(e) => setSendDay(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none hover:bg-zinc-50 focus:border-zinc-400"
              />

              <select
                value={sendHour}
                onChange={(e) => setSendHour(e.target.value)}
                className="select-base w-24"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const v = pad2(i);
                  return (
                    <option key={v} value={v}>
                      {v}시
                    </option>
                  );
                })}
              </select>
            </div>
          </Row>

          <div className="grid grid-cols-[90px_1fr] items-center gap-3">
            <div />
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                checked={includeEstimateUrl}
                onChange={(e) => setIncludeEstimateUrl(e.target.checked)}
              />
              <span className="text-sm font-semibold text-zinc-700">
                {isest === "1" ? "견적서" : "명세서"}{" "}
                <span className="font-normal text-zinc-500">(URL이 포함되어 발송됩니다)</span>
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => withLoading(onSendSms, '문자 발송 중...')}
            disabled={sendingSms}
            className="rounded-md bg-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            문자발송
          </button>
          <button
            type="button"
            onClick={() => withLoading(onSendAlimtalk, '알림톡 발송 중...')}
            className="rounded-md bg-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            알림톡
          </button>
        </div>
      </div>
    </div>
  );
}

