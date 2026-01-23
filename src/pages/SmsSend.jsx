import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUrlContextSnapshot, setUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import { X } from "lucide-react";
import IconBtn from "../components/IconBtn";
// import { useAlert } from "../alerts";

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
  /**
   * ✅ 파람 키는 요구사항대로 고정:
   * est_serial, carno, hp, isset, inday
   */
  const snap = useUrlContextSnapshot({
    storageKey: "smsSendCtx",
    keys: ["est_serial", "carno", "hp", "isset", "inday"],
    cleanPath: "/estsmsend",
  });

  // PhotoViewer처럼 “초기 1회 보정 + 저장” 패턴 유지 :contentReference[oaicite:4]{index=4}
  const [estSerial, setEstSerial] = useState(() => snap?.est_serial || "");
  const [carNo, setCarNo] = useState(() => snap?.carno || "");
  const [hp, setHp] = useState(() => snap?.hp || "");
  const [isSet, setIsSet] = useState(() => !!snap?.isset);
  const [inDay, setInDay] = useState(() => snap?.inday || "");

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!snap?.est_serial && !snap?.carno && !snap?.hp && !snap?.inday && !snap?.isset) return;

    // 1) ctx 저장(F5 대비)
    try {
      sessionStorage.setItem(
        "smsSendCtx",
        JSON.stringify({
          est_serial: snap?.est_serial || "",
          carno: snap?.carno || "",
          hp: snap?.hp || "",
          isset: !!snap?.isset,
          inday: snap?.inday || "",
        })
      );
    } catch {}

    // 2) 첫 로딩에서만 state 보정
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (snap?.est_serial && !estSerial) setEstSerial(snap.est_serial);
    if (snap?.carno && !carNo) setCarNo(snap.carno);
    if (snap?.hp && !hp) setHp(snap.hp);
    if (typeof snap?.isset !== "undefined") setIsSet(!!snap.isset);
    if (snap?.inday && !inDay) setInDay(snap.inday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.est_serial, snap?.carno, snap?.hp, snap?.isset, snap?.inday]);

  /**
   * ✅ 부모(InsuranceEstimate)에서 선택 변경 시 ctx 갱신 메시지 받기
   * - 받은 값도 sessionStorage에 저장해서 F5에도 유지
   * PhotoViewer와 동일한 메시지 수신 패턴 
   */
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "SMS_SEND_SET_CTX") return;

      const next = msg.payload || {};
      const nextEstSerial = next?.est_serial || "";
      const nextCarNo = next?.carno || "";
      const nextHp = next?.hp || "";
      const nextIsSet = !!next?.isset;
      const nextInDay = next?.inday || "";

      // sessionStorage 저장 (F5 유지)
      try {
        sessionStorage.setItem(
          "smsSendCtx",
          JSON.stringify({
            est_serial: nextEstSerial || estSerial,
            carno: nextCarNo || carNo,
            hp: nextHp || hp,
            isset: typeof next?.isset === "undefined" ? isSet : nextIsSet,
            inday: nextInDay || inDay,
          })
        );
      } catch {}

      // 화면 갱신
      if (nextEstSerial) setEstSerial(nextEstSerial);
      if (nextCarNo) setCarNo(nextCarNo);
      if (nextHp) setHp(nextHp);
      if (typeof next?.isset !== "undefined") setIsSet(nextIsSet);
      if (nextInDay) setInDay(nextInDay);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estSerial, carNo, hp, isSet, inDay]);

  // ===== UI 상태 (필수 항목들) =====
  const today = useMemo(() => ymd(new Date()), []);
  const [recvHp, setRecvHp] = useState("");
  const [sendNo, setSendNo] = useState("02-424-1901");
  const [sendDay, setSendDay] = useState(today);
  const [sendHour, setSendHour] = useState("08");
  const [includeEstimateUrl, setIncludeEstimateUrl] = useState(true);
  const [msg, setMsg] = useState("");

  // ctx(차량번호/입고일/수신번호) 바뀌면 메시지/수신번호 자동 갱신
  const defaultMsg = useMemo(() => {
    const dateText = inDay || today;
    return `[${carNo}  점검정비견적서]

인트라밴공업사 입니다.
${dateText} 에 상담받으신 점검정비견적서입니다.

더 좋은 서비스와 혜택으로
고객님께 보답할 수 있도록 최선을 다하겠습니다.

▶ 정비업체명 : 인트라밴공업사
▶ 정비업체전화 : 02-424-1901`;
  }, [carNo, inDay, today]);

  useEffect(() => {
    setRecvHp(hp || "");
    setMsg(defaultMsg);
  }, [hp, defaultMsg, estSerial]);

  // ===== 버튼 동작(화면만) =====
  const onSearchHistory = () => {
    alert(`문자발송 조회: est_serial=${estSerial}`);
  };

  const onSendSms = () => {
    const payload = {
      est_serial: estSerial,
      carno: carNo,
      hp: recvHp,
      isset: isSet,
      inday: inDay,
      sendNo,
      sendDay,
      sendHour,
      includeEstimateUrl,
      msg,
    };
    console.log("SEND_SMS", payload);
    alert("문자발송(샘플)");
  };

  const onSendAlimtalk = () => {
    alert("알림톡(샘플)");
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">문자발송</div>
            <div className="mt-1 text-sm text-zinc-500">
              {carNo ? `차량번호: ${carNo}` : "차량번호: -"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onSearchHistory}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              문자발송 조회
            </button>

            <IconBtn
              icon={X}
              label="닫기"
              variant="primary"
              onClick={() => window.close()}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 min-h-0 flex-1 overflow-auto space-y-4">
        {/* 메시지 */}
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

        {/* 입력 폼 */}
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
            {/* ✅ 콤보박스는 부모창 스타일(select-base)로 */}
            <select
              value={sendNo}
              onChange={(e) => setSendNo(e.target.value)}
              className="select-base"
            >
              <option value="02-424-1901">02-424-1901</option>
              {/* 필요시 추가 */}
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

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900"
              checked={includeEstimateUrl}
              onChange={(e) => setIncludeEstimateUrl(e.target.checked)}
            />
            <span className="text-sm font-semibold text-zinc-700">
              견적서 <span className="font-normal text-zinc-500">(URL이 포함되어 발송됩니다)</span>
            </span>
          </label>
        </div>

        {/* 하단 버튼 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onSendSms}
            className="rounded-md bg-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            문자발송
          </button>
          <button
            type="button"
            onClick={onSendAlimtalk}
            className="rounded-md bg-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            알림톡
          </button>
        </div>
      </div>
    </div>
  );
}
