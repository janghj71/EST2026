// src/styles/uiClasses.js

// ✅ Input (UserAuth.jsx에서 쓰던 스타일 기반)
export const inputCls =
  "w-full h-11 rounded-md border border-gray-300 px-3 " +
  "text-gray-800 placeholder:text-gray-500 " +
  "outline-none focus:ring-2 focus:ring-gray-300";

// ✅ Small Action Buttons (공통 버튼 폭/높이는 여기서 통일)
export const btnBase =
  "h-10 w-28 rounded-md text-white " +
  "transition focus:outline-none focus-visible:ring-2";

// ✅ Primary (확인/저장 등)
export const btnConfirm =
  btnBase + " bg-sky-500 hover:bg-sky-600 active:bg-sky-700 focus-visible:ring-sky-300";

// ✅ Secondary (닫기/취소 등)
export const btnClose =
  btnBase + " bg-gray-500 hover:bg-gray-600 active:bg-gray-700 focus-visible:ring-gray-300";

// (선택) 인증번호 받기 같은 “라인 버튼”도 공용으로 쓰고 싶으면
export const btnOutlineSky =
  "h-10 rounded-md border border-sky-400 text-sky-600 " +
  "hover:bg-sky-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200";
