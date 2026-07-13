import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Gamepad2, Search, LogOut, Menu, X, Shield, User, Bell, LogIn } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";
import { useUnread } from "../contexts/UnreadContext";
import { usePageConfigs } from "../hooks/usePageConfigs";
import { usePublicSettings } from "../hooks/usePublicSettings";
import MessageBell from "./MessageBell";

/**
 * Top navigation header with dynamic tabs, search input,
 * message bell, user avatar, and mobile hamburger menu. Sticky positioned.
 */
export default function Header() {
  const { logout, authState } = useAuthContext();
  const { unreadCount } = useUnread();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic navigation tabs from page configs (enabled + sorted by sort_order)
  // path is derived from page_key (e.g. "cloud-games" → "/cloud-games")
  // label uses page_name (display name, e.g. "云游戏")
  const { enabledConfigs } = usePageConfigs();
  // Exclude the 'home' config — it backs the root landing (/), not a nav tab.
  const TABS = enabledConfigs
    .filter((c) => c.page_key !== "home")
    .map((c) => ({ path: `/${c.page_key}`, label: c.page_name || c.title }));

  // Public settings for dynamic site name and logo
  const { get: getSetting } = usePublicSettings();
  const siteName = getSetting("site_name", "云玩汇");
  const logoUrl = getSetting("logo_url", "");

  /** Handle search submission — navigate to /search?q= */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setMenuOpen(false);
    }
  };

  /** Handle logout — clear token and redirect to /login */
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  /** Display name: prefer email, fall back to username. */
  const displayName = authState.user?.email || authState.user?.username || "";
  /** Avatar initial: first character of email or username. */
  const avatarInitial = (
    authState.user?.email || authState.user?.username || "?"
  )
    .slice(0, 1)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-game-border bg-game-darker/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo + Name */}
        <NavLink to="/" className="flex shrink-0 items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple shadow-lg shadow-neon-blue/20">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="hidden sm:block">
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">{siteName}</span>
            </span>
            <p className="text-xs text-slate-500">云游戏 · 云电脑 · 薅羊毛</p>
          </div>
        </NavLink>

        {/* Desktop Tabs */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `relative shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:bg-game-card/60 hover:text-slate-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {tab.label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Search + MessageBell + User area */}
        <div className="hidden items-center gap-3 md:flex">
          <form onSubmit={handleSearch} className="relative w-44 lg:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索游戏…"
              aria-label="搜索游戏"
              className="w-full rounded-lg border border-game-border bg-game-card/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:bg-game-card focus:ring-2 focus:ring-neon-blue/20"
            />
          </form>
          {authState.user && (
            <div className="flex items-center gap-2.5">
              {/* Admin entry */}
              {authState.user?.isAdmin && (
                <NavLink
                  to="/admin/dashboard"
                  className="flex items-center gap-1.5 rounded-lg border border-game-border bg-game-card/60 px-3 py-2 text-sm text-neon-blue transition-all duration-200 hover:border-neon-blue/30 hover:bg-neon-blue/10 hover:text-neon-blue/90"
                  aria-label="管理后台"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">管理</span>
                </NavLink>
              )}
              {/* Message bell with badge */}
              <MessageBell />
              {/* Avatar + name → /profile */}
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-lg px-1 py-1 transition-all duration-200 hover:opacity-80"
                aria-label="个人中心"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 text-xs font-semibold text-slate-300">
                  {avatarInitial}
                </div>
                <span className="hidden text-sm text-slate-400 lg:inline">
                  {displayName}
                </span>
              </NavLink>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-game-border bg-game-card/60 px-3 py-2 text-sm text-slate-400 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                aria-label="登出"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Login button for unauthenticated users */}
          {!authState.loading && !authState.user && (
            <NavLink
              to="/login"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20 transition-all hover:shadow-glow"
            >
              <LogIn className="h-4 w-4" />
              登录 / 注册
            </NavLink>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-game-border bg-game-card/60 text-slate-400 transition-colors hover:text-slate-200 md:hidden"
          aria-label="菜单"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="animate-slide-down border-t border-game-border bg-game-darker/95 px-4 py-3 backdrop-blur-xl md:hidden">
          {/* Navigation tabs */}
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-neon-blue/10 text-neon-blue"
                      : "text-slate-400 hover:bg-game-card/60 hover:text-slate-200"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索游戏…"
              aria-label="搜索游戏"
              className="w-full rounded-lg border border-game-border bg-game-card/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
            />
          </form>

          {/* User operations section */}
          {authState.user && (
            <>
              <div className="mt-3 border-t border-game-border pt-3">
                <nav className="flex flex-col gap-1">
                  {/* Profile */}
                  <NavLink
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-slate-400 transition-colors hover:bg-game-card/60 hover:text-slate-200"
                  >
                    <User className="h-4 w-4" />
                    <span>个人中心</span>
                  </NavLink>
                  {/* Messages */}
                  <NavLink
                    to="/messages"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-slate-400 transition-colors hover:bg-game-card/60 hover:text-slate-200"
                  >
                    <Bell className="h-4 w-4" />
                    <span>
                      我的消息
                      {unreadCount > 0 && (
                        <span className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                  </NavLink>
                  {/* Admin (only for admin users) */}
                  {authState.user?.isAdmin && (
                    <NavLink
                      to="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-neon-blue transition-colors hover:bg-neon-blue/10"
                    >
                      <Shield className="h-4 w-4" />
                      <span>管理后台</span>
                    </NavLink>
                  )}
                </nav>
              </div>

              {/* Logout button */}
              <div className="mt-2 border-t border-game-border pt-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </>
          )}

          {/* Login link for unauthenticated users (mobile) */}
          {!authState.loading && !authState.user && (
            <div className="mt-3 border-t border-game-border pt-3">
              <NavLink
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20"
              >
                <LogIn className="h-4 w-4" />
                登录 / 注册
              </NavLink>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
 