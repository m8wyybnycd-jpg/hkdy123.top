/**
 * Permission code constants and module grouping definitions.
 *
 * Must stay in sync with the D1 `permissions` table and
 * `migrations/schema-rbac.sql`.
 */

/** 全部权限码（与 D1 permissions 表一致）。 */
export const ALL_PERMISSION_CODES = [
  "dashboard:view",
  "user:view",
  "user:manage",
  "platform:view",
  "platform:manage",
  "desktop:view",
  "desktop:manage",
  "deal:view",
  "deal:manage",
  "game:view",
  "game:manage",
  "free_game:view",
  "free_game:manage",
  "sms_platform:view",
  "sms_platform:manage",
  "role:manage",
  "settings:manage",
  "announcement:view",
  "announcement:manage",
  "message:view",
  "message:manage",
  "log:view",
  "banner:read",
  "banner:write",
  "page:manage",
  "gallery:view",
  "gallery:manage",
  "credential:view",
  "credential:manage",
] as const;

/** 权限按模块分组（用于权限分配视图渲染）。 */
export const PERMISSION_GROUPS: {
  module: string;
  moduleLabel: string;
  permissions: { code: string; name: string }[];
}[] = [
  {
    module: "dashboard",
    moduleLabel: "仪表盘",
    permissions: [{ code: "dashboard:view", name: "查看仪表盘" }],
  },
  {
    module: "user",
    moduleLabel: "用户管理",
    permissions: [
      { code: "user:view", name: "查看用户" },
      { code: "user:manage", name: "管理用户" },
    ],
  },
  {
    module: "platform",
    moduleLabel: "云游戏平台",
    permissions: [
      { code: "platform:view", name: "查看平台" },
      { code: "platform:manage", name: "管理平台" },
    ],
  },
  {
    module: "desktop",
    moduleLabel: "办公云电脑",
    permissions: [
      { code: "desktop:view", name: "查看云电脑" },
      { code: "desktop:manage", name: "管理云电脑" },
    ],
  },
  {
    module: "deal",
    moduleLabel: "薅羊毛",
    permissions: [
      { code: "deal:view", name: "查看薅羊毛" },
      { code: "deal:manage", name: "管理薅羊毛" },
    ],
  },
  {
    module: "game",
    moduleLabel: "游戏库",
    permissions: [
      { code: "game:view", name: "查看游戏" },
      { code: "game:manage", name: "管理游戏" },
    ],
  },
  {
    module: "free_game",
    moduleLabel: "免费资源",
    permissions: [
      { code: "free_game:view", name: "查看免费资源" },
      { code: "free_game:manage", name: "管理免费资源" },
    ],
  },
  {
    module: "sms_platform",
    moduleLabel: "接码平台",
    permissions: [
      { code: "sms_platform:view", name: "查看接码平台" },
      { code: "sms_platform:manage", name: "管理接码平台" },
    ],
  },
  {
    module: "role",
    moduleLabel: "系统管理",
    permissions: [{ code: "role:manage", name: "管理权限角色" }],
  },
  {
    module: "settings",
    moduleLabel: "系统管理",
    permissions: [{ code: "settings:manage", name: "管理系统设置" }],
  },
  {
    module: "announcement",
    moduleLabel: "公告管理",
    permissions: [
      { code: "announcement:view", name: "查看公告" },
      { code: "announcement:manage", name: "管理公告" },
    ],
  },
  {
    module: "message",
    moduleLabel: "站内信",
    permissions: [
      { code: "message:view", name: "查看消息" },
      { code: "message:manage", name: "管理消息" },
    ],
  },
  {
    module: "log",
    moduleLabel: "日志查看",
    permissions: [{ code: "log:view", name: "查看日志" }],
  },
  {
    module: "banner",
    moduleLabel: "轮播图管理",
    permissions: [
      { code: "banner:read", name: "查看轮播图" },
      { code: "banner:write", name: "管理轮播图" },
    ],
  },
  {
    module: "page",
    moduleLabel: "页面配置",
    permissions: [
      { code: "page:manage", name: "管理页面配置" },
    ],
  },
  {
    module: "gallery",
    moduleLabel: "图片库",
    permissions: [
      { code: "gallery:view", name: "查看图片库" },
      { code: "gallery:manage", name: "管理图片库" },
    ],
  },
  {
    module: "credential",
    moduleLabel: "凭证管理",
    permissions: [
      { code: "credential:view", name: "查看凭证" },
      { code: "credential:manage", name: "管理凭证" },
    ],
  },
];

/** 侧边栏菜单项与权限码映射。 */
export const NAV_PERMISSIONS: Record<string, string> = {
  "/admin/dashboard": "dashboard:view",
  "/admin/users": "user:view",
  "/admin/content/platforms": "platform:view",
  "/admin/content/desktops": "desktop:view",
  "/admin/content/deals": "deal:view",
  "/admin/content/games": "game:view",
  "/admin/content/free-games": "free_game:view",
  "/admin/content/sms-platforms": "sms_platform:view",
  "/admin/roles": "role:manage",
  "/admin/settings": "settings:manage",
  "/admin/announcements": "announcement:view",
  "/admin/messages": "message:view",
  "/admin/logs/operation": "log:view",
  "/admin/logs/login": "log:view",
  "/admin/banners": "banner:read",
  "/admin/page-configs": "page:manage",
  "/admin/gallery": "gallery:view",
  "/admin/credentials": "credential:view",
};
