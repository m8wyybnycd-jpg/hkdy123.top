import { useNavigate } from "react-router-dom";
import { Mail, Phone, Calendar, Tag, Shield, LogOut } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";

/**
 * User profile page (route: /profile).
 *
 * Displays account information in a centered card layout:
 * - Avatar (first letter of username/email).
 * - Email, phone (masked), registration date, role chips.
 * - Admin users see an "进入管理后台" button.
 * - Logout button.
 */
export default function ProfilePage() {
  const { authState, logout } = useAuthContext();
  const navigate = useNavigate();
  const user = authState.user;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-slate-400">请先登录</p>
      </div>
    );
  }

  /** Mask the middle 4 digits of a phone number (e.g. 138****8888). */
  const maskPhone = (phone: string): string => {
    if (phone.length < 7) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  };

  /** First character for avatar display. */
  const avatarChar = (user.username || user.email || "?").slice(0, 1).toUpperCase();

  /** Distinguish role chip colors. */
  const roleColor = (role: string): string => {
    if (role === "admin") return "bg-red-500/15 text-red-400";
    if (role === "editor") return "bg-neon-blue/15 text-neon-blue";
    if (role === "viewer") return "bg-slate-500/15 text-slate-400";
    return "bg-neon-purple/15 text-neon-purple";
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-game-border bg-game-card p-6 sm:p-8">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue to-neon-purple text-2xl font-bold text-white shadow-lg shadow-neon-blue/20">
            {avatarChar}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-100">
            {user.username || user.email}
          </h2>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-game-border" />

        {/* Info rows */}
        <div className="space-y-3.5">
          {/* Email */}
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="w-10 shrink-0 text-slate-500">邮箱</span>
            <span className="truncate text-slate-200">
              {user.email || "未绑定"}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="w-10 shrink-0 text-slate-500">手机</span>
            <span className="text-slate-200">
              {user.phone ? maskPhone(user.phone) : "未绑定"}
            </span>
          </div>

          {/* Registration date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="w-10 shrink-0 text-slate-500">注册</span>
            <span className="text-slate-200">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString("zh-CN")
                : "未知"}
            </span>
          </div>

          {/* Roles */}
          <div className="flex items-center gap-3 text-sm">
            <Tag className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="w-10 shrink-0 text-slate-500">角色</span>
            <div className="flex flex-wrap gap-1.5">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${roleColor(role)}`}
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">普通用户</span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-game-border" />

        {/* Actions */}
        <div className="space-y-3">
          {user.isAdmin && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
            >
              <Shield className="h-4 w-4" />
              进入管理后台
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-game-border bg-game-card/60 px-4 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
