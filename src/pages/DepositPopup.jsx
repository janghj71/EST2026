import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Calendar } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useUrlContextSnapshot, setUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import { useAlert } from "../alerts";
import { useDepositSave } from "../hooks/useDepositSave";
import { ymd } from "../utils/dateUtils";
import { unformatNumber } from "../utils/numberFormat";


/**
 * 부모창 청구보험목록 row -> DepositItem 으로 normalize
 * (필드명은 부모 데이터에 맞춰 여기에서 흡수)
 */
function normalizeClaimRow(row) {
  if (!row) {
    return {
      estbo_seqno: "",
      bocomname: "",
      regno: "",
      reqtotal: 0,
      incom: 0,
      inday: "",
    };
  }

  const estbo_seqno = row.estbo_seqno || "";
  const bocomname   = row.bocomname   || "";
  const regno       = row.regno       || "";
  const reqtotal    = Number(row.reqtotal || 0) || 0;
  const incom       = Number(row.incom    || 0) || 0;
  const inday       = row.inday       || "";

  return { estbo_seqno, bocomname, regno, reqtotal, incom, inday };
}

export default function DepositPopup() {
  const { success, error } = useAlert();
  const { saveDeposit } = useDepositSave();
  const ctx = useUrlContextSnapshot({
    storageKey: "depositCtx",
    keys: ["est_serial", "carno"],
    cleanPath: "/estimate-deposit",
  });

  const [estSerial, setEstSerial] = useState(() => ctx?.est_serial || "");
  const [carNo, setCarNo] = useState(() => ctx?.carno || "");

  // 부모에서 내려주는 원본 claims
  const [claims, setClaims] = useState(() => {
    try {
      const raw = sessionStorage.getItem("depositCtx");
      const snap = raw ? JSON.parse(raw) : null;
      return Array.isArray(snap?.claims) ? snap.claims.slice(0, 2) : [];
    } catch {
      return [];
    }
  });

  // 실제 편집/저장할 items(최대2)
  const emptyItems = useMemo(
    () => [
      { estbo_seqno: "", bocomname: "", regno: "", reqtotal: 0, incom: 0, inday: "" },
      { estbo_seqno: "", bocomname: "", regno: "", reqtotal: 0, incom: 0, inday: "" },
    ],
    []
  );
  const [items, setItems] = useState(emptyItems);

  const hydratedRef = useRef(false);

  // URL ctx 들어오면 스냅샷 저장 + 최초 1회 state 보정
  useEffect(() => {
    if (!ctx?.est_serial && !ctx?.carno) return;

    let prev = {};
    try {
      const raw = sessionStorage.getItem("depositCtx");
      prev = raw ? JSON.parse(raw) : {};
    } catch { /* empty */ }

    setUrlContextSnapshot("depositCtx", {
      ...prev,
      est_serial: ctx?.est_serial || prev.est_serial || "",
      carno: ctx?.carno || prev.carno || "",
    });

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx?.est_serial && !estSerial) setEstSerial(ctx.est_serial);
    if (ctx?.carno && !carNo) setCarNo(ctx.carno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.est_serial, ctx?.carno]);

  // 부모 선택 변경(postMessage) 수신 (ctx + claims)
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "ESTIMATE_DEPOSIT_SET_CTX") return;

      const p = msg.payload || {};
      const merged = {
        est_serial: typeof p.est_serial === "undefined" ? estSerial : p.est_serial || "",
        carno: typeof p.carno === "undefined" ? carNo : p.carno || "",
      };

      if (merged.est_serial !== estSerial) setEstSerial(merged.est_serial);
      if (merged.carno !== carNo) setCarNo(merged.carno);

      const nextClaims = Array.isArray(p.claims) ? p.claims.slice(0, 2) : undefined;
      if (nextClaims) setClaims(nextClaims);

      // 여기서만 snapshot 저장 (claims 포함)
      setUrlContextSnapshot("depositCtx", {
        ...merged,
        ...(nextClaims ? { claims: nextClaims } : {}),
      });
      
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [estSerial, carNo]);

  // ✅ claims가 바뀌면 items(편집용)으로 매핑해서 반영 
  useEffect(() => {
    if (!claims || claims.length === 0) {
      setItems(emptyItems);
      return;
    }

    const next = [...emptyItems];
    claims.slice(0, 2).forEach((row, i) => {
      next[i] = normalizeClaimRow(row);
    });
    setItems(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims]);

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const onSave = async () => {
    try {
      // 보이는 항목(estbo_seqno 있는 것)만 순차 저장
      const targets = visibleItems.filter((it) => it.estbo_seqno);
      for (const it of targets) {
        await saveDeposit({
          est_serial:  estSerial,
          estbo_seqno: it.estbo_seqno,
          inday:       it.inday  || "",
          incom:       it.incom  ?? 0,
        });
      }
      await success("저장이 완료되었습니다.");
      // 부모창 청구보험 목록 리프레시 후 닫기
      try {
        window.opener?.postMessage(
          { type: "ESTIMATE_DEPOSIT_SAVED", payload: { est_serial: estSerial } },
          window.location.origin,
        );
      } catch { /* empty */ }
      window.close();
    } catch (err) {
      error(err?.message ?? "저장 실패");
    }
  };

  const visibleItems = useMemo(() => {
    // 0번은 항상 보이게(빈 화면 방지)
    return items.filter((it, idx) => idx === 0 || it.bocomname || it.regno || it.reqtotal);
  }, [items]);

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">견적입금</div>
            <div className="mt-1 text-sm text-zinc-500">
              차량번호 <span className="text-zinc-800 font-semibold">{carNo || "-"}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={Save} label="저장" onClick={onSave} />
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 min-h-0 flex-1 overflow-hidden flex flex-col gap-4">
        <div className="flex-1 min-h-0 grid grid-cols-1 gap-4">
          {visibleItems.map((it, idx) => (
            <DepositCard
              key={idx}
              idx={idx}
              item={it}
              onChange={(patch) => updateItem(idx, patch)}
              onSetToday={() => updateItem(idx, { inday: ymd(new Date()) })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DepositCard({ idx, item, onChange, onSetToday }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="text-sm text-zinc-500">
          청구 보험사
        </div>

        <div className="text-base font-semibold text-zinc-900">
          {item.bocomname || "-"}
        </div>

        <div className="ml-auto text-sm text-zinc-500">
          접수번호 
        </div>

        <div className="text-base font-semibold text-zinc-900">
          {item.regno || "-"}
        </div>


      </div>


      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="청구액">
          <input
            value={Number(item.reqtotal || 0).toLocaleString()}
            readOnly
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-sm outline-none"
          />
        </Field>

        <Field label="입금금액">
          <input
            value={item.incom ? Number(item.incom).toLocaleString() : ""}
            onChange={(e) =>
              onChange({ incom: Number(unformatNumber(e.target.value) || 0) })
            }
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="0"
          />
        </Field>

        <Field label="입금일자">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={item.inday || ""}
              onChange={(e) => onChange({ inday: e.target.value })}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={onSetToday}
              className="rounded-md border border-zinc-200 bg-white p-2 hover:bg-zinc-50"
              title="오늘"
            >
              <Calendar className="h-4 w-4 text-zinc-600" />
            </button>
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-zinc-700">{label}</div>
      {children}
    </div>
  );
}
