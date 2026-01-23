// src/pages/estimate/SimplePopover.jsx
import React, { useEffect } from "react";

export default function SimplePopover({ anchorRect, title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 320);
  const left = Math.min(anchorRect.left, window.innerWidth - 360);

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onClose}>
      <div
        className="absolute rounded-md border border-zinc-200 bg-white shadow-lg w-[360px]"
        style={{ top, left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-zinc-200 flex items-center">
          <div className="text-sm font-semibold text-zinc-800">{title}</div>
          <button
            className="ml-auto text-zinc-500 hover:text-zinc-800"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}
