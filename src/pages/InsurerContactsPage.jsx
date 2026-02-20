import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import FixedHeadTable from "../components/FixedHeadTable";
import IconBtn from "../components/IconBtn";
import { moveFocusOnEnter } from "../utils/focusUtils";
import { useAlert } from "../alerts";
import { useInsurers } from "../hooks/useInsurers";
import { useInsurerContacts } from "../hooks/useInsurerContacts";

const EMAIL_DOMAINS = [
  "naver.com", "hanmail.net", "daum.net", "kakao.com", "gmail.com",
  "nate.com", "outlook.com", "hotmail.com", "yahoo.com", "yahoo.co.kr",
  "korea.com", "chol.com", "dreamwiz.com", "empal.com", "hanafos.com",
  "직접입력",
];

export default function InsurerContactsPage() {
  const { confirm, info, warning } = useAlert();
  const { insurers } = useInsurers();
  const {
    contacts, loading: contactsLoading, saving, deleting,
    save, remove, refetch: refetchContacts,
  } = useInsurerContacts();

  // ── 좌측 보험사 선택 ──
  const [selectedInsCode, setSelectedInsCode] = useState("");
  const [insurerQuery, setInsurerQuery] = useState("");
  const effectiveInsCode = selectedInsCode || insurers[0]?.bocomcode || "";

  const filteredInsurers = useMemo(() => {
    const q = insurerQuery.trim().toLowerCase();
    if (!q) return insurers;
    return insurers.filter((x) => {
      const code = String(x.bocomcode || "").toLowerCase();
      const name = String(x.bocomname || "").toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [insurers, insurerQuery]);

  const selectedInsurer = useMemo(
    () => insurers.find((x) => x.bocomcode === effectiveInsCode) || null,
    [insurers, effectiveInsCode]
  );

  // ── 선택 보험사의 담당자 목록 ──
  const viewContacts = useMemo(
    () => contacts.filter((a) => a.bocomcode === effectiveInsCode),
    [contacts, effectiveInsCode]
  );

  // ── 담당자 선택 (복합키: bocomcode_seqno) ──
  const [selectedKey, setSelectedKey] = useState("");

  const selectedContact = useMemo(
    () => viewContacts.find((a) => a.bocomcode + "_" + a.seqno === selectedKey) || null,
    [viewContacts, selectedKey]
  );

  // ── 폼 ──
  const [mode, setMode] = useState("new"); // new | edit
  const [form, setForm] = useState(() => makeEmptyForm(effectiveInsCode));

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const set2 = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── 보험사 선택 시 ──
  const onSelectInsurer = (row) => {
    const nextCode = row.bocomcode;
    setSelectedInsCode(nextCode);

    const nextContacts = contacts.filter((a) => a.bocomcode === nextCode);
    const first = nextContacts[0];

    if (first) {
      setSelectedKey(first.bocomcode + "_" + first.seqno);
      setMode("edit");
      setForm(contactToForm(first));
    } else {
      setSelectedKey("");
      setMode("new");
      setForm(makeEmptyForm(nextCode));
    }
  };

  // ── 담당자 클릭 → 수정 모드 ──
  const onSelectContact = (row) => {
    setSelectedKey(row.bocomcode + "_" + row.seqno);
    setMode("edit");
    setForm(contactToForm(row));
  };

  // ── 신규추가 ──
  const onNew = () => {
    setMode("new");
    setSelectedKey("");
    setForm(makeEmptyForm(effectiveInsCode));
  };

  // ── 저장 ──
  const onSave = async () => {
    const boman_nm = (form.boman_nm || "").trim();
    if (!selectedInsurer) {
      await warning("보험사를 선택하세요.");
      return;
    }
    if (!boman_nm) {
      await warning("담당자를 입력하세요.");
      return;
    }

    const email_smtp =
      form.emailDomainSel === "직접입력"
        ? (form.emailDomainCustom || "").trim()
        : form.emailDomainSel;

    const saveForm = {
      ...form,
      bocomcode: effectiveInsCode,
      boman_nm,
      email_smtp,
    };

    try {
      await save(saveForm);
      await refetchContacts();
      await info("저장 완료");

      // 신규 저장 후: 재조회된 목록에서 마지막 항목 선택 or 신규 모드 유지
      if (mode === "new") {
        setMode("new");
        setSelectedKey("");
        setForm(makeEmptyForm(effectiveInsCode));
      }
    } catch (err) {
      await warning(err?.message || "저장에 실패했습니다.");
    }
  };

  // ── 삭제 ──
  const onDeleteRow = async (row) => {
    if (!row?.seqno) return;

    const ok = await confirm(
      `${row.boman_nm} 담당자를 삭제할까요?`,
      "삭제 확인",
      { confirmText: "삭제", cancelText: "취소" }
    );
    if (!ok) return;

    try {
      await remove(row.bocomcode, row.seqno);
      await refetchContacts();
      // await info("삭제 완료");

      // 삭제한 행이 선택중이면 초기화
      if (selectedKey === row.bocomcode + "_" + row.seqno) {
        setSelectedKey("");
        setMode("new");
        setForm(makeEmptyForm(effectiveInsCode));
      }
    } catch (err) {
      await warning(err?.message || "삭제에 실패했습니다.");
    }
  };

  // ── 보험사 테이블 컬럼 ──
  const insurerCols = useMemo(
    () => [
      {
        key: "bocomcode",
        title: "코드",
        width: "30%",
        align: "left",
        className: "font-mono",
        render: (val) => <span className="font-mono text-gray-700">{val}</span>,
      },
      {
        key: "bocomname",
        title: "보험사",
        width: "70%",
        align: "left",
        render: (val) => <span className="font-medium text-gray-900">{val}</span>,
      },
    ],
    []
  );

  // ── 담당자 테이블 컬럼 ──
  const contactCols = [
    {
      key: "bocomname",
      title: "보험사명",
      width: "55%",
      align: "left",
      render: (val) => <span className="text-gray-700">{val || selectedInsurer?.bocomname || "-"}</span>,
    },
    {
      key: "boman_nm",
      title: "담당자",
      width: "28%",
      align: "left",
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    {
      key: "__del",
      title: "",
      width: "17%",
      align: "center",
      render: (_v, row) => (
        <IconBtn
          icon={Trash2}
          label=""
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 xl:gap-3">
        {/* Left: 보험사 + 담당자 목록 */}
        <section className="xl:col-span-5 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0">
          {/* 상단: 보험사 — 고정 높이로 제한 */}
          <div className="border-b border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <div className="text-base font-semibold text-gray-900">보험사</div>
              <input
                className="ml-auto h-9 w-48 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                value={insurerQuery}
                onChange={(e) => setInsurerQuery(e.target.value)}
                placeholder="코드/보험사 검색"
              />
            </div>
            <div style={{ height: 300 }}>
              <FixedHeadTable
                columns={insurerCols}
                rows={filteredInsurers}
                rowKey={(r) => r.bocomcode}
                selectedKey={effectiveInsCode}
                onRowClick={onSelectInsurer}
                className="min-h-0 w-full h-full"
                emptyText="검색 결과가 없습니다."
                rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
                rowHoverClass="hover:!bg-gray-50"
                gutterSelectedClass="!bg-blue-50"
                gutterHoverClass="!bg-gray-50"
              />
            </div>
          </div>

          {/* 하단: 담당자 — 고정 높이로 제한 */}
          <div className="min-h-0 mt-3">
            <div className="p-3 border-b border-gray-200 flex items-center">
              <div className="text-sm font-semibold text-gray-900">담당자</div>
              <div className="ml-auto text-xs text-gray-500">{viewContacts.length}건</div>
            </div>

            <div style={{ height: 310 }}>
              <FixedHeadTable
                columns={contactCols}
                rows={viewContacts}
                rowKey={(r) => r.bocomcode + "_" + r.seqno}
                selectedKey={selectedKey}
                onRowClick={onSelectContact}
                className="min-h-0 w-full h-full"
                emptyText="담당자가 없습니다."
                rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
                rowHoverClass="hover:!bg-gray-50"
                gutterSelectedClass="!bg-blue-50"
                gutterHoverClass="!bg-gray-50"
              />
            </div>
          </div>
        </section>

        {/* Right: 입력 폼 */}
        <section className="xl:col-span-7 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-base font-semibold text-gray-900">
                {selectedInsurer
                  ? `보험사: ${selectedInsurer.bocomcode} ${selectedInsurer.bocomname}`
                  : "보험사 선택"}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <Field label="담당자">
              <input className={inputBase} value={form.boman_nm} onChange={set("boman_nm")} />
            </Field>

            <Field label="휴대번호">
              <Phone3
                v1={form.hp0} v2={form.hp1} v3={form.hp2}
                on1={set("hp0")} on2={set("hp1")} on3={set("hp2")}
              />
            </Field>

            <Field label="팩스번호">
              <Phone3
                v1={form.fax0} v2={form.fax1} v3={form.fax2}
                on1={set("fax0")} on2={set("fax1")} on3={set("fax2")}
              />
            </Field>

            <Field label="전화번호">
              <Phone3
                v1={form.tel0} v2={form.tel1} v3={form.tel2}
                on1={set("tel0")} on2={set("tel1")} on3={set("tel2")}
              />
            </Field>

            <Field label="이메일">
              <EmailRow
                emailId={form.email_acc}
                emailDomainSel={form.emailDomainSel}
                emailDomainCustom={form.emailDomainCustom}
                onEmailId={set("email_acc")}
                onDomainSel={(v) => set2("emailDomainSel", v)}
                onDomainCustom={set("emailDomainCustom")}
              />
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

function makeEmptyForm(bocomcode) {
  return {
    bocomcode: bocomcode || "",
    seqno: "",
    boman_nm: "",
    hp0: "010", hp1: "", hp2: "",
    fax0: "", fax1: "", fax2: "",
    email_acc: "",
    email_smtp: "hanmail.net",
    emailDomainSel: "hanmail.net",
    emailDomainCustom: "",
    tel0: "", tel1: "", tel2: "",
    memo: "",
  };
}

/** API row → 폼 객체 (emailDomainSel/Custom 추가) */
function contactToForm(row) {
  const smtp = row.email_smtp || "";
  return {
    ...row,
    emailDomainSel: EMAIL_DOMAINS.includes(smtp) ? smtp : "직접입력",
    emailDomainCustom: EMAIL_DOMAINS.includes(smtp) ? "" : smtp,
  };
}

/* ---------- UI bits ---------- */

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
      <input className={inputBase + " w-40"} value={emailId} onChange={onEmailId} />
      <span className="text-gray-400">@</span>
      
      {emailDomainSel === "직접입력" ? (
        <input className={inputBase + " w-44"} value={emailDomainCustom} onChange={onDomainCustom} placeholder="example.com" />
      ) : null}
      <select className="select-base w-40" value={emailDomainSel} onChange={(e) => onDomainSel(e.target.value)}>
        {EMAIL_DOMAINS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}

const inputBase =
  "h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-full";

const textareaBase =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
