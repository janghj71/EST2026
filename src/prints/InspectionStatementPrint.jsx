// src/prints/InspectionStatementPrint.jsx
import React, { useEffect, useState } from "react";
import { useEstimate } from "../hooks/useEstimate";
import { useEstimateClaims } from "../hooks/useEstimateClaims";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useSealImage } from "../hooks/useSealImage";
import { useUserSettings } from "../hooks/useUserSettings";
import { formatNumber } from "../utils/numberFormat";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import PrintPreviewLayout from "./PrintPreviewLayout";

function fmtN(v) {
  const n = Number(v ?? 0);
  if (n === 0) return "";
  return formatNumber(n);
}

const TD   = { border: "1px solid #000", padding: "2px 4px", fontSize: "8.5pt", verticalAlign: "middle" };
const TDC  = { ...TD, textAlign: "center" };
const TDR  = { ...TD, textAlign: "right" };
const THL  = { ...TD, backgroundColor: "#e8e8e8", fontWeight: "bold", whiteSpace: "nowrap" };
const THLC = { ...THL, textAlign: "center" };

const CHK = {
  border: "1px solid #000",
  display: "inline-block",
  width: "11px", height: "11px",
  textAlign: "center", lineHeight: "11px",
  fontSize: "9pt", marginRight: "2px", verticalAlign: "middle",
};

