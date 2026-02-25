import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, Ban } from "lucide-react";

import FixedHeadTable from "../components/FixedHeadTable";
import IconBtn from "../components/IconBtn";
import { moveFocusOnEnter } from "../utils/focusUtils";
import Field from "../components/Field";
import SealUploader from "../components/SealUploader";
import { useAlert } from "../alerts";
import { useUserSettings } from "../hooks/useUserSettings";
import { useTbCode } from "../hooks/useTbCode";

export default function UserSettingsPage() {
  const { confirm, warning, info } = useAlert();
  const {
    users, loading, saving, error, save, uploadSeal, deleteSeal, stop, refetch,
  } = useUserSettings();
  const { codes: roleOptions } = useTbCode("STATE1");

  // 조회 에러 → 메시지 표시
  useEffect(() => {
    if (error) warning(error.message || "조회에 실패했습니다.");
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  const [userQuery, setUserQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const effectiveId = selectedId || users[0]?.hp || "";

  const selectedUser = useMemo(
    () => users.find((u) => u.hp === effectiveId) || null,
    [users, effectiveId]
  );
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hp = String(u.hp || "").toLowerCase();
      const username = String(u.username || "").toLowerCase();
      const usertype = String(u.usertypename || "").toLowerCase();
      return hp.includes(q) || username.includes(q) || usertype.includes(q);
    });
  }, [users, userQuery]);

  const [mode, setMode] = useState("edit"); // new | edit
  const [form, setForm] = useState(() => makeEmptyForm());

  const loadToForm = (u) => {
    setMode("edit");
    setForm({
      hp: u.hp,
      username: u.username,
      usertype: u.usertype,
      lusename: u.lusename,
      imgdata: u.imgdata || "",
    });
  };

  const onRowClick = (row) => {
    setSelectedId(row.hp);
    loadToForm(row);
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // 신규추가
  const onNew = () => {
    setMode("new");
    setSelectedId("");
    setForm(makeEmptyForm());
  };

  // 저장
  const onSave = async () => {
    const hp = (form.hp || "").trim();
    const username = (form.username || "").trim();

    if (!hp) return await warning("아이디를 입력하세요.");
    if (!username) return await warning("이름을 입력하세요.");

    try {
      await save(form);
      await refetch();
      await info("저장 완료");

      if (mode === "new") {
        setMode("new");
        setSelectedId("");
        setForm(makeEmptyForm());
      }
    } catch (err) {
      await warning(err?.message || "저장에 실패했습니다.");
    }
  };

  // 중지
  const onStopRow = useCallback(async (row) => {
    if (!row) return;
    if (row.lusename === "중지") return;

    const ok = await confirm(`${row.hp} 사용자를 중지 처리할까요?`);
    if (!ok) return;

    try {
      await stop(row);
      await refetch();
    } catch (err) {
      await warning(err?.message || "중지에 실패했습니다.");
    }
  }, [confirm, stop, refetch, warning]);

  const columns = useMemo(
    () => [
      {
        key: "usertypename",
        title: "구분",
        width: "20%",
        align: "left",
        render: (v) => <span className="text-gray-700">{v || "-"}</span>,
      },
      {
        key: "hp",
        title: "아이디",
        width: "36%",
        align: "left",
        className: "font-mono",
        render: (v) => <span className="font-mono text-gray-700">{maskId(v)}</span>,
      },
      {
        key: "username",
        title: "사용자명",
        width: "25%",
        align: "left",
        render: (v) => <span className="font-medium text-gray-900">{v}</span>,
      },
      {
        key: "lusename",
        title: "사용",
        width: "15%",
        align: "left",
        render: (v) => <span className={badge(v)}>{v}</span>,
      },
      {
        key: "__stop",
        title: "",
        width: "15%",
        align: "center",
        render: (_v, row) => (
          <IconBtn
            icon={Ban}
            label=""
            className="h-8 w-10 justify-center p-0"
            onClick={(e) => {
              e?.stopPropagation?.();
              onStopRow(row);
            }}
            disabled={row.lusename === "중지"}
            title={row.lusename === "중지" ? "이미 중지" : "중지"}
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
            disabled={!!error}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 xl:gap-3">
        {/* Left: list */}
        <section className="xl:col-span-6 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200 h-[57px] flex items-center gap-2">
            <div className="text-base font-semibold text-gray-900">사용자</div>
            <input
              className="ml-auto h-10 w-64 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="아이디/이름/구분 검색"
            />
          </div>
          <div style={{ height: 620 }}>
            <FixedHeadTable
              columns={columns}
              rows={filteredUsers}
              rowKey={(r) => r.hp}
              selectedKey={effectiveId}
              onRowClick={onRowClick}
              className="min-h-0 w-full h-full"
              emptyText="검색 결과가 없습니다."
              rowSelectedClass="!bg-blue-50 hover:!bg-blue-50"
              rowHoverClass="hover:!bg-gray-50"
              gutterSelectedClass="!bg-blue-50"
              gutterHoverClass="!bg-gray-50"
            />
          </div>
        </section>

        {/* Right: form */}
        <section className="xl:col-span-6 rounded-md border border-gray-200 bg-white overflow-hidden min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-base font-semibold text-gray-900">
                {mode === "new" ? "사용자 등록" : selectedUser ? `아이디: ${selectedUser.hp}` : "사용자 선택"}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <Field label="아이디">
              <input className={inputBase} value={form.hp} onChange={set("hp")} />
            </Field>

            <Field label="이름">
              <input className={inputBase} value={form.username} onChange={set("username")} />
            </Field>

            <Field label="구분">
              <select className="select-base" value={form.usertype} onChange={set("usertype")}>
                {roleOptions.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.value} {x.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* 인감 */}
          <div className="border-t border-gray-200 p-5">
            <div className="text-base font-semibold text-gray-900 mb-4">견적작성자 인감</div>
            <SealUploader
              title={null}
              card={false}
              imageUrl={form.imgdata ? `data:image/jpeg;base64,${form.imgdata}` : ""}
              onUpload={async (file) => {
                if (!file) return;
                try {
                  const base64 = await fileToBase64(file);
                  await uploadSeal(form.hp, base64);
                  setForm((p) => ({ ...p, imgdata: base64 }));
                  await refetch();
                } catch (err) {
                  await warning(err?.message || "인감 등록에 실패했습니다.");
                }
              }}
              onDelete={async () => {
                try {
                  await deleteSeal(form.hp);
                  setForm((p) => ({ ...p, imgdata: "" }));
                  await refetch();
                } catch (err) {
                  await warning(err?.message || "인감 삭제에 실패했습니다.");
                }
              }}
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
    hp: "",
    username: "",
    usertype: "1",
    lusename: "사용",
    imgdata: "",
  };
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

/** JPEG File → Base64 문자열 (접두어 제거) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const inputBase =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
