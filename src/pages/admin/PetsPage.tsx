import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cat,
  PawPrint,
  Search,
  X,
  Loader2,
  BarChart3,
  MessageSquare,
  Brain,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type {
  AdminPetItem,
  AdminPetStats,
  AdminPetConversation,
  AdminPetMemory,
  AdminPetListResponse,
} from "../../types";

// ── Constants ────────────────────────────────────────────

const LEVEL_COLORS: Record<number, string> = {
  1: "text-cyan-400 bg-cyan-500/10",           // 蛋 → 青蓝
  2: "text-amber-400 bg-amber-500/10",          // 幼崽 → 琥珀
  3: "text-indigo-400 bg-indigo-500/10",        // 少年 → 靛蓝
  4: "text-sky-400 bg-sky-500/10",              // 青年
  5: "text-emerald-400 bg-emerald-500/10",      // 成年
  6: "text-yellow-400 bg-yellow-500/10",        // 精英 → 金色
  7: "text-white bg-white/10",                  // 传说 → 纯白
};

const STATE_LABELS: Record<string, string> = {
  idle: "空闲",
  waving: "挥手",
  jumping: "跳跃",
  running: "奔跑",
  failed: "失败",
  waiting: "等待",
  review: "检查",
};

const MOOD_LABELS: Record<string, string> = {
  happy: "开心",
  sad: "难过",
  angry: "生气",
  curious: "好奇",
  thinking: "思考",
  sleep: "睡眠",
};

const MEMORY_TYPE_LABELS: Record<string, string> = {
  preference: "偏好",
  fact: "事实",
  behavior: "行为",
  relationship: "关系",
  ephemeral: "临时",
};

// ── Helpers ───────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function titleCase(label: string | null | undefined, fallback: string): string {
  if (!label) return fallback;
  const known = STATE_LABELS[label] || MOOD_LABELS[label];
  if (known) return known;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ── Main Component ───────────────────────────────────────

