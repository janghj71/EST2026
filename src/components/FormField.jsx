export function FormField({ label, children, hint }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center">
      <div className="col-span-3 text-sm text-zinc-600">{label}</div>
      <div className="col-span-9">
        {children}
        {hint ? <div className="text-xs text-zinc-500 mt-1">{hint}</div> : null}
      </div>
    </div>
  );
}
