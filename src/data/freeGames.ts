/** 免费单机游戏资源（夸克网盘分享） */
export interface FreeGame {
  id: string;
  name: string;
  type: string;
  platform: string;
  description: string;
  quarkLink: string;
  emoji: string;
}

/** 所有游戏类型（用于筛选） */
export const FREE_GAME_TYPES: string[] = [
  "全部",
  "动作RPG",
  "动作",
  "角色扮演",
  "生存冒险",
  "动作冒险",
  "休闲",
  "策略",
  "模拟策略",
  "射击",
  "冒险",
  "生存",
  "格斗",
];

/** 所有平台（用于筛选） */
export const FREE_GAME_PLATFORMS: string[] = ["全部", "客户端", "网页端", "手机"];

/** 26款游戏数据 */
export const freeGames: FreeGame[] = [
  { id: "fg01", name: "浪人崛起", type: "动作RPG", platform: "客户端", description: "幕末开放世界武士动作游戏", quarkLink: "https://pan.quark.cn/s/26112bf80f46", emoji: "⚔️" },
  { id: "fg02", name: "堕落之主", type: "动作", platform: "客户端", description: "暗黑奇幻魂Like动作游戏", quarkLink: "https://pan.quark.cn/s/aabf69932ba3", emoji: "💀" },
  { id: "fg03", name: "暗黑破坏神3 终极版", type: "动作RPG", platform: "客户端", description: "暴雪经典刷宝打怪ARPG", quarkLink: "https://pan.quark.cn/s/ad7a940c1f7d", emoji: "🔥" },
  { id: "fg04", name: "上古卷轴5 周年纪念版", type: "角色扮演", platform: "客户端", description: "天际省开放世界史诗冒险", quarkLink: "https://pan.quark.cn/s/41d75b78bbaf", emoji: "🐉" },
  { id: "fg05", name: "森林之子", type: "生存冒险", platform: "客户端", description: "孤岛生存对抗食人族变异怪", quarkLink: "https://pan.quark.cn/s/040de1e2dc3d", emoji: "🌲" },
  { id: "fg06", name: "塞尔达传说 旷野之息", type: "动作冒险", platform: "客户端", description: "海拉鲁开放世界自由探索", quarkLink: "https://pan.quark.cn/s/97f1406ca254", emoji: "🗡️" },
  { id: "fg07", name: "塞尔达传说 王国之泪", type: "动作冒险", platform: "客户端", description: "天空与地底的全新海拉鲁冒险", quarkLink: "https://pan.quark.cn/s/1fe1c3fc3ac5", emoji: "🏰" },
  { id: "fg08", name: "宝可梦 朱紫", type: "角色扮演", platform: "客户端", description: "帕底亚地区开放式宝可梦冒险", quarkLink: "https://pan.quark.cn/s/3d60c968c5f5", emoji: "⚡" },
  { id: "fg09", name: "宝可梦 阿尔宙斯", type: "动作RPG", platform: "客户端", description: "远古洗翠地区捕捉宝可梦", quarkLink: "https://pan.quark.cn/s/1e91baefaec8", emoji: "🌟" },
  { id: "fg10", name: "宝可梦 肉鸽", type: "休闲", platform: "客户端", description: "宝可梦题材 Roguelike 爬塔", quarkLink: "https://pan.quark.cn/s/274ec2723b4e", emoji: "🎲" },
  { id: "fg11", name: "去吧皮卡丘/伊布", type: "角色扮演", platform: "客户端", description: "关都地区经典宝可梦重制", quarkLink: "https://pan.quark.cn/s/126dd2bb3720", emoji: "⚡" },
  { id: "fg12", name: "全面战争 三国", type: "策略", platform: "客户端", description: "三国题材大规模即时战略", quarkLink: "https://pan.quark.cn/s/fb60c31ada83", emoji: "🏯" },
  { id: "fg13", name: "文明6 全DLC", type: "策略", platform: "客户端", description: "回合制4X策略建立伟大文明", quarkLink: "https://pan.quark.cn/s/e6f17b29a0ec", emoji: "🏛️" },
  { id: "fg14", name: "缺氧 眼冒金星", type: "模拟策略", platform: "客户端", description: "小行星殖民地生存管理模拟", quarkLink: "https://pan.quark.cn/s/59fac7546da6", emoji: "🚀" },
  { id: "fg15", name: "中国式家长", type: "休闲", platform: "客户端", description: "模拟中国家庭教育养成", quarkLink: "https://pan.quark.cn/s/87a1d4cf1bb3", emoji: "📚" },
  { id: "fg16", name: "僵尸世界大战", type: "射击", platform: "客户端", description: "丧尸末世四人合作射击", quarkLink: "https://pan.quark.cn/s/8bd816767cd6", emoji: "🔫" },
  { id: "fg17", name: "无主之地3 全DLC", type: "射击", platform: "客户端", description: "漫画风刷宝射击夺宝游戏", quarkLink: "https://pan.quark.cn/s/c61f90b30686", emoji: "💥" },
  { id: "fg18", name: "杀手3 豪华版", type: "动作", platform: "客户端", description: "47号特工全球暗杀沙盒", quarkLink: "https://pan.quark.cn/s/4f3ab970e745", emoji: "🎯" },
  { id: "fg19", name: "无人深空", type: "冒险", platform: "客户端", description: "无限宇宙探索生存建造", quarkLink: "https://pan.quark.cn/s/cd6981faa776", emoji: "🪐" },
  { id: "fg20", name: "以撒的结合 全DLC", type: "动作", platform: "客户端", description: "肉鸽地牢弹幕射击经典", quarkLink: "https://pan.quark.cn/s/0e10a092bcb8", emoji: "💔" },
  { id: "fg21", name: "饥荒", type: "生存", platform: "客户端", description: "蒂姆伯顿画风荒野求生", quarkLink: "https://pan.quark.cn/s/ea46dbb76993", emoji: "🌑" },
  { id: "fg22", name: "小骨英雄杀手", type: "动作", platform: "客户端", description: "换头小骨Roguelite横版动作", quarkLink: "https://pan.quark.cn/s/79beaaae356c", emoji: "💀" },
  { id: "fg23", name: "九日", type: "动作", platform: "客户端", description: "道家庞克手绘风格类银河城", quarkLink: "https://pan.quark.cn/s/b68c4fbb7668", emoji: "☯️" },
  { id: "fg24", name: "王国保卫战5", type: "策略", platform: "客户端", description: "经典塔防系列最新作", quarkLink: "https://pan.quark.cn/s/eae998155c00", emoji: "🛡️" },
  { id: "fg25", name: "月圆之夜 全DLC", type: "策略", platform: "客户端", description: "黑暗童话风卡牌Roguelike", quarkLink: "https://pan.quark.cn/s/984747b6b6a0", emoji: "🃏" },
  { id: "fg26", name: "街头霸王5 冠军版", type: "格斗", platform: "客户端", description: "卡普空经典格斗终极版", quarkLink: "https://pan.quark.cn/s/16299a4e7341", emoji: "👊" },
];

/** 类型 → 渐变色映射 */
export const typeGradients: Record<string, string> = {
  动作RPG: "from-red-500/90 via-orange-600/90 to-amber-900/90",
  动作: "from-orange-500/90 via-red-600/90 to-rose-900/90",
  角色扮演: "from-violet-600/90 via-purple-700/90 to-indigo-900/90",
  生存冒险: "from-emerald-500/90 via-teal-600/90 to-green-900/90",
  动作冒险: "from-cyan-500/90 via-blue-600/90 to-blue-900/90",
  休闲: "from-pink-400/90 via-rose-500/90 to-pink-800/90",
  策略: "from-emerald-500/90 via-teal-600/90 to-green-900/90",
  模拟策略: "from-amber-400/90 via-yellow-600/90 to-lime-800/90",
  射击: "from-orange-500/90 via-red-600/90 to-rose-900/90",
  冒险: "from-cyan-500/90 via-blue-600/90 to-blue-900/90",
  生存: "from-emerald-500/90 via-teal-600/90 to-green-900/90",
  格斗: "from-red-600/90 via-rose-700/90 to-slate-900/90",
};
