import { Link } from "react-router-dom";
import {
  Monitor,
  Cloud,
  Gamepad2,
  Gift,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Smartphone,
  Zap,
  ShieldCheck,
} from "lucide-react";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/**
 * Public landing page (no login required).
 * SEO-optimized homepage with H1 containing primary keywords,
 * feature cards for each category, and descriptive content.
 * Hero title/subtitle and SEO meta are admin-managed via page_configs.
 */
export default function HomePage() {
  const { getConfig } = usePageConfigs();
  const config = getConfig("home");

  return (
    <>
      <SEO pageKey="home" breadcrumbName="首页" pageConfig={config} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero Section */}
        <section className="relative mb-12 overflow-hidden rounded-3xl border border-game-border bg-gradient-to-br from-game-card to-game-darker px-6 py-16 text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-neon-blue/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-64 rounded-full bg-neon-purple/5 blur-3xl" />
          <div className="relative">
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              <span className="gradient-text">
                {config?.title || "云游戏平台哪个好？"}
              </span>
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-base text-slate-400 sm:text-lg">
              {config?.subtitle || "2026年免费云游戏平台大全。聚合全网10+云游戏平台、5+云电脑入口和26款免费游戏资源，一页看全、一键直达。不用买显卡，手机也能玩3A大作。"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/cloud-games"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20 transition-all hover:shadow-glow"
              >
                <Monitor className="h-4 w-4" />
                浏览云游戏平台
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/free-games"
                className="flex items-center gap-2 rounded-xl border border-game-border bg-game-card/60 px-6 py-3 text-sm font-medium text-slate-300 transition-all hover:border-neon-green/30 hover:bg-neon-green/5"
              >
                <Gamepad2 className="h-4 w-4 text-neon-green" />
                免费游戏资源
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-slate-200">
            全站导航
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Cloud Games */}
            <Link
              to="/cloud-games"
              className="group rounded-2xl border border-game-border bg-game-card p-6 transition-all duration-200 hover:border-neon-blue/30 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 ring-1 ring-game-border">
                <Monitor className="h-6 w-6 text-neon-blue" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-100">
                云游戏平台入口
              </h3>
              <p className="text-sm text-slate-500">
                腾讯START、网易云游戏、格来云游戏等10+主流平台入口聚合，一页对比查看，一键直达。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-neon-blue opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Cloud Desktops */}
            <Link
              to="/cloud-desktops"
              className="group rounded-2xl border border-game-border bg-game-card p-6 transition-all duration-200 hover:border-neon-purple/30 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 ring-1 ring-game-border">
                <Cloud className="h-6 w-6 text-neon-purple" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-100">
                云电脑入口
              </h3>
              <p className="text-sm text-slate-500">
                阿里云电脑、华为云电脑等5+办公云电脑平台。iPad秒变Windows，新用户免费体验。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-neon-purple opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Free Games */}
            <Link
              to="/free-games"
              className="group rounded-2xl border border-game-border bg-game-card p-6 transition-all duration-200 hover:border-neon-green/30 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-green/20 to-neon-blue/20 ring-1 ring-game-border">
                <Gamepad2 className="h-6 w-6 text-neon-green" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-100">
                免费游戏资源
              </h3>
              <p className="text-sm text-slate-500">
                26款夸克网盘免费游戏，含3A大作、独立游戏、经典老游戏。一键保存即下即玩。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-neon-green opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Deals */}
            <Link
              to="/deals"
              className="group rounded-2xl border border-game-border bg-game-card p-6 transition-all duration-200 hover:border-amber-400/30 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-neon-green/20 ring-1 ring-game-border">
                <Gift className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-100">
                薅羊毛优惠
              </h3>
              <p className="text-sm text-slate-500">
                云游戏免费时长、限时优惠第一时间聚合。帮你免排队、省费用。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* SMS Platforms */}
            <Link
              to="/sms-platforms"
              className="group rounded-2xl border border-game-border bg-game-card p-6 transition-all duration-200 hover:border-cyan-400/30 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-neon-blue/20 ring-1 ring-game-border">
                <MessageSquare className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-100">
                接码平台导航
              </h3>
              <p className="text-sm text-slate-500">
                24个接码平台导航，保护隐私、批量注册必备。含免费和付费平台对比。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-400 opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Library */}
            <Link
              to="/library"
              className="group rounded-2xl border border-game-border bg-game-card p-6 transition-all duration-200 hover:border-rose-400/30 hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400/20 to-neon-purple/20 ring-1 ring-game-border">
                <BookOpen className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-100">
                攻略文章库
              </h3>
              <p className="text-sm text-slate-500">
                云游戏新手入门全攻略、平台对比评测、常见问题解答。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-rose-400 opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="mb-12 rounded-2xl border border-game-border bg-game-card/40 p-6 sm:p-8">
          <h2 className="mb-4 text-xl font-bold text-slate-200">
            什么是云游戏？云游戏平台怎么选？
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-slate-400">
            <p>
              云游戏是一种将游戏运行在云端服务器上、通过视频流将画面传输到用户设备的游戏方式。
              你不需要高配电脑或游戏主机，只要有网络连接，手机、平板、低配电脑都能玩3A大作。
              云游戏不用下载安装，点击即玩，是未来游戏发展的重要方向。
            </p>
            <p>
              选择云游戏平台时，需要考虑几个关键因素：
              <strong className="text-slate-300">延迟表现</strong>（直接影响游戏体验）、
              <strong className="text-slate-300">免费时长</strong>（新用户福利能帮你零成本体验）、
              <strong className="text-slate-300">游戏库</strong>（是否包含你想玩的游戏）、
              <strong className="text-slate-300">画质</strong>（是否支持1080P/4K）、
              以及<strong className="text-slate-300">排队情况</strong>（高峰期是否需要排队）。
            </p>
            <p>
              云玩汇聚合了腾讯START、网易云游戏、格来云游戏、达龙云游戏等10+主流云游戏平台入口，
              以及阿里云电脑、华为云电脑等5+办公云电脑平台。每个平台都有详细介绍和对比信息，
              帮你快速找到最适合自己的云游戏方案。此外，我们还提供26款夸克网盘免费游戏资源和
              云游戏薅羊毛信息，让你白嫖不花钱。
            </p>
          </div>
        </section>

        {/* Advantages */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-slate-200">
            为什么选择云玩汇？
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl border border-game-border bg-game-card/40 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon-blue/10">
                <Smartphone className="h-5 w-5 text-neon-blue" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-200">手机玩PC游戏</h3>
                <p className="text-xs text-slate-500">
                  不用买显卡，手机/平板也能畅玩3A大作
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-game-border bg-game-card/40 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon-green/10">
                <Zap className="h-5 w-5 text-neon-green" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-200">一页看全</h3>
                <p className="text-xs text-slate-500">
                  所有平台入口聚合，对比查看，一键直达
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-game-border bg-game-card/40 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon-purple/10">
                <ShieldCheck className="h-5 w-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-200">信息透明</h3>
                <p className="text-xs text-slate-500">
                  各平台优缺点、免费额度、排队情况全公开
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-8 rounded-2xl border border-game-border bg-gradient-to-br from-game-card to-game-darker p-6 text-center sm:p-8">
          <h2 className="mb-2 text-lg font-bold text-slate-200">
            准备好开始云游戏之旅了吗？
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            注册账号即可解锁全部功能，收藏你喜欢的平台，第一时间获取薅羊毛信息
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20 transition-all hover:shadow-glow"
          >
            免费注册 / 登录
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <RelatedLinks current="home" />
      </div>
    </>
  );
}
