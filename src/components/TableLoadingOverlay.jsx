// src/components/TableLoadingOverlay.jsx
import { Loader2 } from "lucide-react";

/**
 * 테이블(목록) 영역에만 표시되는 로딩 오버레이
 * 부모 div에 relative 가 있어야 합니다.
 */
export default function TableLoadingOverlay({ loading, message = "조회중..." }) {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        <span className="text-sm font-medium text-gray-500">{message}</span>
      </div>
    </div>
  );
}