export default function PetsPage() {
  const [pets, setPets] = useState<AdminPetItem[]>([]);
  const [stats, setStats] = useState<AdminPetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Debounced search
  const [searchInput, setSearchInput] = useState("");

  // Detail modal
  const [selectedPet, setSelectedPet] = useState<AdminPetItem | null>(null);

  // ── Load stats ──
  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient.getPetStats();
      setStats(data);
    } catch {
      // Stats are non-critical; ignore individual failures
    }
  }, []);

  // ── Load pet list ──
  const loadPets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; pageSize: number; search?: string; level?: number } = {
        page,
        pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (levelFilter !== "all") params.level = parseInt(levelFilter, 10);
      const data: AdminPetListResponse = await apiClient.getAdminPets(params);
      setPets(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
      setPets([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, levelFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, levelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const openDetail = (pet: AdminPetItem) => {
    setSelectedPet(pet);
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Cat className="h-5 w-5 text-aurora-cyan" />
          宠物管理
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          AI 记忆体桌面宠物的全局管理 — 查看所有用户的宠物、成长数据、对话与记忆
        </p>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="宠物总数" value={stats.totalPets} icon={<PawPrint className="h-4 w-4" />} />
          <StatCard label="累计对话" value={stats.totalChats} icon={<MessageSquare className="h-4 w-4" />} />
          <StatCard label="24h 活跃" value={stats.active24h} icon={<Sparkles className="h-4 w-4" />} />
          <StatCard label="记忆总量" value={stats.totalMemories} icon={<Brain className="h-4 w-4" />} />
          <StatCard label="对话总数" value={stats.totalConversations} icon={<BarChart3 className="h-4 w-4" />} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索宠物名 / 邮箱 / 用户名"
            className="w-64 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:border-aurora-cyan/50 focus:outline-none"
          />
        </form>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">等级</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 focus:border-aurora-cyan/50 focus:outline-none"
          >
            <option value="all">全部</option>
            <option value="1">Lv.1 蛋</option>
            <option value="2">Lv.2 幼崽</option>
            <option value="3">Lv.3 少年</option>
            <option value="4">Lv.4 青年</option>
            <option value="5">Lv.5 成年</option>
            <option value="6">Lv.6 精英</option>
            <option value="7">Lv.7 传说</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-slate-500">共 {total} 只</span>
      </div>

      {/* Pet table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : pets.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <Cat className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-sm text-slate-500">暂无宠物数据</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">所属用户</th>
                <th className="px-4 py-3 font-medium">等级</th>
                <th className="px-4 py-3 font-medium">EXP</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">心情</th>
                <th className="px-4 py-3 font-medium">对话数</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pets.map((pet) => (
                <tr
                  key={pet.id}
                  onClick={() => openDetail(pet)}
                  className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-mono text-slate-500">{pet.id}</td>
                  <td className="px-4 py-3 font-medium text-white">{pet.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {pet.userEmail || pet.username || <span className="text-slate-600">未绑定</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[pet.level] || LEVEL_COLORS[1]}`}>
                      Lv.{pet.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{pet.exp}</td>
                  <td className="px-4 py-3 text-slate-400">{titleCase(pet.state, pet.state)}</td>
                  <td className="px-4 py-3 text-slate-400">{titleCase(pet.mood, pet.mood)}</td>
                  <td className="px-4 py-3 text-slate-300">{pet.totalChats}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(pet.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-40"
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {selectedPet && (
        <PetDetailDrawer pet={selectedPet} onClose={() => setSelectedPet(null)} />
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

// ── Detail Drawer ────────────────────────────────────────

type TabKey = "info" | "conversations" | "memories";

function PetDetailDrawer({ pet, onClose }: { pet: AdminPetItem; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true, onClose);

  const [tab, setTab] = useState<TabKey>("info");
  const [conversations, setConversations] = useState<AdminPetConversation[]>([]);
  const [convTotal, setConvTotal] = useState(0);
  const [convPage, setConvPage] = useState(1);
  const [memories, setMemories] = useState<AdminPetMemory[]>([]);
  const [memTotal, setMemTotal] = useState(0);
  const [memPage, setMemPage] = useState(1);
  const [tabLoading, setTabLoading] = useState(false);

  const convPageSize = 15;
  const memPageSize = 15;

  // Load conversations when tab active / page changes
  useEffect(() => {
    if (tab !== "conversations") return;
    let cancelled = false;
    setTabLoading(true);
    apiClient
      .getPetConversations(pet.id, convPage, convPageSize)
      .then((res) => {
        if (cancelled) return;
        setConversations(res.items);
        setConvTotal(res.total);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setTabLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, convPage, pet.id]);

  useEffect(() => {
    if (tab !== "memories") return;
    let cancelled = false;
    setTabLoading(true);
    apiClient
      .getPetMemories(pet.id, memPage, memPageSize)
      .then((res) => {
        if (cancelled) return;
        setMemories(res.items);
        setMemTotal(res.total);
      })
      .catch(() => {
        if (!cancelled) setMemories([]);
      })
      .finally(() => {
        if (!cancelled) setTabLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, memPage, pet.id]);

  const convTotalPages = Math.max(1, Math.ceil(convTotal / convPageSize));
  const memTotalPages = Math.max(1, Math.ceil(memTotal / memPageSize));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-game-darker shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-lg px-2 py-1 text-xs font-medium ${LEVEL_COLORS[pet.level] || LEVEL_COLORS[1]}`}>
              Lv.{pet.level}
            </span>
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Cat className="h-5 w-5 text-aurora-cyan" />
                {pet.name}
              </h3>
              <p className="text-xs text-slate-500">
                ID {pet.id} · {pet.userEmail || pet.username || "未绑定用户"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 px-4">
          <TabButton active={tab === "info"} onClick={() => setTab("info")} icon={<PawPrint className="h-4 w-4" />}>
            宠物信息
          </TabButton>
          <TabButton active={tab === "conversations"} onClick={() => setTab("conversations")} icon={<MessageSquare className="h-4 w-4" />}>
            对话记录
          </TabButton>
          <TabButton active={tab === "memories"} onClick={() => setTab("memories")} icon={<Brain className="h-4 w-4" />}>
            记忆
          </TabButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "info" && <PetInfoTab pet={pet} />}
          {tab === "conversations" && (
            <ConversationList
              loading={tabLoading}
              items={conversations}
              page={convPage}
              totalPages={convTotalPages}
              onPageChange={setConvPage}
            />
          )}
          {tab === "memories" && (
            <MemoryList
              loading={tabLoading}
              items={memories}
              page={memPage}
              totalPages={memTotalPages}
              onPageChange={setMemPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm transition-colors ${
        active
          ? "border-aurora-cyan text-white"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function PetInfoTab({ pet }: { pet: AdminPetItem }) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "宠物 ID", value: <span className="font-mono">{pet.id}</span> },
    { label: "名称", value: pet.name },
    { label: "所属用户", value: pet.userEmail || pet.username || "未绑定" },
    { label: "等级", value: <span className={`rounded px-2 py-0.5 text-xs ${LEVEL_COLORS[pet.level] || LEVEL_COLORS[1]}`}>Lv.{pet.level}</span> },
    { label: "经验值", value: <span className="font-mono">{pet.exp}</span> },
    { label: "当前状态", value: titleCase(pet.state, pet.state) },
    { label: "心情", value: titleCase(pet.mood, pet.mood) },
    { label: "累计对话", value: pet.totalChats },
    { label: "累计浏览", value: pet.totalBrowses },
    { label: "累计点赞", value: pet.totalLikes },
    { label: "孵化时间", value: formatDate(pet.hatchedAt) },
    { label: "创建时间", value: formatDate(pet.createdAt) },
    { label: "更新时间", value: formatDate(pet.updatedAt) },
  ];
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between border-b border-white/5 py-2">
          <span className="text-xs text-slate-500">{row.label}</span>
          <span className="text-sm text-slate-200">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ConversationList({
  loading,
  items,
  page,
  totalPages,
  onPageChange,
}: {
  loading: boolean;
  items: AdminPetConversation[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">暂无对话记录</p>;
  }
  return (
    <div className="space-y-4">
      {items.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                c.role === "user" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
              }`}
            >
              {c.role === "user" ? "用户" : "宠物"}
            </span>
            <span className="text-xs text-slate-500">+{c.expGained} EXP</span>
            <span className="ml-auto text-xs text-slate-600">{formatDate(c.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{c.content}</p>
          {(c.pageContext || c.pageUrl) && (
            <p className="mt-2 text-xs text-slate-500">
              上下文: {c.pageContext || "—"} {c.pageUrl ? `· ${c.pageUrl}` : ""}
            </p>
          )}
        </div>
      ))}
      <Pager page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

function MemoryList({
  loading,
  items,
  page,
  totalPages,
  onPageChange,
}: {
  loading: boolean;
  items: AdminPetMemory[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">暂无记忆</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((m) => (
        <div key={m.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
              {MEMORY_TYPE_LABELS[m.memoryType] || m.memoryType}
            </span>
            <span className="text-xs text-slate-500">重要性 {m.importance}</span>
            <span className="ml-auto text-xs text-slate-600">{formatDate(m.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{m.content}</p>
        </div>
      ))}
      <Pager page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        上一页
      </button>
      <span className="text-sm text-slate-500">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-40"
      >
        下一页
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
