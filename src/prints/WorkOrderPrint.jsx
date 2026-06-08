// src/prints/WorkOrderPrint.jsx
import React, { useEffect, useState } from "react";
import { useEstimate } from "../hooks/useEstimate";
import { useEstimateClaims } from "../hooks/useEstimateClaims";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { formatNumber } from "../utils/numberFormat";
import { printDateStr } from "../utils/dateUtils";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import PrintPreviewLayout from "./PrintPreviewLayout";

// ── 공통 셀 스타일 ───────────────────────────────────────────
const TD   = { border: "1px solid #000", padding: "3px 6px", fontSize: "9pt", verticalAlign: "middle" };
const TDC  = { ...TD, textAlign: "center" };
const TDR  = { ...TD, textAlign: "right" };
const THL  = { ...TD, backgroundColor: "#e8e8e8", fontWeight: "bold", whiteSpace: "nowrap" };
const THLC = { ...THL, textAlign: "center" };

const COAT_LABELS = { "1": "1코트", "2": "2코트", "4": "3코트", "5": "4코트" };

export default function WorkOrderPrint() {
  const ctx = useUrlContextSnapshot({
    storageKey: "workOrderPrintCtx",
    keys: ["est_serial"],
    cleanPath: "/print/work-order",
  });

  const est_serial = ctx?.est_serial ?? "";

  const { fetchMasterById, fetchDetails } = useEstimate();
  const { fetchClaims }                   = useEstimateClaims();
  const { form: ci }                      = useCompanyInfo();

  const [master, setMaster] = useState(null);
  const [rows,   setRows]   = useState([]);
  const [claim,  setClaim]  = useState(null);

  useEffect(() => {
    if (!est_serial) return;
    Promise.all([
      fetchMasterById(est_serial),
      fetchDetails(est_serial),
      fetchClaims(est_serial),
    ]).then(([mj, dj, cj]) => {
      setMaster(mj?.dataset?.[0] ?? null);
      setRows(dj?.dataset ?? []);
      setClaim((cj?.dataset ?? [])[0] ?? null);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est_serial]);

  // ── 업체정보 ─────────────────────────────────────────────────
  const tel  = [ci.tel0, ci.tel1, ci.tel2].filter(Boolean).join("-");
  const fax  = [ci.fax0, ci.fax1, ci.fax2].filter(Boolean).join("-");
  const addr = [ci.addr1, ci.addr2].filter(Boolean).join(" ");

  // ── 고객 정보 ─────────────────────────────────────────────────
  const hp = [master?.hp0, master?.hp1, master?.hp2].filter(Boolean).join("-");
  const coatLabel  = COAT_LABELS[String(master?.pntcot_code ?? "")] ?? "";
  const colorLabel = master?.pntcolor_code ?? "";
  const paintInfo  = [colorLabel, coatLabel].filter(Boolean).join(" / ");

  // ── 정비상세 필터 (공임 row: paykind 1/4/6) ─────────────────
  const detailRows = rows.filter((r) => ["1", "4", "6"].includes(String(r.paykind ?? "")));

  // ── 작업항목 / 작업 표시 함수 ────────────────────────────────
  const getPayname = (row) => {
    const wc  = String(row.workcode ?? "");
    const pn  = row.payname   ?? "";
    const sn  = row.statename ?? "";
    if (wc === "P") return sn ? `${pn} - ${sn}` : pn;
    if (wc === "B") return sn ? `${pn} - ${sn}` : pn;
    return pn;
  };

  // ── 인쇄일시 ─────────────────────────────────────────────────
  const printDate = printDateStr();

  // ── 페이지 분할 (매 페이지 동일 헤더, 동일 row 수) ───────────
  const ROWS_PER_PAGE = 25;

  const pageChunks = [];
  if (detailRows.length === 0) {
    pageChunks.push({ rows: [], startNo: 1, pageIndex: 0 });
  } else {
    let s = 0, p = 0;
    while (s < detailRows.length) {
      pageChunks.push({ rows: detailRows.slice(s, s + ROWS_PER_PAGE), startNo: s + 1, pageIndex: p });
      s += ROWS_PER_PAGE;
      p++;
    }
  }
  const totalPages = pageChunks.length;

  if (!master && est_serial) {
    return <div style={{ padding: 20 }}>데이터 불러오는 중...</div>;
  }

  // ── A4 페이지 스타일 ─────────────────────────────────────────
  const PAGE_STYLE = {
    fontFamily:    "'맑은 고딕', 'Malgun Gothic', sans-serif",
    fontSize:      "9pt",
    width:         "190mm",
    height:        "277mm",
    margin:        "0 auto",
    padding:       "2mm 4mm",
    color:         "#000",
    display:       "flex",
    flexDirection: "column",
    boxSizing:     "border-box",
    overflow:      "hidden",
  };

  // ── 페이지 헤더 (매 페이지 출력) ─────────────────────────────
  const renderHeader = () => (
    <>
      {/* 제목 */}
      <div style={{ textAlign: "center", marginBottom: "2mm" }}>
        <span style={{ fontSize: "16pt", fontWeight: "bold", letterSpacing: "4px" }}>
          작 업 지 시 서
        </span>
      </div>

      {/* 보험건(seccode=12) — 보험사명(담보) / 일반건은 공간만 유지 */}
      <div style={{ textAlign: "left", marginBottom: "2mm", fontSize: "11pt", fontWeight: "bold" }}>
        {String(master?.seccode) === "12"
          ? `${claim?.bocomname ?? ""}${claim?.dambo ? `(${claim.dambo})` : ""}`
          : " "}
      </div>

      {/* 좌: 고객/차량 정보 + 우: 업체정보 */}
      <div style={{ display: "flex", gap: "3px", marginBottom: "4mm", alignItems: "stretch" }}>
        {/* 좌측 표 (5행 × 4열) */}
        <table style={{ flex: "0 0 58%", borderCollapse: "collapse" }}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col />
            <col style={{ width: "22%" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td style={THLC}>고객성명</td>
              <td style={TD}>{master?.custom_name ?? ""}</td>
              <td style={THLC}>전화번호</td>
              <td style={TD}>{hp}</td>
            </tr>
            <tr>
              <td style={THLC}>차량번호</td>
              <td style={TD}>{master?.carno ?? ""}</td>
              <td style={THLC}>차 종</td>
              <td style={TD}>{master?.carname ?? ""}</td>
            </tr>
            <tr>
              <td style={THLC}>주행거리</td>
              <td style={{ ...TDR, whiteSpace: "nowrap" }}>
                {master?.lastkm ? `${formatNumber(Number(master.lastkm))} KM` : ""}
              </td>
              <td style={THLC}>모델명</td>
              <td style={TD}>{master?.modelname ?? ""}</td>
            </tr>
            <tr>
              <td style={THLC}>입고일자</td>
              <td style={TD}>{master?.inday ?? ""}</td>
              <td style={THLC}>출고예정일자</td>
              <td style={TD}>{master?.preoutday ?? ""}</td>
            </tr>
            <tr>
              <td style={THLC}>차량등록일</td>
              <td style={TD}>{master?.car_registday ?? ""}</td>
              <td style={THLC}>도장칼라/코트</td>
              <td style={TD}>{paintInfo}</td>
            </tr>
          </tbody>
        </table>

        {/* 우: 업체정보 */}
        <div style={{
          flex: 1,
          border: "1px solid #000",
          padding: "4px 8px",
          fontSize: "9pt",
          lineHeight: "1.85",
        }}>
          <div><strong>공 장 상 호 : </strong>{ci.comName}</div>
          <div><strong>대 &nbsp; 표 &nbsp; 자 : </strong>{ci.boss}</div>
          <div><strong>사업자번호 : </strong>{ci.idNo}</div>
          <div><strong>전 화 번 호 : </strong>{tel}</div>
          <div><strong>팩 스 번 호 : </strong>{fax}</div>
          <div><strong>주 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 소 : </strong>{addr}</div>
        </div>
      </div>

    </>
  );

  // ── 정비상세 헤더 ────────────────────────────────────────────
  const renderDetailHeader = () => (
    <table style={{ marginTop: "-1px" }}>
      <colgroup>
        <col style={{ width: "8%" }} />
        <col />
        <col style={{ width: "16%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={THLC}>No</th>
          <th style={THLC}>작업항목</th>
          <th style={THLC}>작업</th>
        </tr>
      </thead>
    </table>
  );

  // ── 정비상세 행 ──────────────────────────────────────────────
  const renderDetailRows = (pageRows, startNo) => {
    const emptyCnt = Math.max(0, ROWS_PER_PAGE - pageRows.length);
    return (
      <div style={{ overflow: "hidden" }}>
        <table style={{ marginTop: "-1px" }}>
          <colgroup>
            <col style={{ width: "8%" }} />
            <col />
            <col style={{ width: "16%" }} />
          </colgroup>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={startNo + i} style={{ height: "7mm" }}>
                <td style={TDC}>{startNo + i}</td>
                <td style={{ ...TD, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 0 }}>
                  {getPayname(row)}
                </td>
                <td style={TDC}>{row.workcodename ?? ""}</td>
              </tr>
            ))}
            {Array.from({ length: emptyCnt }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ height: "7mm" }}>
                <td style={TDC}></td>
                <td style={TD}></td>
                <td style={TDC}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── 푸터 ────────────────────────────────────────────────────
  const renderFooter = (pageIndex) => (
    <>
      <div style={{
        border: "1px solid #000",
        padding: "3mm 4mm",
        marginTop: "auto",
        fontSize: "8.5pt",
        lineHeight: "1.6",
      }}>
        점검ㆍ정비의 잘못으로 인하여 다음 각호의 구분에 따른 기간중에 발생하는 고장등에 대한 무상점검ㆍ정비<br />
        가. 차령 1년 미만, 주행거리 20,000Km 이내의 자동차 : 점검ㆍ정비일부터 90일 이내<br />
        나. 차령 3년 미만, 주행거리 60,000Km 이내의 자동차 : 점검ㆍ정비일부터 60일 이내<br />
        다. 차령 5년 미만, 주행거리 100,000Km 이내의 자동차 : 점검ㆍ정비일부터 30일 이내
      </div>
      <div style={{ display: "flex", fontSize: "8pt", marginTop: "1mm", color: "#555" }}>
        <span>인쇄일시 : {printDate}</span>
        <span style={{ flex: 1, textAlign: "center" }}>- {pageIndex + 1} / {totalPages} -</span>
        <span style={{ visibility: "hidden" }}>인쇄일시 : {printDate}</span>
      </div>
    </>
  );

  // ── 페이지 조립 ──────────────────────────────────────────────
  const pageList = pageChunks.map((chunk) => (
    <div key={chunk.pageIndex} style={PAGE_STYLE}>
      <style>{`
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
        img { display: block; }
      `}</style>
      {renderHeader()}
      {renderDetailHeader()}
      {renderDetailRows(chunk.rows, chunk.startNo)}
      {renderFooter(chunk.pageIndex)}
    </div>
  ));

  return (
    <PrintPreviewLayout>
      {pageList}
    </PrintPreviewLayout>
  );
}
