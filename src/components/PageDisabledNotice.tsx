import { Link } from "react-router-dom";
import { Ban, ArrowLeft } from "lucide-react";

interface PageDisabledNoticeProps {
  /** The page title to display in the notice message. */
  pageTitle?: string;
}

/**
 * Notice component displayed when a user accesses a disabled page via direct URL.
 *
 * Shows a centered card with a "page disabled" message and a link back to
 * the home page. Used by individual page components when their page config
 * has is_enabled = 0.
 */
export default function PageDisabledNotice({ pageTitle }: PageDisabledNoticeProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-game-border bg-game-card/80 p-8 text-center shadow-xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <Ban className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-200">
          页面已下线
        </h2>
        <p className="mb-6 text-sm text-slate-400">
          {pageTitle ? `「${pageTitle}」` : "该页面"}已被管理员关闭，暂时无法访问。
          <br />
          如有疑问，请联系管理员。
        </p>
        <Link
          to="/cloud-games"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-neon-blue/20 transition-all duration-200 hover:brightness-110"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