export default function InspectionStatementPrint() {
  const ctx = useUrlContextSnapshot({
    storageKey: "inspectionStatementPrintCtx",
    keys: ["est_serial", "estbo_seqno"],
    cleanPath: "/print/inspection-statement",
  });

  const est_serial  = ctx?.est_serial  ?? "";
  const estbo_seqno = ctx?.estbo_seqno ?? "";

  const { fetchMasterById, fetchDetails } = useEstimate();
  const { fetchClaims } = useEstimateClaims();
  const { form: ci }                     = useCompanyInfo();
  const { companySeal, managerSeal }     = useSealImage();
  const { users, loading: usersLoading } = useUserSettings();

  const [master,     setMaster]     = useState(null);
  const [rows,       setRows]       = useState([]);
  const [writerSeal, setWriterSeal] = useState("");
  const [claimName,  setClaimName]  = useState("");

  // ── 데이터 조회 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!est_serial) return;
    Promise.all([
      fetchMasterById(est_serial),
      fetchDetails(est_serial, estbo_seqno || undefined),
      fetchClaims(est_serial),
    ]).then(([mj, dj, cj]) => {
      setMaster(mj?.dataset?.[0] ?? null);
      setRows(dj?.dataset ?? []);
      const claims = cj?.dataset ?? [];
      const matched = claims.find((c) => c.estbo_seqno === estbo_seqno);
      setClaimName(matched?.bocomname ?? claims[0]?.bocomname ?? "");
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est_serial]);

  // ── 작성자 인감 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!master?.w_manname || usersLoading) return;
    const u = users.find((u) => u.username === master.w_manname);
    if (u?.imgdata) setWriterSeal(`data:image/jpeg;base64,${u.imgdata}`);
  }, [master, users, usersLoading]);

  // ── 합계 ─────────────────────────────────────────────────────────
  const sumPart  = rows.reduce((a, r) => a + Number(r.partsum ?? 0), 0);
  const sumPay   = rows.reduce((a, r) => a + Number(r.paysum  ?? 0), 0);
  const sumTotal = sumPart + sumPay;
  const sumVat   = Math.round(sumTotal / 10);
  const sumGrand = sumTotal + sumVat;

  // ── 날짜 ─────────────────────────────────────────────────────────
  const todayStr = (() => {
    const src = master?.inday ?? "";
    const d = src ? new Date(src) : new Date();
    const p2 = (v) => String(v).padStart(2, "0");
    return `${d.getFullYear()} 년 ${p2(d.getMonth() + 1)} 월 ${p2(d.getDate())} 일`;
  })();

  const printDateStr = (() => {
    const n = new Date();
    const p2 = (v) => String(v).padStart(2, "0");
    return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`;
  })();

  // ── 기타 ─────────────────────────────────────────────────────────
  const tel       = [ci.tel0, ci.tel1, ci.tel2].filter(Boolean).join("-");
  const addr      = [ci.addr1, ci.addr2].filter(Boolean).join(" ");
  const addRepair = String(master?.add_repair ?? "") === "1";

  const showQty = (row) => {
    const pk = String(row.paykind ?? "");
    if (pk !== "3" && pk !== "5") return "";
    const n = Number(row.qty ?? 0);
    return n === 0 ? "" : String(n);
  };

  const getPayname = (row) => {
    const wc  = String(row.workcode  ?? "");
    const pk  = String(row.paykind   ?? "");
    const pn  = row.payname      ?? "";
    const sn  = row.statename    ?? "";
    const wcn = row.workcodename ?? "";
    if (wc === "P") {
      if (row.subpayno === "99991") return `${pn} ${Number(row.qty ?? 0)} 회`;
      if (row.payno && row.payno !== "") return [pn, sn, wcn].filter(Boolean).join(" ");
      return pn;
    }
    if (wc === "B") return sn === "" ? [pn, wcn].filter(Boolean).join(" ") : [pn, sn, wcn].filter(Boolean).join(" ");
    if (pk !== "3" && pk !== "5") return [pn, wcn].filter(Boolean).join(" ");
    return pn;
  };

  // ── 16행 페이지 분할 ─────────────────────────────────────────────
  const DETAIL_ROWS = 16;
  const pageChunks = [];
  if (rows.length === 0) {
    pageChunks.push([]);
  } else {
    for (let i = 0; i < rows.length; i += DETAIL_ROWS) {
      pageChunks.push(rows.slice(i, i + DETAIL_ROWS));
    }
  }

  if (!master && est_serial) {
    return <div style={{ padding: 20 }}>데이터 불러오는 중...</div>;
  }

  const PAGE_STYLE = {
    fontFamily: "'맑은 고딕', 'Malgun Gothic', sans-serif",
    fontSize: "8.5pt",
    width: "190mm",
    height: "277mm",
    margin: "0 auto",
    padding: "2mm 4mm",
    color: "#000",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  // ── 상세 테이블 (6열: 합계 없음) ────────────────────────────────
  const renderDetailTable = (pageRows) => {
    const padded = [
      ...pageRows,
      ...Array(Math.max(0, DETAIL_ROWS - pageRows.length)).fill(null),
    ];
    return (
      <table>
        <colgroup>
          <col style={{ width: "230px" }} />
          <col style={{ width: "68px" }} />
          <col style={{ width: "28px" }} />
          <col style={{ width: "56px" }} />
          <col style={{ width: "66px" }} />
          <col style={{ width: "66px" }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: "#e8e8e8" }}>
            <th rowSpan={2} style={THLC}>작 업 내 용</th>
            <th colSpan={4} style={THLC}>부 품</th>
            <th rowSpan={2} style={THLC}>공 임</th>
          </tr>
          <tr style={{ backgroundColor: "#e8e8e8" }}>
            <th style={THLC}>구 분</th>
            <th style={THLC}>수량</th>
            <th style={THLC}>단 가</th>
            <th style={THLC}>계</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((row, i) => (
            <tr key={i} style={{ height: "7mm" }}>
              <td style={{ ...TD, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "0" }}>
                {row ? getPayname(row) : "\u00A0"}
              </td>
              <td style={TDC}>
                {row && ["3","5"].includes(String(row.paykind ?? "")) ? (row.state ?? "") : ""}
              </td>
              <td style={TDR}>{row ? showQty(row) : ""}</td>
              <td style={TDR}></td>
              <td style={TDR}>{row ? fmtN(row.partsum) : ""}</td>
              <td style={TDR}>{row ? fmtN(row.paysum)  : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ── 합계 + 푸터 ──────────────────────────────────────────────────
  const renderSummaryAndFooter = (pageIndex, totalPages) => {
    const isLast = pageIndex === totalPages - 1;
    return (
      <>
        {/* 합계 행 */}
        <table style={{ marginTop: "-1px" }}>
          <colgroup>
            {["8%","12%","8%","12%","8%","12%","8%","12%","8%","12%"].map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>
            <tr style={{ fontWeight: "bold" }}>
              <td style={THLC}>부 품</td>
              <td style={TDR}>{isLast ? fmtN(sumPart)  : ""}</td>
              <td style={THLC}>공 임</td>
              <td style={TDR}>{isLast ? fmtN(sumPay)   : ""}</td>
              <td style={THLC}>소 계</td>
              <td style={TDR}>{isLast ? fmtN(sumTotal) : ""}</td>
              <td style={THLC}>부가세</td>
              <td style={TDR}>{isLast ? fmtN(sumVat)   : ""}</td>
              <td style={THLC}>총 계</td>
              <td style={TDR}>{isLast ? fmtN(sumGrand) : ""}</td>
            </tr>
          </tbody>
        </table>

        {/* 푸터 박스 */}
        <div style={{ border: "1px solid #000", marginTop: "1mm", padding: "3mm 4mm 2mm 4mm" }}>
          <div style={{ fontSize: "8pt" }}>
            【자동차관리법】 제58조제5항 및 같은 법 시행규칙 제134조제2항에 따라 위와 같이 발급합니다.
          </div>
          <div style={{ textAlign: "right", fontSize: "8.5pt", marginTop: "1mm" }}>{todayStr}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1mm" }}>
            {/* 작성자 */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "8.5pt" }}>
              <span style={{ fontWeight: "bold" }}>작성자</span>
              <span>{master?.w_manname ?? ""}</span>
              <span style={{ position: "relative", display: "inline-block", width: "36px", textAlign: "center" }}>
                <span style={{ position: "relative", zIndex: 2 }}>(인)</span>
                {writerSeal && (
                  <img src={writerSeal} alt="작성자인감" style={{
                    position: "absolute", left: "50%", top: "50%",
                    transform: "translate(-50%,-50%)",
                    maxHeight: "32px", maxWidth: "36px",
                    opacity: 0.85, mixBlendMode: "multiply", zIndex: 1,
                  }} />
                )}
              </span>
            </div>
            {/* 대표이사 */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "8.5pt" }}>
              <span style={{ fontWeight: "bold" }}>대표이사</span>
              <span>{ci.boss}</span>
              <span style={{ position: "relative", display: "inline-block", width: "36px", textAlign: "center" }}>
                <span style={{ position: "relative", zIndex: 2 }}>(인)</span>
                {companySeal && (
                  <img src={companySeal} alt="직인" style={{
                    position: "absolute", left: "50%", top: "50%",
                    transform: "translate(-50%,-50%)",
                    maxHeight: "32px", maxWidth: "36px",
                    opacity: 0.85, mixBlendMode: "multiply", zIndex: 1,
                  }} />
                )}
              </span>
            </div>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #000", margin: "2mm -4mm 2mm -4mm" }} />
          <div style={{ fontSize: "7.5pt", lineHeight: "1.65" }}>
            <div>1. 정비업자가 점검.정비의 잘못으로 다음 구분에 따른 기간중 발생하는 고장 등에 대하여는 무상점검.정비를 합니다.</div>
            <div style={{ marginLeft: "8px" }}>（「자동차관리법 시행규칙」 제 134조 제1항제2호)</div>
            <div style={{ marginLeft: "8px" }}>가. 차령 1년미만 또는 주행거리 2만킬로미터 이내의 자동차 : 점검.정비일로부터 90일 이내</div>
            <div style={{ marginLeft: "8px" }}>나. 차령 3년미만 또는 주행거리 6만킬로미터 이내의 자동차 : 점검.정비일로부터 60일 이내</div>
            <div style={{ marginLeft: "8px" }}>다. 차령 3년이상 또는 주행거리 6만킬로미터 이상의 자동차 : 점검.정비일로부터 30일 이내</div>
            <div>2. 이 내역서는 2부를 작성, 정비의뢰자에게 1부를 교부하고, 정비업자는 1부를 1년간 문서 또는 전산자료로 보관하여야 합니다.</div>
            <div>3. 부품란의 구분란에는 다음에 따라 기재하여야 합니다.</div>
            <div style={{ marginLeft: "8px" }}>
              가. 자동차 제작사 및 부품업체가 공급하는 신품(자동차 제작사의 경우에는 사후관리용 보증부품을 포함합니다): A<br />
              나. 재제조품: B&nbsp;&nbsp;&nbsp;다. 중고품(재생품을 포함합니다): C&nbsp;&nbsp;&nbsp;라. 인증대체부품: D&nbsp;&nbsp;&nbsp;마. 수입부품: F
            </div>
            <div>※ 재생정비한 원동기를 부품으로 사용한 경우에는 「자동차관리법 시행규칙」 별지 제90호서식의 원동기재생정비사실확인서를 첨부해야합니다.</div>
            <div>4. 구동축전지를 교체한 경우에는 작업내용란에 부품명과 구동측전지 식별번호를 표기하여야 합니다.</div>
          </div>
        </div>

        {/* 페이지 번호 + 인쇄일시 */}
        <div style={{ display: "flex", alignItems: "center", fontSize: "8pt", marginTop: "2mm", color: "#555" }}>
          <span>인쇄일시 : {printDateStr}</span>
          <span style={{ flex: 1, textAlign: "center" }}>- {pageIndex + 1} / {totalPages} -</span>
          <span style={{ visibility: "hidden" }}>인쇄일시 : {printDateStr}</span>
        </div>
      </>
    );
  };

  // ── 페이지 헤더 ──────────────────────────────────────────────────
  const renderPageHeader = () => (
    <>
      <div style={{ fontSize: "8pt", marginBottom: "1.5mm" }}>【별지 제89호의2서식】</div>
      <div style={{ textAlign: "center", marginBottom: "3mm" }}>
        <span style={{ fontSize: "15pt", fontWeight: "bold", letterSpacing: "2px" }}>
          자동차 점검 정비 명세서
        </span>
        {claimName && (
          <span style={{ fontSize: "10pt", fontWeight: "bold", marginLeft: "10px" }}>
            {claimName}
          </span>
        )}
      </div>
      <table>
        <colgroup>
          <col style={{ width: "44px" }} />
          <col style={{ width: "78px" }} />
          <col style={{ width: "136px" }} />
          <col style={{ width: "64px" }} />
          <col />
          <col style={{ width: "54px" }} />
          <col style={{ width: "70px" }} />
        </colgroup>
        <tbody>
          {/* 차량소유자 Row1: 등록번호, 차명, 주행km */}
          <tr>
            <td rowSpan={2} style={{ ...THLC, whiteSpace: "nowrap", verticalAlign: "top", paddingTop: "4px", lineHeight: "2" }}>
              <div>차 량</div><div>소유자</div>
            </td>
            <td style={THL}>등록번호</td>
            <td style={TD}>{master?.carno ?? ""}</td>
            <td style={THL}>차명(차종)</td>
            <td style={TD}>{[master?.carname, master?.modelname].filter(Boolean).join(" ")}</td>
            <td style={THL}>주행km</td>
            <td style={{ ...TDR, whiteSpace: "nowrap" }}>
              {master?.lastkm ? formatNumber(Number(master.lastkm)) : ""}
            </td>
          </tr>
          {/* 차량소유자 Row2: 등록일자, 점검정비의뢰일자 */}
          <tr>
            <td style={THL}>등록일자</td>
            <td style={TD}>{master?.car_registday ?? ""}</td>
            <td style={THL}>점검.정비 의뢰일자</td>
            <td style={TD} colSpan={3}>{master?.inday ?? ""}</td>
          </tr>
          {/* 정비사업자 Row1: 사업자등록번호, 정비업등록번호, TEL */}
          <tr>
            <td rowSpan={3} style={{ ...THLC, whiteSpace: "nowrap", verticalAlign: "middle", lineHeight: "2" }}>
              <div>정 비</div><div>사업자</div>
            </td>
            <td style={THL}>사업자등록번호</td>
            <td style={{ ...TD, whiteSpace: "nowrap" }}>{ci.idNo}</td>
            <td style={THL}>정비업등록번호</td>
            <td style={{ ...TD, whiteSpace: "nowrap" }}>{ci.sanghoid}</td>
            <td colSpan={2} style={{ ...TD, whiteSpace: "nowrap" }}>(TEL) {tel}</td>
          </tr>
          {/* 정비사업자 Row2: 업체명 + 주소 (같은 라인) */}
          <tr>
            <td style={THL}>업체명</td>
            <td style={TD}>{ci.comName}</td>
            <td style={THL}>주소</td>
            <td colSpan={3} style={TD}>{addr}</td>
          </tr>
          {/* 정비사업자 Row3: 완료일자, 출고일자, 정비책임자 + 인감 */}
          <tr>
            <td style={THL}>점검.정비완료일자</td>
            <td style={TD}>{master?.outday ?? ""}</td>
            <td style={THL}>출고일자</td>
            <td style={TD}>{master?.outday ?? ""}</td>
            <td style={THL}>정비책임자</td>
            <td style={{ ...TD, position: "relative" }}>
              <span>{master?.supman ?? ""}</span>
              {managerSeal && (
                <img src={managerSeal} alt="정비책임자인감" style={{
                  position: "absolute", right: "2px", top: "50%",
                  transform: "translateY(-50%)",
                  maxHeight: "36px", maxWidth: "42px",
                  opacity: 0.85, mixBlendMode: "multiply", zIndex: 1,
                }} />
              )}
            </td>
          </tr>
          {/* 점검정비내역 + 추가정비동의여부 */}
          <tr>
            <td colSpan={2} style={THL}>점 검 . 정 비 내 역</td>
            <td colSpan={2} style={THL}>추가정비동의여부</td>
            <td colSpan={3} style={TD}>
              <span style={{ marginRight: "14px" }}>
                <span style={CHK}>{addRepair ? "■" : ""}</span>동의
              </span>
              <span>
                <span style={CHK}>{!addRepair ? "■" : ""}</span>부동의
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: "8.5pt", margin: "0.5mm 0 0.5mm 0" }}>아래와 같이 점검.정비하였습니다.</div>
    </>
  );

  // ── 페이지 목록 ──────────────────────────────────────────────────
  const pageList = pageChunks.map((chunkRows, pageIndex) => (
    <div key={pageIndex} style={PAGE_STYLE}>
      <style>{`
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
        img { display: block; }
      `}</style>
      {renderPageHeader()}
      {renderDetailTable(chunkRows)}
      {renderSummaryAndFooter(pageIndex, pageChunks.length)}
    </div>
  ));

  return (
    <PrintPreviewLayout>
      {pageList}
    </PrintPreviewLayout>
  );
}
