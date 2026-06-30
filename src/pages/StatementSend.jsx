// src/pages/StatementSend.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Bell, Mail, Search, ChevronLeft, ChevronRight } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable";
import { useAlert } from "../alerts";
import { useLoading } from "../loading/useLoading";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useAlimtalkTemplate } from "../hooks/useAlimtalkTemplate";
import { useSms } from "../hooks/useSms";
import { useSmsSender } from "../hooks/useSmsSender";
import { useMailSend } from "../hooks/useMailSend";
import { getComcode } from "../api/config";
import { useStatementList } from "../hooks/useStatementList";
import { monthRange, addMonths } from "../utils/dateUtils";
import { formatMoney } from "../utils/numberFormat";
import { pad2 } from "../utils/dateUtils";


export default function StatementSend() {
  const { warning, success } = useAlert();
  const { withLoading } = useLoading();
  const { form: companyForm, loading: companyLoading } = useCompanyInfo();
  const { fetchTemplate } = useAlimtalkTemplate();
  const { sendSms, sendAlimtalk, sendingSms } = useSms();
  const { senders } = useSmsSender();
  const { sendEstimateMail } = useMailSend();
  const { loading: fetching, fetchStatementList } = useStatementList();

  const today = useMemo(() => new Date(), []);
  const initRange = useMemo(() => monthRange(today), [today]);
  const [outFrom, setOutFrom] = useState(() => initRange.from);
  const [outTo, setOutTo] = useState(() => initRange.to);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const moveMonth = (delta) => {
    const d = addMonths(monthAnchor, delta);
    const r = monthRange(d);
    setMonthAnchor(d);
    setOutFrom(r.from);
    setOutTo(r.to);
  };

  const setCurrentMonth = () => {
    const d = new Date();
    const r = monthRange(d);
    setMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    setOutFrom(r.from);
    setOutTo(r.to);
  };

  const [rows, setRows] = useState([]);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [focusedId, setFocusedId] = useState(null);

  // 발신번호
  const [sendNo, setSendNo] = useState("");
  useEffect(() => {
    const first = senders?.[0]?.callback || "";
    if (first) setSendNo(first);
  }, [senders]);


  // ── 템플릿 미리보기 ──
  const [templateText, setTemplateText] = useState("");
  const companyLoadingRef = useRef(companyLoading);
  useEffect(() => { companyLoadingRef.current = companyLoading; }, [companyLoading]);

  const focusedRow = useMemo(
    () => (focusedId ? rows.find((r) => r.est_serial === focusedId) ?? null : rows[0] ?? null),
    [focusedId, rows]
  );

  const loadTemplate = useCallback(async (row) => {
    if (companyLoadingRef.current) return;
    if (!companyForm.comName) return;
    try {
      const result = await fetchTemplate({
        isest: "0",
        smskind: "02",
        carno: row?.carno || "",
        inday: row?.inday || "",
        custom_name: row?.custom_name || "",
        comname: companyForm.comName,
        tel0: companyForm.tel0,
        tel1: companyForm.tel1,
        tel2: companyForm.tel2,
        address1: companyForm.addr1,
        address2: companyForm.addr2,
        saletotal: row?.saletotal,
        outday: row?.outday || "",
      });
      setTemplateText(result?.text || "");
    } catch {
      setTemplateText("");
    }
  }, [companyForm, fetchTemplate]);

  // 회사 정보 로딩 완료 or 포커스 행 변경 시 템플릿 재로드
  useEffect(() => {
    if (!companyLoading) loadTemplate(focusedRow);
  }, [companyLoading, focusedRow, loadTemplate]);

  // ── 조회 ──
  const onQuery = async () => {
    try {
      const dataset = await fetchStatementList({ day1: outFrom, day2: outTo });
      setRows(dataset);
      setCheckedIds(new Set());
      setFocusedId(null);
    } catch (e) {
      if (e?.message === "aborted") return;
      warning(e?.message || "조회 중 오류가 발생했습니다.");
    }
  };

  // ── 체크박스 ──
  const filteredIds = useMemo(() => rows.map((r) => r.est_serial), [rows]);
  const allChecked = useMemo(
    () => filteredIds.length > 0 && filteredIds.every((id) => checkedIds.has(id)),
    [filteredIds, checkedIds]
  );
  const toggleChecked = (id) =>
    setCheckedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setCheckedIds((prev) => {
      const n = new Set(prev);
      if (allChecked) filteredIds.forEach((id) => n.delete(id));
      else filteredIds.forEach((id) => n.add(id));
      return n;
    });

  // ── 체크된 행 목록 ──
  const checkedRows = useMemo(() => rows.filter((r) => checkedIds.has(r.est_serial)), [rows, checkedIds]);

  // ── 문자발송 ──
  const onSendSms = async () => {
    if (checkedRows.length === 0) { warning("발송할 대상을 선택하세요."); return; }
    if (!sendNo) { warning("발신번호를 선택하세요."); return; }
    await withLoading(async () => {
      const comcode = getComcode();
      let ok = 0, fail = 0;
      for (const row of checkedRows) {
        const hp = [row.hp0, row.hp1, row.hp2].filter(Boolean).join("");
        if (!hp) { fail++; continue; }
        try {
          const templateResult = await fetchTemplate({
            isest: "0", smskind: "02",
            carno: row.carno || "", inday: row.inday || "", custom_name: row.custom_name || "",
            comname: companyForm.comName, tel0: companyForm.tel0, tel1: companyForm.tel1, tel2: companyForm.tel2,
            address1: companyForm.addr1, address2: companyForm.addr2, saletotal: row.saletotal, outday: row.outday || "",
          });
          if (!templateResult) { fail++; continue; }
          await sendSms({ comcode, est_serial: row.est_serial, hp, callback: sendNo, smskind: "02", smstxt: templateResult.text || "" });
          ok++;
        } catch { fail++; }
      }
      if (fail === 0) success(`${ok}건 문자발송 완료`);
      else warning(`${ok}건 성공 / ${fail}건 실패`);
    }, "문자 발송 중...");
  };

  // ── 알림톡 발송 ──
  const onSendAlimtalk = async () => {
    if (checkedRows.length === 0) { warning("발송할 대상을 선택하세요."); return; }
    if (!sendNo) { warning("발신번호를 선택하세요."); return; }
    await withLoading(async () => {
      const comcode = getComcode();
      let ok = 0, fail = 0;
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${pad2(now.getMonth() + 1)}`;
      for (const row of checkedRows) {
        const hp = [row.hp0, row.hp1, row.hp2].filter(Boolean).join("");
        if (!hp) { fail++; continue; }
        try {
          const templateResult = await fetchTemplate({
            isest: "0", smskind: "02",
            carno: row.carno || "", inday: row.inday || "", custom_name: row.custom_name || "",
            comname: companyForm.comName, tel0: companyForm.tel0, tel1: companyForm.tel1, tel2: companyForm.tel2,
            address1: companyForm.addr1, address2: companyForm.addr2, saletotal: row.saletotal, outday: row.outday || "",
          });
          if (!templateResult) { fail++; continue; }
          const { text, template, altkindcode } = templateResult;
          const effectiveSmskind = altkindcode || "02";
          const sNew = `a|comcode=${comcode}|sale_serial=${row.est_serial}|smskind=${effectiveSmskind}|yyyymm=${yyyymm}|prgcode=208`;
          const btn_01_url_01 = template?.link1_mob ? template.link1_mob.replace(/#\{인쇄물정보\}/g, sNew) : "";
          const btn_01_url_02 = template?.link1_pc  ? template.link1_pc.replace(/#\{인쇄물정보\}/g, sNew)  : "";
          const params = {
            comcode, est_serial: row.est_serial, hp: hp.replace(/-/g, ""), callback: sendNo,
            smskind: effectiveSmskind, smstxt: text || "", biztype: "at",
            yellowid_key: companyForm.yellowidKeyJmt || "", templatecode: template?.templatecode || "", resend: "Y",
          };
          if (template?.link1_name) {
            params.btn_type_01 = template?.link1_type || "";
            params.btn_nm_01 = template?.link1_name || "";
            params.btn_01_url_01 = btn_01_url_01;
            params.btn_01_url_02 = btn_01_url_02;
          }
          await sendAlimtalk(params);
          ok++;
        } catch { fail++; }
      }
      if (fail === 0) success(`${ok}건 알림톡 발송 완료`);
      else warning(`${ok}건 성공 / ${fail}건 실패`);
    }, "알림톡 발송 중...");
  };

  // ── 이메일 발송 ──
  const onSendEmail = async () => {
    if (checkedRows.length === 0) { warning("발송할 대상을 선택하세요."); return; }
    await withLoading(async () => {
      const comcode = getComcode();
      let ok = 0, fail = 0;
      for (const row of checkedRows) {
        const mailAddr = row.email_acc
          ? row.email_smtp ? `${row.email_acc}@${row.email_smtp}` : row.email_acc
          : "";
        if (!mailAddr) { fail++; continue; }
        try {
          const res = await sendEstimateMail({
            comcode, est_serial: row.est_serial, mailkind: "02C",
            mail_addr: mailAddr,
            mail_subject: row.carno ? `차량번호 ${row.carno} 점검정비명세서입니다` : "점검정비명세서입니다",
            mail_text: "",
          });
          if (String(res?.result) === "false") { fail++; continue; }
          ok++;
        } catch { fail++; }
      }
      if (fail === 0) success(`${ok}건 이메일 발송 완료`);
      else warning(`${ok}건 성공 / ${fail}건 실패 (이메일 미등록 포함)`);
    }, "이메일 발송 중...");
  };

  // ── 테이블 컬럼 ──
  const columns = useMemo(() => [
    {
      key: "__sel",
      title: (
        <div className="flex items-center justify-center">
          <input type="checkbox" className="h-4 w-4 accent-zinc-900" checked={allChecked} onChange={toggleAll} onClick={(e) => e.stopPropagation()} />
        </div>
      ),
      width: "4%",
      align: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            className="h-4 w-4 accent-zinc-900"
            checked={checkedIds.has(row.est_serial)}
            onChange={() => toggleChecked(row.est_serial)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
    },
    { key: "seccodename", title: "구분", width: "6%", align: "left", render: (v) => v || "" },
    { key: "carno", title: "차량번호", width: "10%", align: "left" },
    { key: "carname", title: "차량명", width: "13%", align: "left" },
    { key: "custom_name", title: "고객명", width: "9%", align: "left" },
    {
      key: "hp0",
      title: "연락처",
      width: "13%",
      align: "left",
      render: (_, row) => [row.hp0, row.hp1, row.hp2].filter(Boolean).join("-"),
    },
    {
      key: "email_acc",
      title: "이메일",
      width: "21%",
      align: "left",
      render: (v, row) => {
        if (!v) return "";
        return row.email_smtp ? `${v}@${row.email_smtp}` : v;
      },
    },
    {
      key: "saletotal",
      title: "견적금액",
      width: "8%",
      align: "right",
      render: (v) => formatMoney(v),
    },
    { key: "outday", title: "출고일자", width: "9%", align: "left", render: (v) => v || "" },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [checkedIds, allChecked]);

  return (
    <div className="bg-zinc-50 flex flex-col min-h-0 h-full overflow-hidden">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="app-container py-3">
          <div className="text-lg font-semibold text-zinc-900">명세서 문자 발송</div>
          <div className="text-xs text-zinc-500">출고일자 기준으로 발송 대상을 조회합니다</div>
        </div>
      </div>

      <div className="app-container py-4 flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
        {/* 검색 + 발송 버튼 */}
        <div className="flex items-center gap-3 bg-white rounded-md border border-zinc-200 px-4 py-3 flex-wrap">
          {/* 좌: 검색 조건 */}
          <span className="text-sm font-semibold text-zinc-700 shrink-0">출고일자</span>
          <input
            type="date"
            value={outFrom}
            onChange={(e) => setOutFrom(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
          />
          <span className="text-zinc-400 text-sm">~</span>
          <input
            type="date"
            value={outTo}
            onChange={(e) => setOutTo(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
          />
          <button type="button" onClick={() => moveMonth(-1)}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            전월
          </button>
          <button type="button" onClick={setCurrentMonth}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            금월
          </button>
          <button type="button" onClick={() => moveMonth(-1)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => moveMonth(+1)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onQuery}
            disabled={fetching}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            조회
          </button>

          {/* 구분선 */}
          <div className="h-6 w-px bg-zinc-200 mx-1 shrink-0" />

          {/* 우: 발송 버튼 */}
          <span className="text-sm font-semibold text-zinc-700 shrink-0">발신번호</span>
          <select
            value={sendNo}
            onChange={(e) => setSendNo(e.target.value)}
            className="select-base h-9 text-sm"
          >
            {(senders ?? []).map((s) => (
              <option key={s.orderno || s.callback} value={s.callback || ""}>
                {s.callback || ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onSendSms}
            disabled={sendingSms}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" />
            문자발송
          </button>
          <button
            type="button"
            onClick={onSendAlimtalk}
            className="inline-flex items-center gap-1.5 rounded-md bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-yellow-300"
          >
            <Bell className="h-4 w-4" />
            알림톡 발송
          </button>
          <button
            type="button"
            onClick={onSendEmail}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <Mail className="h-4 w-4" />
            이메일 발송
          </button>

        </div>

        {/* 본문: 좌측 템플릿 + 우측 목록 */}
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
          {/* 좌측 — 템플릿 미리보기 */}
          <div className="w-[300px] shrink-0 flex flex-col rounded-md border border-zinc-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50 shrink-0">
              <div className="text-sm font-semibold text-zinc-800">명세서 템플릿</div>
              {/* <div className="text-xs text-zinc-400 mt-0.5">
                {focusedRow ? `${focusedRow.carno || "-"} 기준 미리보기` : "행을 선택하면 미리보기가 갱신됩니다"}
              </div> */}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {templateText ? (
                <pre className="text-xs text-zinc-700 whitespace-pre-wrap leading-5 font-sans">
                  {templateText}
                </pre>
              ) : (
                <div className="text-xs text-zinc-400 text-center mt-8">
                  템플릿을 불러오는 중이거나<br />등록된 명세서 템플릿이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 우측 — 대상 목록 */}
          <div className="flex-1 min-w-0 flex flex-col rounded-md border border-zinc-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50 shrink-0 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-800">
                대상 목록
                {rows.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-zinc-400">{rows.length}건</span>
                )}
              </div>
              {checkedIds.size > 0 && (
                <span className="text-sm text-zinc-500">
                  <span className="font-semibold text-zinc-800">{checkedIds.size}건</span> 선택됨
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <FixedHeadTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.est_serial}
                height="100%"
                emptyText={fetching ? "조회 중..." : "조회 결과가 없습니다. 출고일자를 선택 후 조회하세요."}
                onRowClick={(row) => setFocusedId(row.est_serial)}
                getRowClassName={(row) =>
                  row.est_serial === (focusedId ?? rows[0]?.est_serial) ? "!bg-blue-50" : ""
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
