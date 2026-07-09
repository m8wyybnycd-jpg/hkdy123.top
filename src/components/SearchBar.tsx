import { Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";

interface SearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
}

/**
 * Reusable search input with icon and clear button.
 * Submits on Enter key or button click.
 */
export default function SearchBar({
  initialValue = "",
  onSearch,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索游戏、平台、薅羊毛信息…"
        autoFocus={autoFocus}
        aria-label="搜索"
        className="w-full rounded-xl border border-game-border bg-game-card py-3 pl-12 pr-24 text-sm text-slate-200 shadow-card placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-game-elevated hover:text-slate-300"
            aria-label="清除"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2 text-sm font-medium text-white shadow-md shadow-neon-blue/20 transition-all duration-200 hover:brightness-110"
        >
          搜索
        </button>
      </div>
    </form>
  );
}
