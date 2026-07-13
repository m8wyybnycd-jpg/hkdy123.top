import { useNavigate } from "react-router-dom";
import { Lock, Home, ArrowLeft } from "lucide-react";

/**
 * 403 Forbidden page.
 *
 * Displayed when a user attempts to access an admin route
 * they don't have permission for.
 *
 * Shows a lock icon, "403 - 无权访问" heading, description text,
 * and buttons to return to the dashboard or front-end home.
 */
export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      {/* Lock Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15">
        <Lock className="h-10 w-10 text-red-400" />
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-2xl font-bold text-slate-100">403 - 无权访问</h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-center text-sm text-slate-400">
        抱歉，您没有访问此页面的权限。如需获取权限，请联系超级管理员为您分配相应的角色和权限。
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#2EA7FF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1d8ad6]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回仪表盘
        </button>
        <button
          onClick={() => navigate("/cloud-games")}
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
        >
          <Home className="h-4 w-4" />
          返回前台
        </button>
      </div>
    </div>
  );
}
