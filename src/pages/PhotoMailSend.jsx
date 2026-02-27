import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Mail, X } from "lucide-react";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import { useEstimate } from "../hooks/useEstimate";
import { useTbCode } from "../hooks/useTbCode";
import { usePhoto } from "../hooks/usePhoto";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3">
      <div className="pt-2 text-sm font-semibold text-zinc-800">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Check({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-zinc-800 select-none">
      <input
        type="checkbox"
        className="h-4 w-4 accent-zinc-800"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function toEmail(row) {
  const id = (row?.boman_email_acc || "").trim();
  const domain = (row?.boman_email_smtp || "").trim();
  if (!id || !domain) return "";
  return `${id}@${domain}`;
}

export default function PhotoMailSend() {
  const { info, warning } = useAlert();
  const { est_serial: estFromPath = "" } = useParams();

  const snap = useUrlContextSnapshot({
    storageKey: "photoMailSendCtx",
    keys: ["est_serial", "carno"],
    cleanPath: estFromPath ? `/photo-mail-send/${estFromPath}` : "/photo-mail-send",
  });

  const [estId, setEstId] = useState(() => snap?.est_serial || estFromPath || "");
  const [carNo, setCarNo] = useState(() => snap?.carno || "");
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!snap?.est_serial && !snap?.carno && !estFromPath) return;

    try {
      sessionStorage.setItem(
        "photoMailSendCtx",
        JSON.stringify({
          est_serial: snap?.est_serial || estFromPath || estId,
          carno: snap?.carno || carNo,
        })
      );
    } catch {
      /* empty */
    }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (snap?.est_serial && !estId) setEstId(snap.est_serial);
    if (!snap?.est_serial && estFromPath && !estId) setEstId(estFromPath);
    if (snap?.carno && !carNo) setCarNo(snap.carno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.est_serial, snap?.carno, estFromPath]);

  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "PHOTO_MAIL_SET_CTX") return;

      const next = msg.payload || {};
      const nextEstId = next?.est_serial || "";
      const nextCarNo = next?.carno || "";

      try {
        sessionStorage.setItem(
          "photoMailSendCtx",
          JSON.stringify({
            est_serial: nextEstId || estId,
            carno: nextCarNo || carNo,
          })
        );
      } catch {
        /* empty */
      }

      if (nextEstId) setEstId(nextEstId);
      if (nextCarNo) setCarNo(nextCarNo);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [estId, carNo]);

  const { claims, fetchClaims } = useEstimate();
  const { codes: photoCodes } = useTbCode("PTOKND");
  const { photos, fetchPhotos } = usePhoto();

  useEffect(() => {
    if (estId) fetchPhotos(estId);
  }, [estId, fetchPhotos]);

  useEffect(() => {
    if (estId) fetchClaims(estId);
  }, [estId, fetchClaims]);

  const CATS = useMemo(() => {
    const cats = [{ key: "all", label: "전체사진" }];
    photoCodes.forEach((c) => cats.push({ key: c.value, label: c.label }));
    return cats;
  }, [photoCodes]);

  const [checkedCats, setCheckedCats] = useState({ all: true });

  useEffect(() => {
    const init = {};
    CATS.forEach((c) => {
      init[c.key] = c.key === "all";
    });
    setCheckedCats(init);
  }, [CATS]);

  const enabledCatKeys = useMemo(() => {
    const keys = Object.entries(checkedCats)
      .filter(([k, v]) => v)
      .map(([k]) => k);
    if (keys.includes("all")) return null;
    return keys;
  }, [checkedCats]);

  const filteredPhotos = useMemo(() => {
    if (!enabledCatKeys) return photos;
    return photos.filter(
      (p) => enabledCatKeys.includes(p.photokind) || (enabledCatKeys.includes("9") && !p.photokind)
    );
  }, [photos, enabledCatKeys]);

  const toggleCat = (key, on) => {
    setCheckedCats((prev) => {
      const next = { ...prev };
      if (key === "all") {
        CATS.forEach((c) => {
          next[c.key] = c.key === "all" ? on : false;
        });
        if (!on) next.all = false;
        return next;
      }

      next.all = false;
      next[key] = on;
      const any = Object.entries(next).some(([k, v]) => k !== "all" && v);
      if (!any) {
        CATS.forEach((c) => {
          next[c.key] = c.key === "all";
        });
      }
      return next;
    });
  };

  const contactOptions = useMemo(() => {
    return claims
      .map((row) => ({
        key: `${row.estbo_seqno || ""}`,
        label: row.boman_nm || "(이름없음)",
        email: toEmail(row),
      }))
      .filter((row) => row.key.trim() !== "");
  }, [claims]);

  const [contactKey, setContactKey] = useState("");
  const [toEmailAddr, setToEmailAddr] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    setSubject(carNo ? `${carNo} 차량의 사진입니다.` : "차량의 사진입니다.");
  }, [carNo]);

  useEffect(() => {
    if (!contactKey) return;
    const picked = contactOptions.find((x) => x.key === contactKey);
    if (!picked?.email) return;
    setToEmailAddr(picked.email);
  }, [contactKey, contactOptions]);

  const onSendMail = async () => {
    if (!toEmailAddr.trim()) {
      warning("받는사람 이메일을 입력하세요.");
      return;
    }

    const payload = {
      est_serial: estId,
      carno: carNo,
      to: toEmailAddr.trim(),
      subject: subject.trim(),
      content,
      categories: enabledCatKeys || ["all"],
      photoCount: filteredPhotos.length,
    };
    console.log("SEND_PHOTO_MAIL", payload);
    await info(`메일발송(준비)\n첨부 사진: ${filteredPhotos.length}장`);
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">메일발송</div>
            <div className="text-sm text-zinc-500">
              {carNo ? `차량번호: ${carNo}` : "차량번호: -"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={Mail} label="메일발송"  onClick={onSendMail} />
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl rounded-lg border border-zinc-200 bg-zinc-50 p-5 space-y-4">
          <Row label="보험 담당자">
            <select
              value={contactKey}
              onChange={(e) => setContactKey(e.target.value)}
              className="w-full select-base h-11"
            >
              <option value="">선택하세요</option>
              {contactOptions.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="받는사람 이메일">
            <input
              value={toEmailAddr}
              onChange={(e) => setToEmailAddr(e.target.value)}
              className="w-full h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none focus:border-zinc-500"
            />
          </Row>

          <Row label="제목">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none focus:border-zinc-500"
            />
          </Row>

          <Row label="첨부파일 종류">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                {CATS.map((c) => (
                  <Check
                    key={c.key}
                    checked={!!checkedCats[c.key]}
                    onChange={(on) => toggleCat(c.key, on)}
                    label={c.label}
                  />
                ))}
              </div>
              <div className="text-sm text-zinc-500">첨부예정: {filteredPhotos.length}장</div>
            </div>
          </Row>

          <Row label="내용">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="메일 내용을 입력하세요"
              rows={10}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-base leading-6 outline-none focus:border-zinc-500 resize-y min-h-[240px]"
            />
          </Row>

        </div>
      </div>
    </div>
  );
}
