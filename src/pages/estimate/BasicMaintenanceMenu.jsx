// src/pages/estimate/BasicMaintenanceMenu.jsx
import React, { useState, useEffect } from "react";
import { useTbCode } from "../../hooks/useTbCode";

// ── 대분류 행 컴포넌트 ─────────────────────────────────────────────
// useTbCode를 각 행 컴포넌트에서 호출 → 소분류 유무를 개별 판단
function CatRow({ cat, isActive, onHover, onDirectClick }) {
  const { codes, loading } = useTbCode("WRK06" + cat.value);
  const subItems = (codes ?? []).filter((c) => c.state === "1");
  const hasChildren = !loading && subItems.length > 0;

  return (
    <button
      type="button"
      className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm text-zinc-800
        hover:bg-zinc-100 active:bg-zinc-200
        ${isActive ? "bg-zinc-100" : ""}`}
      onMouseEnter={(e) => {
        if (loading) return;
        if (hasChildren) {
          onHover({
            rect: e.currentTarget.getBoundingClientRect(),
            catValue: cat.value,
            subItems,
          });
        } else {
          onHover(null); // 소분류 없음 → 오른쪽 패널 닫기
        }
      }}
      onClick={() => {
        if (!loading && !hasChildren) {
          onDirectClick(cat); // 소분류 없는 대분류 → 직접 인서트
        }
      }}
    >
      <span>{cat.label}</span>
      {!loading && hasChildren && (
        <span className="text-zinc-400 text-xs ml-3">{">"}</span>
      )}
    </button>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function BasicMaintenanceMenu({ open, onClose, onItemClick }) {
  const { codes: mainCodes } = useTbCode("WRK06");
  const mainItems = (mainCodes ?? []).filter((c) => c.state === "1");

  // 오른쪽 패널 상태: { rect, catValue, subItems }
  const [subRect, setSubRect] = useState(null);

  useEffect(() => {
    if (!open) setSubRect(null);
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* ── 왼쪽 패널: 대분류 목록 ── */}
      <div
        className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-zinc-200 bg-white shadow-lg py-1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {mainItems.length === 0 && (
          <div className="px-3 py-2 text-xs text-zinc-400">항목 없음</div>
        )}
        {mainItems.map((cat) => (
          <CatRow
            key={cat.value}
            cat={cat}
            isActive={subRect?.catValue === cat.value}
            onHover={setSubRect}
            onDirectClick={(item) => {
              onItemClick?.(item);
              onClose?.();
            }}
          />
        ))}
      </div>

      {/* ── 오른쪽 패널: 소분류 목록 (fixed) ── */}
      {subRect && (
        <div
          className="fixed z-[51] min-w-[160px] rounded-md border border-zinc-200 bg-white shadow-lg py-1"
          style={{
            top: Math.min(subRect.rect.top, window.innerHeight - 300),
            left: subRect.rect.right + 4,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1 flex flex-col gap-0.5">
            {subRect.subItems.map((item) => (
              <button
                key={item.value}
                type="button"
                className="text-left rounded px-2 py-1 text-sm whitespace-nowrap hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => {
                  onItemClick?.(item);
                  onClose?.();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
