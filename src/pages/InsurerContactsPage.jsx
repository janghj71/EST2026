import {  useCallback, useMemo, useState, useRef } from "react";
import { Plus, Save, RotateCcw, Trash2 } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable"; // 경로 맞게 수정
import IconBtn from "../components/IconBtn"; // 경로 맞게 수정
import { moveFocusOnEnter } from "../utils/focusUtils"; // 경로 맞게 수정
import { useAlert } from "../alerts";

// 더미 보험사
const seedInsurers = [
  { code: "01", name: "메리츠" },
  { code: "02", name: "한화" },
  { code: "03", name: "롯데" },
  { code: "04", name: "삼성" },
  { code: "05", name: "현대" },
];

// 더미 담당자(보험사별 여러명)
const seedAgents = [
  {
    id: "A001",
    insCode: "03",
    agentName: "담당자2",
    hp1: "010",
    hp2: "8618",
    hp3: "6919",
    fax1: "",
    fax2: "",
    fax3: "",
    emailId: "",
    emailDomain: "hanmail.net",
    tel1: "",
    tel2: "",
    tel3: "",
    memo: "",
    status: "사용", // 내부용(삭제 처리용)
  },
  {
    id: "A002",
    insCode: "03",
    agentName: "김길동",
    hp1: "010",
    hp2: "1234",
    hp3: "5678",
    fax1: "",
    fax2: "",
    fax3: "",
    emailId: "format2000",
    emailDomain: "hanmail.net",
    tel1: "",
    tel2: "",
    tel3: "",
    memo: "",
    status: "사용",
  },
];

const EMAIL_DOMAINS = ["hanmail.net", "naver.com", "gmail.com", "daum.net", "nate.com", "직접입력"];
const makeId = (seq) => `A${String(seq).padStart(6, "0")}`;

