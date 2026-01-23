import { useCallback, useMemo, useState } from "react";
import { Plus, Save, Ban, Upload, Trash2 } from "lucide-react";

import FixedHeadTable from "../components/FixedHeadTable"; 
import IconBtn from "../components/IconBtn";               
import { moveFocusOnEnter } from "../utils/focusUtils";    
import Field from "../components/Field";
import SealUploader from "../components/SealUploader";
import { useAlert } from "../alerts";


// 더미 권한(구분)
const ROLE_OPTIONS = [
  { value: "1", label: "1 관리자" },
  { value: "2", label: "2 사용자" },
  { value: "3", label: "3 조회" },
];

// 더미 사용자 목록
const seedUsers = Array.from({ length: 16 }).map((_, i) => ({
  id: `0103793${String(2200 + i).padStart(4, "0")}`,
  name: "장희정",
  role: "1",
  status: "사용", // 사용/중지
  stampUrl: "",   // 인감 이미지
}));

export default function UserSettingsPage() {
  const { confirm, warning, info } = useAlert();
  const [users, setUsers] = useState(seedUsers);
  const [selectedId, setSelectedId] = useState(users[0]?.id || "");

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedId) || null,
    [users, selectedId]
  );

  const [mode, setMode] = useState("edit"); // new | edit
  const [form, setForm] = useState(() => makeEmptyForm());

  // 최초 선택 사용자 폼 로드
  // (현재는 화면 코딩 단계라, row 클릭 시만 로드하도록 단순 처리)
  const loadToForm = (u) => {
    setMode("edit");
    setForm({
      id: u.id,
      name: u.name,
      role: u.role,
      status: u.status,
      stampUrl: u.stampUrl || "",
    });
  };

  const onRowClick = (row) => {
    setSelectedId(row.id);
    loadToForm(row);
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // 신규추가
  const onNew = () => {
    setMode("new");
    setSelectedId("");
    setForm(makeEmptyForm());
  };

  // 저장(신규/수정) - 화면만 더미
  const onSave = async () => {
    const id = (form.id || "").trim();
    const name = (form.name || "").trim();

    if (!id) return await warning("아이디를 입력하세요.");
    if (!name) return await warning("이름을 입력하세요.");

    if (mode === "new") {
      if (users.some((u) => u.id === id)) return await warning("이미 존재하는 아이디입니다.");

      const newRow = {
        id,
        name,
        role: form.role,
        status: "사용",
        stampUrl: form.stampUrl || "",
      };

      setUsers((prev) => [newRow, ...prev]);
      setSelectedId(id);
      setMode("edit");
      await info("저장 완료");
      return;
    }

    // edit
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedId
          ? { ...u, id, name, role: form.role, stampUrl: form.stampUrl || "", status: form.status }
          : u
      )
    );

    // id 변경 시 selectedId 동기화
    if (selectedId && selectedId !== id) setSelectedId(id);

    await info("저장 완료");
  };

  // 중지(소프트) - 현재 선택 사용자 status="중지"
   // 중지(소프트) - 행 기준 status="중지"
  const onStopRow = useCallback(async (row) => {
    if (!row) return;
    if (row.status === "중지") return; 

    const ok = await confirm(`${row.id} 사용자를 중지 처리할까요?`);
      if (!ok) return;
  
    setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, status: "중지" } : u)));

    // 현재 폼이 그 유저를 보고 있으면 폼도 동기화
    if (selectedId === row.id) setForm((p) => ({ ...p, status: "중지" }));
  }, [confirm, selectedId]);

  // 인감 등록(파일 선택 → 미리보기 URL)
  const onUploadStamp = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, stampUrl: url }));
  };

  // 인감 삭제
  const onDeleteStamp = async () => {
    const ok = await confirm("인감을 삭제할까요?");
    if (!ok) return;
    setForm((p) => ({ ...p, stampUrl: "" }));
  };

  const columns = useMemo(
    () => [
      {
        key: "role",
        title: "구분",
        width: "20%",
        align: "left",
        render: (v) => <span className="text-gray-700">{roleLabel(v)}</span>,
      },
      {
        key: "id",
        title: "아이디",
        width: "36%",
        align: "left",
        className: "font-mono",
        render: (v) => <span className="font-mono text-gray-700">{maskId(v)}</span>,
      },
      {
        key: "name",
        title: "사용자명",
        width: "25%",
        align: "left",
        render: (v) => <span className="font-medium text-gray-900">{v}</span>,
      },
      {
        key: "status",
        title: "사용",
        width: "15%",
        align: "left",
        render: (v) => <span className={badge(v)}>{v}</span>,
      },
      {
        key: "__stop",
        title: "",
        width: "15%",             // 버튼 안 가리게 px 고정
        align: "center",
        render: (_v, row) => (
          <IconBtn
            icon={Ban}
            label=""            // 텍스트 없이 아이콘만
            // variant="danger"
            className="h-8 w-10 justify-center p-0"
            onClick={(e) => {
              e?.stopPropagation?.();
              onStopRow(row);
            }}
            disabled={row.status === "중지"}
            title={row.status === "중지" ? "이미 중지" : "중지"}
          />
        ),
      },
    ],
    [onStopRow]
  );

  return (
    <div className="space-y-4" onKeyDown={moveFocusOnEnter}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">사용자 등록</div>
        </div>

        <div className="ml-auto flex gap-2">
          <IconBtn
            icon={Plus}
            label="신규추가"
            variant="default"
            className="h-10 w-28 justify-center whitespace-nowrap"
            onClick={onNew}
          />
          <IconBtn
            icon={Save}
            label="저장"
            variant="primary"
            className="h-10 w-28 justify-center whitespace-nowrap"
            onClick={onSave}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        {/* Left: list */}
        <section className="xl:col-span-6 rounded-l-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-0 min-h-0">
            <FixedHeadTable
              columns={columns}
              rows={users}
              rowKey={(r) => r.id}
              selectedKey={selectedId}
              onRowClick={(row) => onRowClick(row)}
              height={620}
              className="min-h-0 w-full"
              emptyText="사용자가 없습니다."
              rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-50"
              gutterHoverClass="!bg-gray-50"
            />
          </div>
        </section>

        {/* Right: form */}
        <section className="xl:col-span-6 rounded-r-md border border-gray-200 border-l-0 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-base font-semibold text-gray-900">
                {mode === "new" ? "사용자 등록" : selectedUser ? `아이디: ${selectedUser.id}` : "사용자 선택"}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <Field label="아이디">
              <input className={inputBase} value={form.id} onChange={set("id")} />
            </Field>

            <Field label="이름">
              <input className={inputBase} value={form.name} onChange={set("name")} />
            </Field>

            <Field label="구분">
              <select className="select-base" value={form.role} onChange={set("role")}>
                {ROLE_OPTIONS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

            {/* 인감 */}
            {/* <div className="pt-2">
              <div className="text-sm font-semibold text-gray-900 mb-2">견적작성자 인감</div>

              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-7">
                  <div className="rounded-md border border-gray-200 bg-white p-3 h-[220px] flex items-center justify-center overflow-hidden">
                    {form.stampUrl ? (
                      <img
                        src={form.stampUrl}
                        alt="stamp"
                        className="max-h-[200px] max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-sm text-gray-400">등록된 인감이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="col-span-5 flex flex-col gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onUploadStamp(e.target.files?.[0])}
                    />
                    <span className="w-full">
                      <IconBtn
                        icon={Upload}
                        label="등록"
                        variant="primary"
                        className="h-10 w-28 justify-center whitespace-nowrap"
                      />
                    </span>
                  </label>

                  <IconBtn
                    icon={Trash2}
                    label="삭제"
                    variant="danger"
                    className="h-10 w-28 justify-center whitespace-nowrap"
                    onClick={onDeleteStamp}
                    disabled={!form.stampUrl}
                  />
                </div>
              </div>
            </div> */}
          <div className="border-t border-gray-200 p-5">
            {/* <div className="text-sm font-semibold text-gray-900 mb-3">
              견적작성자 인감
            </div>

            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-7">
                <div className="rounded-xl border border-gray-200 bg-white p-3 h-[220px] flex items-center justify-center overflow-hidden">
                  {form.stampUrl ? (
                    <img
                      src={form.stampUrl}
                      alt="stamp"
                      className="max-h-[200px] max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-sm text-gray-400">
                      등록된 인감이 없습니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-5 flex flex-col gap-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadStamp(e.target.files?.[0])}
                  />
                  <span className="w-full">
                    <IconBtn
                      icon={Upload}
                      label="등록"
                      variant="primary"
                      className="h-10 w-28 justify-center whitespace-nowrap"
                    />
                  </span>
                </label>

                <IconBtn
                  icon={Trash2}
                  label="삭제"
                  variant="default"
                  className="h-10 w-28 justify-center whitespace-nowrap"
                  onClick={onDeleteStamp}
                  disabled={!form.stampUrl}
                />
              </div>
            </div>
             */}
            <div className="text-base font-semibold text-gray-900 mb-4">견적작성자 인감</div>
            <SealUploader
              title={null}        // 상위에서 타이틀 출력
              card={false}        // 외곽 카드 제거
              imageUrl={form.stampUrl}
              onUpload={(file) => {
                if (!file) return;
                const url = URL.createObjectURL(file);
                setForm((p) => ({ ...p, stampUrl: url }));
              }}
              onDelete={() => setForm((p) => ({ ...p, stampUrl: "" }))}
            />
          </div>

        </section>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function makeEmptyForm() {
  return {
    id: "",
    name: "",
    role: "1",
    status: "사용",
    stampUrl: "",
  };
}

function roleLabel(v) {
  const found = ROLE_OPTIONS.find((x) => x.value === String(v));
  return found ? found.label : String(v);
}

function maskId(v) {
  if (!v) return "";
  if (v.length <= 6) return v;
  return v.slice(0, 6) + "******";
}

function badge(v) {
  if (v === "사용")
    return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700";
  if (v === "중지")
    return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700";
  return "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700";
}

const inputBase =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
