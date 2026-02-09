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
  normalize, 
  placeholder,
  inputClassName = "",
  maxHeightClassName = "max-h-56",
  showAllWhenNoMatch = false,
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const lastValueRef = useRef(value ?? "");

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value ?? "");
  const [hi, setHi] = useState(-1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [intentPick, setIntentPick] = useState(false); // ★ 옵션 선택 의도


  // 외부 value가 진짜로 바뀐 경우에만 q를 갱신 (렌더 중 1회만)
  if ((value ?? "") !== lastValueRef.current) {
    lastValueRef.current = value ?? "";
    // 사용자가 타이핑 중이 아닐 때만 맞추고 싶으면 조건 추가 가능
    if (!open) setQ(value ?? "");
  }
  
  const filtered = useMemo(() => {
    const s = (q ?? "").trim().toUpperCase();
    if (!s) return options;
    return options.filter((x) => String(x).toUpperCase().includes(s));
  }, [q, options]);

  
  const shownOptions = useMemo(() => {
    // 클릭해서 연 상태면 무조건 전체 옵션
    if (!isFiltering) return options;
  
    // 타이핑 중일 때만 필터 적용
    if (!showAllWhenNoMatch) return filtered;
  
    // (선택) 타이핑 중인데 매칭 0개면 전체 옵션을 보여주고 싶으면 유지
    if ((q ?? "").trim() && filtered.length === 0) return options;
  
    return filtered;
  }, [isFiltering, options, filtered, q, showAllWhenNoMatch]);
  
  // 바깥 클릭 닫기
  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);


  const openDropdown = (ensureHi = false) => {
    setOpen(true);
    setHi((p) => {
      if (!ensureHi) return -1;                 // ★ 마우스로 열면 하이라이트 없음
      if (shownOptions.length === 0) return -1;
      return p < 0 ? 0 : Math.min(p, shownOptions.length - 1);
    });
  };
  
  const commit = (next) => {
    setQ(next ?? "");
    onChange?.(next ?? "");
    setOpen(false);
    setHi(-1);
    setIsFiltering(false);
    setIntentPick(false);
    // ★ Enter로 확정했을 때 포커스 유지(마우스 선택에서도 문제 없음)
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const openAndEnsureHi = () => {
    setOpen(true);
    setHi((p) => {
      // if (filtered.length === 0) return -1;
      // return p < 0 ? 0 : Math.min(p, filtered.length - 1);
      if (shownOptions.length === 0) return -1;
        return p < 0 ? 0 : Math.min(p, shownOptions.length - 1);

    });
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setIntentPick(true); // ★ 옵션 선택 의도 생김
      setHi((p) => {
        const next = Math.min((p < 0 ? -1 : p) + 1, shownOptions.length - 1);
        return next;
      });
      return;
    }
  
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setIntentPick(true); // ★ 옵션 선택 의도 생김
      setHi((p) => Math.max(p - 1, 0));
      return;
    }
  
    if (e.key === "Escape") {
      setOpen(false);
      setHi(-1);
      return;
    }
  
    if (e.key === "Enter") {
      // ★ open 상태에서 Enter는 부모로 전파되면 안 됨(포커스 날아감 방지)
      if (open) {
        e.preventDefault();
        e.stopPropagation();
  
        // if (hi >= 0 && shownOptions[hi] != null) {
        if (intentPick && hi >= 0 && shownOptions[hi] != null) {
          commit(shownOptions[hi]);
        } else {
          commit(q); // 옵션 하이라이트 없으면 입력값 그대로 확정
        }
        return;
      }
  
      // open이 아닐 때 Enter는 기존대로(부모의 엔터 이동 로직이 있다면 그걸 타게 둠)
      return;
    }
  };
  
  useEffect(() => {
    setQ(value ?? "");
  }, [value]);
  

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          className={inputClassName}
          value={q}
          onChange={(e) => {
            // const v = e.target.value;
            const raw = e.target.value;
            const v = normalize ? normalize(raw) : raw; 

            setQ(v);
            setIsFiltering(true); 
            setOpen(true);
            setHi(-1);
            setIntentPick(false); // ★ 타이핑 중엔 옵션 선택 의도 없음
            onChange?.(v); // 입력 즉시 반영
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          onMouseDown={() => {
            setIsFiltering(false);
            openDropdown(false);
          }}
          onFocus={() => {
            // 키보드 탭 이동으로 들어와도 전체 옵션이 자연스럽다
            setIsFiltering(false);
          }}
        />

        {/* ▼ 토글 버튼 (클릭 시에만 열기/닫기) */}
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
            openDropdown(true);
          }}
        >
          ▼
        </div>


      </div>

      {/* {open && filtered.length > 0 && ( */}
      {open && shownOptions.length > 0 && (
        <div
          className={[
            // SimplePopover 룩앤필 통일
            "absolute left-0 top-full mt-1 w-full z-50",
            "rounded-md border border-zinc-200 bg-white shadow-lg",
            maxHeightClassName,
            "overflow-auto",
          ].join(" ")}
        >
          {/* {filtered.map((opt, idx) => { */}
          {shownOptions.map((opt, idx) => {
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
                  setIntentPick(true);        // ★ 클릭 선택 의도
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
