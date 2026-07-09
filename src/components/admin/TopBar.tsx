import { useLocation, useNavigate } from "react-router-dom";
import { Menu, ArrowLeft, LogOut } from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";

interface TopBarProps {
  onMenuClick: () => void;
}

/** Route-to-title mapping for the admin TopBar. */
const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "仪表盘",
  "/admin/users": "用户管理",
  "/admin/content/platforms": "云游戏平台",
  "/admin/content/desktops": "办公云电脑",
  "/admin/content/deals": "薅羊毛",
  "/admin/content/games": "游戏库",
  "/admin/roles": "权限角色",
  "/admin/settings": "系统设置",
};

/**
 * Admin top bar: mobile menu toggle, page title, admin info,
 * return-to-frontend link, and logout button.
 */
export default function TopBar({ onMenuClick }: TopBarProps) {
  const { authState, logout } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  const title: string = PAGE_TITLES[location.pathname] ?? "后台管理";

  const handleLogout = (): void => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Left: menu toggle + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>

      {/* Right: return link + admin info + logout */}
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          onClick={() => navigate("/cloud-games")}
          aria-label="返回前台"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">返回前台</span>
        </button>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 lg:pl-4">
          <div className="text-right">
            <p className="max-w-[180px] truncate text-sm font-medium text-slate-700">
              {authState.user?.email ?? "未知用户"}
            </p>
            <p className="text-xs text-slate-400">管理员</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-500"
            aria-label="退出登录"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
