export default function AppHeader({ compact = false }) {
  return (
    <div className={compact ? "text-left" : "text-center"}>
      <div className={`font-black tracking-tight text-gray-900 ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        MOM
      </div>
      <div className={`text-gray-400 font-medium tracking-wide ${compact ? "text-xs" : "text-sm sm:text-base"}`}>
        Mobility Online Management
      </div>
    </div>
  );
}



