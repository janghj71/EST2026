import React, { useEffect, useMemo, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Download,
  X,
  Trash2,
  Save,
} from "lucide-react";
import { useUrlContextSnapshot } from "../hooks/useUrlContextSnapshot";
import IconBtn from "../components/IconBtn";
import { useAlert } from "../alerts";
import { usePhoto } from "../hooks/usePhoto";
import { useTbCode } from "../hooks/useTbCode";


function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function PhotoPopup() {
  const { confirm, warning, error: alertError, info } = useAlert();

  // ── API hooks ──
  const { saving, savePhotoDetail } = usePhoto();
  const { codes: photoCodes } = useTbCode("PTOKND");

  // tbcode("PTOKND") → CATS 동적 생성 (전체사진 제외 — PhotoPopup에서는 불필요)
  const CATS = useMemo(() => {
    if (photoCodes.length > 0) {
      return photoCodes.map((c) => ({ key: c.value, label: c.label }));
    }
    // tbcode 로딩 전 fallback
    return [];
  }, [photoCodes]);

  const ctx = useUrlContextSnapshot({
    storageKey: "photoPopupCtx",
    keys: ["estId", "carNo", "file", "imgUrl", "cat", "memo", "photoSeqno", "photoOrder"],
    cleanPath: "/photo-popup",
  });

  const readSaved = () => {
    try {
      const raw = sessionStorage.getItem("photoPopupCtx");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saved = readSaved();

  const [estId, setEstId] = useState(ctx.estId || saved?.estId || "");
  const [carNo, setCarNo] = useState(ctx.carNo || saved?.carNo || "");
  const [fileName, setFileName] = useState(ctx.file || saved?.file || "");
  const [imgUrl, setImgUrl] = useState(ctx.imgUrl || saved?.imgUrl || "");
  const [cat, setCat] = useState(ctx.cat || saved?.cat || "");
  const [memo, setMemo] = useState(ctx.memo || saved?.memo || "");
  const [photoSeqno, setPhotoSeqno] = useState(ctx.photoSeqno || saved?.photoSeqno || "");
  const [photoOrder, setPhotoOrder] = useState(ctx.photoOrder || saved?.photoOrder || "");

  const makeCacheBust = () =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const stripQuery = (url = "") => url.split("?")[0];

  // cache-busting 카운터 (impure 함수 호출 없이 URL 갱신)
  const [imgVer, setImgVer] = useState(() => makeCacheBust());
  // const [imgVer, setImgVer] = useState(0);

  // 사진 뷰 상태(줌/회전)
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  // 드래그(팬) 상태
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = React.useRef(null); // { x, y, mx, my }
  const imgWrapRef = React.useRef(null);


  const title = useMemo(() => {
    return carNo?.trim() ? carNo.trim() : "차량번호";
  }, [carNo]);


  const refreshImage = () => setImgVer(makeCacheBust());

  const displayImgSrc = useMemo(() => {
    const base = stripQuery(imgUrl);
    return base ? `${base}?_cb=${imgVer}` : "";
  }, [imgUrl, imgVer]);


  // 부모창에서 postMessage로도 갱신 가능하게(그리드 클릭 시 재사용)
  useEffect(() => {
    const handler = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || msg.type !== "PHOTO_POPUP_SET_CTX") return;

      const p = msg.payload || {};
      if (p.estId != null) setEstId(p.estId);
      if (typeof p.carNo === "string") setCarNo(p.carNo);
      if (typeof p.file === "string") setFileName(p.file);

      // if (typeof p.imgUrl === "string") setImgUrl(p.imgUrl);
      if (typeof p.imgUrl === "string") {
        setImgUrl(p.imgUrl);
        refreshImage(); // 팝업 재사용 시에도 항상 새 URL로 로드
      }

      if (typeof p.cat === "string") setCat(p.cat);
      if (typeof p.memo === "string") setMemo(p.memo);
      if (p.photoSeqno != null) setPhotoSeqno(p.photoSeqno);
      if (p.photoOrder != null) setPhotoOrder(p.photoOrder);

      try {
        sessionStorage.setItem(
          "photoPopupCtx",
          JSON.stringify({
            estId: p.estId ?? estId,
            carNo: typeof p.carNo === "string" ? p.carNo : carNo,
            file: typeof p.file === "string" ? p.file : fileName,
            imgUrl: typeof p.imgUrl === "string" ? p.imgUrl : imgUrl,
            cat: typeof p.cat === "string" ? p.cat : cat,
            memo: typeof p.memo === "string" ? p.memo : memo,
            photoSeqno: p.photoSeqno ?? photoSeqno,
            photoOrder: p.photoOrder ?? photoOrder,
          })
        );
      } catch { /* empty */ }

      setScale(1);
      setRotate(0);
      setPan({ x: 0, y: 0 });
      setIsPanning(false);
      panStartRef.current = null;
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const onZoomIn = () => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), 0.3, 3));
  const onZoomOut = () => 
    setScale((s) => {
      const ns = clamp(Number((s - 0.1).toFixed(2)), 0.3, 3);
      if (ns <= 1) setPan({ x: 0, y: 0 });
      return ns;
    });
  const onRotateL = () => setRotate((r) => (r - 90) % 360);
  const onRotateR = () => setRotate((r) => (r + 90) % 360);
  const onResetView = () => {
    setScale(1);
    setRotate(0);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    panStartRef.current = null;
  };

  const onDownload = () => {
    // 실제는 API 다운로드로 연결
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = fileName || "photo.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onSave = async () => {
    if (!estId || !photoSeqno) {
      warning("저장할 사진 정보가 없습니다.");
      return;
    }
    const updates = [{
      photo_seqno: photoSeqno,
      photokind: cat,
      photo_order: photoOrder,
      memo,
    }];

    try {
      // 회전이 있으면 회전된 이미지를 blob으로 만들어서 전송
      let fileBlob = null;
      let fName = null;
      if (rotate !== 0 && imgUrl) {
        fileBlob = await rotateImageToBlob(imgUrl, rotate);
        // fileName에서 확장자 포함된 실제 파일명 사용, 없으면 imgUrl에서 추출
        const urlName = imgUrl.split("/").pop()?.split("?")[0] || "";
        fName = (fileName && fileName.includes(".")) ? fileName
              : (urlName && urlName.includes(".")) ? urlName
              : "photo.jpg";
      }
      await savePhotoDetail(estId, updates, fileBlob, fName);

      // 부모(PhotoViewer)에 새로고침 요청
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "PHOTO_SAVED", payload: { est_serial: estId } },
            window.location.origin
          );
        }
      } catch { /* cross-origin 등 무시 */ }

      // 회전 초기화 (서버에 저장된 이미지가 이미 회전 상태)
      setRotate(0);
      setPan({ x: 0, y: 0 });

      // imgUrl cache-busting → 브라우저가 서버의 회전된 이미지를 새로 로드
      if (fileBlob) {
        // setImgVer((v) => v + 1);
        refreshImage();
      }

      await info("저장 완료");
    } catch (e) {
      warning(e.message || "저장에 실패했습니다.");
    }
  };

  /** 이미지 URL + 회전각도 → Canvas → Blob */
  // const rotateImageToBlob = (url, deg) => {
  //   return new Promise((resolve, reject) => {
  //     const img = new Image();
  //     img.crossOrigin = "anonymous";
  //     img.onload = () => {
  //       const rad = (deg * Math.PI) / 180;
  //       const sin = Math.abs(Math.sin(rad));
  //       const cos = Math.abs(Math.cos(rad));
  //       const w = Math.round(img.width * cos + img.height * sin);
  //       const h = Math.round(img.width * sin + img.height * cos);
  //       const canvas = document.createElement("canvas");
  //       canvas.width = w;
  //       canvas.height = h;
  //       const ctx2d = canvas.getContext("2d");
  //       ctx2d.translate(w / 2, h / 2);
  //       ctx2d.rotate(rad);
  //       ctx2d.drawImage(img, -img.width / 2, -img.height / 2);
  //       canvas.toBlob((blob) => {
  //         if (blob) resolve(blob);
  //         else reject(new Error("이미지 변환 실패"));
  //       }, "image/jpeg", 0.92);
  //     };
  //     img.onerror = () => reject(new Error("이미지 로드 실패"));
  //     // 기존 cache-busting 파라미터 제거 후 새 파라미터로 서버에서 원본 이미지 강제 로드
  //     const base = url.split("?")[0];
  //     img.src = `${base}?_cb=${imgVer + 1}`;
  //   });
  // };
