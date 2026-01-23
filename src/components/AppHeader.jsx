export default function AppHeader({ compact = false }) {
  return (
    <div className={compact ? "text-left" : "text-center"}>
      <h1
        className={`
          tracking-tight text-gray-800
          ${compact ? "text-lg font-bold" : "text-xl sm:text-2xl lg:text-3xl font-semibold"}
        `}
      >
        자동차 정비 견적관리
        <span className="ml-2 font-bold text-green-700">EST2026</span>
      </h1>

      {/* {!compact && ( */}
        <div className="mt-1 text-xs sm:text-sm text-gray-500">
          Estimate Management System
        </div>
      {/* )} */}
    </div>
  );
}



