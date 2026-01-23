export default function Field({ label, children, alignTop = false, className = "" }) {
  return (
    <div className={["grid grid-cols-12 gap-3 items-center", className].join(" ")}>
      <div
        className={[
          "col-span-3 text-sm text-gray-600 whitespace-nowrap",
          alignTop ? "self-start pt-2" : "",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="col-span-9">{children}</div>
    </div>
  );
}
