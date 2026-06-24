import React, { useCallback, useMemo, useRef, useState } from "react";
import { GripVertical, X, Plus, Trash2, Save } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable";
import TableLoadingOverlay from "../components/TableLoadingOverlay";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { useSmsSender } from "../hooks/useSmsSender";
import { getComcode } from "../api/config";

/** 서버 orderno: "01","02"… / 신규: Date.now() 13자리 */
const isNewRow = (row) => Number(row.orderno) > 1000000;

export default function SmsSenderPage() {
  const { confirm, warning, info } = useAlert();
  const { senders, loading, saving, deleting, error, refetch, saveSenders, deleteSender } = useSmsSender();

  const [rows, setRows] = useState([]);
  const [sender, setSender] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // 조회 에러 → 메시지 표시
  React.useEffect(() => {
    if (error) warning(error.message || "조회에 실패했습니다.");
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  // API 데이터 → 로컬 rows 동기화
  React.useEffect(() => {
    if (senders.length > 0) {
      setRows(senders);
      setSelectedId((prev) =>
        prev && senders.some((s) => s.orderno === prev)
          ? prev
          : senders[0]?.orderno ?? null
      );
    }
  }, [senders]);


  const viewRows = useMemo(() => rows.filter((r) => !r._deleted), [rows]);

  // drag
  const dragIdRef = useRef(null);

  const reorderIds = (ids, fromIdx, toIdx) => {
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return next;
  };

  const commitReorderByIds = (orderedIds) => {
    setRows((prev) => {
      const active = prev.filter((r) => !r._deleted);
      const deleted = prev.filter((r) => r._deleted);
      const map = new Map(active.map((r) => [r.orderno, r]));
      const nextActive = orderedIds.map((id) => map.get(id)).filter(Boolean);
      return [...nextActive, ...deleted];
    });
  };

  const onAdd = async () => {
    const v = (sender || "").trim();
    if (!v) return await warning("발신번호를 입력하세요.");

    const newRow = { orderno: String(Date.now()), callback: v };
    setRows((p) => [...p, newRow]);
    setSelectedId(newRow.orderno);
    setSender("");
  };

  // --- 저장 (등록 + 자리이동) ---
  const buildDataset = useCallback(() => {
    const comcode = getComcode();
    const active = viewRows;
    const newItems = active.filter(isNewRow);
    const existingItems = active.filter((r) => !isNewRow(r));
    return [...newItems, ...existingItems].map((r) => ({
      comcode,
      callback: r.callback,
    }));
  }, [viewRows]);

  const onSave = useCallback(async () => {
    const dataset = buildDataset();
    if (dataset.length === 0) {
      return await warning("저장할 발신번호가 없습니다.");
    }
    const res = await saveSenders(dataset);
    if (String(res?.result) === 'false') { await warning(res?.msg || "저장에 실패했습니다."); return; }
    await refetch();
    await info("저장 완료");
  }, [buildDataset, saveSenders, refetch, info, warning]);

  // --- 삭제 (즉시 API 호출) ---
  const onDelete = useCallback(async (row) => {
    const ok = await confirm(`${row.callback} 발신번호를 삭제할까요?`);
    if (!ok) return;
    const res = await deleteSender(row.callback);
    if (String(res?.result) === 'false') { await warning(res?.msg || "삭제에 실패했습니다."); return; }
    await refetch();
  }, [confirm, deleteSender, refetch, warning]);

  const columns = useMemo(
    () => [
      {
        key: "__move",
        title: "이동",
        width: "10%",
        align: "center",
        render: () => <GripVertical className="inline-block text-zinc-400" size={18} />,
      },
      {
        key: "orderno",
        title: "순번",
        width: "12%",
        align: "center",
        render: (_v, _row, idx) => (
          <span className="font-mono">{String(idx + 1).padStart(2, "0")}</span>
        ),
      },
      {
        key: "callback",
        title: "발신번호",
        width: "58%",
        align: "left",
        className: "font-mono",
      },
      {
        key: "__del",
        title: "",
        width: "20%",
        align: "center",
        render: (_v, row) => (
          <IconBtn
            icon={Trash2}
            // label="삭제"
            variant="ghost"
            className="h-9 w-10 justify-center"
            onClick={(e) => {
              e?.stopPropagation?.();
              onDelete(row);
            }}
          />
        ),
      },
    ],
    [onDelete]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-900">문자발송 발신번호등록</div>
        <IconBtn
          icon={Save}
          label="저장"
          variant="primary"
          className="h-10 w-28 justify-center whitespace-nowrap"
          onClick={onSave}
          disabled={saving || !!error}
        />
      </div>

      {/* 입력 */}
      <section className="rounded-md border border-gray-300 bg-white p-4">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 text-base font-semibold text-gray-700 whitespace-nowrap">
            발신번호
          </div>

          <div className="col-span-7">
            <input
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="발신번호입력(-없이)"
              inputMode="numeric"
            />
          </div>

          <div className="col-span-3 flex justify-start">
            <IconBtn
              icon={Plus}
              label="등록"
              variant="primary"
              className="h-10 w-28 justify-center whitespace-nowrap"
              onClick={onAdd}
            />
          </div>
        </div>
      </section>

      {/* 목록 */}
      <section className="relative rounded-md border border-gray-200 bg-white overflow-hidden">
        <TableLoadingOverlay loading={loading} />
        <FixedHeadTable
          columns={columns}
          rows={viewRows}
          rowKey={(r) => r.orderno}
          height={520}
          tableTextClass="text-base"   // 목록 텍스트 한 단계 업
          selectedKey={selectedId}
          onRowClick={(row) => setSelectedId(row.orderno)}
          emptyText="등록된 발신번호가 없습니다."
          getRowProps={(row) => ({
            draggable: true,
            onDragStart: () => {
              dragIdRef.current = row.orderno;
            },
            onDragOver: (e) => e.preventDefault(),
            onDrop: (e) => {
              e.preventDefault();
              const dragId = dragIdRef.current;
              if (!dragId || dragId === row.orderno) return;

              const ids = viewRows.map((r) => r.orderno);
              const fromIdx = ids.indexOf(dragId);
              const toIdx = ids.indexOf(row.orderno);
              if (fromIdx < 0 || toIdx < 0) return;

              commitReorderByIds(reorderIds(ids, fromIdx, toIdx));
              dragIdRef.current = null;
            },
          })}
          // 선택/오버 클래스는 FixedHeadTable 기본값 써도 OK (필요하면 여기서 조정)
        />
      </section>

      {/* 하단 인포 (✅ 한 단계 업: text-sm) */}
      <section className="text-sm leading-6 text-gray-700">
        <div className="space-y-2">
          <div>
            <span className="mr-1">▶</span>
            발신번호 변작방지 관련 전기통신 사업법 및 관련고시 시행
            <span className="ml-1 text-gray-500">('15년4월16일)</span>
          </div>
          <ul className="list-disc pl-6">
            <li>
              통신사업자 <span className="text-red-600 font-semibold">번호변작방지 조치 의무화</span>, 인터넷발송 문자서비스{" "}
              <span className="text-red-600 font-semibold">등록제</span> 도입
            </li>
            <li>불법대량광고 번호 중지등</li>
          </ul>

          <div className="pt-2">
            <span className="mr-1">▶</span>
            발신번호 <span className="text-red-600 font-semibold">"사전등록"</span>,{" "}
            <span className="text-red-600 font-semibold">"특수한 유형의 부가통신사업자"</span>{" "}
            <span className="text-red-600 font-semibold">"등록제"</span> 시행
            <span className="ml-1 text-gray-500">('15년10월16일)</span>
          </div>
          <ul className="list-disc pl-6">
            <li>사전에 등록된 발신번호로만 문자메시지 발신가능</li>
            <li>
              인터넷발송문자서비스 사업(신고제→등록제, 기술적조치의무화)
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
