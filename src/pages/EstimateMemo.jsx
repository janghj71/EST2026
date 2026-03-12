// EstimateMemo.jsx (FixedHeadTable 버전)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Trash2, GripVertical } from "lucide-react";
import IconBtn from "../components/IconBtn";
import FixedHeadTable from "../components/FixedHeadTable";
import { useUrlContextSnapshot, setUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import { useEstimateMemo } from "../hooks/useEstimateMemo";

// 001 ~ 030
function pad3(n) {
  return String(n).padStart(3, "0");
}

export default function EstimateMemo() {
  const ctx = useUrlContextSnapshot({
    storageKey: "estimateMemoCtx",
    keys: ["est_serial", "carno"],
    cleanPath: "/estimate-memo",
  });

  const [estSerial, setEstSerial] = useState(() => ctx?.est_serial || "");
  const [carNo, setCarNo] = useState(() => ctx?.carno || "");
  const hydratedRef = useRef(false);
  const inputRefs = useRef({}); // { [seq:number]: HTMLInputElement|null }

  // ✅ 1~30 고정
  const initialRows = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        seq: i + 1,
        text: "",
      })),
    []
  );

  const [rows, setRows] = useState(initialRows);
  const [activeSeq, setActiveSeq] = useState(null);
  const { loading, fetchRows, saveRows, saveRowsBeacon } = useEstimateMemo();

  // stale closure 방지용 refs
  const rowsRef = useRef(rows);
  const estSerialRef = useRef(estSerial);
  const prevEstSerialRef = useRef('');
  const saveRowsRef = useRef(saveRows);
  const saveRowsBeaconRef = useRef(saveRowsBeacon);

  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => { estSerialRef.current = estSerial; }, [estSerial]);
  useEffect(() => { saveRowsRef.current = saveRows; }, [saveRows]);
  useEffect(() => { saveRowsBeaconRef.current = saveRowsBeacon; }, [saveRowsBeacon]);

  const resetRows = () => setRows(initialRows);

  // ✅ URL ctx 들어오면 스냅샷 저장 + 최초 1회 state 보정
  useEffect(() => {
    if (!ctx?.est_serial && !ctx?.carno) return;

    setUrlContextSnapshot("estimateMemoCtx", {
      est_serial: ctx?.est_serial || "",
      carno: ctx?.carno || "",
    });

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx?.est_serial && !estSerial) setEstSerial(ctx.est_serial);
    if (ctx?.carno && !carNo) setCarNo(ctx.carno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.est_serial, ctx?.carno]);

  // ✅ 부모 선택(estSerial) 변경 시 이전 데이터 저장 후 신규 조회
  useEffect(() => {
    // 이전 est_serial 데이터 저장 (변경 시에만)
    if (prevEstSerialRef.current && prevEstSerialRef.current !== estSerial) {
      saveRowsRef.current(prevEstSerialRef.current, rowsRef.current);
    }
    prevEstSerialRef.current = estSerial;

    if (!estSerial) {
      resetRows();
      return;
    }
    fetchRows(estSerial).then((result) => {
      if (result) {
        setRows(result);
        setActiveSeq(null);
      }
    });
    inputRefs.current = {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estSerial]);

  // ✅ 창 닫힐 때 현재 데이터 저장 (keepalive fetch — 언로드 중 취소 방지)
  useEffect(() => {
    const onBeforeUnload = () => {
      if (estSerialRef.current) {
        saveRowsBeaconRef.current(estSerialRef.current, rowsRef.current);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 부모에서 postMessage로 ctx 갱신
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "ESTIMATE_MEMO_SET_CTX") return;

      const p = msg.payload || {};
      const merged = {
        est_serial: typeof p.est_serial === "undefined" ? estSerial : (p.est_serial || ""),
        carno: typeof p.carno === "undefined" ? carNo : (p.carno || ""),
      };

      setUrlContextSnapshot("estimateMemoCtx", merged);

      if (merged.est_serial !== estSerial) setEstSerial(merged.est_serial);
      if (merged.carno !== carNo) setCarNo(merged.carno);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [estSerial, carNo]);

  // ===== 입력/삭제 =====
  const onChangeText = (seq, value) => {
    setRows((prev) => prev.map((r) => (r.seq === seq ? { ...r, text: value } : r)));
  };

  const onDeleteRow = (seq) => {
    const current = rowsRef.current;
    const idx = current.findIndex((r) => r.seq === seq);
    if (idx < 0) return;

    const updated = current.map((r, i) => {
      if (i < idx) return r;                                                         // 삭제 전 행: 변경 없음
      if (i < current.length - 1) return { ...r, text: current[i + 1].text ?? "" }; // 아래 행 당기기
      return { ...r, text: "" };                                                     // 마지막 행: 빈값
    });

    setRows(updated);
    if (estSerialRef.current) saveRowsRef.current(estSerialRef.current, updated);
  };

  const onDeleteAll = () => {
    const updated = rowsRef.current.map((r) => ({ ...r, text: "" }));
    setRows(updated);
    if (estSerialRef.current) saveRowsRef.current(estSerialRef.current, updated);
  };

  // ===== 드래그 자리이동 =====
  const dragFromSeqRef = useRef(null);

  // “내용(text)”만 삽입 이동(shift). 순번 1~30은 고정
  const moveTextInsert = (fromSeq, toSeq) => {
    if (!fromSeq || !toSeq || fromSeq === toSeq) return;

    setRows((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((r) => r.seq === fromSeq);
      const toIdx = next.findIndex((r) => r.seq === toSeq);
      if (fromIdx < 0 || toIdx < 0) return prev;

      const picked = next[fromIdx].text ?? "";

      // from 텍스트 제거
      next[fromIdx] = { ...next[fromIdx], text: "" };

      // shift
      if (fromIdx < toIdx) {
        for (let i = fromIdx; i < toIdx; i++) {
          next[i] = { ...next[i], text: next[i + 1].text };
        }
      } else {
        for (let i = fromIdx; i > toIdx; i--) {
          next[i] = { ...next[i], text: next[i - 1].text };
        }
      }

      // insert
      next[toIdx] = { ...next[toIdx], text: picked };
      return next;
    });

    setActiveSeq(toSeq);
  };

  // drop 공통 처리(셀 안에서 받음)
  const allowDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };

  const onDropToSeq = (e, toSeq) => {
    e.preventDefault();
    const from =
      dragFromSeqRef.current ??
      Number(e.dataTransfer?.getData("text/plain") || 0);

    dragFromSeqRef.current = null;
    moveTextInsert(from, toSeq);
  };

  // seq별 input ref 저장

  const focusSeq = (seq) => {
    if (!seq || seq < 1 || seq > 30) return;
    setActiveSeq(seq);

    // 렌더 이후에도 안전하게
    requestAnimationFrame(() => {
      const el = inputRefs.current?.[seq];
      if (el && typeof el.focus === "function") {
        el.focus();
        // 커서 맨 뒤로(선택은 원하면 주석)
        const len = el.value?.length ?? 0;
        try {
          el.setSelectionRange(len, len);
        } catch {}
      }
    });
  };

  const onMemoKeyDown = (e, seq) => {
    const key = e.key;

    // 조합키(한글 입력 등) 중엔 건드리지 않기
    if (e.isComposing) return;

    if (key === "ArrowUp") {
      e.preventDefault();
      focusSeq(Math.max(1, seq - 1));
      return;
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      focusSeq(Math.min(30, seq + 1));
      return;
    }
    if (key === "Enter") {
      // Enter = 다음 라인
      e.preventDefault();
      focusSeq(Math.min(30, seq + 1));
    }
  };
  
  // ===== FixedHeadTable columns =====
  const columns = useMemo(
    () => [
      {
        key: "drag",
        title: "",
        width: "60px",
        align: "center",
        render: (_v, row) => (
          <button
            type="button"
            className="rounded-md p-2 hover:bg-zinc-100 cursor-grab active:cursor-grabbing"
            title="드래그해서 자리이동"
            draggable
            onDragStart={(e) => {
              dragFromSeqRef.current = row.seq;
              e.dataTransfer?.setData("text/plain", String(row.seq)); // firefox 호환
              if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              e.stopPropagation();
            }}
            onDragEnd={() => {
              dragFromSeqRef.current = null;
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-zinc-500" />
          </button>
        ),
      },
      {
        key: "seq",
        title: "순번",
        width: "90px",
        align: "center",
        render: (v, row) => (
          <div
            className="w-full h-full flex items-center justify-center"
            onDragOver={allowDrop}
            onDrop={(e) => onDropToSeq(e, row.seq)}
          >
            <span className="font-semibold text-zinc-700">{pad3(v)}</span>
          </div>
        ),
      },
      {
        key: "text",
        title: "메모 내용",
        align: "left",
        render: (v, row) => (
          <div onDragOver={allowDrop} onDrop={(e) => onDropToSeq(e, row.seq)}>
            <input
              ref={(el) => {
                inputRefs.current[row.seq] = el;   // 핵심: ref 등록
              }}
              value={v || ""}
              onChange={(e) => onChangeText(row.seq, e.target.value)}
              onKeyDown={(e) => onMemoKeyDown(e, row.seq)}
              className="w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-300 focus:bg-white"
              onFocus={() => setActiveSeq(row.seq)}   // 포커스되면 행 선택
            />
          </div>
        ),
      },
      {
        key: "actions",
        title: "기능",
        width: "120px",
        align: "center",
        render: (_v, row) => (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRow(row.seq);
            }}
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        ),
      },
    ],
    [onChangeText]
  );

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">견적메모</div>
            <div className="mt-1 text-sm text-zinc-500">
              차량번호 <span className="text-zinc-800 font-semibold">{carNo || "-"}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 min-h-0 flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onDeleteAll}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <Trash2 className="h-4 w-4" />
            전체삭제
          </button>

          {/* <div className="ml-auto flex items-center gap-3">
            {loading && <div className="text-xs text-zinc-400">불러오는 중...</div>}
            <div className="text-xs text-zinc-400">est_serial: {estSerial || "-"}</div>
          </div> */}
        </div>

        {/* Table Card */}
        <div className="rounded-md border border-zinc-200 bg-white overflow-hidden flex flex-col min-h-0 flex-1">
          <FixedHeadTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.seq}
            selectedKey={activeSeq}
            // onRowClick={(row) => setActiveSeq(row.seq)}
            onRowClick={(row) => focusSeq(row.seq)}
            height="100%"
            bodyClassName="min-h-0 flex-1"
          />

          <div className="px-3 py-2 text-xs text-zinc-500 border-t border-zinc-200 bg-white flex-none">
            자리이동은 “내용”만 드래그로 원하는 위치에 삽입 이동합니다. (순번 001~030 고정)
          </div>
        </div>
      </div>
    </div>
  );
}
