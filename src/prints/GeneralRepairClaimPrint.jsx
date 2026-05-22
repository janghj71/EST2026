// src/prints/GeneralRepairClaimPrint.jsx
import React, { useEffect, useState } from "react";
import { useEstimate } from "../hooks/useEstimate";
import { useEstimateClaims } from "../hooks/useEstimateClaims";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useSealImage } from "../hooks/useSealImage";
import { useTbCode } from "../hooks/useTbCode";
import { formatNumber } from "../utils/numberFormat";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import PrintPreviewLayout from "./PrintPreviewLayout";

// ── 숫자 0 → 빈값 (견적내역용) ───────────────────────────────
function fmtN(v) {
  const n = Number(v ?? 0);
  if (n === 0) return "";
  return formatNumber(n);
}

// ── 숫자 0 → "0" 표시 (정산 테이블용) ───────────────────────
function fmtZ(v) {
  const n = Number(v ?? 0);
  return n === 0 ? "0" : formatNumber(n);
}

// ── 공통 셀 스타일 ───────────────────────────────────────────
const TD   = { border: "1px solid #000", padding: "2px 4px", fontSize: "8.5pt", verticalAlign: "middle" };
const TDC  = { ...TD, textAlign: "center" };
const TDR  = { ...TD, textAlign: "right" };
const THL  = { ...TD, backgroundColor: "#e8e8e8", fontWeight: "bold", whiteSpace: "nowrap" };
const THLC = { ...THL, textAlign: "center" };

// 정산 테이블 전용 — 우측 여백 넓힘
const STDR  = { ...TD,  textAlign: "right", padding: "2px 10px" };
const STHLR = { ...THL, textAlign: "right", padding: "2px 10px" };

const COAT_LABELS = { "1": "1코트", "2": "2코트", "4": "3코트", "5": "4코트" };

