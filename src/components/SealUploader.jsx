import { Upload, Trash2 } from "lucide-react";
import IconBtn from "../components/IconBtn";

export default function SealUploader({
  title,
  imageUrl,
  onUpload,
  onDelete,
  size = 160,
  rounded = "rounded-md",
  card = true,              // 추가: 외곽 카드 사용 여부
  className = "",           // 추가: 래퍼 커스터마이즈
}) {
  const Wrapper = card ? "section" : "div";

  return (
    <Wrapper
      className={[
        card ? "rounded-md border border-gray-200 bg-white p-5" : "",
        className,
      ].join(" ")}
    >
      {/* title은 card일 때만 강조, card=false면 상위에서 타이틀을 주는 방식 */}
      {title ? (
        <div className={card ? "text-base font-semibold text-gray-900" : "text-sm font-semibold text-gray-900"}>
          {title}
        </div>
      ) : null}

      <div className={title ? "mt-4 flex items-start gap-4" : "flex items-start gap-4"}>
        <div>
          <div
            className={`${rounded} border border-gray-200 bg-white p-3 
                        flex items-center justify-center overflow-hidden 
                        aspect-square`}
            style={{ width: size, height: size }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="seal" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-sm text-gray-400">등록된 인감이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/jpeg"
              className="hidden"
              onChange={(e) => {
                onUpload?.(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span
              className={[
                "inline-flex items-center justify-center gap-2",
                "h-9 px-3 text-sm",
                "rounded-md border",
                "border-zinc-800 bg-zinc-800 text-white hover:bg-zinc-700",
                "font-semibold",
                "active:scale-[0.98]",
                "h-10 w-28 justify-center whitespace-nowrap",
              ].join(" ")}
            >
              <Upload size={18} strokeWidth={2} />
              <span>등록</span>
            </span>
          </label>

          <IconBtn
            icon={Trash2}
            label="삭제"
            variant="danger"
            className="h-10 w-28 justify-center whitespace-nowrap"
            onClick={onDelete}
            disabled={!imageUrl}
          />
        </div>
      </div>
    </Wrapper>
  );
}
