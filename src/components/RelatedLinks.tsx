import { Link } from "react-router-dom";
import {
  Monitor,
  Cloud,
  Gamepad2,
  Gift,
  MessageSquare,
  BookOpen,
} from "lucide-react";

interface RelatedLink {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ALL_LINKS: Record<string, RelatedLink> = {
  "cloud-games": {
    to: "/cloud-games",
    label: "云游戏平台",
    description: "10+主流云游戏平台入口聚合",
    icon: <Monitor className="h-5 w-5 text-neon-blue" />,
  },
  "cloud-desktops": {
    to: "/cloud-desktops",
    label: "云电脑入口",
    description: "5+办公云电脑，iPad秒变Windows",
    icon: <Cloud className="h-5 w-5 text-neon-purple" />,
  },
  "free-games": {
    to: "/free-games",
    label: "免费游戏资源",
    description: "26款夸克网盘免费游戏合集",
    icon: <Gamepad2 className="h-5 w-5 text-neon-green" />,
  },
  deals: {
    to: "/deals",
    label: "薅羊毛优惠",
    description: "云游戏免费时长/限时优惠聚合",
    icon: <Gift className="h-5 w-5 text-amber-400" />,
  },
  "sms-platforms": {
    to: "/sms-platforms",
    label: "接码平台导航",
    description: "24个接码平台，隐私保护/批量注册",
    icon: <MessageSquare className="h-5 w-5 text-cyan-400" />,
  },
  library: {
    to: "/library",
    label: "攻略文章库",
    description: "云游戏新手入门/平台对比/常见问题",
    icon: <BookOpen className="h-5 w-5 text-rose-400" />,
  },
};

interface RelatedLinksProps {
  /** Current page key to exclude from the related links list */
  current: string;
  /** Specific related page keys to show (defaults to all except current) */
  related?: string[];
}

/**
 * Related pages internal links section.
 * Displays 3-5 related page cards at the bottom of each content page
 * for SEO internal linking and user discovery.
 */
export default function RelatedLinks({ current, related }: RelatedLinksProps) {
  const keys = related
    ? related.filter((k) => k !== current && ALL_LINKS[k])
    : Object.keys(ALL_LINKS).filter((k) => k !== current);

  return (
    <section className="mt-12 border-t border-game-border pt-8">
      <h2 className="mb-4 text-lg font-bold text-slate-200">相关推荐</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const link = ALL_LINKS[key];
          return (
            <Link
              key={key}
              to={link.to}
              className="group flex items-start gap-3 rounded-xl border border-game-border bg-game-card/60 p-4 transition-all duration-200 hover:border-game-border-hover hover:bg-game-card"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-game-elevated">
                {link.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                  {link.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                  {link.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
