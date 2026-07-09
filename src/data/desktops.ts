import type { CloudDesktop } from "../types";

/**
 * Office cloud desktop platforms (5+ entries).
 *
 * These platforms are suited for remote work, design, development,
 * and other productivity tasks — not gaming.
 */
export const desktops: CloudDesktop[] = [
  {
    id: "aliyun-wuying",
    name: "阿里云无影",
    url: "https://www.aliyun.com/product/wuying",
    desc: "阿里云旗下云桌面服务，支持多端接入，企业级安全与性能，适合设计、开发、办公场景",
    scenarios: ["企业办公", "设计渲染", "软件开发", "数据分析"],
    priceRange: "约 50~200 元/月（按配置）",
    activity: "新用户免费试用 7 天",
  },
  {
    id: "qingjiao",
    name: "青椒云电脑",
    url: "https://www.qingjiaocloud.com/",
    desc: "主打高性价比办公云电脑，支持 PS/CAD/3D 建模等设计软件，按月或按需计费",
    scenarios: ["设计制图", "CAD绘图", "视频剪辑", "日常办公"],
    priceRange: "约 30~150 元/月",
    activity: "新用户首月 5 折",
  },
  {
    id: "zanqi",
    name: "赞奇云桌面",
    url: "https://www.zanqicloud.com/",
    desc: "专注设计行业云桌面解决方案，支持专业级 3D 渲染和影视后期，GPU 加速性能强",
    scenarios: ["3D渲染", "影视后期", "动画制作", "建筑设计"],
    priceRange: "约 80~300 元/月",
    activity: "企业用户可申请免费测试",
  },
  {
    id: "tianyi",
    name: "天翼云电脑",
    url: "https://cloud.189.cn/",
    desc: "中国电信旗下云电脑服务，网络稳定延迟低，适合政企办公和个人远程办公",
    scenarios: ["政企办公", "远程办公", "教育培训", "呼叫中心"],
    priceRange: "约 20~100 元/月",
    activity: "新用户免费体验 3 天",
  },
  {
    id: "yidong",
    name: "移动云桌面",
    url: "https://cloud.10086.cn/",
    desc: "中国移动旗下云桌面服务，依托移动 5G 网络，支持多终端接入，适合移动办公场景",
    scenarios: ["移动办公", "5G远程桌面", "政企办公", "教育"],
    priceRange: "约 25~120 元/月",
    activity: "新用户首月免费试用",
  },
];

/** Quick lookup map: desktop id → CloudDesktop object. */
export const desktopMap: Record<string, CloudDesktop> = desktops.reduce(
  (acc, d) => {
    acc[d.id] = d;
    return acc;
  },
  {} as Record<string, CloudDesktop>
);
