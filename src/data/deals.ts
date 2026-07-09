import type { Deal } from "../types";

/**
 * Deals / freebies / coupons data (5 categories, 3-5 entries each).
 *
 * `updatedAt` and `expiresAt` are ISO 8601 strings.
 * `expiresAt` of null means the deal is long-term valid.
 */
export const deals: Deal[] = [
  // ── 签到免费 (checkin) ─────────────────────────────────
  {
    id: "checkin-netease",
    title: "网易云游戏每日签到",
    description: "连签 7 天送 130 分钟电脑时长，看广告每次额外 +10 分钟。网页版直接签到，零成本攒时长。",
    link: "https://cg.163.com/",
    category: "checkin",
    tags: ["网易云游戏", "每日签到", "免费时长"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "checkin-shunwang",
    title: "顺网云电脑每日领时长",
    description: "每天可领免费体验时长，连续签到天数越多奖励越高。适合每天短时间体验云游戏。",
    link: "https://cpc.icloud.cn/",
    category: "checkin",
    tags: ["顺网云", "每日领取", "免费体验"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "checkin-dalong",
    title: "达龙云电脑签到+暗号领时长",
    description: "每日签到领时长，关注官方公众号获取暗号可额外兑换时长（7 天内有效）。双重渠道白嫖。",
    link: "https://www.dalongyun.com/",
    category: "checkin",
    tags: ["达龙云", "暗号兑换", "双重渠道"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "checkin-gelaiyun",
    title: "格来云游戏每日签到",
    description: "每日签到领免费时长，连续签到可获额外奖励。新用户首次签到送 30 分钟。",
    link: "https://www.gleayun.com/",
    category: "checkin",
    tags: ["格来云", "每日签到", "新用户福利"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },

  // ── 限免监控 (limited_free) ───────────────────────────
  {
    id: "limited-epic",
    title: "EPIC Games 每周免费游戏",
    description: "EPIC 商店每周四发放 1-2 款免费游戏，永久入库。关注 EPIC 商店页面或订阅提醒，不错过任何限免。",
    link: "https://store.epicgames.com/zh-CN/free-games",
    category: "limited_free",
    tags: ["EPIC", "每周免费", "永久入库"],
    updatedAt: "2025-07-04",
    expiresAt: null,
  },
  {
    id: "limited-steam",
    title: "Steam 限免/周末试玩",
    description: "Steam 不定期提供周末免费试玩游戏，部分游戏限时免费领取。关注 Steam 商店首页和社区动态获取最新限免信息。",
    link: "https://store.steampowered.com/",
    category: "limited_free",
    tags: ["Steam", "周末试玩", "限时免费"],
    updatedAt: "2025-07-03",
    expiresAt: null,
  },
  {
    id: "limited-gog",
    title: "GOG 限免活动",
    description: "GOG 平台不定期推出经典游戏限时免费领取活动，关注 GOG 首页或社区通知及时领取。",
    link: "https://www.gog.com/",
    category: "limited_free",
    tags: ["GOG", "经典游戏", "限时免费"],
    updatedAt: "2025-06-28",
    expiresAt: null,
  },

  // ── 优惠码 (coupon) ────────────────────────────────────
  {
    id: "coupon-start",
    title: "腾讯START 新用户首月半价",
    description: "新用户注册 START 白金会员首月半价，仅需 19 元即可畅玩 240 小时。适合想体验腾讯系云游戏的用户。",
    link: "https://start.qq.com/",
    category: "coupon",
    tags: ["腾讯START", "首月半价", "新用户"],
    updatedAt: "2025-07-01",
    expiresAt: "2025-12-31",
  },
  {
    id: "coupon-shunwang",
    title: "顺网云电脑 8 折优惠码",
    description: "限时 8 折优惠码：SHUNWANG80（不定期更新）。充值时长可叠加使用，按分钟计费更划算。",
    link: "https://cpc.icloud.cn/",
    category: "coupon",
    tags: ["顺网云", "8折优惠", "充值折扣"],
    updatedAt: "2025-07-02",
    expiresAt: "2025-08-31",
  },
  {
    id: "coupon-dalong",
    title: "达龙云电脑充值满赠活动",
    description: "充值满 50 元送 10 元时长，满 100 元送 30 元时长。限时活动，适合长期使用达龙云的用户囤时长。",
    link: "https://www.dalongyun.com/",
    category: "coupon",
    tags: ["达龙云", "充值满赠", "限时活动"],
    updatedAt: "2025-07-01",
    expiresAt: "2025-07-31",
  },
  {
    id: "coupon-moguyun",
    title: "蘑菇云游戏新用户 5 折券",
    description: "新注册用户可领取 5 折体验券，首充任意金额享半价。价格本就低廉，叠加折扣更划算。",
    link: "https://www.moguyun.com/",
    category: "coupon",
    tags: ["蘑菇云", "5折券", "新用户"],
    updatedAt: "2025-06-25",
    expiresAt: "2025-09-30",
  },

  // ── 新用户福利 (new_user) ─────────────────────────────
  {
    id: "newuser-netease",
    title: "网易云游戏新用户送 2 小时",
    description: "新注册网易云游戏用户免费送 2 小时电脑时长 + 3 天手机云游戏。无需充值即可体验端游和手游云化。",
    link: "https://cg.163.com/",
    category: "new_user",
    tags: ["网易云游戏", "免费2小时", "手机端"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "newuser-todesk",
    title: "ToDesk 新用户免费试用 1 小时",
    description: "新用户注册 ToDesk 云电脑可免费试用 1 小时，支持 Web 端和移动端。远程桌面起家，体验流畅。",
    link: "https://www.todesk.com/",
    category: "new_user",
    tags: ["ToDesk", "免费1小时", "多端支持"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "newuser-caiji",
    title: "菜鸡云游戏新用户送 1 小时",
    description: "新用户注册即送 1 小时免费时长，价格低廉的平台试水首选。按小时计费最低约 0.15 元/时。",
    link: "https://www.caijiyun.com/",
    category: "new_user",
    tags: ["菜鸡云", "免费1小时", "低价"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "newuser-hongshouzhi",
    title: "红手指云手机免费试用 24 小时",
    description: "新用户可免费试用云手机 24 小时，适合挂机类手游 24 小时不间断运行。专注云手机服务。",
    link: "https://www.redfinger.com/",
    category: "new_user",
    tags: ["红手指", "云手机", "24小时试用"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },

  // ── 野路子 (wildcard) ─────────────────────────────────
  {
    id: "wildcard-ad-watching",
    title: "看广告攒时长攻略",
    description: "网易云游戏、格来云等平台支持看广告获取免费时长。每天看几段短视频广告即可攒够当日游戏时长，适合零氪玩家。",
    link: "https://cg.163.com/",
    category: "wildcard",
    tags: ["看广告", "免费时长", "零氪"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "wildcard-multi-register",
    title: "多平台新用户注册白嫖法",
    description: "同时注册多个云游戏平台（网易、START、顺网、达龙、格来、菜鸡等），每个平台都有新用户免费时长，加起来可白嫖 10+ 小时。",
    link: "https://cg.163.com/",
    category: "wildcard",
    tags: ["多平台", "新用户", "白嫖攻略"],
    updatedAt: "2025-07-01",
    expiresAt: null,
  },
  {
    id: "wildcard-student",
    title: "学生认证额外福利",
    description: "部分平台（如腾讯START、网易云游戏）支持学生认证，认证后可享专属折扣或额外免费时长。用教育邮箱或学生证即可认证。",
    link: "https://start.qq.com/",
    category: "wildcard",
    tags: ["学生认证", "专属折扣", "教育优惠"],
    updatedAt: "2025-06-20",
    expiresAt: null,
  },
];

/** Quick lookup map: deal id → Deal object. */
export const dealMap: Record<string, Deal> = deals.reduce(
  (acc, d) => {
    acc[d.id] = d;
    return acc;
  },
  {} as Record<string, Deal>
);
