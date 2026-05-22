import React, { useMemo, useState, useEffect } from "react";
import { Save, RotateCcw, Upload, Trash2, Search } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { moveFocusOnEnter } from "../utils/focusUtils";
import SealUploader from "../components/SealUploader";
import ZipcodeSearchModal from "../components/ZipcodeSearchModal";
import { useAlert } from "../alerts";
import { useCompanyInfo } from "../hooks/useCompanyInfo";
import { useTbCode } from "../hooks/useTbCode";
import { useSealImage } from "../hooks/useSealImage";


export default function CompanyInfoPage() {
  const { confirm, info, warning } = useAlert();
  const { form, setForm, loading, saving, error, refetch, save } = useCompanyInfo();
  const { companySeal, managerSeal, saving: sealSaving, error: sealError, saveSeal, deleteSeal } = useSealImage();
  const { codes: shopKindList } = useTbCode("SKD01");

  const hasError = !!(error || sealError);

  const [zipcodeOpen, setZipcodeOpen] = useState(false);

  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const onZipcodeSelect = ({ zipcode, addr1 }) => {
    setForm((p) => ({ ...p, zipCode: zipcode, addr1 }));
  };

  // 조회 에러 → 메시지 표시
  useEffect(() => {
    const msg = error?.message || sealError?.message;
    if (msg) warning(msg || "조회에 실패했습니다.");
  }, [error, sealError]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSave = async () => {
    try {
      await save(form);
      await info("저장 완료");
    } catch (err) {
      await info(err.message || "저장 실패");
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
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
        </div>

        <div className="ml-auto flex gap-2">
          <IconBtn
            icon={Save}
            label={saving ? "저장중..." : "저장"}
            variant="primary"
            className="h-10 w-25 justify-center"
            onClick={onSave}
            disabled={saving || hasError}
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
                {shopKindList.map((o) => (
                  <option key={o.value} value={o.value}>{o.value} {o.label}</option>
                ))}
                
              </select>
            </Field>
            <Field label="정비업등록번호">
              <input className={input} value={form.sanghoid} onChange={onChange("sanghoid")} readOnly />
            </Field>
            <Field label="정비책임자">
              <input className={input} value={form.supman} onChange={onChange("supman")} />
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
                  onClick={() => setZipcodeOpen(true)}
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
            
          </div>
        </section>
      </div>

      {zipcodeOpen && (
        <ZipcodeSearchModal
          onSelect={onZipcodeSelect}
          onClose={() => setZipcodeOpen(false)}
        />
      )}

      {/* seals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SealUploader
          title="회사 직인"
          imageUrl={sealError ? "" : companySeal}
          disabled={hasError}
          onUpload={async (file) => {
            if (!file) return;
            try {
              await saveSeal(1, file);
            } catch (err) {
              await info(err.message || "회사 직인 저장 실패");
            }
          }}
          onDelete={async () => {
            const ok = await confirm("회사 직인을 삭제하시겠습니까?");
            if (!ok) return;
            try {
              await deleteSeal(1);
            } catch (err) {
              await info(err.message || "회사 직인 삭제 실패");
            }
          }}
        />

        <SealUploader
          title="정비책임자 인감"
          imageUrl={sealError ? "" : managerSeal}
          disabled={hasError}
          onUpload={async (file) => {
            if (!file) return;
            try {
              await saveSeal(2, file);
            } catch (err) {
              await info(err.message || "정비책임자 인감 저장 실패");
            }
          }}
          onDelete={async () => {
            const ok = await confirm("정비책임자 인감을 삭제하시겠습니까?");
            if (!ok) return;
            try {
              await deleteSeal(2);
            } catch (err) {
              await info(err.message || "정비책임자 인감 삭제 실패");
            }
          }}
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

