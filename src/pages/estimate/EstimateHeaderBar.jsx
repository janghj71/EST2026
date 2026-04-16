// src/pages/estimate/EstimateHeaderBar.jsx
import React, { useState, useRef, useEffect } from "react";
import IconBtn from "../../components/IconBtn";
import {
  User,
  Wrench,
  Paintbrush, FlaskConical,
  Search,
  CheckCircle,
  Image as ImageIcon,
  Printer,
  Send,
  Save,
} from "lucide-react";

export default function EstimateHeaderBar({
  onSaveAndList,
  saving = false,
  onOpenLaborItems,
  onOpenPaintItems,
  onOpenChemicalItems,
  onOpenPartLookup,
  onDuplicateCheck,
  onOpenPhotoViewer,
  onPrint,
  master,
}) {
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef(null);

  useEffect(() => {
    if (!printMenuOpen) return;
    const handle = (e) => {
      if (!printMenuRef.current?.contains(e.target)) setPrintMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [printMenuOpen]);

  // master.isest 기준 메뉴 목록
  const printItems = String(master?.isest) === "1"
    ? [
        { label: "점검정비 견적서" },
        { label: "개인정보 활용동의" },
      ]
    : [
        { label: "작업지시서" },
        { label: "수리비 청구서" },
        { label: "점검정비 명세서" },
        { label: "개인정보 활용동의" },
      ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconBtn icon={Wrench} label="공임항목" onClick={onOpenLaborItems} />
      <IconBtn icon={Paintbrush} label="도장항목" onClick={onOpenPaintItems} />
      <IconBtn icon={FlaskConical} label="케미칼항목" onClick={onOpenChemicalItems} />
      <IconBtn icon={Search} label="부품조회" onClick={onOpenPartLookup} />

      <IconBtn icon={CheckCircle} label="중복체크" onClick={onDuplicateCheck} />

      <div className="ml-auto flex items-center gap-2">
        <IconBtn icon={ImageIcon} label="차량사진" onClick={onOpenPhotoViewer} />

        {/* ── 서식인쇄 드롭다운 ── */}
        <div className="relative" ref={printMenuRef}>
          <IconBtn
            icon={Printer}
            label="서식인쇄"
            onClick={() => setPrintMenuOpen((v) => !v)}
          />
          {printMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-zinc-200 bg-white shadow-lg py-1">
              {printItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200"
                  onClick={() => {
                    setPrintMenuOpen(false);
                    onPrint?.(item.label);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <IconBtn icon={Send} label="견적청구" onClick={() => alert("TODO")} />
        <IconBtn icon={Save} label="저장" onClick={onSaveAndList} disabled={saving} />
      </div>
    </div>
  );
}
