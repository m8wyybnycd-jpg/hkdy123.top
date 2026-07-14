import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  HardDrive,
  X,
  Clock,
  Database,
} from "lucide-react";
import SEO from "../components/SEO";
import PageDisabledNotice from "../components/PageDisabledNotice";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface CloudLink {
  type: string;
  url: string;
  status: string;
}

interface SearchResult {
  title: string;
  datetime: string;
  date: string;
  cloud_type_name: string;
  links: CloudLink[];
  first_url: string;
  status: string;
}

interface SearchResponse {
  ok: boolean;
  data: {
    total: number;
    results: SearchResult[];
  };
  ads?: { title: string; url: string }[];
}

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

/** 支持的网盘类型 */
const CLOUD_TYPES = [
  { key: "", label: "全部", icon: "🧰" },
  { key: "夸克网盘", label: "夸克网盘", icon: "🟡" },
  { key: "百度网盘", label: "百度网盘", icon: "🔵" },
  { key: "阿里云盘", label: "阿里云盘", icon: "🟠" },
  { key: "UC网盘", label: "UC网盘", icon: "🟢" },
  { key: "迅雷网盘", label: "迅雷网盘", icon: "⚡" },
  { key: "天翼云盘", label: "天翼云盘", icon: "🔴" },
  { key: "115网盘", label: "115网盘", icon: "🟣" },
  { key: "移动云盘", label: "移动云盘", icon: "🔵" },
  { key: "123网盘", label: "123网盘", icon: "🎯" },
  { key: "PikPak", label: "PikPak", icon: "🌈" },
  { key: "光鸭云盘", label: "光鸭云盘", icon: "🦆" },
  { key: "磁力链接", label: "磁力链接", icon: "🧲" },
  { key: "电驴链接", label: "电驴链接", icon: "🔗" },
];

/** API base URL — 泽索搜 免费开放接口 */
const API_BASE = "https://zreso.cn/api/search";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

