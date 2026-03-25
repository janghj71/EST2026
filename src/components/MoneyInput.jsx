import { formatNumber, unformatNumber } from "../utils/numberFormat";
// import { moveFocusOnEnter } from "../utils/focusUtils";

export default function MoneyInput({
  value,
  onChange,
  onFocus,
  className = "",
  suffix = "원",
  mode = "form",
  rightPad = null,
  inputClassName = "",
  ...rest

}) {
  const display = value === "" || value === null || value === undefined
  ? ""
  : formatNumber(value);

  const inputClass =
    mode === "cell"
      ? // 테이블 셀용: 평소 투명, 포커스 때만 박스
        "h-8 w-full bg-transparent px-2 text-sm text-zinc-900 text-right tabular-nums outline-none " +
        "focus:bg-white focus:ring-1 focus:ring-zinc-900/20 focus:border focus:border-zinc-300 " +
        // (suffix ? "pr-10" : "pr-2")
        (rightPad ? rightPad : (suffix ? "pr-9" : "pr-2"))
      : // 일반 화면용: 항상 박스(원래 스타일)
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 text-right " +
        "focus:outline-none focus:ring-2 focus:ring-gray-900/10 " +
        (suffix ? "pr-9" : "pr-3");
    
  return (
    <div className="relative w-full">
      <input
        {...rest}
        className={inputClass + " " + className}
        value={display}
        inputMode="numeric"
        onFocus={(e) => { onFocus?.(e); e.target.select(); }}
        // onKeyDown={moveFocusOnEnter}
        onChange={(e) => {
          const raw = unformatNumber(e.target.value);
          onChange(raw); 
        }}
      />
      {suffix ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
