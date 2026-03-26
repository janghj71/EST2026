import { formatNumber, unformatNumber } from "../utils/numberFormat";
// import { moveFocusOnEnter } from "../utils/focusUtils";

export default function MoneyInput({
  value,
  onChange,
  onFocus,
  onBlur,
  className = "",
  suffix = "원",
  mode = "form",
  rightPad = null,
  selectOnFocus = true,
  inputClassName = "",
  ...rest
}) {
  const display = value === "" || value === null || value === undefined
    ? ""
    : formatNumber(value);

  const inputClass =
    mode === "cell"
      ? "h-8 w-full bg-transparent px-2 text-sm text-zinc-900 text-right tabular-nums outline-none " +
        "focus:bg-white focus:ring-1 focus:ring-zinc-900/20 focus:border focus:border-zinc-300 " +
        (rightPad ? rightPad : (suffix ? "pr-9" : "pr-2"))
      : "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 text-right " +
        "focus:outline-none focus:ring-2 focus:ring-gray-900/10 " +
        (suffix ? "pr-9" : "pr-3");

  return (
    <div className="relative w-full">
      <input
        {...rest}
        className={inputClass + " " + className + " " + inputClassName}
        value={display}
        inputMode="numeric"
        onFocus={(e) => {
          onFocus?.(e);
          if (selectOnFocus) e.target.select();
        }}
        onBlur={(e) => {
          onBlur?.(e);
        }}
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
