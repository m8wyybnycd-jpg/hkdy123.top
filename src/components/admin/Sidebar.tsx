import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Monitor,
  Tag,
  Library,
  Gift,
  ShieldCheck,
  Settings,
  X,
  Megaphone,
  Mail,
  ScrollText,
  Images,
  Image,
  LayoutTemplate,
  MessageSquare,
  KeyRound,
  Cat,
} from "lucide-react";
import { usePermission } from "../../contexts/PermissionContext";
import { NAV_PERMISSIONS } from "../../constants/permissions";

interface SidebarProps {
  /** Whether the sidebar is open on mobile (drawer mode). */
  mobileOpen: boolean;
  /** Close the sidebar (mobile only). */
  onClose: () => void;
}

/** Navigation menu item definition. */
interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  /** Required permission code to see this item (undefined = always visible). */
  permission?: string;
}

/** Primary navigation items. */
const mainNav: NavItem[] = [
  { label: "仪表盘", to: "/admin/dashboard", icon: LayoutDashboard, permission: NAV_PERMISSIONS["/admin/dashboard"] },
  { label: "用户管理", to: "/admin/users", icon: Users, permission: NAV_PERMISSIONS["/admin/users"] },
];

/** Content management sub-menu items. */
const contentNav: NavItem[] = [
  { label: "云游戏平台", to: "/admin/content/platforms", icon: Gamepad2, permission: NAV_PERMISSIONS["/admin/content/platforms"] },
  { label: "办公云电脑", to: "/admin/content/desktops", icon: Monitor, permission: NAV_PERMISSIONS["/admin/content/desktops"] },
  { label: "薅羊毛", to: "/admin/content/deals", icon: Tag, permission: NAV_PERMISSIONS["/admin/content/deals"] },
  { label: "游戏库", to: "/admin/content/games", icon: Library, permission: NAV_PERMISSIONS["/admin/content/games"] },
  { label: "免费资源", to: "/admin/content/free-games", icon: Gift, permission: NAV_PERMISSIONS["/admin/content/free-games"] },
  { label: "接码平台", to: "/admin/content/sms-platforms", icon: MessageSquare, permission: NAV_PERMISSIONS["/admin/content/sms-platforms"] },
];

/** Communication sub-menu items (announcements + messages + media). */
const communicationNav: NavItem[] = [
  { label: "公告管理", to: "/admin/announcements", icon: Megaphone, permission: NAV_PERMISSIONS["/admin/announcements"] },
  { label: "轮播图管理", to: "/admin/banners", icon: Images, permission: NAV_PERMISSIONS["/admin/banners"] },
  { label: "图片库", to: "/admin/gallery", icon: Image, permission: NAV_PERMISSIONS["/admin/gallery"] },
  { label: "站内信", to: "/admin/messages", icon: Mail, permission: NAV_PERMISSIONS["/admin/messages"] },
];

/** Secondary navigation items (system management). */
const secondaryNav: NavItem[] = [
  { label: "页面配置", to: "/admin/page-configs", icon: LayoutTemplate, permission: NAV_PERMISSIONS["/admin/page-configs"] },
  { label: "凭证管理", to: "/admin/credentials", icon: KeyRound, permission: NAV_PERMISSIONS["/admin/credentials"] },
  { label: "宠物管理", to: "/admin/pets", icon: Cat, permission: NAV_PERMISSIONS["/admin/pets"] },
  { label: "权限角色", to: "/admin/roles", icon: ShieldCheck, permission: NAV_PERMISSIONS["/admin/roles"] },
  { label: "日志查看", to: "/admin/logs/operation", icon: ScrollText, permission: NAV_PERMISSIONS["/admin/logs/operation"] },
  { label: "系统设置", to: "/admin/settings", icon: Settings, permission: NAV_PERMISSIONS["/admin/settings"] },
];

/** Shared CSS classes for NavLink active/inactive states. */
const linkBaseClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const linkActiveClass =
  "bg-aurora-cyan/15 text-aurora-cyan";
const linkInactiveClass =
  "text-slate-400 hover:bg-white/5 hover:text-slate-200";

/**
 * Filter navigation items based on the user's permissions.
 * Items without a permission field are always shown.
 */
function useFilteredNav(items: NavItem[]): NavItem[] {
  const { hasPermission } = usePermission();
  return items.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );
}

/**
 * Admin sidebar navigation.
 *
 * Desktop: fixed 240px width, always visible.
 * Mobile: slides in as a drawer overlay when `mobileOpen` is true.
 * Menu items are dynamically filtered based on user permissions.
 */
export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const filteredMainNav = useFilteredNav(mainNav);
  const filteredContentNav = useFilteredNav(contentNav);
  const filteredCommunicationNav = useFilteredNav(communicationNav);
  const filteredSecondaryNav = useFilteredNav(secondaryNav);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 flex h-screen w-60 flex-col
          bg-game-darker transition-transform duration-300
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-aurora-cyan" />
            <span className="text-base font-bold text-white">云游戏后台</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* Main section */}
          {filteredMainNav.length > 0 && (
            <>
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                主菜单
              </div>
              <div className="space-y-1">
                {filteredMainNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}

          {/* Content management section */}
          {filteredContentNav.length > 0 && (
            <>
              <div className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                内容管理
              </div>
              <div className="space-y-1">
                {filteredContentNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}

          {/* Communication section */}
          {filteredCommunicationNav.length > 0 && (
            <>
              <div className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                消息通知
              </div>
              <div className="space-y-1">
                {filteredCommunicationNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}

          {/* System section */}
          {filteredSecondaryNav.length > 0 && (
            <>
              <div className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                系统
              </div>
              <div className="space-y-1">
                {filteredSecondaryNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer version */}
        <div className="border-t border-white/5 px-5 py-4">
          <p className="text-xs text-slate-500">CloudGame Hub v4.0</p>
        </div>
      </aside>
    </>
  );
}
