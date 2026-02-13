import { useMemo, useState } from "react";
import { Save, RotateCcw, Upload, Trash2, Search } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { moveFocusOnEnter } from "../utils/focusUtils";
import SealUploader from "../components/SealUploader";
import { useAlert } from "../alerts";
import { useCompanyInfo } from "../hooks/useCompanyInfo";

// 화면 전용(더미) 페이지: API/훅 없음
export default function CompanyInfoPage() {
  const { confirm, info } = useAlert();
  const { form, setForm, loading, error, refetch } = useCompanyInfo();

  // const email = useMemo(() => {
  //   const id = (form.emailId || "").trim();
  //   const dom = (form.emailDomain || "").trim();
  //   if (!id && !dom) return "";
  //   return `${id}@${dom}`;
  // }, [form.emailId, form.emailDomain]);

  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSave = async () => {
    // 화면만: 저장 로그
    await info("저장 완료");

  };

  if (loading) return <div className="p-10 text-center text-gray-500">로딩중...</div>;
  if (!form)   return <div className="p-10 text-center text-gray-400">데이터 없음</div>;

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
          <div className="text-lg font-semibold text-gray-900">업체정보</div>
          {/* <div className="text-sm text-gray-500 mt-0.5">
            기초사항
          </div> */}
        </div>

        <div className="ml-auto flex gap-2">
          <IconBtn
            icon={Save}
            label="저장"
            variant="primary"
            className="h-10 w-25 justify-center"
            onClick={onSave}
          />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* left card: 사업자/업체 */}
        <section className="rounded-md border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">업체 기본정보</div>
          <div className="mt-4 space-y-3">
            <Field label="사업자 번호">
              <input className={input} value={form.idNo} onChange={onChange("idNo")} />
            </Field>
            <Field label="상호">
              <input className={input} value={form.comName} onChange={onChange("comName")} />
            </Field>
            <Field label="대표자">
              <input className={input} value={form.boss} onChange={onChange("boss")} />
            </Field>
            <Field label="업태">
              <input className={input} value={form.upTae} onChange={onChange("upTae")} />
            </Field>
            <Field label="업종">
              <input className={input} value={form.upJong} onChange={onChange("upJong")} />
            </Field>
            <Field label="정비범위">
              <select className="w-full select-base" value={form.shopKind} onChange={onChange("shopKind")}>
                <option value="1">1종합</option>
                <option value="2">2종</option>
                <option value="3">3급</option>
              </select>
            </Field>
          </div>
        </section>

        {/* right card: 연락/주소 */}
        <section className="rounded-md border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">연락처 / 주소</div>
          <div className="mt-4 space-y-3">
            <Field label="전화번호">
              <div className="flex gap-2">
                <input className={`${input} w-20`} value={form.tel0} onChange={onChange("tel0")} />
                <input className={`${input} w-24`} value={form.tel1} onChange={onChange("tel1")} />
                <input className={`${input} w-24`} value={form.tel2} onChange={onChange("tel2")} />
              </div>
            </Field>

            <Field label="팩스번호">
              <div className="flex gap-2">
                <input className={`${input} w-20`} value={form.fax0} onChange={onChange("fax0")} />
                <input className={`${input} w-24`} value={form.fax1} onChange={onChange("fax1")} />
                <input className={`${input} w-24`} value={form.fax2} onChange={onChange("fax2")} />
              </div>
            </Field>

            <Field label="우편번호">
              <div className="flex gap-2">
                <input className={`${input} w-28`} value={form.zipCode} onChange={onChange("zipCode")} />
                {/* <button type="button" className={btnGhost}>
                  검색
                </button> */}
                <IconBtn
                  icon={Search}
                  label="검색"
                  variant="default"
                  className="h-10 w-28 justify-center whitespace-nowrap"
                  onClick={() => console.log("우편번호 검색")}
                />
              </div>
            </Field>

            <Field label="사업장 주소">
              <div className="space-y-2">
                <input className={input} value={form.addr1} onChange={onChange("addr1")} />
                <input className={input} value={form.addr2} onChange={onChange("addr2")} />
              </div>
            </Field>

            <Field label="이메일">
              <input
                className={input}
                value={form.email}
                onChange={onChange("email")}
                placeholder="example@domain.com"
              />
            </Field>

            {/* <Field label="이메일 주소">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${input} w-48`}
                  value={form.emailId}
                  onChange={onChange("emailId")}
                  placeholder="아이디"
                />
                <span className="text-gray-400">@</span>
                <select
                  // className={`${input} w-48`}
                  className="${input} w-full select-base" 
                  value={form.emailDomain}
                  onChange={onChange("emailDomain")}
                >
                  <option value="hanmail.net">hanmail.net</option>
                  <option value="naver.com">naver.com</option>
                  <option value="gmail.com">gmail.com</option>
                  <option value="direct">직접입력</option>
                </select>

                {form.emailDomain === "direct" ? (
                  <input
                    className={`${input} w-56`}
                    value={form.emailDomainText || ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, emailDomainText: e.target.value }))
                    }
                    placeholder="도메인 직접입력"
                  />
                ) : null}

                <div className="ml-auto text-xs text-gray-500">
                  미리보기: <span className="font-medium text-gray-700">{email}</span>
                </div>
              </div>
            </Field> */}
          </div>
        </section>
      </div>

      {/* seals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* <SealCard title="회사 직인" />
        <SealCard title="정비책임자 인감" /> */}
        <SealUploader
          title="회사 직인"
          imageUrl={form.companySealUrl}
          onUpload={(file) => {
            if (!file) return;
            const url = URL.createObjectURL(file);
            setForm((p) => ({ ...p, companySealUrl: url }));
          }}
          onDelete={() => setForm((p) => ({ ...p, companySealUrl: "" }))}
        />

        <SealUploader
          title="정비책임자 인감"
          imageUrl={form.managerSealUrl}
          onUpload={(file) => {
            if (!file) return;
            const url = URL.createObjectURL(file);
            setForm((p) => ({ ...p, managerSealUrl: url }));
          }}
          onDelete={() => setForm((p) => ({ ...p, managerSealUrl: "" }))}
        />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center">
      <div className="col-span-4 text-sm text-gray-600">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}

function SealCard({ title }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-5">
      <div className="flex items-center">
        <div className="text-base font-semibold text-gray-900">{title}</div>
      </div>

      <div className="mt-4 flex gap-4 items-start">
        <div className="w-44 h-36 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
          미리보기
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="sr-only">이미지 선택</span>
            <input type="file" accept="image/*" className="hidden" onChange={() => {}} />
            <span className="inline-flex h-10 w-28 items-center justify-center rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm font-semibold cursor-pointer">
              등록
            </span>
          </label>

          <button type="button" className="h-10 w-28 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium">
            삭제
          </button>
        </div>
      </div>
    </section>
  );
}

const input =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

