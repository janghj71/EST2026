import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import IconBtn from "../components/IconBtn"; 
import FixedHeadTable from "../components/FixedHeadTable"; 
import { moveFocusOnEnter } from "../utils/focusUtils";
import { useAlert } from "../alerts";

// 화면 전용(더미) 데이터
const seed = [
  { code: "01", name: "작업준비중", status: "사용" },
  { code: "02", name: "도장대기", status: "사용" },
  { code: "03", name: "판금부", status: "사용" },
  { code: "04", name: "11111", status: "사용" },
  { code: "05", name: "선견적", status: "사용" },
  { code: "06", name: "선견적2", status: "중지" },
  { code: "99", name: "삭제예시", status: "삭제" },
];

export default function WorkStatusPage() {
  const { confirm, warning, remove, info } = useAlert();
  const [rows, setRows] = useState(seed);

  // 필터
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // 선택
  const [selectedCode, setSelectedCode] = useState("01");

  // 입력(작업상태명만)
  const [name, setName] = useState("");

  const selectedRow = useMemo(
    () => rows.find((r) => r.code === selectedCode) || null,
    [rows, selectedCode]
  );

  // 목록 필터(삭제 포함 여부)
  const viewRows = useMemo(() => {
    return rows
      .filter((r) => (includeDeleted ? true : r.status !== "삭제"))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [rows, includeDeleted]);

  const onCreate =  async () => {
    const v = name.trim();
    if (!v) {
      await warning("작업상태명을 입력하세요.");
      return;
    }

    // 실제론 서버가 code를 자동 부여
    // 화면만: 임시 code 부여
    const tempCode = makeTempCode(rows);

    setRows((prev) => [...prev, { code: tempCode, name: v, status: "사용", _temp: true }]);
    setSelectedCode(tempCode);
    setName("");
    await info("등록 완료");

  };

  const onSoftDeleteRow = useCallback(async (row) => {
    if (!row) return;

    if (row.status === "삭제") {
      await info("이미 삭제 상태입니다.");
      return;
    }

    // const ok = confirm(`[${row.code}] ${row.name} 을(를) 삭제 상태로 변경할까요?`);
    const ok = await remove(
            `[${row.code}] ${row.name} 을(를) 삭제 상태로 변경할까요?`,
            "삭제 확인",
            { confirmText: "삭제", cancelText: "취소" }
    );
    if (!ok) return;

    // 소프트 삭제: 상태만 '삭제'로 변경
    setRows((prev) =>
      prev.map((r) => (r.code === row.code ? { ...r, status: "삭제" } : r))
    );

    // 삭제 포함이 꺼져 있으면 화면에서 사라지므로 다음 선택
    if (!includeDeleted) {
      const nextList = viewRows.filter((r) => r.code !== row.code);
      setSelectedCode(nextList[0]?.code || "");
    }
  }, [remove, info, includeDeleted, viewRows]);

  // FixedHeadTable 컬럼 정의
  const columns = useMemo(
    () => [
      {
        key: "code",
        title: "코드",
        width: "20%",
        align: "center",
        className: "font-mono",
        render: (val, row) =>
          row._temp ? <span className="text-gray-400">(자동)</span> : val,
      },
      {
        key: "name",
        title: "작업상태명",
        width: "60%",
        align: "left",
        render: (val) => <span className="font-medium text-gray-900">{val}</span>,
      },
      {
        key: "status",
        title: "상태",
        width: "20%",
        align: "center",
        render: (val) => <span className={badge(val)}>{val}</span>,
      },
      {
        key: "__del",
        title: "",
        width: "15%",
        align: "center",
        render: (_v, row) => (
          <IconBtn
            icon={Trash2}
            variant="ghost"
            className="h-9 w-10 justify-center p-0"
            onClick={(e) => {
              e?.stopPropagation?.();
              onSoftDeleteRow(row);
            }}
          />
        ),
      },
    ],
   [onSoftDeleteRow]
  );


  return (
    <div 
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === "Enter") moveFocusOnEnter(e);
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">작업상태 등록</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: list */}
        <section className="xl:col-span-7 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                삭제건 포함조회
              </label>

              <div className="text-xs text-gray-500">{viewRows.length}건</div>

              {/* <div className="ml-auto">
                <IconBtn
                  icon={Trash2}
                  label="삭제"
                  variant="danger"
                  className="h-10 w-28 justify-center whitespace-nowrap"
                  onClick={onSoftDelete}
                  disabled={!selectedRow}
                />
              </div> */}
            </div>
          </div>

          {/* ✅ 목록: FixedHeadTable */}
          <div className="p-0 min-h-0">
            <FixedHeadTable
              columns={columns}
              rows={viewRows}
              rowKey={(r) => r.code}
              selectedKey={selectedCode}
              onRowClick={(row) => setSelectedCode(row.code)}
              height={520} // 필요 시 조절
              className="min-h-0"
              emptyText="조회 결과가 없습니다."
              rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-50"
              gutterHoverClass="!bg-gray-50"
            />
          </div>
        </section>

        {/* Right: create */}
        <section className="xl:col-span-5 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-base font-semibold text-gray-900">작업상태 등록</div>
              <div className="ml-auto">
                <IconBtn
                  icon={Plus}
                  label="등록"
                  variant="primary"
                  className="h-10 w-28 justify-center whitespace-nowrap"
                  onClick={onCreate}
                />
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <Field label="작업상태명">
              <input
                className={inputBase}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 작업준비중"
              />
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-4 text-sm text-gray-600 whitespace-nowrap">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}

function makeTempCode(rows) {
  const used = new Set(rows.map((r) => r.code));
  for (let i = 1; i <= 99; i++) {
    const c = `T${String(i).padStart(2, "0")}`;
    if (!used.has(c)) return c;
  }
  return `T${Date.now()}`;
}

const inputBase =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

function badge(v) {
  if (v === "사용")
    return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700";
  if (v === "중지")
    return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700";
  if (v === "삭제")
    return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700";
  return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700";
}
