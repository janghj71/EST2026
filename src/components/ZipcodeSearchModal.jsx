// src/components/ZipcodeSearchModal.jsx
import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useZipcodeSearch } from "../hooks/useZipcodeSearch";
import FixedHeadTable from "./FixedHeadTable";

export default function ZipcodeSearchModal({ onSelect, onClose }) {
  const [roadname, setRoadname] = useState("");
  const [bdbunji1, setBdbunji1] = useState("");
  const [searched, setSearched] = useState(false);

  const { results, loading, searchZipcode } = useZipcodeSearch();
  const [selectedRow, setSelectedRow] = useState(null);

  const roadnameRef = useRef(null);

  const columns = useMemo(() => [
    {
      key: "zipcode",
      title: "우편번호",
      width: "25%",
      render: (v) => <div className="h-8 flex items-center font-mono text-zinc-600">{v}</div>,
    },
    {
      key: "roadaddr",
      title: "도로명 주소",
      width: "75%",
      render: (v) => <div className="h-8 flex items-center text-zinc-800 truncate">{v}</div>,
    },
  ], []);

  const onSearch = async () => {
    if (!roadname.trim()) {
      roadnameRef.current?.focus();
      return;
    }
    setSearched(true);
    await searchZipcode(roadname.trim(), bdbunji1.trim());
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  const onRowClick = (row) => {
    onSelect({ zipcode: row.zipcode, addr1: row.roadaddr });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="rounded-md border border-zinc-200 bg-white shadow-xl overflow-hidden w-[580px]">

        {/* 헤더 */}
        <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
              <Search className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold text-zinc-900">우편번호 검색</span>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="px-4 py-3 border-b border-zinc-200 bg-white">
          <div className="flex gap-2">
            <input
              ref={roadnameRef}
              value={roadname}
              onChange={(e) => setRoadname(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="도로명  예) 성수일로8길"
              autoFocus
              className="flex-1 h-8 rounded-md border border-zinc-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
            <input
              value={bdbunji1}
              onChange={(e) => setBdbunji1(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="건물번호"
              className="w-28 h-8 rounded-md border border-zinc-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
            <button
              type="button"
              onClick={onSearch}
              disabled={loading}
              className="h-8 px-3 rounded-md bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              검색
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-400">도로명을 입력하고 검색하세요. 건물번호는 선택입력입니다.</p>
        </div>

        {/* 결과 목록 */}
        <div className="p-4">
          <div className="h-[220px] overflow-hidden">
            <FixedHeadTable
              columns={columns}
              rows={results}
              rowKey={(r) => r.zipcode + r.roadaddr}
              rowSize="sm"
              height={220}
              emptyText={loading ? "검색 중..." : searched ? "검색 결과가 없습니다." : "도로명을 입력하고 검색하세요."}
              selectedKey={selectedRow ? selectedRow.zipcode + selectedRow.roadaddr : ""}
              onRowClick={(row) => setSelectedRow(row)}
              onRowDoubleClick={(row) => onRowClick(row)}
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t border-zinc-200 px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            disabled={!selectedRow}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            onClick={() => onRowClick(selectedRow)}
          >
            확인
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
