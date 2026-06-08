// src/pages/estimate/WorkOrderPopup.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, ListChecks, RotateCcw, X } from "lucide-react";
import IconBtn from "../../components/IconBtn";
import FixedHeadTable from "../../components/FixedHeadTable";
import { useDamageSheet } from "../../hooks/useDamageSheet";
import { useUrlContextSnapshot } from "../../hooks/useUrlContextSnapshot";
import { useTbCode } from "../../hooks/useTbCode";
import { useLoading } from "../../loading/useLoading";
import { useAlert } from "../../alerts";

/**
 * 작업지시서 (UI 샘플)
 * - 자동차 외판 부위를 SVG로 렌더 → 부위 클릭 시 상태 순환
 *   none → 교환(파랑) → 판금(초록) → none
 * - [예상 견적확인] → 선택 부위 목록 출력
 * - [작업반영] → (추후 견적내역 insert 연결)
 */

// 부위 정의 — car_topview.jpg(370×340) 위 연결점 좌표(%)
// cx/cy: 자동차 위 파란 연결점 위치 (이미지 비율 기준 %)
const PARTS = [
  { key: "front_bumper", label: "앞범퍼",   cx: 55.1, cy: 3.6 },
  { key: "headlamp_l",   label: "헤드램프L", cx: 10.6, cy: 13.5 },
  { key: "headlamp_r",   label: "헤드램프R", cx: 88.9, cy: 13.6 },
  { key: "hood",         label: "본네트",   cx: 56, cy: 16.3 },
  { key: "fender_fl",    label: "앞휀다L",   cx: 10.6, cy: 19.4 },
  { key: "fender_fr",    label: "앞휀다R",   cx: 88.9, cy: 19.4 },
  { key: "door_fl",      label: "앞도어L",   cx: 10.4, cy: 43.3 },
  { key: "door_fr",      label: "앞도어R",   cx: 89.0, cy: 43.3 },
  { key: "roof",         label: "루프",     cx: 54.4, cy: 52 },
  { key: "door_rl",      label: "뒤도어L",   cx: 10.5, cy: 59.4 },
  { key: "door_rr",      label: "뒤도어R",   cx: 89, cy: 59.4 },
  { key: "fender_rl",    label: "뒤휀다L",   cx: 10.6, cy: 82.3 },
  { key: "fender_rr",    label: "뒤휀다R",   cx: 90, cy: 82.3 },
  { key: "taillamp_l",   label: "테일램프L", cx: 10.6, cy: 89.3 },
  { key: "taillamp_r",   label: "테일램프R", cx: 89, cy: 89.3 },
  { key: "trunk",        label: "트렁크",   cx: 56.5, cy: 87.9},
  { key: "rear_bumper",  label: "뒤범퍼",   cx: 55.1, cy: 96.3 },
];

const NEXT   = { none: "exchange", exchange: "panel", panel: "none" };
const FILL   = { none: "#f1f5f9", exchange: "#3b82f6", panel: "#22c55e" };
const WORK_LABEL = { exchange: "교환", panel: "판금" };

// workcode → 상태 매핑 (X=교환, B=판금)
const STATE_BY_WC = { X: "exchange", B: "panel" };
// 상태 → workcode 역매핑
const WC_BY_STATE = { exchange: "X", panel: "B" };
// workcode → 한글명 (EstimateItemsTable WORK_OPTIONS 동일)
const WC_NAME = {
  R: "탈착", X: "교환", B: "판금", A: "조정", O: "오버홀",
  S: "수리", P: "도장", T: "견인", G: "구난", W: "세차",
};
// codename(공백 제거) → PARTS.key 매핑
const norm = (s) => String(s ?? "").replace(/\s/g, "");
const NAME_TO_KEY = Object.fromEntries(PARTS.map((p) => [norm(p.label), p.key]));

