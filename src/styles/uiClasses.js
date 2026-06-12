// src/styles/uiClasses.js

// Input
export const inputCls =
  "w-full h-11 rounded-md border border-gray-300 px-3 " +
  "text-gray-800 placeholder:text-gray-400 bg-gray-50 " +
  "outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition";

// Small Action Buttons
export const btnBase =
  "h-10 w-28 rounded-md text-white " +
  "inline-flex items-center justify-center gap-2 " +
  "transition focus:outline-none focus-visible:ring-2";

// Primary (확인/저장 등)
export const btnConfirm =
  btnBase + " bg-neutral-900 hover:bg-neutral-700 active:bg-neutral-950 focus-visible:ring-neutral-400";

// Secondary (닫기/취소 등)
export const btnClose =
  btnBase + " bg-zinc-200 text-zinc-800 hover:bg-zinc-300 active:bg-zinc-400 focus-visible:ring-zinc-300";

// 인증번호 받기 버튼
export const btnOutlineSky =
  "h-10 rounded-md border border-gray-300 text-gray-700 bg-white " +
  "hover:bg-gray-50 hover:border-gray-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-200";