export default function GeneralRepairClaimPrint() {
  const ctx = useUrlContextSnapshot({
    storageKey: "generalRepairClaimPrintCtx",
    keys: ["est_serial", "estbo_seqno"],
    cleanPath: "/print/general-repair-claim",
  });

  const est_serial  = ctx?.est_serial  ?? "";
  const estbo_seqno = ctx?.estbo_seqno ?? "";

  const { fetchMasterById, fetchDetails } = useEstimate();
  const { fetchClaims, fetchSettle }      = useEstimateClaims();
  const { form: ci }                      = useCompanyInfo();
  const { companySeal }                   = useSealImage();
  const { codes: pykCodes }               = useTbCode("PYK01");
  const { codes: pnkCodes }               = useTbCode("PNK01");

  const [master, setMaster] = useState(null);
  const [rows,   setRows]   = useState([]);
  const [claim,  setClaim]  = useState(null);
  const [settle, setSettle] = useState(null);

  useEffect(() => {
    if (!est_serial) return;
    Promise.all([
      fetchMasterById(est_serial),
      fetchDetails(est_serial, estbo_seqno || undefined),
      fetchClaims(est_serial),
      fetchSettle({ est_serial }),
    ]).then(([mj, dj, cj, sj]) => {
      setMaster(mj?.dataset?.[0] ?? null);
      setRows(dj?.dataset ?? []);
      const claims = cj?.dataset ?? [];
      const matched = claims.find((c) => c.estbo_seqno === estbo_seqno) ?? claims[0] ?? null;
      setClaim(matched);
      const settleRows = sj?.dataset ?? [];
      const matchedSettle = settleRows.find((s) => s.estbo_seqno === estbo_seqno) ?? settleRows[0] ?? null;
      setSettle(matchedSettle);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est_serial]);

  // ── 업체정보 ─────────────────────────────────────────────────
  const tel  = [ci.tel0, ci.tel1, ci.tel2].filter(Boolean).join("-");
  const fax  = [ci.fax0, ci.fax1, ci.fax2].filter(Boolean).join("-");
  const addr = [ci.addr1, ci.addr2].filter(Boolean).join(" ");

  // ── 고객 연락처 / 이메일 ─────────────────────────────────────
  const hp    = [master?.hp0, master?.hp1, master?.hp2].filter(Boolean).join("-");
  const email = [master?.email_acc, master?.email_smtp].filter(Boolean).join("@");

  // ── paykind / pntkind 명칭 ───────────────────────────────────
  const paykindLabel = pykCodes.find((c) => c.value === String(master?.paykind ?? ""))?.label ?? "";
  const pntkindLabel = pnkCodes.find((c) => c.value === String(master?.pntkind ?? ""))?.label ?? "";

  // ── 도장 코트 라벨 ───────────────────────────────────────────
  const coatLabel = COAT_LABELS[String(master?.pntcot_code ?? "2")] ?? "";

  // ── 추가정비 동의 ─────────────────────────────────────────────
  const addRepairAgreed = master?.add_repair === "1";

  // ── 인쇄일시 ─────────────────────────────────────────────────
  const printDateStr = (() => {
    const n  = new Date();
    const p2 = (v) => String(v).padStart(2, "0");
    return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`;
  })();

  // ── 견적내역 행 표시 함수 ────────────────────────────────────
  const getPayname = (row) => {
    const wc  = String(row.workcode  ?? "");
    const pk  = String(row.paykind   ?? "");
    const pn  = row.payname      ?? "";
    const sn  = row.statename    ?? "";
    if (wc === "P") {
      if (row.subpayno === "99991") return `${pn} ${Number(row.qty ?? 0)} 회`;
      if (row.payno && row.payno !== "") return [pn, sn].filter(Boolean).join(" ");
      return pn;
    }
    if (wc === "B") return sn === "" ? pn : [pn, sn].filter(Boolean).join(" ");
    if (pk !== "3" && pk !== "5") return pn;
    return pn;
  };

  const showQty = (row) => {
    const wc = String(row.workcode ?? "");
    if (["T", "G", "W"].includes(wc)) return "";
    const n = Number(row.qty ?? 0);
    return n === 0 ? "" : String(n);
  };

  const isLaborRow = (row) => {
    const pk = String(row.paykind ?? "");
    return pk !== "3" && pk !== "5";
  };

  // ── 페이지 분할 ──────────────────────────────────────────────
  const ROWS_PAGE1    = 16;
  const ROWS_PER_PAGE = 35;

  const pageChunks = [];
  if (rows.length === 0) {
    pageChunks.push({ isFirst: true, rows: [], startNo: 1, pageIndex: 0 });
  } else {
    pageChunks.push({ isFirst: true, rows: rows.slice(0, ROWS_PAGE1), startNo: 1, pageIndex: 0 });
    let s = ROWS_PAGE1;
    let p = 1;
    while (s < rows.length) {
      pageChunks.push({ isFirst: false, rows: rows.slice(s, s + ROWS_PER_PAGE), startNo: s + 1, pageIndex: p });
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
    fontSize:      "8.5pt",
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

  // ── 견적정산 테이블 (일반용 — 보험 차감 항목 제외) ──────────
  const renderSettleTable = () => {
    const s              = settle ?? {};
    const vatrateDisplay = String(Number(s.vatrate ?? "10"));

    return (
      <table>
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "15%" }} />
          <col />
        </colgroup>
        <tbody>
          {/* Row 1: 섹션 헤더 */}
          <tr>
            <td colSpan={2} style={THLC}>공 임</td>
            <td colSpan={2} style={THLC}>부 품</td>
            <td colSpan={2} style={THLC}>차 감</td>
          </tr>
          {/* Row 2 */}
          <tr>
            <td style={THLC}>탈착교환</td>
            <td style={STDR}>{fmtZ(s.rxao)}</td>
            <td style={THLC}>재 료 대</td>
            <td style={STDR}>{fmtZ(s.p1)}</td>
            <td style={THLC}>감가상각</td>
            <td style={STDR}>{fmtN(s.depreci_amt)}</td>
          </tr>
          {/* Row 3 */}
          <tr>
            <td style={THLC}>판금수리</td>
            <td style={STDR}>{fmtZ(s.bs)}</td>
            <td style={THLC}>순정부품</td>
            <td style={STDR}>{fmtZ(s.newpart)}</td>
            <td style={THLC}>잔 존 물</td>
            <td style={STDR}>{fmtN(s.rem_amt)}</td>
          </tr>
          {/* Row 4 */}
          <tr>
            <td style={THLC}>견인기타</td>
            <td style={STDR}>{fmtZ(s.tg)}</td>
            <td style={THLC}>중고부품</td>
            <td style={STDR}>{fmtZ(s.oldpart)}</td>
            <td style={THLC}>차감소계</td>
            <td style={STDR}>{fmtZ(s.dcsum)}</td>
          </tr>
          {/* Row 5: 도장공임 + 합계 섹션 헤더 */}
          <tr>
            <td style={THLC}>도장공임</td>
            <td style={STDR}>{fmtZ(s.p2)}</td>
            <td style={TD}></td>
            <td style={TD}></td>
            <td colSpan={2} style={THLC}>합 계</td>
          </tr>
          {/* Row 6: 가열건조비 + 소계 */}
          <tr>
            <td style={THLC}>가열건조비</td>
            <td style={STDR}>{fmtZ(s.p4)}</td>
            <td style={TD}></td>
            <td style={TD}></td>
            <td style={THLC}>소 계</td>
            <td style={STDR}>{fmtZ(s.endtotal)}</td>
          </tr>
          {/* Row 7: 부가세 */}
          <tr>
            <td style={TD}></td>
            <td style={TD}></td>
            <td style={TD}></td>
            <td style={TD}></td>
            <td style={THLC}>부 가 세</td>
            <td style={{ ...TD, padding: "2px 10px 2px 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{vatrateDisplay}%</span>
                <span>{fmtZ(s.endvat)}</span>
              </div>
            </td>
          </tr>
          {/* Row 8: 소계들 + 합계 */}
          <tr style={{ fontWeight: "bold" }}>
            <td style={THLC}>공임소계</td>
            <td style={STHLR}>{fmtZ(s.endpaysum)}</td>
            <td style={THLC}>부품소계</td>
            <td style={STHLR}>{fmtZ(s.endpartsum)}</td>
            <td style={THLC}>합 계</td>
            <td style={STHLR}>{fmtZ(s.reqtotal)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  // ── 1페이지 전용 헤더 ────────────────────────────────────────
  const renderPageOneHeader = () => (
    <>
      {/* 제목 */}
      <div style={{ textAlign: "center", marginBottom: "2mm" }}>
        <span style={{ fontSize: "14pt", fontWeight: "bold", letterSpacing: "2px" }}>
          일반 수리비 청구서
        </span>
      </div>

      {/* 고객정보(좌) + 업체정보(우) */}
      <div style={{ display: "flex", gap: "3px", alignItems: "stretch" }}>
        {/* 좌: 고객정보 */}
        <table style={{ flex: "0 0 58%", borderCollapse: "collapse" }}>
          <colgroup>
            <col style={{ width: "24%" }} />
            <col />
            <col style={{ width: "22%" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td style={THLC}>고 객 명</td>
              <td style={TD}>{master?.custom_name ?? ""}</td>
              <td style={THLC}>연 락 처</td>
              <td style={TD}>{hp}</td>
            </tr>
            <tr>
              <td style={THLC}>이 메 일</td>
              <td style={TD} colSpan={3}>{email}</td>
            </tr>
            <tr>
              <td style={THLC}>추가정비 동의</td>
              <td style={TD} colSpan={3}>
                <span style={{
                  display: "inline-block",
                  width: "12px", height: "12px",
                  border: "1px solid #000",
                  backgroundColor: addRepairAgreed ? "#000" : "#fff",
                  marginRight: "4px",
                  verticalAlign: "middle",
                }} />
                <span style={{ verticalAlign: "middle" }}>
                  {addRepairAgreed ? "동의함" : "미동의"}
                </span>
              </td>
            </tr>
            <tr>
              <td style={THLC}>탈부착작업</td>
              <td style={TD}>{paykindLabel}</td>
              <td style={THLC}>도 장 작 업</td>
              <td style={TD}>{pntkindLabel}</td>
            </tr>
            <tr>
              <td style={THLC}>&nbsp;</td>
              <td style={TD}></td>
              <td style={THLC}></td>
              <td style={TD}></td>
            </tr>
          </tbody>
        </table>

        {/* 우: 업체정보 + 직인 */}
        <div style={{
          flex: 1,
          border: "1px solid #000",
          padding: "3px 6px",
          fontSize: "8.5pt",
          position: "relative",
          lineHeight: "1.75",
        }}>
          <div><strong>공 장 상 호 : </strong>{ci.comName}</div>
          <div><strong>대 &nbsp; 표 &nbsp; 자 : </strong>{ci.boss}</div>
          <div><strong>사업자번호 : </strong>{ci.idNo}</div>
          <div><strong>전 화 번 호 : </strong>{tel}</div>
          <div><strong>팩 스 번 호 : </strong>{fax}</div>
          <div><strong>주 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 소 : </strong>{addr}</div>
          {companySeal && (
            <img src={companySeal} alt="직인" style={{
              position: "absolute", right: "4px", top: "50%",
              transform: "translateY(-50%)",
              maxHeight: "54px", maxWidth: "60px",
              opacity: 0.85, mixBlendMode: "multiply",
            }} />
          )}
        </div>
      </div>

      {/* spacer 1: 고객/업체정보 ↔ 수리차량 */}
      <div style={{ flex: 1 }} />

      {/* 수리차량 / 견적정보 */}
      <table>
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "13%" }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={6} style={{ ...THL, fontSize: "8.5pt" }}>
              수리차량 / 견적정보
            </td>
          </tr>
          <tr>
            <td style={THLC}>차량번호</td>
            <td style={TD}>{master?.carno ?? ""}</td>
            <td style={THLC}>차 량</td>
            <td style={TD}>{master?.carname ?? ""}</td>
            <td style={THLC}>모 델</td>
            <td style={TD}>{master?.modelname ?? ""}</td>
          </tr>
          <tr>
            <td style={THLC}>차대번호</td>
            <td style={TD}>{master?.vinno ?? ""}</td>
            <td style={THLC}>차량등록일</td>
            <td style={TD}>{master?.car_registday ?? ""}</td>
            <td style={THLC}>주행거리</td>
            <td style={{ ...TDR, whiteSpace: "nowrap" }}>
              {master?.lastkm ? `${formatNumber(Number(master.lastkm))} KM` : ""}
            </td>
          </tr>
          <tr>
            <td style={THLC}>입고일자</td>
            <td style={TD}>{master?.inday ?? ""}</td>
            <td style={THLC}>출고일자</td>
            <td style={TD}>{master?.outday ?? ""}</td>
            <td style={TD} colSpan={2}></td>
          </tr>
          <tr>
            <td style={THLC}>탈부착M/H</td>
            <td style={TDR}>
              {claim?.xpay ? `${formatNumber(Number(claim.xpay))} 원` : ""}
            </td>
            <td style={THLC}>판금M/H</td>
            <td style={TDR}>
              {claim?.bpay ? `${formatNumber(Number(claim.bpay))} 원` : ""}
            </td>
            <td style={THLC}>도장M/H</td>
            <td style={TDR}>
              {claim?.ppay ? `${formatNumber(Number(claim.ppay))} 원` : ""}
              {claim?.ppay && coatLabel ? `  ${coatLabel}` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      {/* spacer 2: 수리차량 ↔ 정산 */}
      <div style={{ flex: 1 }} />

      {/* 견적정산 */}
      {renderSettleTable()}

      {/* spacer 3: 정산 ↔ 내역 */}
      <div style={{ flex: 1 }} />
    </>
  );

  // ── 견적내역 테이블 헤더 ─────────────────────────────────────
  const renderDetailHeader = () => (
    <table style={{ marginTop: "-1px" }}>
      <colgroup>
        <col style={{ width: "5%" }} />
        <col />
        <col style={{ width: "8%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "12%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={THLC}>No</th>
          <th style={THLC}>작업항목및 부품명</th>
          <th style={THLC}>작업</th>
          <th style={THLC}>시간Q</th>
          <th style={THLC}>부품코드</th>
          <th style={THLC}>부품가격</th>
          <th style={THLC}>공 임</th>
          <th style={THLC}>비 고</th>
        </tr>
      </thead>
    </table>
  );

  // ── 견적내역 행 ──────────────────────────────────────────────
  const renderDetailRows = (pageRows, startNo, pageIndex, isFirst) => {
    const target   = isFirst ? ROWS_PAGE1 : ROWS_PER_PAGE;
    const emptyCnt = Math.max(0, target - pageRows.length);
    return (
    <div style={{ overflow: "hidden" }}>
    <table style={{ marginTop: "-1px" }}>
      <colgroup>
        <col style={{ width: "5%" }} />
        <col />
        <col style={{ width: "8%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "12%" }} />
      </colgroup>
      <tbody>
        {pageRows.map((row, i) => {
          const rowNo = startNo + i;
          const labor = isLaborRow(row);
          const sep   = !(pageIndex === 0 && i === 0) && parseFloat(row.b_level ?? "0") === 0;
          return (
            <tr key={rowNo} style={{ height: "7mm" }}>
              <td style={{ ...TDC, color: labor ? "#1d4ed8" : "#000", borderTop: sep ? "1px dashed #888" : undefined }}>{rowNo}</td>
              <td style={{ ...TD,  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "0", borderTop: sep ? "1px dashed #888" : undefined }}>
                {getPayname(row)}
              </td>
              <td style={{ ...TDC, borderTop: sep ? "1px dashed #888" : undefined }}>{row.workcodename ?? ""}</td>
              <td style={{ ...TDR, borderTop: sep ? "1px dashed #888" : undefined }}>{showQty(row)}</td>
              <td style={{ ...TDC, borderTop: sep ? "1px dashed #888" : undefined }}>{row.part_makercode ?? ""}</td>
              <td style={{ ...TDR, borderTop: sep ? "1px dashed #888" : undefined }}>{fmtN(row.partsum)}</td>
              <td style={{ ...TDR, borderTop: sep ? "1px dashed #888" : undefined }}>{fmtN(row.paysum)}</td>
              <td style={{ ...TDC, borderTop: sep ? "1px dashed #888" : undefined }}>{row.statename ?? ""}</td>
            </tr>
          );
        })}
        {Array.from({ length: emptyCnt }).map((_, i) => (
          <tr key={`empty-${i}`} style={{ height: "7mm" }}>
            <td style={TDC}></td>
            <td style={TD}></td>
            <td style={TDC}></td>
            <td style={TDR}></td>
            <td style={TDC}></td>
            <td style={TDR}></td>
            <td style={TDR}></td>
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
        padding: "3mm 4mm 2mm",
        marginTop: "auto",
        fontSize: "8pt",
        textAlign: "left",
        lineHeight: "1.65",
      }}>
        상기 청구서가 분해 작업전에 산출된 경우 분해점검 후 부품의 증감 작업변경에 따라 견적금액이 변동될 수 있습니다.<br />
        부품가격은 산출 시점 기준이며, 실제 수급 상황에 따라 변동될 수 있으니 확인하시기 바랍니다.
      </div>
      <div style={{ display: "flex", fontSize: "8pt", marginTop: "1mm", color: "#555" }}>
        <span>인쇄일시 : {printDateStr}</span>
        <span style={{ flex: 1, textAlign: "center" }}>- {pageIndex + 1} / {totalPages} -</span>
        <span style={{ visibility: "hidden" }}>인쇄일시 : {printDateStr}</span>
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
      {chunk.isFirst && renderPageOneHeader()}
      {!chunk.isFirst && <div style={{ flex: 1 }} />}
      {renderDetailHeader()}
      {renderDetailRows(chunk.rows, chunk.startNo, chunk.pageIndex, chunk.isFirst)}
      {renderFooter(chunk.pageIndex)}
    </div>
  ));

  return (
    <PrintPreviewLayout>
      {pageList}
    </PrintPreviewLayout>
  );
}
