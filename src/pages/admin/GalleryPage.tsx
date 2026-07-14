import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Upload,
  Trash2,
  Pencil,
  Copy,
  X,
  Loader2,
  FileImage,
  Check,
} from "lucide-react";
import { apiClient } from "../../services/api";
import HasPermission from "../../components/HasPermission";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type { GalleryImage, GalleryListResponse } from "../../types";

/** 格式化文件大小为人类可读字符串。 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 根据 MIME 类型返回简短类型标签。 */
function mimeLabel(mime: string): string {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  if (mime.includes("gif")) return "GIF";
  if (mime.includes("webp")) return "WebP";
  if (mime.includes("svg")) return "SVG";
  if (mime.includes("bmp")) return "BMP";
  return mime.split("/")[1]?.toUpperCase() || "IMG";
}

/**
 * 图片库管理页面。
 *
 * 功能：缩略图网格展示、上传、搜索、重命名、删除、复制链接。
 * 风格与 BannersPage 等后台页面保持一致（极光暗色主题）。
 */
export default function GalleryPage() {
  // ── State ──
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  // 重命名弹窗
  const [renameTarget, setRenameTarget] = useState<GalleryImage | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const renameModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(renameModalRef, !!renameTarget, () => !renaming && setRenameTarget(null));

  // 复制链接 toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 拖拽上传状态
  const [dragOver, setDragOver] = useState(false);

  // ── Data loading ──
  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res: GalleryListResponse = await apiClient.getGalleryImages({
        page,
        pageSize,
        search: search || undefined,
      });
      setImages(res.list || []);
      setTotal(res.total);
    } catch (err) {
      console.error("加载图片列表失败:", err);
      setImages([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // ── Search ──
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };
  const handleSearchClear = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // ── Upload ──
  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    if (validFiles.length === 0) {
      setUploadError("请选择有效的图片文件（不超过 10MB）");
      return;
    }
    setUploading(true);
    setUploadError(null);
    for (const file of validFiles) {
      try {
        await apiClient.uploadGalleryImage(file);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "上传失败";
        setUploadError(`${file.name}: ${msg}`);
      }
    }
    setUploading(false);
    loadImages();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = "";
    }
  };

  // ── Drag & Drop ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deleteGalleryImage(deleteTarget.id);
      setImages((prev) => prev.filter((img) => img.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      setDeleteTarget(null);
    } catch (err) {
      console.error("删除失败:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Rename ──
  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const updated = await apiClient.renameGalleryImage(
        renameTarget.id,
        renameValue.trim()
      );
      setImages((prev) =>
        prev.map((img) => (img.id === updated.id ? updated : img))
      );
      setRenameTarget(null);
      setRenameValue("");
    } catch (err) {
      console.error("重命名失败:", err);
    } finally {
      setRenaming(false);
    }
  };

  const openRename = (img: GalleryImage) => {
    setRenameTarget(img);
    setRenameValue(img.name);
  };

  // ── Copy link ──
  const handleCopyLink = async (img: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(img.url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = img.url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(img.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-200">图片库</h1>
          <p className="mt-1 text-sm text-slate-500">
            上传和管理图片资源，复制链接在其他页面引用
          </p>
        </div>
        <HasPermission code="gallery:manage">
          <label
            className={`inline-flex items-center gap-2 rounded-lg bg-[#2EA7FF] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1d8ad6] cursor-pointer ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "上传中..." : "上传图片"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
              disabled={uploading}
            />
          </label>
        </HasPermission>
      </div>

      {/* 上传错误提示 */}
      {uploadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {uploadError}
          <button
            className="ml-2 text-red-300 hover:text-red-200"
            onClick={() => setUploadError(null)}
          >
            <X className="h-4 w-4 inline" />
          </button>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜索图片名称..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-aurora-cyan/50 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-[#2EA7FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1d8ad6]"
        >
          搜索
        </button>
        {search && (
          <button
            onClick={handleSearchClear}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 空状态 + 拖拽上传区域 */}
      {images.length === 0 && !loading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 transition-colors ${
            dragOver
              ? "border-aurora-cyan/50 bg-aurora-cyan/5"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div className="rounded-full bg-white/[0.06] p-4">
            <FileImage className="h-10 w-10 text-slate-400" />
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {search ? "没有找到匹配的图片" : "还没有上传图片"}
          </p>
          {!search && (
            <HasPermission code="gallery:manage">
              <label className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6] cursor-pointer">
                <Upload className="h-4 w-4" />
                选择图片上传
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={uploading}
                />
              </label>
            </HasPermission>
          )}
          <p className="mt-2 text-xs text-slate-500">
            支持 JPG、PNG、GIF、WebP，单个不超过 10MB | 也可以拖拽图片到此区域
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-aurora-cyan" />
          <span className="ml-3 text-sm text-slate-500">加载中...</span>
        </div>
      )}

      {/* 图片网格 */}
      {!loading && images.length > 0 && (
        <>
          {/* 统计信息 */}
          <div className="text-sm text-slate-500">
            共 {total} 张图片 {search && `(筛选: "${search}")`}
          </div>

          {/* 拖拽区域包裹网格 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${
              dragOver ? "ring-2 ring-aurora-cyan/50 rounded-xl" : ""
            }`}
          >
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden transition-all hover:border-aurora-cyan/30 hover:bg-white/[0.06]"
              >
                {/* 缩略图 */}
                <div className="aspect-square bg-game-darker overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* 信息 + 操作栏 */}
                <div className="px-2.5 py-2">
                  {/* 名称 */}
                  <p
                    className="text-xs font-medium text-slate-200 truncate"
                    title={img.name}
                  >
                    {img.name}
                  </p>
                  {/* 类型 + 大小 */}
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {mimeLabel(img.mimeType)} · {formatFileSize(img.fileSize)}
                  </p>

                  {/* 操作按钮 */}
                  <div className="mt-1.5 flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(img)}
                      className="rounded p-1 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 transition-colors"
                      title="复制链接"
                    >
                      {copiedId === img.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <HasPermission code="gallery:manage">
                      <button
                        onClick={() => openRename(img)}
                        className="rounded p-1 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 transition-colors"
                        title="重命名"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(img)}
                        className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </HasPermission>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
              >
                上一页
              </button>
              <span className="text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 删除确认弹窗 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            ref={deleteModalRef}
            className="w-full max-w-md rounded-xl border border-white/10 bg-game-darker p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-200">确认删除</h3>
            <p className="mt-3 text-sm text-slate-400">
              确定要删除图片 <span className="text-slate-200 font-medium">{deleteTarget.name}</span> 吗？
              此操作不可撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "删除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 重命名弹窗 ── */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            ref={renameModalRef}
            className="w-full max-w-md rounded-xl border border-white/10 bg-game-darker p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-200">重命名图片</h3>
            <div className="mt-4">
              <label className="block text-sm text-slate-400 mb-1">新名称</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
                maxLength={255}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 px-3 text-sm text-slate-200 focus:border-aurora-cyan/50 focus:outline-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRenameTarget(null)}
                disabled={renaming}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !renameValue.trim()}
                className="rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6] disabled:opacity-50"
              >
                {renaming ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
