// src/pages/estimate/ClaimSelectModal.jsx
import React from "react";
import { X, FileText } from "lucide-react";

export default function ClaimSelectModal({ open, onClose, claims = [], onSelect }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
      <div className="w-[360px] rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
            <FileText className="h-4 w-4" />
          </span>
          <span className="ml-2 text-base font-semibold text-zinc-900">청구처 선택</span>
          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        {/* List */}
        <div className="flex flex-col py-1">
          {claims.map((c) => (
            <button
              key={c.estbo_seqno}
              type="button"
              className="w-full px-4 py-3 text-left text-sm text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 border-b border-zinc-100 last:border-0"
              onClick={() => {
                onSelect?.(c.estbo_seqno);
                onClose?.();
              }}
            >
              {c.bocomname || `청구처 ${c.estbo_seqno}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
