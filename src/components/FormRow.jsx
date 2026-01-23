// src/components/FormRow.jsx
export default function FormRow({ label, children, alignTop = false, className = "" }) {
  return (
    <div className={["grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2", className].join(" ")}>
      <div
        className={[
          "text-sm text-gray-600 whitespace-nowrap",
          alignTop ? "self-start pt-2" : "",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
