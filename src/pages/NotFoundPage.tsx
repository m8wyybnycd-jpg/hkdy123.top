import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

/**
 * 404 Not Found page (public route: *).
 *
 * Displays a large gradient "404" heading with helpful navigation buttons.
 * No login required — accessible to all visitors.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-game-dark px-4 py-20 text-center">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Large 404 */}
      <h1 className="text-8xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
        404
      </h1>

      <p className="mt-4 text-xl font-medium text-slate-200">
        页面走丢了~
      </p>
      <p className="mt-2 text-sm text-slate-400">
        你访问的页面不存在或已被移除
      </p>

      {/* Navigation buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate("/cloud-games", { replace: true })}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-6 py-3 text-sm font-medium text-white shadow-lg shadow-neon-blue/20 transition-all duration-200 hover:opacity-90"
        >
          ← 返回首页
        </button>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-game-border px-6 py-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-game-card/60"
        >
          返回上一页
        </button>
      </div>
    </div>
  );
}