export default function InsurerContactsPage() {
  const {confirm, info, warning } = useAlert();
  const [insurers] = useState(seedInsurers);
  const [agents, setAgents] = useState(seedAgents);

  const seqRef = useRef(1);


  // 좌측 보험사 선택(테이블)
  const [selectedInsCode, setSelectedInsCode] = useState("03");
  

  const selectedInsurer = useMemo(
    () => insurers.find((x) => x.code === selectedInsCode) || null,
    [insurers, selectedInsCode]
  );

  // 선택 보험사의 담당자 목록(삭제는 숨김)
  const viewAgents = useMemo(() => {
    return agents
      .filter((a) => a.insCode === selectedInsCode)
      .filter((a) => a.status !== "삭제")
      .sort((a, b) => a.agentName.localeCompare(b.agentName));
  }, [agents, selectedInsCode]);

  // 담당자 선택(테이블)
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const selectedAgent = useMemo(
    () => viewAgents.find((a) => a.id === selectedAgentId) || null,
    [viewAgents, selectedAgentId]
  );

  // 보험사 바뀌면: 담당자 선택 초기화 + 신규 모드
  const onSelectInsurer = (row) => {
    const nextInsCode = row.code;

    // 1) 보험사 선택
    setSelectedInsCode(nextInsCode);

    // 2) 다음 보험사의 담당자 목록(삭제 제외) 계산
    const nextAgents = agents
      .filter((a) => a.insCode === nextInsCode)
      .filter((a) => a.status !== "삭제")
      .sort((a, b) => a.agentName.localeCompare(b.agentName));

    // 3) 첫 담당자 자동 선택
    const first = nextAgents[0];

    if (first) {
      setSelectedAgentId(first.id);
      setMode("edit");
      setForm({
        ...first,
        emailDomainSel: EMAIL_DOMAINS.includes(first.emailDomain) ? first.emailDomain : "직접입력",
        emailDomainCustom: EMAIL_DOMAINS.includes(first.emailDomain) ? "" : first.emailDomain,
      });
    } else {
      // 담당자가 없으면 신규 모드
      setSelectedAgentId("");
      setMode("new");
      setForm(makeEmptyForm(nextInsCode));
    }
  };


  // 폼
  const [mode, setMode] = useState("new"); // new | edit
  const [form, setForm] = useState(() => makeEmptyForm(selectedInsCode));

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const set2 = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // 신규추가
  const onNew = () => {
    setMode("new");
    setSelectedAgentId("");
    setForm(makeEmptyForm(selectedInsCode));
  };

  // 목록 클릭 → 수정 모드
  const onSelectAgent = (row) => {
    setSelectedAgentId(row.id);
    setMode("edit");
    setForm({
      ...row,
      emailDomainSel: EMAIL_DOMAINS.includes(row.emailDomain) ? row.emailDomain : "직접입력",
      emailDomainCustom: EMAIL_DOMAINS.includes(row.emailDomain) ? "" : row.emailDomain,
    });
  };

  // 저장(신규/수정)
  const onSave = async () => {
    const agentName = (form.agentName || "").trim();
    if (!selectedInsurer) {
      // alert("보험사를 선택하세요.");
      await warning("보험사를 선택하세요.");
      return;
    }
    if (!agentName) {
      // alert("담당자를 입력하세요.");
      await warning("담당자를 입력하세요.");
      return;
    }

    const emailDomain =
      form.emailDomainSel === "직접입력"
        ? (form.emailDomainCustom || "").trim()
        : form.emailDomainSel;

    if (mode === "new") {
      // const id = `A${String(Date.now()).slice(-6)}`;
      const id = makeId(seqRef.current++);
      const newRow = {
        id,
        insCode: selectedInsCode,
        agentName,
        hp1: onlyNum(form.hp1),
        hp2: onlyNum(form.hp2),
        hp3: onlyNum(form.hp3),
        fax1: onlyNum(form.fax1),
        fax2: onlyNum(form.fax2),
        fax3: onlyNum(form.fax3),
        emailId: (form.emailId || "").trim(),
        emailDomain: emailDomain || "",
        tel1: onlyNum(form.tel1),
        tel2: onlyNum(form.tel2),
        tel3: onlyNum(form.tel3),
        memo: form.memo || "",
        status: "사용",
      };

      setAgents((prev) => [...prev, newRow]);
      setSelectedAgentId(newRow.id);
      setMode("edit");
      setForm({
        ...newRow,
        emailDomainSel: EMAIL_DOMAINS.includes(newRow.emailDomain) ? newRow.emailDomain : "직접입력",
        emailDomainCustom: EMAIL_DOMAINS.includes(newRow.emailDomain) ? "" : newRow.emailDomain,
      });
      // alert("등록(더미) 완료");
      await info("저장 완료");
      return;
    }

    // edit 저장
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgentId
          ? {
              ...a,
              agentName,
              hp1: onlyNum(form.hp1),
              hp2: onlyNum(form.hp2),
              hp3: onlyNum(form.hp3),
              fax1: onlyNum(form.fax1),
              fax2: onlyNum(form.fax2),
              fax3: onlyNum(form.fax3),
              emailId: (form.emailId || "").trim(),
              emailDomain: emailDomain || "",
              tel1: onlyNum(form.tel1),
              tel2: onlyNum(form.tel2),
              tel3: onlyNum(form.tel3),
              memo: form.memo || "",
            }
          : a
      )
    );
    // alert("저장(더미) 완료");
    await info("저장 완료");
  };

  // 목록에서 행 삭제(소프트 삭제)
   const onDeleteRow = async (row) => {
    if (!row?.id) return;

    // const ok = confirm(`${row.agentName} 담당자를 삭제 처리할까요?`);
    const ok = await confirm(
      `${row.agentName} 담당자를 삭제 처리할까요?`,
      "삭제 확인", 
      { confirmText: "삭제", cancelText: "취소" }
    );
    if (!ok) return;

    setAgents((prev) => prev.map((a) => (a.id === row.id ? { ...a, status: "삭제" } : a)));

    // 삭제한 행이 선택중이면 폼/선택 초기화
    if (selectedAgentId === row.id) {
      setSelectedAgentId("");
      setMode("new");
      setForm(makeEmptyForm(selectedInsCode));
    }
  };

  // FixedHeadTable: 보험사 컬럼
  const insurerCols = useMemo(
    () => [
      {
        key: "code",
        title: "코드",
        width: "30%",
        align: "left",
        className: "font-mono",
        render: (val) => <span className="font-mono text-gray-700">{val}</span>,
      },
      {
        key: "name",
        title: "보험사",
        width: "70%",
        align: "left",
        render: (val) => <span className="font-medium text-gray-900">{val}</span>,
      },
    ],
    []
  );


  // FixedHeadTable: 담당자 컬럼 
  const agentCols = [
    {
      key: "insName",
      title: "보험사명",
      width: "60%",
      align: "left",
      render: () => (
        <span className="text-gray-700">{selectedInsurer?.name || "-"}</span>
      ),
    },
    {
      key: "agentName",
      title: "담당자",
      width: "28%",
      align: "left",
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    {
      key: "__del",
      title: "",
      width: "20%",
      align: "center",
      truncate: false,    // FixedHeadTable이 지원하면 권장
      render: (_v, row) => (
        <IconBtn
          icon={Trash2}
          label=""
          // variant="ghost"
          className="h-9 w-10 justify-center p-0"
          onClick={(e) => {
            e?.stopPropagation?.();
            onDeleteRow(row);
          }}
        />
      ),
    },
  
  ];
  

  return (
    // 모든 인풋 Enter/Shift+Enter 이동(위임)
    <div className="space-y-4" onKeyDown={moveFocusOnEnter}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">보험 담당자 등록</div>
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
        {/* Left: 보험사/담당자 목록 */}
        <section className="xl:col-span-5 rounded-l-md border border-gray-200 bg-white overflow-hidden min-h-0">
          {/* 상단: 보험사 목록 */}
          <div className="border-b border-gray-200">
            <div className="p-3 text-sm font-semibold text-gray-900">보험사</div>
            <div className="p-0">
              <FixedHeadTable
                columns={insurerCols}
                rows={insurers}
                rowKey={(r) => r.code}
                selectedKey={selectedInsCode}
                onRowClick={(row) => onSelectInsurer(row)}
                height={220}
                className="min-h-0 w-full"
                emptyText="보험사가 없습니다."
                rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
                rowHoverClass="hover:!bg-gray-50"
                gutterSelectedClass="!bg-blue-50"
                gutterHoverClass="!bg-gray-50"
              />
            </div>
          </div>

          {/* 하단: 담당자 목록 */}
          <div className=" border-t border-gray-200 p-0 min-h-0 mt-3 ">
            <div className="p-3 border-b border-gray-200 flex items-center">
              <div className="text-sm font-semibold text-gray-900">담당자</div>
              <div className="ml-auto text-xs text-gray-500">{viewAgents.length}건</div>
            </div>

            <FixedHeadTable
              columns={agentCols}
              rows={viewAgents}
              rowKey={(r) => r.id}
              selectedKey={selectedAgentId}
              onRowClick={(row) => onSelectAgent(row)}
              height={340}
              className="min-h-0 w-full"
              emptyText="담당자가 없습니다."
              rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-50"
              gutterHoverClass="!bg-gray-50"
            />
          </div>
        </section>

        {/* Right: 입력 폼 */}
        <section className="xl:col-span-7 rounded-r-md border border-gray-200 border-l-0 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-base font-semibold text-gray-900">
                {selectedInsurer ? `보험사: ${selectedInsurer.code} ${selectedInsurer.name}` : "보험사 선택"}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <Field label="담당자">
              <input className={inputBase} value={form.agentName} onChange={set("agentName")} />
            </Field>

            <Field label="휴대번호">
              <Phone3 v1={form.hp1} v2={form.hp2} v3={form.hp3} on1={set("hp1")} on2={set("hp2")} on3={set("hp3")} />
            </Field>

            <Field label="팩스번호">
              <Phone3 v1={form.fax1} v2={form.fax2} v3={form.fax3} on1={set("fax1")} on2={set("fax2")} on3={set("fax3")} />
            </Field>

            <Field label="이메일">
              <EmailRow
                emailId={form.emailId}
                emailDomainSel={form.emailDomainSel}
                emailDomainCustom={form.emailDomainCustom}
                onEmailId={set("emailId")}
                onDomainSel={(v) => set2("emailDomainSel", v)}
                onDomainCustom={set("emailDomainCustom")}
              />
            </Field>

            <Field label="전화번호">
              <Phone3 v1={form.tel1} v2={form.tel2} v3={form.tel3} on1={set("tel1")} on2={set("tel2")} on3={set("tel3")} />
            </Field>

            <Field label="메모" alignTop>
              <textarea className={textareaBase} value={form.memo} onChange={set("memo")} rows={7} />
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function makeEmptyForm(insCode) {
  return {
    id: "",
    insCode: insCode || "01",
    agentName: "",
    hp1: "010",
    hp2: "",
    hp3: "",
    fax1: "",
    fax2: "",
    fax3: "",
    emailId: "",
    emailDomainSel: "hanmail.net",
    emailDomainCustom: "",
    tel1: "",
    tel2: "",
    tel3: "",
    memo: "",
    status: "사용",
  };
}

function onlyNum(v) {
  return (v ?? "").toString().replace(/[^\d]/g, "");
}

function Field({ label, children, alignTop }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center">
      <div className={["col-span-3 text-sm text-gray-600 whitespace-nowrap", alignTop ? "self-start pt-2" : ""].join(" ")}>
        {label}
      </div>
      <div className="col-span-9">{children}</div>
    </div>
  );
}

function Phone3({ v1, v2, v3, on1, on2, on3 }) {
  return (
    <div className="flex items-center gap-2">
      <input className={inputBase + " w-20 text-center"} value={v1} onChange={on1} inputMode="numeric" />
      <span className="text-gray-400">-</span>
      <input className={inputBase + " w-24 text-center"} value={v2} onChange={on2} inputMode="numeric" />
      <span className="text-gray-400">-</span>
      <input className={inputBase + " w-24 text-center"} value={v3} onChange={on3} inputMode="numeric" />
    </div>
  );
}

function EmailRow({ emailId, emailDomainSel, emailDomainCustom, onEmailId, onDomainSel, onDomainCustom }) {
  return (
    <div className="flex items-center gap-2">
      <input className={inputBase + " w-40"} value={emailId} onChange={onEmailId}  />
      <span className="text-gray-400">@</span>

      {/* select-base로 고정 */}
      <select className="select-base w-40" value={emailDomainSel} onChange={(e) => onDomainSel(e.target.value)}>
        {EMAIL_DOMAINS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {emailDomainSel === "직접입력" ? (
        <input className={inputBase + " w-44"} value={emailDomainCustom} onChange={onDomainCustom} placeholder="example.com" />
      ) : null}
    </div>
  );
}

// ✅ input은 기존 스타일 유지
const inputBase =
  "h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-full";

const textareaBase =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
