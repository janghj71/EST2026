// src/prints/PrivacyConsentPrint.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useSignStamp }   from "../hooks/useSignStamp";
import { useAlert }       from "../alerts";
import { ymd, parseDateParts } from "../utils/dateUtils";
import PrintPreviewLayout from "./PrintPreviewLayout";

const STORAGE_KEY = "privacyConsentCtx";

/* ── 동의함 / 동의하지 않음 체크 쌍 ────────────────────── */
function ConsentPair({ agreed, onChange }) {
  return (
    <div style={S.agreeRow}>
      <span style={S.agreeItem} onClick={() => onChange(true)}>
        <span style={{ ...S.chkBox, background: agreed === true ? "#1d4ed8" : "#fff" }}>
          {agreed === true && <span style={S.chkMark}>✔</span>}
        </span>
        동의함
      </span>
      <span style={S.agreeItem} onClick={() => onChange(false)}>
        <span style={{ ...S.chkBox, background: agreed === false ? "#1d4ed8" : "#fff" }}>
          {agreed === false && <span style={S.chkMark}>✔</span>}
        </span>
        동의하지 않음
      </span>
    </div>
  );
}

/* ── 서명 패드 ──────────────────────────────────────────── */
function SignaturePad({ dataUrl, onUpdate }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef(null);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const start = (e) => { drawing.current = true; lastPos.current = getPos(e); e.preventDefault(); };
  const move  = (e) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
    e.preventDefault();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    onUpdate?.(canvasRef.current.toDataURL());
  };

  const clear = () => {
    canvasRef.current.getContext("2d").clearRect(0, 0, 200, 200);
    onUpdate?.(null);
  };

  const BOX = { width: "22mm", height: "22mm", border: "1px solid #333", display: "block" };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        className="no-print"
        onClick={clear}
        style={{ position: "absolute", right: "100%", top: 0,
                 marginRight: "4px", whiteSpace: "nowrap",
                 fontSize: "10px", padding: "3px 10px", cursor: "pointer",
                 border: "1px solid #bbb", background: "#f5f5f5",
                 borderRadius: "3px" }}
      >
        지우기
      </button>
      <canvas
        ref={canvasRef}
        width={200} height={200}
        style={{ ...BOX, cursor: "crosshair", touchAction: "none" }}
        className="no-print"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <img
        src={dataUrl || "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="}
        alt=""
        style={{ ...BOX, display: "none" }}
        className="sig-print"
      />
    </div>
  );
}

/* ── 공통 스타일 상수 ────────────────────────────────────── */
const FONT = "'맑은 고딕','Malgun Gothic','Apple SD Gothic Neo',sans-serif";

const PAGE_STYLE = {
  fontFamily: FONT,
  fontSize:   "10pt",
  width:      "190mm",
  height:     "277mm",
  margin:     "0 auto",
  padding:    "8mm 2mm 8mm",
  color:      "#000",
  boxSizing:  "border-box",
  overflow:   "hidden",
};

