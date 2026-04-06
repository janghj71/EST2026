// src/pages/estimate/SimplePopover.jsx
import React, { useEffect } from "react";

export default function SimplePopover({
  anchorRect,
  title,
  children,
  onClose,
  placement = "bottom-left",  // "bottom-left" | "right-top"
  minWidth = "360px",
  noTitle = false,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  let top, left;
  if (placement === "right-top") {
    top  = Math.min(anchorRect.top,   window.innerHeight - 400);
    left = Math.min(anchorRect.right, window.innerWidth  - 200);
  } else {
    top  = Math.min(anchorRect.bottom + 6, window.innerHeight - 320);
    left = Math.min(anchorRect.left,       window.innerWidth  - 360);
  }

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onClose}>
      <div
        className="absolute rounded-md border border-zinc-200 bg-white shadow-lg"
        style={{ top, left, minWidth }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!noTitle && (
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
        )}
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}
