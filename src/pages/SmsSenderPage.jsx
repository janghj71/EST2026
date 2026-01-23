import { useCallback, useMemo, useRef, useState } from "react";
import { GripVertical, X, Plus,Trash2 } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable"; 
import IconBtn from "../components/IconBtn";               
import { useAlert } from "../alerts";

export default function SmsSenderPage() {
  const { confirm, warning, info } = useAlert();
  const [rows, setRows] = useState([
    { id: 1, sender: "024241901", status: "사용" },
    { id: 2, sender: "024241902", status: "사용" },
    { id: 3, sender: "0802580615", status: "사용" },
    { id: 4, sender: "0222020535", status: "사용" },
  ]);

  const [sender, setSender] = useState("");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? null);

  const viewRows = useMemo(() => rows.filter((r) => r.status !== "삭제"), [rows]);

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
      const active = prev.filter((r) => r.status !== "삭제");
      const deleted = prev.filter((r) => r.status === "삭제");
      const map = new Map(active.map((r) => [r.id, r]));
      const nextActive = orderedIds.map((id) => map.get(id)).filter(Boolean);
      return [...nextActive, ...deleted];
    });
  };

  const onAdd = async () => {
    const v = (sender || "").trim();
    if (!v) return await warning("발신번호를 입력하세요.");

    const newRow = { id: Date.now(), sender: v, status: "사용" };
    setRows((p) => [...p, newRow]);
    setSelectedId(newRow.id);
    setSender("");
  };

  const onDelete = useCallback(async (row) => {
    const ok = await confirm(`${row.sender} 발신번호를 삭제할까요?`);
    if (!ok) return;

    setRows((prev) => {
      const next = prev.map((x) => (x.id === row.id ? { ...x, status: "삭제" } : x));
      if (selectedId === row.id) {
        const firstAlive = next.find((x) => x.status !== "삭제" && x.id !== row.id);
        setSelectedId(firstAlive?.id ?? null);
      }
      return next;
    });  
  }, [confirm, selectedId]);

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
        key: "__seq",
        title: "순번",
        width: "12%",
        align: "center",
        render: (_v, _row, idx) => (
          <span className="font-mono">{String(idx + 1).padStart(2, "0")}</span>
        ),
      },
      {
        key: "sender",
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
      <div className="text-lg font-semibold text-gray-900">문자발송 발신번호등록</div>

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
      <section className="rounded-md border border-gray-200 bg-white overflow-hidden">
        <FixedHeadTable
          columns={columns}
          rows={viewRows}
          rowKey={(r) => r.id}
          height={520}
          tableTextClass="text-base"   // 목록 텍스트 한 단계 업
          selectedKey={selectedId}
          onRowClick={(row) => setSelectedId(row.id)}
          emptyText="등록된 발신번호가 없습니다."
          getRowProps={(row) => ({
            draggable: true,
            onDragStart: () => {
              dragIdRef.current = row.id;
            },
            onDragOver: (e) => e.preventDefault(),
            onDrop: (e) => {
              e.preventDefault();
              const dragId = dragIdRef.current;
              if (!dragId || dragId === row.id) return;

              const ids = viewRows.map((r) => r.id);
              const fromIdx = ids.indexOf(dragId);
              const toIdx = ids.indexOf(row.id);
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
