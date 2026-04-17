import React from "react";

/**
 * IconBtn (공용 버튼)
 * - variant: "default" | "primary" | "blue" | "danger"
 * - size: "sm" | "md"
 */
export default function IconBtn({
  icon: Icon,
  label,
  title,
  onClick,
  variant = "default",
  size = "md",
  className = "",
  type = "button",
  disabled = false,
}) {
  const sizeCls = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";

  const variantCls =
    variant === "blue"
      ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-500"
      : variant === "primary"
      ? "border-zinc-800 bg-zinc-800 text-white hover:bg-zinc-700"
      : variant === "danger"
      ? "border-red-300 text-red-700 bg-white hover:bg-red-50 hover:border-red-400"
      : variant === "orange"
      ? "border-orange-400 text-orange-600 bg-white hover:bg-orange-50 hover:border-orange-500"
      : variant === "green"
      ? "border-green-600 bg-green-600 text-white hover:bg-green-500"
      : variant === "yellow"
      ? "border-yellow-400 text-yellow-700 bg-white hover:bg-yellow-50 hover:border-yellow-500"
      : "border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-100 hover:border-zinc-400";

  return (
    <button
      type={type}
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2",
        sizeCls,
        "rounded-md border",
        variantCls,
        "font-semibold",
        "active:scale-[0.98]",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      {Icon ? <Icon size={18} strokeWidth={2} /> : null}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