/** Format ISO datetime to readable Chinese format. */
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith("0001")) return "未知时间";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extract the real share URL from zreso's redirect wrapper. */
function getRealUrl(result: SearchResult): string {
  // If links array has usable URLs, use first one
  if (result.links?.length > 0 && result.links[0].url) {
    return result.links[0].url;
  }
  // fallback to first_url (may be a redirect path)
  if (result.first_url) {
    return result.first_url.startsWith("http")
      ? result.first_url
      : `https://zreso.cn${result.first_url}`;
  }
  return "#";
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

/**
 * Net-disk resource search page.
 *
 * Uses the free zreso.cn JSON API to search across 14 cloud-disk types
 * (Quark, Baidu, Aliyun, UC, Xunlei, etc). Results are filtered client-side
 * by cloud type, with search, copy-link, and type-switching capabilities.
 */
export default function NetDiskSearchPage() {
  const { getConfig } = usePageConfigs();
  const config = getConfig("net-disk-search");

  // ── State ──
  const [keyword, setKeyword] = useState("");
  const [activeType, setActiveType] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // ── Derived ──
  const hasActiveFilter = activeType !== "" || keyword.trim().length > 0;

  /** Client-side filter results by selected cloud type. */
  const filteredResults = useMemo(() => {
    if (!activeType) return results;
    return results.filter((r) => r.cloud_type_name === activeType);
  }, [results, activeType]);

  const statusText = searched
    ? loading
      ? "搜索中…"
      : error
        ? "请求失败"
        : `共 ${total} 条结果${activeType ? ` · ${activeType}` : ""}`
    : "输入关键词后开始搜索";

  // ── Actions ──
  const search = useCallback(async () => {
    const kw = keyword.trim();
    if (!kw) return;
    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);

    try {
      const params = new URLSearchParams({ q: kw });
      const resp = await fetch(`${API_BASE}?${params.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: SearchResponse = await resp.json();
      if (!json.ok || !json.data) throw new Error("接口返回异常");
      setResults(json.data.results || []);
      setTotal(json.data.total || 0);
    } catch (err) {
      console.error("NetDiskSearch error:", err);
      setError("搜索接口暂时不可用，请稍后再试。若持续失败，可能是第三方接口限流或服务异常。");
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  const clearFilters = () => {
    setActiveType("");
    setKeyword("");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // fallback silently
    }
  };

  // Show disabled notice if page is off
  if (config && !config.is_enabled) {
    return <PageDisabledNotice pageTitle={config?.title} />;
  }

  return (
    <>
      <SEO pageKey="net-disk-search" breadcrumbName="网盘搜索" pageConfig={config} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* ================================================================ */}
        {/* Hero Header                                                      */}
        {/* ================================================================ */}
        <div className="animate-slide-up overflow-hidden rounded-2xl border border-game-border bg-gradient-to-br from-neon-blue/10 via-game-card to-neon-purple/10">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/30 to-neon-purple/30">
                <HardDrive className="h-7 w-7 text-neon-blue" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                  {config?.title || "网盘资源搜索"}
                </h1>
                <p className="mt-1 text-sm text-slate-400 sm:text-base">
                  {config?.subtitle ||
                    "聚合 14 种网盘资源，支持百度网盘、夸克、阿里云盘、迅雷等，快速找到你需要的文件"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Search + Filter Panel                                            */}
        {/* ================================================================ */}
        <div className="mt-6 rounded-2xl border border-game-border bg-game-card/60 p-4 backdrop-blur-xl sm:p-5">
          {/* Search row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入关键词，如：电影名称、软件名、教程…"
                className="w-full rounded-xl border border-game-border bg-game-card/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:bg-game-card focus:ring-2 focus:ring-neon-blue/20"
              />
            </div>
            <button
              onClick={search}
              disabled={loading || !keyword.trim()}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20 transition-all duration-200 hover:shadow-neon-blue/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  搜索中
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  开始搜索
                </>
              )}
            </button>
          </div>

          {/* Filter row */}
          <div className="mt-3 flex flex-wrap items-center">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              网盘类型
            </span>
            <div className="ml-3 flex flex-wrap items-center gap-2">
              {CLOUD_TYPES.map((type) => {
                const active = activeType === type.key;
                return (
                  <button
                    key={type.key}
                    onClick={() => setActiveType(type.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                        : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
                    }`}
                  >
                    <span className="mr-1">{type.icon}</span>
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status row */}
          <div className="mt-3 flex items-center justify-between border-t border-game-border/50 pt-3">
            <span className="text-sm text-slate-500">{statusText}</span>
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors duration-200 hover:bg-game-elevated hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                清除
              </button>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* Results                                                          */}
        {/* ================================================================ */}
        {!searched ? (
          /* Empty state — before first search */
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-card/40 py-24">
            <HardDrive className="mb-4 h-16 w-16 text-slate-700" />
            <p className="text-base text-slate-500">输入关键词，选择网盘类型，开始搜索</p>
            <p className="mt-1 text-sm text-slate-600">
              支持百度网盘、夸克、阿里云盘等 14 种网盘资源
            </p>
          </div>
        ) : error ? (
          /* Error state */
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 py-24">
            <AlertTriangle className="mb-4 h-14 w-14 text-red-500/50" />
            <p className="text-base text-slate-400">{error}</p>
            <button
              onClick={search}
              className="mt-4 rounded-lg border border-game-border bg-game-card/60 px-4 py-2 text-sm text-slate-400 transition-colors duration-200 hover:border-game-border-hover hover:text-slate-200"
            >
              重试
            </button>
          </div>
        ) : filteredResults.length === 0 ? (
          /* Empty results */
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-card/40 py-24">
            <Database className="mb-4 h-14 w-14 text-slate-700" />
            <p className="text-base text-slate-500">没有找到匹配的结果</p>
            <p className="mt-1 text-sm text-slate-600">换个关键词试试，或者切换到"全部"类型</p>
            <button
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-game-border bg-game-card/60 px-4 py-2 text-sm text-slate-400 transition-colors duration-200 hover:border-game-border-hover hover:text-slate-200"
            >
              清除筛选
            </button>
          </div>
        ) : (
          /* Results grid */
          <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {filteredResults.map((item, index) => (
              <ResultCard
                key={`${item.title}-${index}`}
                item={item}
                index={index}
                copiedUrl={copiedUrl}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        )}

        {/* ================================================================ */}
        {/* Disclaimer                                                      */}
        {/* ================================================================ */}
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/70" />
          <p className="text-xs leading-relaxed text-slate-500">
            免责声明：本页面调用第三方免费搜索接口（zreso.cn），结果仅供检索参考。
            资源的可用性与安全性请自行判断。磁力链接请使用支持对应协议的客户端打开。
            本站不对任何第三方内容负责。
          </p>
        </div>

        <RelatedLinks current="net-disk-search" />
      </div>
    </>
  );
}

/* ────────────────────────────────────────────
   Result Card
   ──────────────────────────────────────────── */

function ResultCard({
  item,
  index,
  copiedUrl,
  onCopy,
}: {
  item: SearchResult;
  index: number;
  copiedUrl: string | null;
  onCopy: (text: string) => void;
}) {
  const url = getRealUrl(item);
  const isMagnet = item.cloud_type_name === "磁力链接";
  const isEd2k = item.cloud_type_name === "电驴链接";

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:shadow-card-hover animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 break-words text-base font-semibold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
            {item.title}
          </h3>
          <span className="shrink-0 rounded-full bg-neon-blue/10 px-2.5 py-0.5 text-xs font-bold text-neon-blue border border-neon-blue/20">
            {item.cloud_type_name}
          </span>
        </div>
      </div>

      {/* ── Meta ── */}
      <div className="mx-5 border-t border-game-border/50" />
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {formatDate(item.datetime)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Database className="h-3 w-3" />
          {item.cloud_type_name}
        </span>
      </div>

      {/* ── Link area ── */}
      <div className="mx-5 border-t border-game-border/50" />
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-game-border bg-game-darker/60 px-3 py-2">
          <input
            readOnly
            value={url}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="min-w-0 flex-1 truncate bg-transparent text-xs text-slate-400 outline-none"
          />
          <button
            onClick={() => onCopy(url)}
            className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors duration-200 hover:bg-game-elevated hover:text-neon-blue"
            title="复制链接"
          >
            {copiedUrl === url ? (
              <Check className="h-4 w-4 text-neon-green" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="mt-auto px-5 pb-5">
        <div className="flex gap-2">
          {isMagnet || isEd2k ? (
            <button
              onClick={() => onCopy(url)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 px-4 py-2.5 text-sm font-medium text-neon-blue transition-all duration-200 hover:from-neon-blue/30 hover:to-neon-purple/30 hover:border-neon-blue/50 hover:shadow-md hover:shadow-neon-blue/10"
            >
              <Copy className="h-4 w-4" />
              复制链接
            </button>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 px-4 py-2.5 text-sm font-medium text-neon-blue transition-all duration-200 hover:from-neon-blue/30 hover:to-neon-purple/30 hover:border-neon-blue/50 hover:shadow-md hover:shadow-neon-blue/10"
            >
              <ExternalLink className="h-4 w-4" />
              打开资源
            </a>
          )}
          <button
            onClick={() => onCopy(url)}
            className="flex items-center justify-center gap-2 rounded-xl border border-game-border bg-game-darker/60 px-4 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-game-border-hover hover:text-slate-200"
          >
            <Copy className="h-4 w-4" />
            复制
          </button>
        </div>
      </div>
    </div>
  );
}
