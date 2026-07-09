import { Lightbulb, Clock, Wifi, Monitor, Coins, Smartphone } from "lucide-react";

interface Tip {
  icon: typeof Clock;
  title: string;
  content: string;
}

const tips: Tip[] = [
  {
    icon: Clock,
    title: "先薅免费时长",
    content:
      "网易云游戏新用户送 2 小时电脑时长，顺网云每天可领免费体验，达龙云签到/暗号领时长（7 天过期）。零成本试玩，满意再充值。",
  },
  {
    icon: Coins,
    title: "常玩选 START 白金",
    content:
      "腾讯 START 白金会员 38 元/月畅玩 240 小时，折合约 0.16 元/时，是重度玩家的性价比之选。偶尔玩选按分钟计费的顺网/达龙更划算。",
  },
  {
    icon: Wifi,
    title: "网络是云游戏的生命线",
    content:
      "云电脑吃网速和延迟，优先使用有线网络或 5GHz WiFi。延迟低于 30ms 体验最佳，高于 80ms 可能卡顿。",
  },
  {
    icon: Monitor,
    title: "重型 3A 用顺网/达龙客户端",
    content:
      "跑赛博朋克2077、黑神话悟空等高画质 3A，建议用顺网云电脑或达龙云电脑的客户端而非网页版，画质和稳定性更好。",
  },
  {
    icon: Smartphone,
    title: "手机玩云游戏",
    content:
      "网易云游戏、ToDesk、海马云都支持手机端，搭配蓝牙手柄可在手机上玩 PC 大作。注意用 WiFi 而非流量，避免高额话费。",
  },
];

/**
 * Money-saving tips section: practical advice for cloud-gaming newcomers.
 */
export default function TipsSection() {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
          <Lightbulb className="h-4 w-4 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">省钱攻略</h2>
        <span className="text-sm text-slate-500">· 新手必看</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tips.map((tip, idx) => {
          const Icon = tip.icon;
          return (
            <div
              key={idx}
              className="group rounded-2xl border border-game-border bg-game-card/60 p-5 shadow-card transition-all duration-300 hover:border-amber-500/30 hover:bg-game-card hover:shadow-card-hover"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/20 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-slate-100">{tip.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">{tip.content}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
