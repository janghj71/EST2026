import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import {
  Mail,
  Printer,
  RotateCw,
  Download,
  Trash2,
  X,
  ChevronDown,
  Save,
} from "lucide-react";
import IconBtn from "../components/IconBtn";
import { openCenteredWindow } from "../utils/popup";
import { buildPhotoPrintHtml } from "../prints/photoPrintHtml";
import { useAlert } from "../alerts";
import { usePhoto } from "../hooks/usePhoto";
import { useTbCode } from "../hooks/useTbCode";
import { getUserid } from "../api/config";

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

function CatPill({ label }) {
  return (
    <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
      {label}
    </span>
  );
}

export default function PhotoViewer() {
  const { warning, info, confirm, choice } = useAlert();
  const ctx = useUrlContextSnapshot({
    storageKey: "photoViewerCtx",
    keys: ["est_serial", "carno"],
    cleanPath: "/photo-viewer",
  });

  const [estId, setEstId] = useState(() => {
    if (ctx.est_serial) return ctx.est_serial;
    try {
      const raw = sessionStorage.getItem("photoViewerCtx");
      const saved = raw ? JSON.parse(raw) : null;
      return saved?.est_serial || "";
    } catch {
      return "";
    }
  });

  const [carNo, setCarNo] = useState(() => {
    if (ctx.carno) return ctx.carno;
    try {
      const raw = sessionStorage.getItem("photoViewerCtx");
      const saved = raw ? JSON.parse(raw) : null;
      return saved?.carno || "";
    } catch {
      return "";
    }
  });

  // ── API hooks ──
  const { photos, loading: photoLoading, error: photoError, fetchPhotos, saving, savePhotoOrder, deleting, deletePhoto, creating, createPhoto } = usePhoto();
  const { codes: photoCodes } = useTbCode("PTOKND");

  // tbcode("PTOKND") → CATS 동적 생성 ("전체사진"은 tbcode에 없으므로 하드코딩)
  const CATS = useMemo(() => {
    const cats = [{ key: "all", label: "전체사진" }];
    photoCodes.forEach((c) => {
      cats.push({ key: c.value, label: c.label });
    });
    return cats;
  }, [photoCodes]);

  // 조회 에러 → 메시지 표시
  useEffect(() => {
    if (photoError?.message) warning(photoError.message || "사진 조회에 실패했습니다.");
  }, [photoError]); // eslint-disable-line react-hooks/exhaustive-deps

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!ctx.est_serial && !ctx.carno) return;

    // 1) ctx는 무조건 저장 (cleanPath/F5 대비)
    try {
      sessionStorage.setItem(
        "photoViewerCtx",
        JSON.stringify({
          est_serial: ctx.est_serial || "",
          carno: ctx.carno || "",
        })
      );
    } catch { /* empty */ }

    // 2) 첫 로딩에서만(딱 1회) state 보정
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx.est_serial && !estId) setEstId(ctx.est_serial);
    if (ctx.carno && !carNo) setCarNo(ctx.carno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.est_serial, ctx.carno]);

  // estId 변경 → 사진 조회
  useEffect(() => {
    if (estId) fetchPhotos(estId);
  }, [estId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg) return;

      if (msg.type === "PHOTO_VIEWER_SET_CTX") {
        const nextEstId = msg?.payload?.est_serial || "";
        const nextCarNo = msg?.payload?.carno || "";

        if (!nextEstId && !nextCarNo) return;

        // sessionStorage 저장 → F5에도 유지
        try {
          sessionStorage.setItem(
            "photoViewerCtx",
            JSON.stringify({
              est_serial: nextEstId || estId,
              carno: nextCarNo || carNo,
            }));
        } catch { /* empty */ }

        if (nextEstId) setEstId(nextEstId);
        if (nextCarNo) setCarNo(nextCarNo);
      }

      // PhotoPopup 저장 완료 → 사진 재조회
      if (msg.type === "PHOTO_SAVED") {
        const serial = msg?.payload?.est_serial || estId;
        if (serial) {
          setCacheBuster((v) => v + 1);
          fetchPhotos(serial);
        }
      }

    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // 자식 팝업(예: PhotoPopup) 추적
  const childWinsRef = useRef(new Set());

  const registerChildWin = (w) => {
    if (!w) return;
    childWinsRef.current.add(w);

    // 이미 닫힌 창은 정리
    try {
      if (w.closed) childWinsRef.current.delete(w);
    } catch { /* empty */ }

    // 주기적으로 닫힌 창 정리(가벼움)
    setTimeout(() => {
      try {
        if (w.closed) childWinsRef.current.delete(w);
      } catch { /* empty */ }
    }, 500);
  };

  const closeAllChildWins = () => {
    childWinsRef.current.forEach((w) => {
      try {
        if (w && !w.closed) w.close();
      } catch { /* empty */ }
    });
    childWinsRef.current.clear();
  };

  // 숫자 기반 cache-buster로 통일 (문자열/숫자 혼합 방지)
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());

  const bustUrl = (url) => {
    if (!url) return "";
    const base = url.split("?")[0];
    return `${base}?_cb=${cacheBuster}`;
  };

  const keepPrevOrder = (nextItems, prevItems) => {
    if (!prevItems?.length) return nextItems;
  
    const prevIndex = new Map(
      prevItems.map((it, idx) => [String(it.id), idx])
    );
  
    return [...nextItems].sort((a, b) => {
      const ai = prevIndex.has(String(a.id)) ? prevIndex.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
      const bi = prevIndex.has(String(b.id)) ? prevIndex.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
  
      if (ai !== bi) return ai - bi;
  
      // 둘 다 신규/미매칭이면 서버 순서(photo_order) 유지
      const ao = Number(a.photo_order) || 0;
      const bo = Number(b.photo_order) || 0;
      return ao - bo;
    });
  };


  // API 사진 데이터 → 로컬 items (photo_order 순 정렬은 hook에서 이미 처리됨)
  const [items, setItems] = useState([]);
  const forceServerOrderRef = useRef(false);

  useEffect(() => {
    if (photos.length > 0) {
      const mapped = photos.map((p) => {
        const rawUrl = p.file_url || "";
        const baseUrl = rawUrl.split("?")[0];
        const urlFileName = baseUrl.split("/").pop() || "";

        return {
          id: p.photo_seqno || `${p.photokind}_${p.photo_order}`,
          cat: p.photokind || "",
          name: p.memo || urlFileName || "사진",
          fileName: urlFileName,
          sourceUrl: baseUrl,
          url: bustUrl(rawUrl),
          memo: p.memo || "",
          photo_order: p.photo_order,
          _raw: p,
        };
      });

      if (forceServerOrderRef.current) {
        // 새로고침 시: 서버 순서(photo_order) 그대로
        setItems(mapped);
        forceServerOrderRef.current = false;
      } else {
        // 그 외: 기존 사용자 정렬 유지
        setItems((prev) => keepPrevOrder(mapped, prev));
      }

    } else {
      setItems([]);
      forceServerOrderRef.current = false;
    }
  }, [photos, cacheBuster]); // eslint-disable-line react-hooks/exhaustive-deps


  const [checkedCats, setCheckedCats] = useState({ all: true });

  // CATS 목록이 변경되면 checkedCats 초기화 (전체사진 ON)
  useEffect(() => {
    const init = {};
    CATS.forEach((c) => (init[c.key] = c.key === "all"));
    setCheckedCats(init);
  }, [CATS]);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [printOpen, setPrintOpen] = useState(false);

  // drag state
  const dragIdRef = useRef(null);

  const enabledCatKeys = useMemo(() => {
    const keys = Object.entries(checkedCats)
      .filter(([k, v]) => v)
      .map(([k]) => k);

    // all만 체크면 전체
    if (keys.includes("all")) return null;
    return keys;
  }, [checkedCats]);

  const viewItems = useMemo(() => {
    if (!enabledCatKeys) return items;
    return items.filter((it) =>
      enabledCatKeys.includes(it.cat) ||
      (enabledCatKeys.includes("9") && !it.cat)
    );
  }, [items, enabledCatKeys]);

  const toggleCat = (key, on) => {
    setCheckedCats((prev) => {
      const next = { ...prev };

      if (key === "all") {
        // 전체 체크하면 나머지 해제
        CATS.forEach((c) => (next[c.key] = c.key === "all" ? on : false));
        if (!on) next.all = false;
        return next;
      }

      next.all = false;
      next[key] = on;

      // 아무것도 없으면 전체로
      const any = Object.entries(next).some(([k, v]) => k !== "all" && v);
      if (!any) {
        CATS.forEach((c) => (next[c.key] = c.key === "all"));
      }
      return next;
    });
  };

  const openPhotoPopup = (it) => {
    const popupImgUrl =
      it?.sourceUrl ||
      (it?._raw?.file_url ? it._raw.file_url.split("?")[0] : "") ||
      "";
      
    const win = openCenteredWindow("/photo-popup", "photoPopup", 800, 1000, {
      windowFeatures: { scrollbars: "no", resizable: "yes" },
      postMessage: {
        type: "PHOTO_POPUP_SET_CTX",
        payload: {
          estId,
          carNo,
          file: it?.fileName || "",
          // imgUrl: it?.url || "",
          imgUrl: popupImgUrl,
          cat: it?.cat || "",
          memo: it?.memo || "",
          photoSeqno: it?._raw?.photo_seqno || "",
          photoOrder: it?._raw?.photo_order || "",
        },
      },
    });
    registerChildWin(win);
  };


  const onPick = (id, multi) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!multi) next.clear();
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveItem = (dragId, overId) => {
    if (!dragId || !overId || dragId === overId) return;

    setItems((prev) => {
      const from = prev.findIndex((x) => x.id === dragId);
      const to = prev.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return prev;

      const next = [...prev];
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
  };

  // 파일 추가(드랍/클릭) → 서버 업로드
  const fileInputRef = useRef(null);

  const addFiles = async (files) => {
    const arr = Array.from(files || []).filter((f) => /^image\/(jpeg|png|jpg)/i.test(f.type));
    if (arr.length === 0) return;
    if (!estId) { warning("견적번호가 없습니다."); return; }

    // photokind 결정: 전체사진(all)이면 "" / 아니면 첫 번째 체크된 카테고리 key
    const checkedKeys = Object.entries(checkedCats)
      .filter(([k, v]) => v && k !== "all")
      .map(([k]) => k);
    const photokind = checkedKeys.length > 0 ? checkedKeys[0] : "9";

    try {
      await createPhoto({
        estSerial: estId,
        photokind,
        memo: "",
        userid: getUserid(),
        carno: carNo,
        files: arr,
      });
      fetchPhotos(estId);
    } catch (e) {
      warning(e.message || "사진 추가에 실패했습니다.");
    }
  };

  // 자리이동(photo_order) 저장
  const onSave = async () => {
    if (!estId) return;
    // items 배열의 현재 순서를 photo_order에 반영
    const updates = items
      .filter((it) => it._raw)  // API에서 온 항목만 (로컬 추가 제외)
      .map((it, idx) => ({
        photo_seqno: it._raw.photo_seqno,
        photokind: it._raw.photokind,
        photo_order: String(idx + 1).padStart(3, "0"),
        memo: it._raw.memo || "",
      }));
    if (updates.length === 0) return;
    try {
      await savePhotoOrder(estId, updates);
      await info("저장 완료");
      fetchPhotos(estId);
    } catch (e) {
      warning(e.message || "저장에 실패했습니다.");
    }
  };

  const onRefresh = () => {
    if (estId) {
      forceServerOrderRef.current = true;
      setCacheBuster((v) => v + 1);
      fetchPhotos(estId);
    }
    setSelectedIds(new Set());
  };

  const downloadPhotos = async (targets) => {
    if (!targets || targets.length === 0) return;
  
    const failed = [];
  
    for (const photo of targets) {
      try {
        // 표시용 URL(it.url) 대신 원본 URL(sourceUrl) 우선 사용
        const src = photo.sourceUrl || photo.url;
        if (!src) throw new Error("다운로드 URL이 없습니다.");
  
        const res = await fetch(src, { mode: "cors" });
        if (!res.ok) throw new Error(`(${res.status}) ${res.statusText}`);
  
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
  
        const a = document.createElement("a");
        const fallbackName = src.split("?")[0].split("/").pop() || `${photo.id}.jpg`;
        const filename = photo.fileName || fallbackName;
  
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
  
        URL.revokeObjectURL(objUrl);
      } catch (err) {
        failed.push(photo.fileName || photo.name || photo.id);
        console.error("사진 다운로드 실패:", err);
      }
    }
  
    if (failed.length > 0) {
      warning(`일부 사진 다운로드 실패 (${failed.length}건)`);
    } else {
      await info(`다운로드 완료 (${targets.length}건)`);
    }
  };

  
  const onDownload = async () => {
    if (items.length === 0) {
      warning("다운로드할 사진이 없습니다.");
      return;
    }
  
    // 1) 선택 우선 (멀티/단독 모두 포함)
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length >= 2) {
      const ok = await confirm(`선택한 사진 ${selectedItems.length}장을 다운로드할까요?`);
      if (!ok) return;
      await downloadPhotos(selectedItems);
      return;
    }
    if (selectedItems.length === 1) {
      const mode = await choice(
        `다운로드 대상을 선택하세요.\n현재 출력 전체: ${viewItems.length}장`,
        "다운로드",
        [
          { key: "single", label: "1장", variant: "primary" },
          { key: "all", label: "전체", variant: "secondary" },
          { key: "cancel", label: "취소", variant: "ghost" },
        ]
      );
    
      if (mode === "single") {
        await downloadPhotos(selectedItems);
        return;
      }
    
      if (mode === "all") {
        await downloadPhotos(viewItems);
        return;
      }
    
      return;
    }
    

    // 2) 선택이 없으면 필터된 전체
    const isFiltered = viewItems.length > 0 && viewItems.length !== items.length;
    if (isFiltered) {
      const ok = await confirm(`필터된 사진 ${viewItems.length}장을 다운로드할까요?`);
      if (!ok) return;
      await downloadPhotos(viewItems);
      return;
    }

    // 3) 선택도 필터도 없으면 중단
    warning("선택한 사진이 없고 필터도 적용되지 않았습니다.");

  };

  const onMail = () => {
    alert("메일 전송 팝업/연동은 다음 단계로 연결하면 됩니다.");
  };

  const onPrint = (count) => {
    setPrintOpen(false);

    if (viewItems.length === 0) {
      warning('인쇄할 사진이 없습니다.');
      return;
    }

    const html = buildPhotoPrintHtml({ viewItems, count, carNo, checkedCats, CATS });

    const popupName = `PrintWindow_${Date.now()}`;
    const popup = openCenteredWindow('about:blank', popupName, 900, 700, {
      windowFeatures: { toolbar: 'no', location: 'no', menubar: 'no', status: 'no', resizable: 'yes' },
    });
    popup.document.write(html);
    popup.document.close();
  };

  const onRemoveSelected = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm(`선택한 사진 ${selectedIds.size}장을 삭제할까요?`);
    if (!ok) return;

    // API에서 온 항목(서버 삭제) vs 로컬 추가 항목 분리
    const serverItems = items.filter((x) => selectedIds.has(x.id) && x._raw?.photo_seqno);
    const localOnlyIds = [...selectedIds].filter((id) => {
      const it = items.find((x) => x.id === id);
      return it && !it._raw?.photo_seqno;
    });

    try {
      // 서버 삭제: 순차 호출
      for (const it of serverItems) {
        await deletePhoto(estId, it._raw.photo_seqno);
      }

      // 로컬 전용 항목 제거
      if (localOnlyIds.length > 0) {
        setItems((prev) => prev.filter((x) => !localOnlyIds.includes(x.id)));
      }

      setSelectedIds(new Set());

      // 서버 삭제가 있었으면 재조회
      if (serverItems.length > 0 && estId) {
        fetchPhotos(estId);
      }
    } catch (e) {
      warning(e.message || "삭제에 실패했습니다.");
    }
  };

  useEffect(() => {
    const onDoc = () => setPrintOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => closeAllChildWins();
    const onUnload = () => closeAllChildWins();

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unload", onUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("unload", onUnload);
    };
  }, []);

  // catLabel 찾기 헬퍼
  const getCatLabel = (catKey) => CATS.find((c) => c.key === catKey)?.label || catKey || "기타";

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold text-zinc-900">사진조회</div>
            <div className="text-sm text-zinc-500">
              {carNo ? `차량번호: ${carNo}` : "차량번호: -"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn
              icon={X}
              label="닫기"
              variant="primary"
              onClick={() => {
                closeAllChildWins();
                window.close();
                }}
            />

          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex flex-wrap items-center gap-2">
          <IconBtn icon={Mail} label="메일" onClick={onMail}>메일</IconBtn>

          <div className="relative">
            <IconBtn
              icon={Printer}
              label="인쇄"
              onClick={(e) => {
                e.stopPropagation();
                setPrintOpen((v) => !v);
              }}
            >
              인쇄 <span className="text-zinc-500">(페이지당 4장)</span> ▾
            </IconBtn>

            {printOpen && (
              <div
                className="absolute left-0 mt-1 w-44 border border-zinc-200 bg-white shadow-sm z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onPrint(4)}>
                  페이지당 4장
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onPrint(6)}>
                  페이지당 6장
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onPrint(12)}>
                  페이지당 12장
                </button>
              </div>
            )}
          </div>

          <IconBtn icon={RotateCw} label="새로고침" onClick={onRefresh}>새로고침</IconBtn>
          <IconBtn icon={Download} label="다운로드" onClick={onDownload}>다운로드</IconBtn>

          <div className="mx-2 h-6 w-px bg-zinc-200" />

          <IconBtn icon={Trash2} label="선택 삭제" onClick={onRemoveSelected} disabled={deleting || saving || creating}>
            {deleting ? "삭제중..." : "선택삭제"}
          </IconBtn>
          <div className="text-sm text-zinc-500">
              선택 {selectedIds.size}장
          </div>

          <div className="mx-2 h-6 w-px bg-zinc-200" />

          {/* <div className="ml-auto flex items-center"> */}
            <IconBtn icon={Save} label="사진순서 저장" onClick={onSave} disabled={saving || deleting || creating || !!photoError}>
              {saving ? "저장중..." : "저장"}
            </IconBtn>
          {/* </div> */}



        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {CATS.map((c) => (
            <Check
              key={c.key}
              checked={!!checkedCats[c.key]}
              onChange={(on) => toggleCat(c.key, on)}
              label={c.label}
            />
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div className="px-6 py-4">
        <div
          className={[
            "border border-zinc-300 bg-white h-[110px] flex items-center justify-center text-center",
            creating ? "text-zinc-400 cursor-wait" : "text-zinc-600 cursor-pointer",
          ].join(" ")}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (!creating) addFiles(e.dataTransfer.files); }}
          onClick={() => { if (!creating) fileInputRef.current?.click(); }}
          role="button"
          tabIndex={0}
        >
          <div>
            <div className="font-medium">
              {creating ? "업로드중..." : "사진을 드래그하거나 클릭하여 추가하세요"}
            </div>
            {!creating && (
              <div className="text-sm text-zinc-500">(JPG/JPEG/PNG, 다중 선택 가능)</div>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Grid */}
      <div className="px-6 pb-6 min-h-0 flex-1 flex flex-col">
        {photoLoading && (
          <div className="py-10 text-center text-gray-500">로딩중...</div>
        )}

        {!photoLoading && viewItems.length === 0 && (
          <div className="py-10 text-center text-gray-400">사진이 없습니다.</div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-1 pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {viewItems.map((it) => {
              const isSel = selectedIds.has(it.id);
              const catLabel = getCatLabel(it.cat);

              return (
                <div
                  key={it.id}
                  draggable
                  onDragStart={() => (dragIdRef.current = it.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => moveItem(dragIdRef.current, it.id)}
                  className={[
                    "relative border border-zinc-200 bg-white ",
                    isSel ? "ring-2 ring-zinc-800" : "",
                  ].join(" ")}
                  onClick={(e) => onPick(it.id, e.ctrlKey || e.metaKey)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPhotoPopup(it);
                  }}

                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      openPhotoPopup(it);
                    }
                  }}
                >
                  <CatPill label={catLabel} />

                  <button
                    type="button"
                    title="삭제"
                    className="
                      absolute right-1.5 top-1.5
                      inline-flex items-center justify-center
                      h-7 w-7
                      rounded-md
                      border border-zinc-300
                      bg-white/90
                      text-zinc-700
                      hover:bg-red-50 hover:border-red-300 hover:text-red-600
                    "
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm("이 사진을 삭제할까요?");
                      if (!ok) return;
                      try {
                        if (it._raw?.photo_seqno) {
                          await deletePhoto(estId, it._raw.photo_seqno);
                          if (estId) fetchPhotos(estId);
                        } else {
                          setItems((prev) => prev.filter((x) => x.id !== it.id));
                        }
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          next.delete(it.id);
                          return next;
                        });
                      } catch (err) {
                        warning(err.message || "삭제에 실패했습니다.");
                      }
                    }}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>


                  <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                    <img src={it.url} alt={it.name} className="w-full h-full object-cover" draggable={false} />
                  </div>

                  <div className="px-2 py-1.5 text-xs text-zinc-700 truncate" title={it.name}>
                    {it.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          * Ctrl(또는 ⌘) 클릭으로 다중 선택 / 드래그로 썸네일 순서 변경
        </div>
      </div>
    </div>
  );
}