export default function WorkOrderPopup() {
  const ctx = useUrlContextSnapshot({
    storageKey: "workOrderCtx",
    keys: ["est_serial"],
    cleanPath: "/work-order",
  });
  const est_serial = ctx?.est_serial ?? "";
  const { fetchDamageSheet, saveDamageSheet, fetchDamagePay } = useDamageSheet();
  const [payRows, setPayRows] = useState([]);
  const { codes: wrk11Codes } = useTbCode("WRK11");
  const { withLoading } = useLoading();
  const { info, error: alertError } = useAlert();

  const [states, setStates] = useState({});   // { partKey: 'none'|'exchange'|'panel' }

  // codename(공백 제거) → damage_cd(WRK11 코드값)
  const nameToCode = useMemo(
    () => Object.fromEntries((wrk11Codes ?? []).map((c) => [norm(c.label), c.value])),
    [wrk11Codes]
  );

  // 팝업 mount 시 손상시트 자동 조회 → 마커 매핑
  useEffect(() => {
    if (!est_serial) return;
    fetchDamageSheet(est_serial).then((json) => {
      const ds = json?.dataset ?? [];
      const next = {};
      ds.forEach((d) => {
        const key = NAME_TO_KEY[norm(d.codename)];
        const st  = STATE_BY_WC[String(d.workcode ?? "")];
        if (key && st) next[key] = st;
      });
      setStates(next);
    }).catch(() => {});
  }, [est_serial, fetchDamageSheet]);

  const onPartClick = (key) =>
    setStates((prev) => ({ ...prev, [key]: NEXT[prev[key] ?? "none"] }));

  const selected = useMemo(
    () =>
      PARTS
        .map((p) => ({ ...p, state: states[p.key] ?? "none" }))
        .filter((p) => p.state !== "none"),
    [states]
  );

  // 예상 견적목록 컬럼 — est_damage_pay_s 응답 매핑
  const previewColumns = useMemo(() => [
    {
      key: "payname",
      title: "작업내용",
      width: "55%",
      align: "left",
      render: (v) => <div className="h-8 flex items-center truncate">{v ?? ""}</div>,
    },
    {
      key: "workcode",
      title: "작업",
      width: "22%",
      align: "left",
      render: (wc) => (
        <div className="h-8 flex items-center text-zinc-700">
          {WC_NAME[String(wc ?? "")] ?? (wc ?? "")}
        </div>
      ),
    },
    {
      key: "hour1",
      title: "시간",
      width: "23%",
      align: "right",
      render: (v) => <div className="h-8 flex items-center justify-end pr-1 tabular-nums">{v ?? ""}</div>,
    },
  ], []);

  // [예상 견적확인] — 색칠된 부위를 손상시트 저장 API로 전송
  const onPreview = async () => {
    const dataset = selected
      .map((p) => ({
        damage_cd: nameToCode[norm(p.label)] ?? "",
        workcode:  WC_BY_STATE[p.state],
      }))
      .filter((d) => d.damage_cd);
    if (dataset.length === 0) {
      alertError("선택된 부위가 없습니다.");
      return;
    }
    try {
      await withLoading(async () => {
        await saveDamageSheet({ est_serial, dataset });
        const json = await fetchDamagePay(est_serial);
        setPayRows(json?.dataset ?? []);
      }, "예상견적 조회 중...");
    } catch (e) {
      alertError(e?.message ?? "예상견적 조회 실패");
    }
  };
  // [작업반영] — 예상견적 목록을 부모창(견적내역)에 insert
  const onApply = () => {
    if (payRows.length === 0) {
      alertError("반영할 예상견적 목록이 없습니다.\n[예상 견적확인]을 먼저 누르세요.");
      return;
    }
    try {
      payRows.forEach((row) => {
        const payload = {
          type: "workTime",
          ...row,
          workname: row.workcodename ?? "",  // 핸들러는 workname 사용
          partsum: row.partsum ?? "0",       // 누락 대비 기본값
        };
        window.opener?.postMessage(
          { type: "LABOR_ITEMS_PICK", payload },
          window.location.origin
        );
      });
      window.close();
    } catch (e) {
      alertError(e?.message ?? "작업반영 실패");
    }
  };
  const onReset = () => setStates({});

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">작업지시서</div>
            <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
              <span>외판 부위를 클릭하여 작업을 지정하세요</span>
              <span className="text-zinc-300">|</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: FILL.exchange }} />
                교환
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: FILL.panel }} />
                판금
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
          </div>
        </div>
      </div>

      {/* 본문: 좌(다이어그램) + 우(견적목록) */}
      <div className="flex-1 min-h-0 flex">
        {/* 좌: 자동차 외판 이미지 + 연결점 마커 오버레이 */}
        <div className="flex-1 min-w-0 flex items-center justify-center bg-zinc-100 p-6 overflow-auto">
          <div className="relative w-full" style={{ maxWidth: "460px", aspectRatio: "370 / 340" }}>
            <img
              src="/car_topview.png"
              alt="자동차 외판"
              className="absolute inset-0 w-full h-full object-contain select-none"
              draggable={false}
            />
            {PARTS.map((p) => {
              const st = states[p.key] ?? "none";
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onPartClick(p.key)}
                  title={st === "none" ? p.label : `${p.label} - ${WORK_LABEL[st]}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px] transition-transform hover:scale-125 cursor-pointer"
                  style={{
                    left: `${p.cx}%`,
                    top: `${p.cy}%`,
                    width: "15px",
                    height: "15px",
                    background: st === "none" ? "#ffffff" : FILL[st],
                    border: st === "none" ? "1.5px solid #94a3b8" : "1.5px solid #ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* 우: 예상 견적목록 */}
        <div className="w-[440px] shrink-0 border-l border-zinc-200 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-800">
            예상 견적목록
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            <div className="h-full overflow-hidden border border-zinc-200 rounded-md">
              <FixedHeadTable
                columns={previewColumns}
                rows={payRows}
                rowKey={(r, i) => `${r.payno ?? ""}-${r.subpayno ?? ""}-${i}`}
                rowSize="sm"
                height={540}
                emptyText="[예상 견적확인]을 눌러 목록을 조회하세요."
              />
            </div>
          </div>
          <div className="shrink-0 px-4 py-2 border-t border-zinc-200 text-xs text-zinc-500">
            총 <span className="font-semibold text-zinc-800">{payRows.length}</span>건
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="shrink-0 border-t border-zinc-200 bg-white px-6 py-3 flex items-center justify-end gap-2">
        <IconBtn icon={RotateCcw} label="초기화" onClick={onReset} />
        <IconBtn icon={ListChecks} label="예상 견적확인" variant="orange" onClick={onPreview} />
        <IconBtn icon={ClipboardCheck} label="작업반영" variant="primary" onClick={onApply} />
      </div>
    </div>
  );
}
