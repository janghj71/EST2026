import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * 공용 ComboInput (입력 가능한 콤보박스)
 * - 드롭다운 폭: input과 동일(w-full)
 * - 스타일: SimplePopover 룩앤필(rounded-md / border / shadow-lg)
 * - 키보드:
 *   - ArrowDown/ArrowUp: 열고 이동
 *   - Enter: (열려있고 highlight 있을 때만) 선택
 *   - Esc: 닫기
 * - 중요: 포커스(Enter/Tab)로 들어와도 자동으로 열지 않음 (Select처럼)
 */
export default function ComboInput({
  value,
  onChange,
  options = [],
  placeholder,
  inputClassName = "",
  maxHeightClassName = "max-h-56",
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value ?? "");
  const [hi, setHi] = useState(-1);

  // 외부 value가 바뀌면 동기화
  useEffect(() => {
    setQ(value ?? "");
  }, [value]);

  const filtered = useMemo(() => {
    const s = (q ?? "").trim().toUpperCase();
    if (!s) return options;
    return options.filter((x) => String(x).toUpperCase().includes(s));
  }, [q, options]);

  // 바깥 클릭 닫기
  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const commit = (v) => {
    onChange?.(v);
    setOpen(false);
    setHi(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const openAndEnsureHi = () => {
    setOpen(true);
    setHi((p) => {
      if (filtered.length === 0) return -1;
      return p < 0 ? 0 : Math.min(p, filtered.length - 1);
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHi((p) => {
        const next = Math.min((p < 0 ? -1 : p) + 1, filtered.length - 1);
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHi((p) => Math.max(p - 1, 0));
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      setHi(-1);
      return;
    }

    if (e.key === "Enter") {
      // ✅ 열려 있고 highlight가 있을 때만 선택(그 외 Enter는 moveFocusOnEnter로 흘려보냄)
      if (open && hi >= 0 && filtered[hi] != null) {
        e.preventDefault();
        e.stopPropagation();
        commit(filtered[hi]);
      }
      return;
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          className={inputClassName}
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            onChange?.(v); // 입력 즉시 반영
            setOpen(true); // ✅ 타이핑 시작할 때만 열림
            setHi(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          // ✅ 포커스 들어온다고 자동으로 열지 않음
          onFocus={() => {
            setHi(-1);
          }}
        />

        {/* ▼ 토글 버튼 (클릭 시에만 열기/닫기) */}
        {/* <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-600"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (open) {
              setOpen(false);
              setHi(-1);
              return;
            }
            openAndEnsureHi();
          }}
          title="목록"
          tabIndex={-1}
        >
          ▼
        </button> */}
        <div
          role="button"
          aria-hidden="true"
          className="absolute right-1 top-1/2 -translate-y-1/2
                    h-7 w-7 flex items-center justify-center
                    rounded-md hover:bg-zinc-100 text-zinc-600
                    cursor-pointer select-none"
          onMouseDown={(e) => {
            // input blur 방지 + 포커스 생성 차단
            e.preventDefault();
          }}
          onClick={() => {
            if (open) {
              setOpen(false);
              setHi(-1);
              return;
            }
            openAndEnsureHi();
          }}
        >
          ▼
        </div>


      </div>

      {open && filtered.length > 0 && (
        <div
          className={[
            // SimplePopover 룩앤필 통일
            "absolute left-0 top-full mt-1 w-full z-50",
            "rounded-md border border-zinc-200 bg-white shadow-lg",
            maxHeightClassName,
            "overflow-auto",
          ].join(" ")}
        >
          {filtered.map((opt, idx) => {
            const active = idx === hi;
            return (
              <button
                key={`${opt}-${idx}`}
                type="button"
                className={[
                  "w-full text-left px-3 py-2 text-sm",
                  active ? "bg-zinc-100" : "hover:bg-zinc-50",
                ].join(" ")}
                onMouseEnter={() => setHi(idx)}
                onMouseDown={(e) => {
                  // blur 전에 값 확정
                  e.preventDefault();
                  commit(opt);
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