const S = {
  title: {
    textAlign:    "center",
    fontSize:     "13.5pt",
    fontWeight:   "bold",
    marginBottom: "12px",
    letterSpacing:"1px",
    fontFamily:   FONT,
  },
  intro: {
    fontSize:     "10.5pt",
    lineHeight:   "1.8",
    marginBottom: "12px",
  },
  highlight: {
    fontSize:   "12pt",
    fontWeight: "bold",
  },
  companyRow: {
    fontSize:     "10.5pt",
    marginBottom: "14px",
    display:      "flex",
    alignItems:   "center",
    flexWrap:     "wrap",
    gap:          "0",
  },
  companyInner: {
    display:    "inline-block",
    minWidth:   "130px",
    textAlign:  "center",
    padding:    "0 4px",
  },
  sectionTitle: {
    fontSize:     "10.5pt",
    fontWeight:   "bold",
    margin:       "14px 0 6px",
    fontFamily:   FONT,
  },
  consentBox: {
    border:       "1px solid #333",
    padding:      "8px 12px",
    marginBottom: "10px",
    fontSize:     "10.5pt",
    lineHeight:   "1.75",
  },
  agreeRow: {
    display:        "flex",
    justifyContent: "flex-end",
    gap:            "22px",
    marginTop:      "6px",
    fontSize:       "9pt",
    userSelect:     "none",
    cursor:         "pointer",
  },
  agreeItem: {
    display:    "inline-flex",
    alignItems: "center",
    gap:        "5px",
    cursor:     "pointer",
  },
  chkBox: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "14px",
    height:         "14px",
    border:         "1px solid #333",
    flexShrink:     "0",
    borderRadius:   "2px",
  },
  chkMark: {
    color:      "#fff",
    fontSize:   "9px",
    lineHeight: "1",
  },
  bulletBlock: {
    fontSize:     "10.5pt",
    marginBottom: "8px",
    lineHeight:   "1.65",
  },
  bulletTitle: {
    fontSize:     "10.5pt",
    marginBottom: "2px",
  },
  bulletBody: {
    fontSize:    "8.5pt",
    lineHeight:  "1.65",
    paddingLeft: "4px",
  },
  bulletIndent: {
    fontSize:    "8.5pt",
    lineHeight:  "1.65",
    paddingLeft: "10px",
  },
  footnote: {
    fontSize:   "10pt",
    lineHeight: "1.65",
    margin:     "6px 0",
  },
  idConsentBox: {
    border:     "1px solid #333",
    padding:    "8px 12px",
    margin:     "10px 0",
    fontSize:   "10pt",
    lineHeight: "1.75",
  },
  footerSection: { marginTop: "22px" },
  footerDate: {
    textAlign:    "center",
    fontSize:     "10.5pt",
    letterSpacing:"3px",
    marginBottom: "26px",
  },
  footerFields: {
    display:       "flex",
    flexDirection: "column",
    alignItems:    "flex-end",
    gap:           "12px",
  },
  footerRow: {
    display:    "flex",
    alignItems: "flex-end",
    gap:        "6px",
    fontSize:   "10pt",
    width:      "260px",
  },
  footerLastRow: {
    display:    "flex",
    alignItems: "flex-end",
    gap:        "8px",
    fontSize:   "10pt",
  },
  footerLbl: { whiteSpace: "nowrap", minWidth: "74px" },
  footerVal: {
    flex:          "1",
    borderBottom:  "1px solid #333",
    paddingBottom: "1px",
    fontSize:      "9pt",
    minWidth:      "0",
    width:         "176px",
  },
};

