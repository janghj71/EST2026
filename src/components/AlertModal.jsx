import { useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle2, XCircle, Trash2 } from "lucide-react";

const iconByType = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  confirm: AlertTriangle,
  remove: Trash2,
};

const titleByType = {
  info: "알림",
  success: "완료",
  warning: "경고",
  error: "오류",
  confirm: "확인",
  remove: "삭제",
};

const toneByType = {
  info:    { headerBg: "bg-blue-50/70", headerFg: "text-blue-600", iconBg: "bg-blue-50",   iconFg: "text-blue-600" },
  success: { headerBg: "bg-emerald-50/70", headerFg: "text-emerald-600", iconBg: "bg-emerald-50",iconFg: "text-emerald-600" },
  warning: { headerBg: "bg-amber-50/70", headerFg: "text-amber-600", iconBg: "bg-amber-50",  iconFg: "text-amber-600" },
  error:   { headerBg: "bg-rose-50/70", headerFg: "text-rose-600", iconBg: "bg-rose-50",   iconFg: "text-rose-600" },
  confirm: { headerBg: "bg-indigo-50/70", headerFg: "text-indigo-600", iconBg: "bg-indigo-50",  iconFg: "text-indigo-600" },
  remove:  { headerBg: "bg-rose-50/70", headerFg: "text-rose-700", iconBg: "bg-rose-50",   iconFg: "text-rose-700" },
};

export default function AlertModal({
  open,
  type = "info",
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  showCancel = false,
  onConfirm,
  onCancel,
  onClose,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "Enter") {
        // confirm 포함: Enter=확인
        e.preventDefault();
        onConfirm?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onConfirm]);

  if (!open) return null;

  const Icon = iconByType[type] || Info;
  const _title = title ?? titleByType[type] ?? "알림";
  const tone = toneByType[type] || toneByType.info;

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onMouseDown={() => onClose?.()}
      />

      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-md bg-white shadow-xl border border-gray-200"
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* header */}
          <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 ${tone.headerBg}`}>
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${tone.iconBg}`}>
              <Icon size={18} className={tone.iconFg} />
            </div>
            <div className="flex-1">
              <div className={`text-lg font-semibold ${tone.headerFg}`}>{_title}</div>
            </div>

            <button
              type="button"
              className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
              onClick={() => onClose?.()}
              aria-label="닫기"
            >
              <X size={18} className="text-gray-600 hover:text-gray-900" />
            </button>
          </div>

          {/* body */}
          <div className="px-4 py-4">
            <div className="text-base text-gray-800 whitespace-pre-wrap">
              {message || ""}
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
            {showCancel && (
              <button
                type="button"
                className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                onClick={() => onCancel?.()}
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={() => onConfirm?.()}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
