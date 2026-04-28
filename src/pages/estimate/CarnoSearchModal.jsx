// src/pages/estimate/CarnoSearchModal.jsx
// 차량번호 검색 결과 모달
import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import FixedHeadTable from "../../components/FixedHeadTable";

export default function CarnoSearchModal({ open, loading, rows = [], carno = "", onConfirm, onClose }) {
  // carno 기준 정렬
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.carno ?? "").localeCompare(b.carno ?? "", "ko")),
    [rows]
  );

  const [selectedRow, setSelectedRow] = useState(null);

  // 모달 열릴 때마다 첫 행 자동 선택
  useEffect(() => {
    if (open) setSelectedRow(sortedRows[0] ?? null);
  }, [open, sortedRows]);

  if (!open) return null;

  const handleConfirm = () => {
    if (selectedRow) onConfirm(selectedRow);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter")  { e.preventDefault(); handleConfirm(); }
    if (e.key === "Escape") { onClose(); }
  };

  const columns = [
    { key: "carno",       title: "차량번호", width: "22%", align: "left" },
    { key: "carname",     title: "차량명",   width: "28%", align: "left" },
    { key: "custom_name", title: "고객명",   width: "22%", align: "left" },
    {
      key: "hp0", title: "연락처", width: "28%", align: "left",
      render: (_, row) => [row.hp0, row.hp1, row.hp2].filter(Boolean).join("-"),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30"
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-[640px] rounded-md border border-zinc-200 bg-white shadow-xl flex flex-col overflow-hidden"
        style={{ height: "60vh" }}
      >
        {/* 헤더 */}
        <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {carno && (
              <div className="text-base font-semibold text-zinc-900">{carno}</div>
            )}
            <div className="text-base font-semibold text-zinc-900">차량번호 검색</div>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 목록 */}
        <div className="min-h-0 flex-1 p-3 flex flex-col overflow-hidden">
          <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 flex-1">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
                조회 중...
              </div>
            ) : (
              <FixedHeadTable
                columns={columns}
                rows={sortedRows}
                rowKey={(r) => r.est_serial}
                selectedKey={selectedRow?.est_serial}
                onRowClick={(r) => setSelectedRow(r)}
                onRowDoubleClick={() => handleConfirm()}
                emptyText="검색 결과가 없습니다."
                height="100%"
                rowSize="sm"
              />
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedRow || sortedRows.length === 0}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
