import { useEffect, useState, useRef } from "react";
import { X, Upload, Link2, Image as ImageIcon, Loader2 } from "lucide-react";
import { apiClient } from "../../services/api";
import type { Banner, BannerCreateRequest } from "../../types";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface BannerFormDialogProps {
  /** 是否打开。 */
  open: boolean;
  /** 关闭弹窗。 */
  onClose: () => void;
  /** 保存成功后的回调。 */
  onSaved: () => void;
  /** 编辑时的已有数据，null 表示新建。 */
  banner: Banner | null;
}

/** 图片输入模式：上传或粘贴 URL。 */
type ImageMode = "upload" | "url";

/**
 * 轮播图新建/编辑弹窗。
 *
 * 支持两种图片输入方式：
 * 1. 上传图片文件（调用 CF Images API）
 * 2. 直接粘贴图片 URL
 */
export default function BannerFormDialog({
  open,
  onClose,
  onSaved,
  banner,
}: BannerFormDialogProps) {
  const isEdit = banner !== null;

  const [title, setTitle] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [uploading, setUploading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, open, onClose);

  /** 打开弹窗时填充表单。 */
  useEffect(() => {
    if (open) {
      setTitle(banner?.title ?? "");
      setImageUrl(banner?.imageUrl ?? "");
      setLinkUrl(banner?.linkUrl ?? "");
      setSortOrder(banner?.sortOrder ?? 0);
      setIsActive(banner?.isActive ?? 1);
      setStartTime(banner?.startTime ?? "");
      setEndTime(banner?.endTime ?? "");
      setDescription(banner?.description ?? "");
      setImageMode(banner?.imageUrl ? "url" : "upload");
      setError("");
    }
  }, [open, banner]);

  /** 处理文件上传。 */
  const handleFileUpload = async (file: File): Promise<void> => {
    setUploading(true);
    setError("");
    try {
      const url = await apiClient.uploadBannerImage(file);
      setImageUrl(url);
      setImageMode("url");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  /** 文件选择事件。 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /** 提交表单。 */
  const handleSubmit = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    const trimmedImageUrl = imageUrl.trim();

    if (!trimmedTitle) {
      setError("轮播图标题不能为空");
      return;
    }
    if (!trimmedImageUrl) {
      setError("图片不能为空，请上传或粘贴图片 URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data: BannerCreateRequest = {
        title: trimmedTitle,
        imageUrl: trimmedImageUrl,
        linkUrl: linkUrl.trim(),
        sortOrder,
        isActive,
        startTime: startTime || null,
        endTime: endTime || null,
        description: description.trim(),
      };

      if (isEdit && banner) {
        await apiClient.updateBanner(banner.id, data);
      } else {
        await apiClient.createBanner(data);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "编辑轮播图" : "新建轮播图"}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white/[0.04] shadow-[0_20px_60px_rgba(2,6,23,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-100">
            {isEdit ? "编辑轮播图" : "新建轮播图"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/[0.10] hover:text-slate-300"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-500/50/30 bg-red-500/15 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入轮播图标题"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
            />
          </div>

          {/* Image: Upload / URL toggle */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              图片 <span className="text-red-400">*</span>
            </label>

            {/* Mode toggle */}
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  imageMode === "upload"
                    ? "bg-[#2EA7FF] text-white"
                    : "border border-white/10 text-slate-400 hover:bg-white/[0.08]"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                上传图片
              </button>
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  imageMode === "url"
                    ? "bg-[#2EA7FF] text-white"
                    : "border border-white/10 text-slate-400 hover:bg-white/[0.08]"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                粘贴 URL
              </button>
            </div>

            {/* Upload mode */}
            {imageMode === "upload" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-white/[0.06] px-4 py-8 transition-colors hover:border-[#2EA7FF]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#2EA7FF]" />
                    <p className="text-xs text-slate-400">上传中…</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="mb-2 h-6 w-6 text-slate-400" />
                    <p className="text-xs text-slate-400">
                      点击选择图片（JPG/PNG/WebP/GIF，最大 10MB）
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* URL mode */}
            {imageMode === "url" && (
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
              />
            )}

            {/* Image preview */}
            {imageUrl && (
              <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                <img
                  src={imageUrl}
                  alt="预览"
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Link URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              跳转链接
            </label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/cloud-games 或 https://example.com"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
            />
            <p className="mt-1 text-xs text-slate-400">
              点击轮播图时跳转的链接，留空则不可点击
            </p>
          </div>

          {/* Sort Order + Active toggle */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                排序值
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
              />
              <p className="mt-1 text-xs text-slate-400">数值越小越靠前</p>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                状态
              </label>
              <select
                value={isActive}
                onChange={(e) => setIsActive(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
              >
                <option value={1}>启用</option>
                <option value={0}>禁用</option>
              </select>
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                生效开始时间
              </label>
              <input
                type="datetime-local"
                value={startTime ? toLocalDatetimeInput(startTime) : ""}
                onChange={(e) =>
                  setStartTime(e.target.value ? new Date(e.target.value).toISOString() : "")
                }
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                生效结束时间
              </label>
              <input
                type="datetime-local"
                value={endTime ? toLocalDatetimeInput(endTime) : ""}
                onChange={(e) =>
                  setEndTime(e.target.value ? new Date(e.target.value).toISOString() : "")
                }
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            留空表示不限制时段（开始为空=立即生效，结束为空=长期有效）
          </p>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              备注
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选，内部备注"
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="rounded-md bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6] disabled:opacity-50"
          >
            {loading ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 将 ISO 8601 时间转换为 datetime-local input 所需的格式。 */
function toLocalDatetimeInput(iso: string): string {
  try {
    const date = new Date(iso);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}
