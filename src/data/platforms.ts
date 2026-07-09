import type { Platform, PlatformId } from "../types";

/**
 * Cloud gaming platforms (10+ entries).
 *
 * Price and free-tier info are based on publicly available information;
 * always verify on each platform's official website.
 */
export const platforms: Platform[] = [
  {
    id: "netease",
    name: "网易云游戏",
    color: "#e60012",
    price: "端游 0.4~8 元/时",
    freeInfo:
      "新用户送 2 小时电脑 + 3 天手机；每日签到连签 7 天 130 分钟；看广告每次 +10 分钟",
    url: "https://cg.163.com/",
    desc: "网页版直接开玩，覆盖端游手游，签到看广告可攒免费时长",
    tags: ["网页版", "签到攒时长", "端游手游"],
    activity: "连签 7 天送 130 分钟，看广告额外领时长",
  },
  {
    id: "start",
    name: "腾讯START",
    color: "#00a4ff",
    price: "白金会员 38 元/月（约 0.16 元/时）",
    freeInfo: "部分游戏免费畅玩",
    url: "https://start.qq.com/",
    desc: "腾讯官方云游戏，白金月费制性价比高，主打腾讯系游戏",
    tags: ["腾讯官方", "月费制", "性价比高"],
    activity: "新用户首月半价，部分游戏限时免费",
  },
  {
    id: "shunwang",
    name: "顺网云电脑",
    color: "#ff6b00",
    price: "约 0.18 元/分钟起",
    freeInfo: "每天可领免费体验时长",
    url: "https://cpc.icloud.cn/",
    desc: "网吧云鼻祖，能跑 Steam 3A 大作，按分钟计费灵活",
    tags: ["按分钟计费", "3A大作", "Steam"],
    activity: "每日签到领免费时长，充值满赠活动",
  },
  {
    id: "dalong",
    name: "达龙云电脑",
    color: "#00b894",
    price: "按 15 分钟粒度计费",
    freeInfo: "新用户免费体验；签到/暗号领时长（7 天过期）",
    url: "https://www.dalongyun.com/",
    desc: "15 分钟计费粒度最灵活，适合短时间体验",
    tags: ["15分钟粒度", "签到暗号", "灵活计费"],
    activity: "每日签到领时长，暗号兑换额外时长",
  },
  {
    id: "todesk",
    name: "ToDesk云电脑",
    color: "#6c5ce7",
    price: "按时长计费",
    freeInfo: "Web + 移动端新用户免费试用 1 小时",
    url: "https://www.todesk.com/",
    desc: "远程桌面起家，支持 Web 和移动端，新用户可免费试玩",
    tags: ["远程桌面", "多端支持", "新用户免费"],
    activity: "新用户免费试用 1 小时",
  },
  {
    id: "haima",
    name: "海马云电脑",
    color: "#fd79a8",
    price: "约 1~2 元/时",
    freeInfo: "常送时长/折扣",
    url: "https://www.haimawan.com/",
    desc: "覆盖手游端游，价格亲民，活动多",
    tags: ["价格亲民", "手游端游", "活动多"],
    activity: "不定期赠送时长和折扣券",
  },
  {
    id: "gelaiyun",
    name: "格来云游戏",
    color: "#2d3436",
    price: "约 0.2~0.5 元/时",
    freeInfo: "新用户免费体验 30 分钟；每日签到领时长",
    url: "https://www.gleayun.com/",
    desc: "老牌云游戏平台，支持 PC 和手机端，游戏库丰富",
    tags: ["老牌平台", "PC手机端", "签到领时长"],
    activity: "新用户免费 30 分钟，每日签到攒时长",
  },
  {
    id: "caiji",
    name: "菜鸡云游戏",
    color: "#00cec9",
    price: "约 0.15~0.3 元/时",
    freeInfo: "新用户送 1 小时；每日签到领 10 分钟",
    url: "https://www.caijiyun.com/",
    desc: "主打低价云游戏，按小时计费便宜，适合轻度玩家",
    tags: ["低价", "按小时计费", "轻度玩家"],
    activity: "新用户送 1 小时，每日签到领 10 分钟",
  },
  {
    id: "hongshouzhi",
    name: "红手指云手机",
    color: "#d63031",
    price: "约 15~60 元/月",
    freeInfo: "新用户免费试用 24 小时",
    url: "https://www.redfinger.com/",
    desc: "专注云手机服务，可 24 小时挂机手游，适合挂机类游戏",
    tags: ["云手机", "24小时挂机", "手游专用"],
    activity: "新用户免费试用 24 小时",
  },
  {
    id: "moguyun",
    name: "蘑菇云游戏",
    color: "#6c5ce7",
    price: "约 0.1~0.4 元/时",
    freeInfo: "新用户送 2 小时；每日签到领时长",
    url: "https://www.moguyun.com/",
    desc: "新兴云游戏平台，价格低廉，支持端游和手游云化",
    tags: ["价格低廉", "端游手游", "新兴平台"],
    activity: "新用户送 2 小时，每日签到领时长",
  },
];

/** Quick lookup map: platform id → Platform object. */
export const platformMap: Record<string, Platform> = platforms.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<string, Platform>
);
