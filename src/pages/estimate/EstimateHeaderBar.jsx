// src/pages/estimate/EstimateHeaderBar.jsx
import React from "react";
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
  onOpenLaborItems,
  onOpenPaintItems,
  onOpenChemicalItems,
  onOpenPartLookup, 
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconBtn icon={Wrench} label="공임항목" onClick={onOpenLaborItems} />
      <IconBtn icon={Paintbrush} label="도장항목" onClick={onOpenPaintItems} />
      <IconBtn icon={FlaskConical} label="케미칼항목" onClick={onOpenChemicalItems} />
      <IconBtn icon={Search} label="부품조회" onClick={onOpenPartLookup} />
      
      <IconBtn icon={CheckCircle} label="중복/견적점검" onClick={() => alert("TODO")} />

      <div className="ml-auto flex items-center gap-2">
        <IconBtn icon={ImageIcon} label="차량사진" onClick={() => alert("TODO")} />
        <IconBtn icon={Printer} label="서식인쇄" onClick={() => alert("TODO")} />
        <IconBtn icon={Send} label="견적청구" onClick={() => alert("TODO")} />
        <IconBtn icon={Save} label="저장" onClick={onSaveAndList} />
      </div>
    </div>
  );
}