// rotateImageToBlob 교체
  const rotateImageToBlob = (url, deg) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const rad = (deg * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const w = Math.round(img.width * cos + img.height * sin);
        const h = Math.round(img.width * sin + img.height * cos);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx2d = canvas.getContext("2d");
        ctx2d.translate(w / 2, h / 2);
        ctx2d.rotate(rad);
        ctx2d.drawImage(img, -img.width / 2, -img.height / 2);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("이미지 변환 실패"));
          },
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));

      const base = stripQuery(url);
      img.src = `${base}?_cb=${makeCacheBust()}`; // 매번 고유 키
    });
  };



  const canPan = scale > 1.001; // 확대된 경우에만 팬 허용

  const onPanMouseDown = (e) => {
    if (!canPan) return;
    e.preventDefault();

    setIsPanning(true);
    panStartRef.current = {
      x: pan.x,
      y: pan.y,
      mx: e.clientX,
      my: e.clientY,
    };
  };

  const onPanMouseMove = (e) => {
    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.mx;
    const dy = e.clientY - panStartRef.current.my;

    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const onPanMouseUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const onWheelZoom = (e) => {
    // 스크롤 막고(페이지 스크롤 방지)
    e.preventDefault();
    e.stopPropagation();

    const wrap = imgWrapRef.current;
    if (!wrap) return;

    // 휠 방향: 위(확대) / 아래(축소)
    const dir = e.deltaY < 0 ? 1 : -1;

    // 줌 스텝 (ctrl+휠이면 트랙패드 확대처럼 느리게 들어오는 경우가 있어서 조금 줄임)
    const step = e.ctrlKey ? 0.05 : 0.1;

    const nextScale = clamp(Number((scale + dir * step).toFixed(2)), 0.3, 3);
    if (nextScale === scale) return;

    // 마우스가 이미지 영역에서 가리키는 위치(컨테이너 기준 좌표)
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left; // 0 ~ rect.width
    const my = e.clientY - rect.top;  // 0 ~ rect.height
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // "현재 pan이 적용된 상태에서" 포인터가 가리키는 월드좌표를 유지하도록 pan 보정
    // (rotate는 고려하지 않고, 현재 요구사항 수준에서는 충분히 자연스럽게 동작)
    const k = nextScale / scale;

    const newPanX = (pan.x - (mx - cx)) * k + (mx - cx);
    const newPanY = (pan.y - (my - cy)) * k + (my - cy);

    setScale(nextScale);

    // 축소해서 100% 이하로 내려가면 pan 초기화(원하면 유지해도 됨)
    if (nextScale <= 1.001) {
      setPan({ x: 0, y: 0 });
    } else {
      setPan({ x: newPanX, y: newPanY });
    }
  };



  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-zinc-900 truncate" title={title}>
              {title}
            </div>
            <div className="text-sm text-zinc-500">선택한 사진 정보</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconBtn icon={Save} label="저장" onClick={onSave} disabled={saving} />
            <IconBtn icon={X} label="닫기" variant="primary" onClick={() => window.close()} />

          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex flex-wrap items-center gap-2">
          <IconBtn icon={ZoomIn} label="확대" onClick={onZoomIn} />
          <IconBtn icon={ZoomOut} label="축소" onClick={onZoomOut} />
          <IconBtn icon={RotateCcw} label="좌회전" onClick={onRotateL} />
          <IconBtn icon={RotateCw} label="우회전" onClick={onRotateR} />
          <IconBtn icon={RefreshCw} label="초기화" onClick={onResetView} />
          <IconBtn icon={Download} label="다운로드" onClick={onDownload} />

          <div className="ml-auto text-sm text-zinc-500">
            확대: <span className="font-semibold text-zinc-800">{Math.round(scale * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden px-6 py-5">
        {/* Image */}
        <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
          <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-800">선택한 사진</span>

            {fileName && (
              <span
                className="text-xs text-zinc-500 truncate"
                title={fileName}
              >
                ({fileName})
              </span>
            )}
          </div>

          {/* <div className="p-0"> ////rounded-md border border-zinc-200 bg-zinc-50 */} 
            <div className="p-4 overflow-hidden">  
              {/* 고정 높이(영역) 안에서 이미지 fit */}
              <div
                ref={imgWrapRef} 
                className={[
                  "relative w-full max-h-[420px] h-[40vh] overflow-hidden",
                  canPan ? "cursor-grab" : "cursor-default",
                  isPanning ? "cursor-grabbing" : "",
                ].join(" ")}
                onWheel={onWheelZoom}
                onMouseDown={onPanMouseDown}
                onMouseMove={onPanMouseMove}
                onMouseUp={onPanMouseUp}
                onMouseLeave={onPanMouseUp}
              >

              {/*}    
                {imgUrl ? (
                  <img
                    src={imgVer ? `${imgUrl.split("?")[0]}?v=${imgVer}` : imgUrl}
                    alt={fileName || "photo"}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain select-none"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotate}deg)`,
                      transformOrigin: "center center",
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                    이미지가 없습니다.
                  </div>
                )}
              */}
                {displayImgSrc ? (
                  <img
                    src={displayImgSrc}
                    alt={fileName || "photo"}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain select-none"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotate}deg)`,
                      transformOrigin: "center center",
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                    이미지가 없습니다.
                  </div>
                )}


              </div>
            {/* </div> */}

          </div>
        </div>

        {/* Inputs */}
        <div className="mt-4 rounded-md border border-zinc-200 bg-white overflow-hidden">
          <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800">
            사진 정보
          </div>

          <div className="p-4 grid grid-cols-1 gap-4">
            <div>
              <div className="mb-1 text-sm font-semibold text-zinc-700">사진 분류</div>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                // className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none hover:bg-zinc-50 focus:border-zinc-400"
                className="w-full select-base" 
              >
                {CATS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold text-zinc-700">메모</div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                className="w-full min-h-[72px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none hover:bg-zinc-50 focus:border-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom helper */}
      <div className="border-t border-zinc-200 bg-white px-6 py-3 text-xs text-zinc-500">
        팁: 마우스 휠로 이미지 확대/축소 됩니다.
      </div>
    </div>
  );
}
