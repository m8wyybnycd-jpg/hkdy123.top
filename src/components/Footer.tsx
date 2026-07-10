import { Link } from "react-router-dom";

/**
 * Footer with site navigation links, disclaimer, and copyright.
 * Includes internal links for SEO (every page links to all main sections).
 */
export default function Footer() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <footer className="border-t border-game-border bg-game-darker/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Internal links for SEO */}
        <nav className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            首页
          </Link>
          <Link to="/cloud-games" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            云游戏平台
          </Link>
          <Link to="/cloud-desktops" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            云电脑入口
          </Link>
          <Link to="/free-games" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            免费游戏
          </Link>
          <Link to="/deals" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            薅羊毛
          </Link>
          <Link to="/sms-platforms" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            接码平台
          </Link>
          <Link to="/library" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            攻略文章
          </Link>
        </nav>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple" />
            <span className="text-sm font-medium text-slate-300">云玩汇</span>
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue" />
          </div>
          <p className="text-sm text-slate-400">
            云游戏 × 云电脑 × 薅羊毛聚合站 | 数据更新于 {year} 年 {month} 月
          </p>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
            免责声明：本站仅作信息聚合参考，不提供云游戏/云电脑服务。各平台价格、免费额度、支持游戏列表等信息以各平台官网实时公布为准。
            游戏版权归各开发商/发行商所有。薅羊毛信息具有时效性，请以实际为准。
          </p>
          <p className="text-xs text-slate-600">
            © {year} 云玩汇 · 由 Cloudflare Pages + Workers + D1 驱动
          </p>
        </div>
      </div>
    </footer>
  );
}
