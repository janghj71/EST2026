import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import IconBtn from "../components/IconBtn";
import FixedHeadTable from "../components/FixedHeadTable";
import TableLoadingOverlay from "../components/TableLoadingOverlay"; 
import { moveFocusOnEnter } from "../utils/focusUtils";
import { useAlert } from "../alerts";
import { useTbCode } from "../hooks/useTbCode";
import { useWorkStatus } from "../hooks/useWorkStatus";

export default function WorkStatusPage() {
  const { warning, remove: removeAlert, info } = useAlert();
  const { codes, loading, error: tbError, reload } = useTbCode("UKND02");
  const { create, creating, remove, deleting } = useWorkStatus(reload);

  // 조회 에러 → 메시지 표시
  useEffect(() => {
    if (tbError) warning(tbError || "조회에 실패했습니다.");
  }, [tbError]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(
    () => codes.map((c) => ({
      subcode:  c.value,
      codename: c.label,
      state_nm: c.state_nm ?? "사용",
    })),
    [codes]
  );
  // 필터
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  // 입력(작업상태명만)
  const [name, setName] = useState("");

  // 목록 필터(삭제 포함 여부)
  const viewRows = useMemo(() => {
    return rows
      .filter((r) => (includeDeleted ? true : r.state_nm !== "삭제"))
      .sort((a, b) => a.subcode.localeCompare(b.subcode));
  }, [rows, includeDeleted]);

  // selectedCode가 비어있으면 첫 번째 행을 기본값으로 사용
  const effectiveCode = selectedCode || viewRows[0]?.subcode || "";

  const onCreate =  async () => {
    const v = name.trim();
    if (!v) {
      await warning("작업상태명을 입력하세요.");
      return;
    }

    try {
      await create(v);
      setName("");
      await info("등록 완료");
    } catch (err) {
      await warning(err?.message || "등록에 실패했습니다.");
    }

  };

  const onSoftDeleteRow = useCallback(async (row) => {
    if (!row) return;

    if (row.state_nm === "삭제") {
      await info("이미 삭제 상태입니다.");
      return;
    }

    const ok = await removeAlert(
      `[${row.subcode}] ${row.codename} 을(를) 삭제할까요?`,
      "삭제 확인",
      { confirmText: "삭제", cancelText: "취소" }
    );
    if (!ok) return;

    try {
      await remove(row.subcode);
      await info("삭제 완료");
    } catch (err) {
      await warning(err?.message || "삭제에 실패했습니다.");
    }
  }, [removeAlert, info, warning, remove]);

  // FixedHeadTable 컬럼 정의
  const columns = useMemo(
    () => [
      {
        key: "subcode",
        title: "코드",
        width: "20%",
        align: "center",
        className: "font-mono",
        // render: (val, row) => row._temp ? <span className="text-gray-400">(자동)</span> : val,
      },
      {
        key: "codename",
        title: "작업상태명",
        width: "60%",
        align: "left",
        render: (val) => <span className="font-medium text-gray-900">{val}</span>,
      },
      {
        key: "state_nm",
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

            </div>
          </div>

          <div className="relative p-0 min-h-0">
            <TableLoadingOverlay loading={loading} />
            <FixedHeadTable
              columns={columns}
              rows={viewRows}
              rowKey={(r) => r.subcode}
              selectedKey={effectiveCode}
              onRowClick={(row) => setSelectedCode(row.subcode)}
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
                  disabled={!!tbError}
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
