// src/prints/InspectionEstimatePrint.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEstimate } from "../hooks/useEstimate";
import { useEstimateClaims } from "../hooks/useEstimateClaims";
import { useMasterEstimateSave } from "../hooks/useMasterEstimateSave";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useSealImage } from "../hooks/useSealImage";
import { useUserSettings } from "../hooks/useUserSettings";
import { formatNumber } from "../utils/numberFormat";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import PrintPreviewLayout from "./PrintPreviewLayout";

// ── 숫자 0 → 빈값 ──────────────────────────────────────────────
function fmtN(v) {
  const n = Number(v ?? 0);
  if (n === 0) return "";
  return formatNumber(n);
}

// ── 공통 셀 스타일 ───────────────────────────────────────────────
const TD  = { border: "1px solid #000", padding: "2px 4px", fontSize: "8.5pt", verticalAlign: "middle" };
const TDC = { ...TD, textAlign: "center" };
const TDR = { ...TD, textAlign: "right" };
const THL = { ...TD, backgroundColor: "#e8e8e8", fontWeight: "bold", whiteSpace: "nowrap" };
const THLC = { ...THL, textAlign: "center" };

export default function InspectionEstimatePrint() {
  const ctx = useUrlContextSnapshot({
    storageKey: "inspectionEstimatePrintCtx",
    keys: ["est_serial", "estbo_seqno"],
    cleanPath: "/print/inspection-estimate",
  });

  const est_serial  = ctx?.est_serial  ?? "";
  const estbo_seqno = ctx?.estbo_seqno ?? "";

  const { fetchMasterById, fetchDetails } = useEstimate();
  const { fetchClaims } = useEstimateClaims();
  const { updateEstPrint } = useMasterEstimateSave();
  const { form: ci, loading: ciLoading }  = useCompanyInfo();
  const { companySeal, loading: sealLoading } = useSealImage();
  const { users, loading: usersLoading }  = useUserSettings();

  const [master,       setMaster]       = useState(null);
  const [rows,         setRows]         = useState([]);
  const [writerSeal,   setWriterSeal]   = useState("");
  const [claimName,    setClaimName]    = useState("");
  const [confirmOpen,  setConfirmOpen]  = useState(false);  // 인쇄확인 모달
  const estPrintRef = useRef(null);   // 최신 est_print 값 보관


  // ── 마스터 + 상세 + 청구처 조회 ────────────────────────────────
  useEffect(() => {
    if (!est_serial) return;
    Promise.all([
      fetchMasterById(est_serial),
      fetchDetails(est_serial, estbo_seqno || undefined),
      fetchClaims(est_serial),
    ]).then(([mj, dj, cj]) => {
      const m = mj?.dataset?.[0] ?? null;
      setMaster(m);
      estPrintRef.current = m?.est_print ?? "";   // est_print 현재값 보관
      setRows(dj?.dataset ?? []);
      const claims = cj?.dataset ?? [];
      const matched = claims.find((c) => c.estbo_seqno === estbo_seqno);
      setClaimName(matched?.bocomname ?? claims[0]?.bocomname ?? "");
    }).catch(() => {});
  // est_serial이 확정된 후 fetch 실행 (useUrlContextSnapshot 타이밍 대응)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est_serial]);

  // ── afterprint → 확인 모달 표시 (est_print≠'1' 인 경우만) ──
  const handleAfterPrint = useCallback(() => {
    if (estPrintRef.current !== "1") {
      setConfirmOpen(true);
    }
  }, []);

  // ── [예, 인쇄됨] 클릭 → API 호출 + 로컬 상태 업데이트 ──────
  const handleConfirmYes = useCallback(() => {
    setConfirmOpen(false);
    updateEstPrint(est_serial).then(() => {
      estPrintRef.current = "1";
      setMaster((m) => m ? { ...m, est_print: "1" } : m);
      try {
        window.opener?.postMessage(
          { type: "EST_MASTER_REFRESH", payload: { est_serial } },
          window.location.origin
        );
      } catch { /* empty */ }
    }).catch(() => {});
  }, [est_serial, updateEstPrint]);

  const handleConfirmNo = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  // ── 작성자 인감 — users 로드 후 w_manname 으로 검색 ──────────
  useEffect(() => {
    if (!master?.w_manname || usersLoading) return;
    const u = users.find((u) => u.username === master.w_manname);
    if (u?.imgdata) setWriterSeal(`data:image/jpeg;base64,${u.imgdata}`);
  }, [master, users, usersLoading]);

  // 자동 인쇄 제거 — PrintPreviewLayout 의 [인쇄] 버튼 사용

  // ── 합계 계산 ────────────────────────────────────────────────
  const sumPart  = rows.reduce((a, r) => a + Number(r.partsum ?? 0), 0);
  const sumPay   = rows.reduce((a, r) => a + Number(r.paysum  ?? 0), 0);
  const sumTotal = sumPart + sumPay;
  const sumVat   = Math.round(sumTotal / 10);
  const sumGrand = sumTotal + sumVat;

  // ── 날짜 ────────────────────────────────────────────────────
  const todayStr = (() => {
    const src = master?.inday ?? "";
    const d = src ? new Date(src) : new Date();
    return `${d.getFullYear()} 년 ${String(d.getMonth() + 1).padStart(2, "0")} 월 ${String(d.getDate()).padStart(2, "0")} 일`;
  })();

  const printDateStr = (() => {
    const n = new Date();
    const p2 = (v) => String(v).padStart(2, "0");
    return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`;
  })();

  // ── 기타 ─────────────────────────────────────────────────────
  const isInsurance = String(master?.seccode) === "12";
  const tel = [ci.tel0, ci.tel1, ci.tel2].filter(Boolean).join("-");
  const addr = [ci.addr1, ci.addr2].filter(Boolean).join(" ");
  // claimName 은 state 로 관리 (fetchClaims 에서 estbo_seqno 기준으로 설정)

  // qty 표시 — paykind 3/5 만
  const showQty = (row) => {
    const pk = String(row.paykind ?? "");
    if (pk !== "3" && pk !== "5") return "";
    const n = Number(row.qty ?? 0);
    return n === 0 ? "" : String(n);
  };

  // 견적내용 표시 로직
  const getPayname = (row) => {
    const wc  = String(row.workcode  ?? "");
    const pk  = String(row.paykind   ?? "");
    const pn  = row.payname      ?? "";
    const sn  = row.statename    ?? "";
    const wcn = row.workcodename ?? "";

    if (wc === "P") {
      if (row.subpayno === "99991") {
        const q = Number(row.qty ?? 0);
        return `${pn} ${q} 회`;
      } else if (row.payno && row.payno !== "") {
        return [pn, sn, wcn].filter(Boolean).join(" ");
      }
      return pn;
    } else if (wc === "B") {
      if (sn === "") {
        return [pn, wcn].filter(Boolean).join(" ");
      } else {
        return [pn, sn, wcn].filter(Boolean).join(" ");
      }
    } else if (pk !== "3" && pk !== "5") {
      return [pn, wcn].filter(Boolean).join(" ");
    }
    return pn;
  };

  // 행 합계
  const rowTotal = (row) => {
    const t = Number(row.partsum ?? 0) + Number(row.paysum ?? 0);
    return t === 0 ? "" : formatNumber(t);
  };

  // ── 16행 단위로 페이지 분할 ────────────────────────────────────
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

  // ── A4 페이지 공통 스타일 ────────────────────────────────────
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

  // ── 견적내역 테이블 (페이지별 rows 전달) ────────────────────
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
          <col style={{ width: "50px" }} />
          <col style={{ width: "60px" }} />
          <col style={{ width: "60px" }} />
          <col style={{ width: "60px" }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: "#e8e8e8" }}>
            <th rowSpan={2} style={THLC}>견 적 내 용</th>
            <th colSpan={4} style={THLC}>부 품 내 역</th>
            <th rowSpan={2} style={THLC}>공 임</th>
            <th rowSpan={2} style={THLC}>합 계</th>
          </tr>
          <tr style={{ backgroundColor: "#e8e8e8" }}>
            <th style={THLC}>코 드</th>
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
              <td style={TDC}>{row?.part_makercode ?? ""}</td>
              <td style={TDR}>{row ? showQty(row) : ""}</td>
              <td style={TDR}></td>
              <td style={TDR}>{row ? fmtN(row.partsum) : ""}</td>
              <td style={TDR}>{row ? fmtN(row.paysum) : ""}</td>
              <td style={TDR}>{row ? rowTotal(row) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ── 합계 + 푸터 (마지막 페이지만) ───────────────────────────
  const renderSummaryAndFooter = (pageIndex, totalPages) => {
    const isLast = pageIndex === totalPages - 1;
    return (
    <>
      <table style={{ marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "17%" }} />
          <col />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: "#e8e8e8", fontWeight: "bold" }}>
            <th style={THLC}>구 분</th>
            <th style={THLC}>부 품</th>
            <th style={THLC}>공 임</th>
            <th style={THLC}>계</th>
            <th style={THLC}>부가가치세</th>
            <th style={THLC}>총 액</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ fontWeight: "bold" }}>
            <td style={TDC}>{isInsurance ? "보험" : "일반"}</td>
            <td style={TDR}>{isLast ? fmtN(sumPart)  : ""}</td>
            <td style={TDR}>{isLast ? fmtN(sumPay)   : ""}</td>
            <td style={TDR}>{isLast ? fmtN(sumTotal) : ""}</td>
            <td style={TDR}>{isLast ? fmtN(sumVat)   : ""}</td>
            <td style={TDR}>{isLast ? fmtN(sumGrand) : ""}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ border: "1px solid #000", marginTop: "1mm", padding: "3mm 4mm 2mm 4mm" }}>
        <div style={{ fontSize: "8pt" }}>
          【자동차관리법】 제58조제5항 및 같은 법 시행규칙 제134조제2항에 따라 위와 같이 발급합니다.
        </div>
        <div style={{ textAlign: "right", fontSize: "8.5pt", marginTop: "1mm" }}>{todayStr}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "8.5pt" }}>
            <span style={{ fontWeight: "bold" }}>작성자</span>
            <span>{master?.w_manname ?? ""}</span>
            <span style={{ position: "relative", display: "inline-block", width: "36px", textAlign: "center" }}>
              <span style={{ position: "relative", zIndex: 2 }}>(인)</span>
              {writerSeal && (
                <img src={writerSeal} alt="작성자인감" style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  maxHeight: "32px", maxWidth: "36px",
                  opacity: 0.85, mixBlendMode: "multiply", zIndex: 1,
                }} />
              )}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "8.5pt" }}>
            <span style={{ fontWeight: "bold" }}>대표이사</span>
            <span>{ci.boss}</span>
            <span style={{ position: "relative", display: "inline-block", width: "36px", textAlign: "center" }}>
              <span style={{ position: "relative", zIndex: 2 }}>(인)</span>
              {companySeal && (
                <img src={companySeal} alt="직인" style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  maxHeight: "32px", maxWidth: "36px",
                  opacity: 0.85, mixBlendMode: "multiply", zIndex: 1,
                }} />
              )}
            </span>
          </div>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #000", margin: "2mm -4mm 2mm -4mm" }} />
        <div style={{ fontSize: "7.5pt", margin: 0, lineHeight: "1.65" }}>
          <div>1. 견적요금은 교통사고 등의 처리를 목적으로 견적서를 발행한 경우에 청구가 가능합니다.</div>
          <div>2. 본 견적서는 교부일로부터 1개월간 유효합니다.</div>
          <div>3. 본 견적서에 포함되지 아니한 부품을 추가 시에는 소비자의 동의를 받아야 하며, 정비의뢰자는 동의한 부품 및 작업부분만 금액을 지급합니다.</div>
          <div>4. 공급자의 직인이 없는 것은 무효로 합니다.</div>
          <div>5. 부품가는 견적일자 기준입니다.</div>
          <div>6. 본 견적서는 2부를 작성, 정비의뢰자에게 1부를 교부하고, 정비업자는 1부를 1년간 문서 또는 전산자료로 보관하여야 합니다.</div>
          <div>
            7. 부품내역란의 코드란은 다음 각 목에 따라 기재하여야 합니다.<br />
            <span style={{ marginLeft: "8px" }}>가. 자동차 제작사 및 부품업체가 공급하는 신품(자동차 제작사의 경우에는 사후관리용 보증부품을 포함합니다): A</span><br />
            <span style={{ marginLeft: "8px" }}>나. 재제조품: B&nbsp;&nbsp;&nbsp;다. 중고품(재생품을 포함합니다): C&nbsp;&nbsp;&nbsp;라. 인증대체부품: D&nbsp;&nbsp;&nbsp;마. 수입부품: F</span>
          </div>
        </div>

      </div>

      {/* 페이지 번호 + 인쇄일시 — 푸터 박스 밖 */}
      <div style={{ display: "flex", alignItems: "center", fontSize: "8pt", marginTop: "2mm", color: "#555" }}>
        <span>인쇄일시 : {printDateStr}</span>
        <span style={{ flex: 1, textAlign: "center" }}>- {pageIndex + 1} / {totalPages} -</span>
        <span style={{ visibility: "hidden" }}>인쇄일시 : {printDateStr}</span>
      </div>
    </>
  );
  };

  // ── 페이지 공통 헤더 (매 페이지 동일) ──────────────────────
  const renderPageHeader = () => (
    <>
      <div style={{ fontSize: "8pt", marginBottom: "1.5mm" }}>【별지 제89호의3서식】</div>
      <div style={{ textAlign: "center", position: "relative", marginBottom: "3mm" }}>
        <span style={{ fontSize: "15pt", fontWeight: "bold", letterSpacing: "2px" }}>
          자동차 점검.정비 견적서
        </span>
        {claimName && (
          <span style={{ fontSize: "10pt", fontWeight: "bold", marginLeft: "10px" }}>
            {claimName}
          </span>
        )}
        <div style={{ textAlign: "right", fontSize: "8pt", marginTop: "1px" }}>일련번호 :</div>
      </div>
      <table>
        <colgroup>
          <col style={{ width: "44px" }} />
          <col style={{ width: "72px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "48px" }} />
          <col />
          <col style={{ width: "54px" }} />
          <col style={{ width: "70px" }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ ...THLC, whiteSpace: "nowrap", verticalAlign: "top", paddingTop: "4px", lineHeight: "2" }}>
              <div>차 량</div><div>소유자</div>
            </td>
            <td style={THL}>등록번호</td>
            <td style={TD}>{master?.carno ?? ""}</td>
            <td style={THL}>차명(차종)</td>
            <td style={TD}>{master?.carname ?? ""}</td>
            <td style={THL}>주행거리</td>
            <td style={{ ...TDR, whiteSpace: "nowrap" }}>
              {master?.lastkm ? formatNumber(Number(master.lastkm)) : ""} Km
            </td>
          </tr>
          <tr>
            <td style={THL}>등록년월일</td>
            <td style={TD}>{master?.car_registday ?? ""}</td>
            <td style={THL}>차대 번호</td>
            <td style={TD} colSpan={3}>{master?.vinno ?? ""}</td>
          </tr>
          <tr>
            <td rowSpan={4} style={{ ...THLC, whiteSpace: "nowrap", verticalAlign: "middle", lineHeight: "2" }}>
              <div>정 비</div><div>사업자</div>
            </td>
            <td style={THL}>사업자등록번호</td>
            <td style={{ ...TD, whiteSpace: "nowrap" }}>{ci.idNo}</td>
            <td style={THL}>정비업 등록번호</td>
            <td style={{ ...TD, whiteSpace: "nowrap" }} colSpan={3}>{ci.sanghoid}</td>
          </tr>
          <tr>
            <td style={THL}>업체명/대표자</td>
            <td colSpan={5} style={{ ...TD, position: "relative", height: "28px" }}>
              <span style={{ position: "relative", zIndex: 1 }}>{ci.comName}</span>
              {companySeal && (
                <img src={companySeal} alt="직인" style={{
                  position: "absolute", right: "4px", top: "50%",
                  transform: "translateY(-50%)",
                  maxHeight: "44px", maxWidth: "60px",
                  opacity: 0.85, mixBlendMode: "multiply", zIndex: 1,
                }} />
              )}
              <span style={{
                position: "absolute", right: "72px", top: "50%",
                transform: "translateY(-50%)", zIndex: 1,
                fontSize: "8.5pt", whiteSpace: "nowrap",
              }}>{ci.boss}</span>
            </td>
          </tr>
          <tr>
            <td style={THL}>주&nbsp;&nbsp;&nbsp;소</td>
            <td style={TD} colSpan={3}>{addr}</td>
            <td style={THL}>전화번호</td>
            <td style={{ ...TD, whiteSpace: "nowrap" }}>{tel}</td>
          </tr>
          <tr>
            <td style={THL}>견 적 구 분</td>
            <td style={TD} colSpan={5}>
              <span style={{ marginRight: "8px" }}>
                <span style={{ border: "1px solid #000", display: "inline-block", width: "11px", height: "11px", textAlign: "center", lineHeight: "11px", fontSize: "9pt", marginRight: "2px", verticalAlign: "middle" }}>
                  {isInsurance ? "✓" : ""}
                </span>보험
              </span>
              <span>
                <span style={{ border: "1px solid #000", display: "inline-block", width: "11px", height: "11px", textAlign: "center", lineHeight: "11px", fontSize: "9pt", marginRight: "2px", verticalAlign: "middle" }}>
                  {!isInsurance ? "✓" : ""}
                </span>일반
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: "8.5pt", margin: "0.5mm 0 0.5mm 0" }}>아래와 같이 견적합니다.</div>
    </>
  );

  // ── 페이지 목록 생성 ─────────────────────────────────────────
  const pageList = pageChunks.map((chunkRows, pageIndex) => (
    <div key={pageIndex} style={PAGE_STYLE}>
      <style>{`
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
        img { display: block; }
      `}</style>

      {/* 매 페이지 동일한 헤더 */}
      {renderPageHeader()}

      {/* 견적 내역 — 페이지별 16행 */}
      {renderDetailTable(chunkRows)}

      {/* 매 페이지 동일한 합계 + 푸터 */}
      {renderSummaryAndFooter(pageIndex, pageChunks.length)}
    </div>
  ));

  return (
    <>
      <PrintPreviewLayout onAfterPrint={handleAfterPrint}>
        {pageList}
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
            <div style={{ fontSize: "15pt", marginBottom: "8px" }}>🖨</div>
            <div style={{ fontSize: "13pt", fontWeight: "bold", marginBottom: "6px" }}>
              인쇄가 정상 출력되었습니까?
            </div>
            <div style={{ fontSize: "9.5pt", color: "#64748b", marginBottom: "24px" }}>
              확인 시 견적서가 수정 불가로 변경됩니다.
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
          </div>
        </div>
      )}
    </>
  );
}
