import { Filter } from "lucide-react";
import type { DealCategory } from "../types";
import { DEAL_CATEGORIES } from "../types";

interface DealFilterProps {
  selectedCategory: DealCategory | "all";
  onCategoryChange: (category: DealCategory | "all") => void;
  resultCount: number;
}

/**
 * Deal category filter bar with 6 options:
 * 全部 / 签到免费 / 限免监控 / 优惠码 / 新用户 / 野路子
 */
export default function DealFilter({
  selectedCategory,
  onCategoryChange,
  resultCount,
}: DealFilterProps) {
  return (
    <div className="mb-6 rounded-2xl border border-game-border bg-game-card/60 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-sm font-medium text-slate-400">
          <Filter className="h-3.5 w-3.5" /> 分类
        </span>
        {DEAL_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                  : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
        <span className="ml-auto text-sm text-slate-500">
          共 <span className="font-medium text-slate-300">{resultCount}</span> 条
        </span>
      </div>
    </div>
  );
}