/* ══════════════════════════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════════════════════════ */
export default function PrivacyConsentPrint() {

  /* ── 컨텍스트 ── */
  const [ctx, setCtx] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const { form: companyForm }              = useCompanyInfo();
  const { fetchSignStamp, saveSignStamp }  = useSignStamp();
  const { confirm, error: alertError }     = useAlert();

  /* ── 서명 dataUrl ── */
  const [sigDataUrl, setSigDataUrl] = useState(null);

  /* ── 4개 동의 체크 ── */
  const [c1,   setC1]   = useState(true);
  const [c2,   setC2]   = useState(true);
  const [c2id, setC2id] = useState(true);
  const [c3,   setC3]   = useState(true);

  /* ── 기존 서명 조회 후 보기 모드 ── */
  const [viewMode,       setViewMode]       = useState(false);
  const [existingStamps, setExistingStamps] = useState({ signstamp: "", signstamp2: "" });

  /* ── 인쇄 확인 모달 / 저장 진행 상태 ── */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving,      setSaving]      = useState(false);

  /* ── 중복 조회 방지 ref ── */
  const fetchCalledRef = useRef(false);

  /* ── postMessage 수신 ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "PRIVACY_CONSENT_SET_CTX") {
        const payload = e.data.payload;
        setCtx(payload);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /* ── ctx 준비되면 기존 서명 조회 → 분기 ── */
  const handleInitialFetch = useCallback(async (serial) => {
    const res  = await fetchSignStamp({ sign_serial: serial, signkind: "4" });

    // API 오류 처리 (aborted / result:false)
    if (res?.result === "false" || res?.result === false) {
      const msg = res?.msg || "서버 오류";
      if (msg !== "aborted") {
        // aborted 는 StrictMode 재시도로 처리 → alert 불필요
        await alertError(`서명 조회 실패: ${msg}`);
      }
      return;
    }

    const rows = res?.dataset ?? [];
    console.log("[PrivacyConsent] ③ rows.length=", rows.length);
    if (rows.length === 0) {
      return;
    }

    const row = rows[0];
    if (!row?.signstamp && !row?.signstamp2) {
      return;
    }

    // 기존 서명 있음 → 재작성 여부 확인
    const yes = await confirm("개인정보활용동의 내역을 재작성 하시겠습니까?");
    if (!yes) {
      setExistingStamps({ signstamp: row.signstamp || "", signstamp2: row.signstamp2 || "" });
      setViewMode(true);
    }
  }, [fetchSignStamp, confirm]);

  useEffect(() => {
    const serial = ctx?.est_serial;
    console.log("[PrivacyConsent] effect - est_serial=", serial,
      "| fetchCalled=", fetchCalledRef.current);
    if (!serial) {
      console.warn("[PrivacyConsent] est_serial 없음 → 조회 스킵");
      return;
    }
    if (fetchCalledRef.current) return;
    fetchCalledRef.current = true;
    handleInitialFetch(serial).catch((e) =>
      console.error("[PrivacyConsent] handleInitialFetch 에러:", e)
    );

    // StrictMode 강제 unmount 시 flag 리셋 → remount 때 재시도 가능
    return () => { fetchCalledRef.current = false; };
  }, [ctx?.est_serial, handleInitialFetch]);

  /* ── 인쇄 후 확인 모달 표시 (보기 모드 / est_serial 없으면 스킵) ── */
  const onAfterPrint = useCallback(() => {
    if (viewMode) return;
    if (!ctx?.est_serial) return;
    setConfirmOpen(true);
  }, [viewMode, ctx?.est_serial]);

  /* ── [예, 인쇄됨] → 로딩 전환 → Puppeteer 캡처 + 서버 저장 ── */
  const handleConfirmYes = useCallback(async () => {
    setSaving(true);   // 로딩 시작 (모달은 열린 채로 유지, 닫기 버튼 disable)
    try {
      const captureData = { ...ctx, c1, c2, c2id, c3, sigDataUrl };
      const appUrl = window.location.origin;

      const res = await fetch("/capture-api/consent-pages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ captureData, appUrl }),
      });

      const json = await res.json();

      if (json.result !== "OK") {
        console.error("[PrivacyConsentPrint] 캡처 서버 오류:", json.msg);
        return;
      }

      await saveSignStamp({
        sign_serial: ctx.est_serial,
        signkind:    "4",
        signstamp:   json.signstamp,
        signstamp2:  json.signstamp2,
      });

      console.log("[PrivacyConsentPrint] 서명 이미지 저장 완료");
    } catch (err) {
      console.error("[PrivacyConsentPrint] 서명 저장 실패:", err);
    } finally {
      setSaving(false);      // 성공/실패 무관 로딩 종료
      setConfirmOpen(false); // 저장 완료 후 모달 닫기
    }
  }, [ctx, c1, c2, c2id, c3, sigDataUrl, saveSignStamp]);

  /* ── [아니오] → 모달만 닫기 ── */
  const handleConfirmNo = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  /* ── 파생값 ── */
  const dateForPrint = ctx?.seccode === "11" ? (ctx?.inday ?? "") : (ctx?.accday ?? "");
  const acc          = parseDateParts(dateForPrint);
  const today      = parseDateParts(ymd(new Date()));
  const comName    = companyForm?.comName || "";
  const boList     = (ctx?.claims ?? []).map((c) => c.bocomname).filter(Boolean).join(", ");
  const phone      = [ctx?.hp0, ctx?.hp1, ctx?.hp2].filter(Boolean).join("-");
  const email      = ctx?.email_acc
    ? (ctx?.email_smtp ? `${ctx.email_acc}@${ctx.email_smtp}` : ctx.email_acc)
    : "";
  const customName = ctx?.custom_name || "";

  /* ═══════════════════════════════════════════════════════
     보기 모드: 기존 서명 이미지 표시 (인쇄 가능)
  ═══════════════════════════════════════════════════════ */
  if (viewMode) {
    const toSrc = (b64) => b64 ? `data:image/jpeg;base64,${b64}` : null;
    const stamp1 = toSrc(existingStamps.signstamp);
    const stamp2 = toSrc(existingStamps.signstamp2);

    const imgStyle = { width: "100%", height: "100%", objectFit: "contain", display: "block" };
    const noImg    = <div style={{ color: "#999", fontSize: "14pt", textAlign: "center", paddingTop: "40mm" }}>이미지 없음</div>;

    return (
      <PrintPreviewLayout>
        <div style={{ ...PAGE_STYLE, padding: 0 }}>
          {stamp1 ? <img src={stamp1} alt="개인정보활용동의 1페이지" style={imgStyle} /> : noImg}
        </div>
        <div style={{ ...PAGE_STYLE, padding: 0 }}>
          {stamp2 ? <img src={stamp2} alt="개인정보활용동의 2페이지" style={imgStyle} /> : noImg}
        </div>
      </PrintPreviewLayout>
    );
  }

  /* ═══════════════════════════════════════════════════════
     1 페이지 내용 (캡처존 + PrintPreview 공용)
  ═══════════════════════════════════════════════════════ */
  const page1Inner = (
    <>
      <div style={S.title}>
        차량수리 요청 및 개인(신용)정보 수집·이용, 제공 및 조회 동의서
      </div>

      <p style={S.intro}>
        &nbsp;&nbsp;<span style={S.highlight}>{acc.y} 년 {acc.m} 월 {acc.d} 일</span>에 발생한 차량번호&nbsp;
        <span style={S.highlight}>{ctx?.carno || ""}</span>
        &nbsp;의 교통사고 및 검사 · 정비에 관련된 모든 업무 처리와 관련한
        개인(신용)정보에 대하여 아래와 같이 수집, 이용, 제공에 동의합니다.
      </p>

      <div style={S.companyRow}>
        <span>정비업체 [</span>
        <span style={{ ...S.companyInner, ...S.highlight }}>{comName}</span>
        <span>],</span>
        <span style={{ width: "10mm", display: "inline-block" }} />
        <span>보험사 [</span>
        <span style={{ ...S.companyInner, ...S.highlight }}>{boList}</span>
        <span> ]</span>
      </div>

      {/* 1. 수집·이용 */}
      <div style={S.sectionTitle}>1. &nbsp;개인(신용)정보의 수집·이용에 관한 사항</div>
      <div style={S.consentBox}>
        『개인정보보호법』제15조 및 제22조,『신용정보의 이용 및 보호에 관한 법률』제32조에 따라
        귀사가 아래와 같은 내용으로 본인의 (신용)정보를 수집·이용하는 것에 동의합니다.
        <ConsentPair agreed={c1} onChange={setC1} />
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 개인(신용)정보의 수집·이용 목적</div>
        <div style={S.bulletBody}>
          자동차수리 및 품질보증, 부품열람 및 활용, 손해사정서비스 등 필요한 업무, 정비연합회,
          관할 시도 자동차검사 정비조합, 관할 지역 정비협의회의 정비업무 통계 활용, 사후관리,
          민원처리 및 소비자보호 사고차량 매매업무, 증빙서류보존과 관련된 업무 면허 정보 및
          사업자정보 조회,
        </div>
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 정비업체 ( {comName} )가 수취 이용할 개인(신용)정보의 내용</div>
        <div style={S.bulletIndent}>
          - 자동차등록증상의 정보, 차량번호, 성명, 주소, 직업, 전화번호, 전자우편주소, 음성정보,
          운전면허정보, 계좌정보, 사업자등록증상의 정보, 사고정보, 자동차 수리관련 정보,
          부품조회 열람 및 활용 정보, 외국인등록번호
        </div>
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 개인(신용)정보의 보유·이용 기간</div>
        <div style={S.bulletIndent}>
          - 수집·이용 동의일로부터 개인(신용)정보의 수집·이용 목적을 달성할 때까지
        </div>
      </div>

      <div style={S.footnote}>
        ※ 귀하는 상기 동의를 거부할 수 있습니다. 다만, 이에 대한 동의를 하시지 않을 경우에는
        정상적인 정비, 수리 서비스 업무가 지연될 수 있습니다.
      </div>

      {/* 2. 제공 */}
      <div style={S.sectionTitle}>2. &nbsp;개인(신용)정보의 제공에 관한 사항</div>
      <div style={S.consentBox}>
        『개인정보보호법』제17조 및 제22조, 제24조,『신용정보의 이용 및 보호에 관한 법률』제32조에
        따라 귀사가 본인의 개인(신용) 정보를 아래와 같이 제3자에게 제공하는 것에 동의합니다.
        <ConsentPair agreed={c2} onChange={setC2} />
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 개인(신용)정보를 제공받는 자</div>
        <div style={S.bulletBody}>
          &nbsp;&nbsp;&nbsp;정비업체, 전국자동차검사정비사업조합연합회, 정비견적 및 국토부
          정비이력전송업무 위탁 전산업체, 관할 자동차검사정비조합, 관할 지역 정비협의회,
          손해사정업체, 보험요율산출기관, 국토해양부, 계약체결 및 이행 등에 필요한 업무를
          위탁 받은 자(부품공급업체, 위탁 클센타, 긴급 및 현장 출동업체, 견인업체, 자동차
          대여업체, 대리운전자 등),
        </div>
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 개인(신용)정보를 제공받는 자의 이용목적</div>
        <div style={S.bulletBody}>
          &nbsp;&nbsp;&nbsp;손해사정서비스 등 계약이행에 필요한 업무(보험금 청구 포함),
          전국자동차검사정비사업조합연합회, 관할 시도 자동차검사정비조합, 관할 지역
          정비협의회의 정비업무 통계 활용, 사후관리, 민원처리 및 소비자보호 증빙서류보존과
          관련된 업무, 면허정보, 부품조회 열람 및 활용 정보,
        </div>
      </div>
    </>
  );

  /* ═══════════════════════════════════════════════════════
     2 페이지 내용
  ═══════════════════════════════════════════════════════ */
  const page2Inner = (
    <>
      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 정비업체/보험개발원 및 보험사가 제공할 개인(신용)정보의 내용</div>
        <div style={S.bulletIndent}>
          - 자동차등록증상의 정보, 차량번호, 성명, 주소, 직업, 전화번호, 전자우편주소, 음성정보,
          운전면허정보, 계좌정보, 사업자등록증상의 정보, 사고정보, 자동차 수리관련 정보,
          부품조회, 열람 및 활용 정보, 외국인등록번호, 보험금지 급정보
        </div>
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>
          □ 제공받는 자의 개인(신용)정보 보유 이용기간은 제공 동의일로부터 개인(신용)정보의 제공목적을 달성할 때까지
        </div>
        <div style={S.bulletIndent}>
          ※ '제공할 개인(신용)정보의 내용'중 상기 제공대상기관의 법령상 업무수행 목적 및
          계약목적 달성에 부합하는 최소한의 정보만 제공
        </div>
      </div>

      <div style={S.idConsentBox}>
        ※ 귀(하)사가 본 계약과 관련하여 본인의 고유식별정보(주민등록번호, 외국인등록번호)를
        상기의 목적으로 상기의 보유 이용 기간 동안 수집·이용하는 것에 동의합니다.
        <ConsentPair agreed={c2id} onChange={setC2id} />
      </div>

      <div style={S.footnote}>
        ※ 귀하는 상기 동의를 거부할 수 있습니다. 다만, 이에 대한 동의를 하시지 않을 경우에는
        정상적인 정비, 수리 서비스 및 보험금지급 업무가 지연될 수 있습니다.
      </div>

      {/* 3. 조회 */}
      <div style={S.sectionTitle}>3. &nbsp;개인(신용)정보의 조회에 관한 사항</div>
      <div style={S.consentBox}>
        귀(하)사가 아래와 같은 내용으로 전국자동차검사정비사업조합연합회, 관할 시도
        자동차검사정비조합, 관할 지역 정비협의회 등에서 신용정보기관(『신용정보의 이용 및
        보호에 관한 법률』제32조 제2항) 및 금융감독원, 보험업법상 보험요율산출기관,
        국토해양부 등으로부터 본인의 개인(신용)정보를 조회하는 것에 동의합니다.
        <ConsentPair agreed={c3} onChange={setC3} />
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 조회한 개인(신용)정보</div>
        <div style={S.bulletIndent}>
          - 보험계약정보(보험사명, 보험가입 기간 중 보험가입 사항), 보험금 지급정보(보험사고일자,
          사고내용, 보험금 지급내역)
        </div>
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 개인(신용)정보 조회 목적</div>
        <div style={S.bulletIndent}>- 보험금 지급내역 등</div>
      </div>

      <div style={S.bulletBlock}>
        □ 조회동의 유효 기간 - 동의서 제출일로부터 개인(신용)정보의 조회 목적을 달성할 때까지
      </div>

      <div style={S.bulletBlock}>
        <div style={S.bulletTitle}>□ 조회자(개인(신용)정보를 제공받는 자)의 개인(신용)정보의 보유·이용 기간</div>
        <div style={S.bulletIndent}>
          - 정보를 제공받은 날로부터 개인(신용)정보의 조회 목적을 달성할 때까지
        </div>
      </div>

      <div style={S.footnote}>
        ※ 귀하는 상기 동의를 거부할 수 있습니다. 다만, 이에 대한 동의를 하시지 않을 경우에는
        정상적인 정비, 수리 서비스 및 보험금지급 업무가 지연될 수 있습니다.
      </div>

      <div style={S.footnote}>
        ※ 본 동의서에 의한 개인(신용)정보 조회는 귀하의 신용등급에 영향을 주지 않습니다.
      </div>

      {/* 동의일자 / 서명 */}
      <div style={S.footerSection}>
        <div style={S.footerDate}>
          {today.y} &nbsp;년 &nbsp;&nbsp; {today.m} &nbsp;월 &nbsp;&nbsp; {today.d} &nbsp;일
        </div>
        <div style={S.footerFields}>
          <div style={S.footerRow}>
            <span style={S.footerLbl}>전화번호 :</span>
            <span style={S.footerVal}>{phone}</span>
          </div>
          <div style={S.footerRow}>
            <span style={S.footerLbl}>E-Mail :</span>
            <span style={S.footerVal}>{email}</span>
          </div>
          <div style={S.footerLastRow}>
            <span style={{ ...S.footerLbl, fontWeight: "bold" }}>정비의뢰자 :</span>
            <span style={{ ...S.footerVal, fontWeight: "bold", fontSize: "16px" }}>{customName}</span>
            <SignaturePad dataUrl={sigDataUrl} onUpdate={setSigDataUrl} />
          </div>
        </div>
      </div>
    </>
  );

  /* ═══════════════════════════════════════════════════════
     렌더
  ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── 전역 CSS ── */}
      <style>{`
        * { box-sizing: border-box; }
        @media screen { .sig-print { display: none !important; } }
        @media print  { .sig-print { display: block !important; } }
      `}</style>

      {/* ── 화면 + 인쇄 미리보기 ── */}
      <PrintPreviewLayout onAfterPrint={onAfterPrint} disableClose={saving}>
        <div style={PAGE_STYLE}>{page1Inner}</div>
        <div style={PAGE_STYLE}>{page2Inner}</div>
      </PrintPreviewLayout>

      {/* ── 인쇄 확인 모달 ── */}
      {confirmOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: "8px",
            padding: "28px 32px", minWidth: "320px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            fontFamily: "'맑은 고딕','Malgun Gothic',sans-serif",
            textAlign: "center",
          }}>
            {saving ? (
              /* ── 저장 진행 중 ── */
              <>
                <div style={{ fontSize: "15pt", marginBottom: "12px" }}>⏳</div>
                <div style={{ fontSize: "12pt", fontWeight: "bold", marginBottom: "6px" }}>
                  서명 이미지 저장 중...
                </div>
                <div style={{ fontSize: "9.5pt", color: "#64748b" }}>
                  잠시만 기다려 주세요.
                </div>
              </>
            ) : (
              /* ── 확인 버튼 ── */
              <>
                <div style={{ fontSize: "15pt", marginBottom: "8px" }}>🖨</div>
                <div style={{ fontSize: "13pt", fontWeight: "bold", marginBottom: "6px" }}>
                  인쇄가 정상 출력되었습니까?
                </div>
                <div style={{ fontSize: "9.5pt", color: "#64748b", marginBottom: "24px" }}>
                  확인 시 동의서 서명 이미지가 저장됩니다.
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button onClick={handleConfirmYes} style={{
                    padding: "8px 28px", borderRadius: "6px", border: "none",
                    background: "#2563eb", color: "#fff",
                    fontSize: "11pt", fontWeight: "bold", cursor: "pointer",
                  }}>
                    예, 인쇄됨
                  </button>
                  <button onClick={handleConfirmNo} style={{
                    padding: "8px 28px", borderRadius: "6px",
                    border: "1px solid #cbd5e1", background: "#fff",
                    fontSize: "11pt", cursor: "pointer", color: "#334155",
                  }}>
                    아니오
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
