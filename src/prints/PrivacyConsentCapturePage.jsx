// src/prints/PrivacyConsentCapturePage.jsx
// Puppeteer 가 스크린샷 찍을 정적 렌더 페이지
// URL : /print/privacy-consent/capture
// sessionStorage key : "privacyConsentCaptureCtx"
//   { ...ctx, c1, c2, c2id, c3, sigDataUrl }

import React, { useState } from "react";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { ymd, parseDateParts } from "../utils/dateUtils";

/* ── 동의함 / 동의하지 않음 표시 (클릭 없음) ───────────── */
function ConsentPairStatic({ agreed }) {
  return (
    <div style={S.agreeRow}>
      <span style={S.agreeItem}>
        <span style={{ ...S.chkBox, background: agreed === true ? "#1d4ed8" : "#fff" }}>
          {agreed === true && <span style={S.chkMark}>✔</span>}
        </span>
        동의함
      </span>
      <span style={S.agreeItem}>
        <span style={{ ...S.chkBox, background: agreed === false ? "#1d4ed8" : "#fff" }}>
          {agreed === false && <span style={S.chkMark}>✔</span>}
        </span>
        동의하지 않음
      </span>
    </div>
  );
}

/* ── 공통 스타일 ─────────────────────────────────────────── */
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
  background: "#fff",
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
  },
  agreeItem: {
    display:    "inline-flex",
    alignItems: "center",
    gap:        "5px",
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
export default function PrivacyConsentCapturePage() {
  /* sessionStorage에서 컨텍스트 읽기 */
  const [data] = useState(() => {
    try {
      const raw = sessionStorage.getItem("privacyConsentCaptureCtx");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const { form: companyForm } = useCompanyInfo();

  /* 데이터 파싱 */
  const acc        = parseDateParts(data.accday);
  const today      = parseDateParts(ymd(new Date()));
  const comName    = companyForm?.comName || "";
  const boList     = (data.claims ?? []).map((c) => c.bocomname).filter(Boolean).join(", ");
  const phone      = [data.hp0, data.hp1, data.hp2].filter(Boolean).join("-");
  const email      = data.email_acc
    ? (data.email_smtp ? `${data.email_acc}@${data.email_smtp}` : data.email_acc)
    : "";
  const customName = data.custom_name || "";
  const sigDataUrl = data.sigDataUrl || null;

  /* 동의 상태 (기본값: true) */
  const c1   = data.c1   ?? true;
  const c2   = data.c2   ?? true;
  const c2id = data.c2id ?? true;
  const c3   = data.c3   ?? true;

  /* ── 1페이지 내용 ── */
  const page1Inner = (
    <>
      <div style={S.title}>
        차량수리 요청 및 개인(신용)정보 수집·이용, 제공 및 조회 동의서
      </div>

      <p style={S.intro}>
        &nbsp;&nbsp;<span style={S.highlight}>{acc.y} 년 {acc.m} 월 {acc.d} 일</span>에 발생한 차량번호&nbsp;
        <span style={S.highlight}>{data.carno || ""}</span>
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
        <ConsentPairStatic agreed={c1} />
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
        <ConsentPairStatic agreed={c2} />
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

  /* ── 2페이지 내용 ── */
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
        <ConsentPairStatic agreed={c2id} />
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
        <ConsentPairStatic agreed={c3} />
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
            {/* 서명 이미지 */}
            <div style={{ width: "22mm", height: "22mm", border: "1px solid #333", flexShrink: 0 }}>
              {sigDataUrl && (
                <img
                  src={sigDataUrl}
                  alt="서명"
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  /* ── 렌더 : 두 페이지를 세로로 쌓음 ── */
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }
      `}</style>
      <div id="pcp-capture-page1" style={PAGE_STYLE}>
        {page1Inner}
      </div>
      <div id="pcp-capture-page2" style={PAGE_STYLE}>
        {page2Inner}
      </div>
    </>
  );
}
