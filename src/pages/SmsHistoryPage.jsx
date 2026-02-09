// src/pages/SmsHistoryPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FixedHeadTable from "../components/FixedHeadTable";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function yyyymmOf(year, month) {
  return `${year}${pad2(month)}`;
}

function makeRng(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  return function rand() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 0xffffffff;
  };
}

function makeDemoRows(yyyymm) {
  const rand = makeRng(yyyymm);
  const year = Number(yyyymm.slice(0, 4));
  const month = Number(yyyymm.slice(4, 6));

  const kinds = ["sms", "mms"];
  const results = ["성공", "실패", "대기", "재시도"];
  const templates = [
    (url) =>
      `[자동차점검정비견적서 발송안내]
인트라반공업사로부터 [전국4가4444] 자동차점검정비견적서가 발송되었습니다.
▶ 자동차점검정비견적서 URL
${url}

▶ 전체 청구이력확인 URL
http://estservice.intravan.co.kr 에서 청구서와 청구사진을 확인하세요.`,
    (url) =>
      `안녕하세요. 예약 안내드립니다.
원하시는 일자와 시간을 선택해 주세요.
[예약 링크] ${url}
감사합니다.`,
    (url) =>
      `정비 완료 안내드립니다.
차량 점검이 완료되었습니다.
자세한 내역 확인: ${url}`,
    (url) =>
      `보험청구 안내드립니다.
필요 서류 및 진행상태 확인: ${url}
문의사항은 업체로 연락주세요.`,
  ];

  const phone = () => {
    const mid = Math.floor(rand() * 9000 + 1000);
    const end = Math.floor(rand() * 9000 + 1000);
    return `010${mid}${end}`;
  };

  const url = (i) => {
    const dd = pad2(Math.floor(rand() * 28 + 1));
    const hh = pad2(Math.floor(rand() * 24));
    const mm = pad2(Math.floor(rand() * 60));
    return `http://ESTService.goldauto.co.kr/HTML/KAIMA/${yyyymm}/${dd}${hh}${mm}/EST_${String(i).padStart(
      6,
      "0"
    )}.pdf`;
  };

  const rows = [];
  const total = 35;
  for (let i = 0; i < total; i++) {
    const day = pad2(Math.floor(rand() * 28 + 1));
    const hour = pad2(Math.floor(rand() * 24));
    const min = pad2(Math.floor(rand() * 60));

    const t = templates[Math.floor(rand() * templates.length)];
    const msg = t(url(i + 1));

    rows.push({
      senddatetime: `${year}-${pad2(month)}-${day} ${hour}:${min}`,
      callphone: phone(),
      msg,
      result_nm: results[Math.floor(rand() * results.length)],
      kind: kinds[Math.floor(rand() * kinds.length)],
    });
  }

  rows.sort((a, b) => (a.senddatetime < b.senddatetime ? 1 : -1));
  return rows;
}

function rowKey(r) {
  return `${r.senddatetime || ""}|${r.callphone || ""}|${(r.msg || "").slice(0, 20)}`;
}

export default function SmsHistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yyyymm = useMemo(() => yyyymmOf(year, month), [year, month]);

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("idle");
  const [selectedKey, setSelectedKey] = useState(null);

  const refetch = useCallback(() => {
    setStatus("loading");
    const list = makeDemoRows(yyyymm);
    setRows(list);
    setStatus("success");
  }, [yyyymm]);

  // ✅ rows 로딩 후 최초 선택
  useEffect(() => {
    if (!selectedKey && rows.length > 0) setSelectedKey(rowKey(rows[0]));
    if (rows.length === 0) setSelectedKey(null);
  }, [rows, selectedKey]);

  const selectedRow = useMemo(() => {
    if (!selectedKey) return null;
    return rows.find((r) => rowKey(r) === selectedKey) || null;
  }, [rows, selectedKey]);

  const moveMonth = useCallback(
    (delta) => {
      const d = new Date(year, month - 1 + delta, 1);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    },
    [year, month]
  );

  // ✅ 케미칼 FixedHeadTable 컬럼 스펙에 맞춤: title/width/className/render(_val,row)
  const columns = useMemo(
    () => [
      {
        key: "senddatetime",
        title: "발송일시",
        width: "18%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.senddatetime}>
            {row.senddatetime || ""}
          </div>
        ),
      },
      {
        key: "callphone",
        title: "수신번호",
        width: "14%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title={row.callphone}>
            {row.callphone || ""}
          </div>
        ),
      },
      {
        key: "msg",
        title: "메세지",
        width: "52%",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center truncate" title="">
            {(row.msg || "").replace(/\s+/g, " ").trim()}
          </div>
        ),
      },
      {
        key: "result_nm",
        title: "상태",
        width: "8%",
        align: "center",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-center truncate">{row.result_nm || ""}</div>
        ),
      },
      {
        key: "kind",
        title: "구분",
        width: "8%",
        align: "center",
        className: "px-2 py-0",
        render: (_val, row) => (
          <div className="h-8 flex items-center justify-center truncate">{row.kind || ""}</div>
        ),
      },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur">
        <div className="border-b border-zinc-400">
          <div className="app-container py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900">문자발송 조회</div>
                <div className="text-xs text-zinc-500">발송년월 기준으로 문자 발송 이력을 조회합니다.</div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                문자발송
              </button>
            </div>
          </div>
        </div>

        {/* 조회 라인 */}
        <div className="app-container py-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-zinc-700">발송년월</div>

            <button
              type="button"
              className="h-9 w-9 rounded-md bg-white border border-gray-200 hover:bg-gray-50 inline-flex items-center justify-center"
              onClick={() => moveMonth(-1)}
              title="이전"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select className={"select-base h-9 "} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 8 }).map((_, i) => {
                const y = now.getFullYear() - 5 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>

            <select className={"select-base h-9"} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => {
                const m = i + 1;
                return (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              className="h-9 w-9 rounded-md bg-white border border-gray-200 hover:bg-gray-50 inline-flex items-center justify-center"
              onClick={() => moveMonth(+1)}
              title="다음"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={refetch}
              className="h-9 px-4 rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm font-semibold flex items-center gap-2"
              title="조회"
            >
              <Search className="w-4 h-4" />
              조회
            </button>

            <div className="ml-auto text-xs text-zinc-500">
              {status === "loading" ? "조회중..." : ""}
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 + 하단 메시지 */}
      <div className="app-container min-h-0 flex-1 py-4 flex flex-col gap-3">
        <div className="min-h-0 flex-1 rounded-md border border-gray-200 bg-white overflow-hidden">
          <FixedHeadTable
            columns={columns}
            rows={rows}
            rowSize="sm"
            rowKey={(row) => rowKey(row)}   // ✅ 케미칼처럼 rowKey 사용
            selectedKey={selectedKey}
            onRowClick={(row) => setSelectedKey(rowKey(row))}
            emptyText={status === "loading" ? "조회중..." : "문자 발송 이력이 없습니다."}
          />
        </div>

        <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
          <div className="border-b bg-zinc-50 px-3 py-2 flex items-center gap-2">
            <div className="text-sm font-semibold text-zinc-900">메세지 내용</div>
            <div className="ml-auto text-xs text-zinc-500">
              {selectedRow ? `${selectedRow.senddatetime || ""} / ${selectedRow.callphone || ""}` : ""}
            </div>
          </div>

          <div className="h-40 overflow-auto px-3 py-3 text-sm text-zinc-800 whitespace-pre-wrap">
            {selectedRow?.msg || "선택된 항목이 없습니다."}
          </div>
        </div>
      </div>
    </div>
  );
}
