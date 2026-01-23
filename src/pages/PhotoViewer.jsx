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
} from "lucide-react";
import IconBtn from "../components/IconBtn";
import { openCenteredWindow } from "../utils/popup";
import { useAlert } from "../alerts";


const CATS = [
  { key: "all", label: "전체사진" },
  { key: "before", label: "수리전" },
  { key: "sheet", label: "판금" },
  { key: "paint", label: "도장" },
  { key: "diag", label: "진단" },
  { key: "func", label: "기능" },
  { key: "doc", label: "문서" },
  { key: "etc", label: "기타" },
];

function makeDummyPhotos(count = 80) {

  // 외부 이미지 없이 “색+텍스트”로 썸네일 생성 (data URL)
  const cats = ["before", "sheet", "paint", "diag", "func", "doc", "etc"];
  const rand = (n) => Math.floor(Math.random() * n);

  const svgToDataUrl = (svg) =>
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

  return Array.from({ length: count }).map((_, i) => {
    const cat = cats[i % cats.length];
    const hue = (i * 33) % 360;
    const label = `${CATS.find((c) => c.key === cat)?.label || "사진"} ${String(i + 1).padStart(3, "0")}`;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stop-color="hsl(${hue},60%,55%)"/>
            <stop offset="1" stop-color="hsl(${(hue + 40) % 360},60%,45%)"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <rect x="14" y="14" rx="10" ry="10" width="180" height="44" fill="rgba(0,0,0,0.40)"/>
        <text x="28" y="44" font-size="18" fill="white" font-family="Arial, sans-serif">${label}</text>
        <text x="28" y="86" font-size="14" fill="rgba(255,255,255,0.85)" font-family="Arial, sans-serif">drag to reorder</text>
      </svg>
    `.trim();

    return {
      id: `p${i + 1}`,
      cat,
      name: label,
      url: svgToDataUrl(svg),
      createdAt: Date.now() - rand(1000 * 60 * 60 * 24 * 30),
    };
  });
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

function CatPill({ label }) {
  return (
    <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
      {label}
    </span>
  );
}

export default function PhotoViewer() {
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
    } catch {}

    // 2) 첫 로딩에서만(딱 1회) state 보정
    //    - ctx가 늦게 들어오는 경우를 커버
    //    - 이미 state가 있으면 덮어쓰지 않음
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (ctx.est_serial && !estId) setEstId(ctx.est_serial);
    if (ctx.carno && !carNo) setCarNo(ctx.carno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.est_serial, ctx.carno]);


  // 3) 부모(InsuranceEstimate)에서 estId 갱신 메시지 받기
  
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "PHOTO_VIEWER_SET_CTX") return;

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
      } catch {}

      // 화면 갱신(리프레시) - 전체 리로드 말고 “데이터만” 다시 로딩하게 만드는 게 UX가 더 좋음
      if (nextEstId) setEstId(nextEstId);
      if (nextCarNo) setCarNo(nextCarNo);

      // 필요하면 여기서 데이터 fetch 다시 호출
      // fetchPhotos(nextEstId);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);


  // 자식 팝업(예: PhotoPopup) 추적
  const childWinsRef = useRef(new Set());

  const registerChildWin = (w) => {
    if (!w) return;
    childWinsRef.current.add(w);

    // 이미 닫힌 창은 정리
    try {
      if (w.closed) childWinsRef.current.delete(w);
    } catch {}

    // 주기적으로 닫힌 창 정리(가벼움)
    setTimeout(() => {
      try {
        if (w.closed) childWinsRef.current.delete(w);
      } catch {}
    }, 500);
  };

  const closeAllChildWins = () => {
    childWinsRef.current.forEach((w) => {
      try {
        if (w && !w.closed) w.close();
      } catch {}
    });
    childWinsRef.current.clear();
  };
  

  const [items, setItems] = useState(() => makeDummyPhotos(96));
  const [checkedCats, setCheckedCats] = useState(() => {
    // 기본: 전체사진 ON
    const init = {};
    CATS.forEach((c) => (init[c.key] = c.key === "all"));
    return init;
  });

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
    return items.filter((it) => enabledCatKeys.includes(it.cat));
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
    const win = openCenteredWindow("/photo-popup", "photoPopup", 800, 1000, {
      windowFeatures: { scrollbars: "no", resizable: "yes" },
      postMessage: {
        type: "PHOTO_POPUP_SET_CTX",
        payload: {
          estId,
          carNo,
          file: it?.name || "",
          imgUrl: it?.url || "",
          cat: it?.cat || "etc",
          memo: "",
        },
        // targetOrigin 생략하면 자동으로 window.location.origin
        // intervals/attempts도 필요시 조절 가능
      },
    });
    registerChildWin(win);
  };
  // const openPhotoPopup = (it) => {
  //   // 화면만: 라우트는 네 프로젝트에 맞춰서 "/photo-popup"로 가정
  //   const w = 800;
  //   const h = 950;

  //   const popup = openCenteredWindow(
  //     "/photo-popup",
  //     "photoPopup",
  //     w,
  //     h,
  //     {
  //       scrollbars: "yes",
  //       resizable: "yes",
  //     }
  //   );

  //   // 팝업이 막혔거나 못 열면 종료
  //   if (!popup) return;

  //   // (PhotoPopup에서 postMessage 수신해서 타이틀/이미지/인풋 바인딩하게 만들면 됨)
  //   const payload = {
  //     // estId도 함께 보내면 팝업에서 제목/정보 구성하기 좋음
  //     estId,
  //     carNo: "11가1234", // 지금은 화면만이라 임시값. 실제는 보험견적에서 넘어온 값으로 치환
  //     file: it?.name || "",
  //     imgUrl: it?.url || "",
  //     cat: it?.cat || "etc",
  //     memo: "", // 화면만: 초기 메모 비움
  //   };

  //   // 팝업 로딩 타이밍 때문에 약간의 딜레이/재시도
  //   const send = () => {
  //     try {
  //       popup.postMessage(
  //         { type: "PHOTO_POPUP_SET_CTX", payload },
  //         window.location.origin
  //       );
  //     } catch {}
  //   };

  //   // openCenteredWindow 내부에서도 focus/이동/리사이즈를 한번 더 하므로
  //   // postMessage는 동일하게 2~3회 재시도 유지
  //   send();
  //   setTimeout(send, 200);
  //   setTimeout(send, 600);
  // };


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

  // 파일 추가(드랍/클릭)
  const fileInputRef = useRef(null);

  const addFiles = (files) => {
    const arr = Array.from(files || []).filter((f) => /^image\/(jpeg|png|jpg)/i.test(f.type));
    if (arr.length === 0) return;

    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        setItems((prev) => [
          {
            id: `u${Date.now()}_${Math.random().toString(16).slice(2)}`,
            cat: "etc",
            name: f.name,
            url: String(reader.result),
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      };
      reader.readAsDataURL(f);
    });
  };

  const onDropZoneDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const onRefresh = () => {
    // 더미는 재생성
    setItems(makeDummyPhotos(96));
    setSelectedIds(new Set());
  };

  const onDownload = () => {
    alert("다운로드는 실제 API 연동 시 zip 생성/다운로드로 연결하면 됩니다.");
  };

  const onMail = () => {
    alert("메일 전송 팝업/연동은 다음 단계로 연결하면 됩니다.");
  };

  const onPrint = (mode) => {
    setPrintOpen(false);
    alert(`인쇄: ${mode}`);
  };

  const onRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 사진 ${selectedIds.size}장을 삭제할까요?`)) return;
    setItems((prev) => prev.filter((x) => !selectedIds.has(x.id)));
    setSelectedIds(new Set());
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
              인쇄 <span className="text-zinc-500">(4/page)</span> ▾
            </IconBtn>

            {printOpen && (
              <div
                className="absolute left-0 mt-1 w-44 border border-zinc-200 bg-white shadow-sm z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onPrint("1/page")}>
                  1/page
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onPrint("2/page")}>
                  2/page
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onPrint("4/page")}>
                  4/page
                </button>
              </div>
            )}
          </div>

          <IconBtn icon={RotateCw} label="새로고침" onClick={onRefresh}>새로고침</IconBtn>
          <IconBtn icon={Download} label="다운로드" onClick={onDownload}>다운로드</IconBtn>

          <div className="mx-2 h-6 w-px bg-zinc-200" />

          <IconBtn icon={Trash2} label="선택 삭제" onClick={onRemoveSelected}>선택삭제</IconBtn>
          
          <div className="text-sm text-zinc-500">
              선택 {selectedIds.size}장
          </div>
          
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
          className="border border-zinc-300 bg-white h-[110px] flex items-center justify-center text-center text-zinc-600"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropZoneDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div>
            <div className="font-medium">사진을 드래그하거나 클릭하여 추가하세요</div>
            <div className="text-sm text-zinc-500">(JPG/JPEG/PNG, 다중 선택 가능)</div>
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
      {/* <div className="px-6 pb-8"> */}
      <div className="px-6 pb-6 min-h-0 flex-1 flex flex-col">
        {/* <div className="h-[calc(100vh-310px)] overflow-auto pr-2"> */}
        <div className="min-h-0 flex-1 overflow-auto p-1 pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {viewItems.map((it) => {
              const isSel = selectedIds.has(it.id);
              const catLabel = CATS.find((c) => c.key === it.cat)?.label || "기타";

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
                    onClick={(e) => {
                      e.stopPropagation();
                      setItems((prev) => prev.filter((x) => x.id !== it.id));
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(it.id);
                        return next;
                      });
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
