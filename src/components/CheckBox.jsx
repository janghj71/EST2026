import React from "react";

/**
 * 공용 체크박스
 * - label 클릭 시 토글
 * - controlled: checked / onChange
 * - tailwind: accent 색상 통일
 */
export default function CheckBox({
  label,
  checked,
  onChange,
  disabled = false,
  className = "",
  inputClassName = "",
  labelClassName = "",
}) {
  return (
    <label
      className={[
        "inline-flex items-center gap-2 select-none",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      <input
        type="checkbox"
        className={["h-4 w-4 accent-zinc-900", inputClassName].join(" ")}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked, e)}
      />
      {label != null && label !== "" ? (
        <span className={["text-sm text-zinc-700", labelClassName].join(" ")}>
          {label}
        </span>
      ) : null}
    </label>
  );
}
