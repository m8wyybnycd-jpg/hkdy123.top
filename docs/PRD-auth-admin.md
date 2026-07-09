# PRD：全路由登录拦截 + 后台页面配置管理系统

> **项目名称**: cloudgame-hub
> **文档版本**: v6.0
> **编写日期**: 2026-07-09
> **技术栈**: Vite 5 + React 18 + TypeScript + Tailwind CSS + React Router v6 + Cloudflare Pages Functions + D1 SQLite
> **PRD 类型**: 简单 PRD

---

## 一、项目信息

| 字段 | 值 |
|------|-----|
| Language | 中文 |
| Programming Language | Vite + React + TypeScript + Tailwind CSS |
| Project Name | cloudgame-hub |
| 原始需求 | ① 全站路由级登录拦截，未登录自动跳转登录页，登录后返回原目标页面；② 后台页面配置管理系统，可控制页面显示内容、可见性及各项参数，配置修改实时/刷新后生效 |

### 需求复述

用户提出两大需求：

1. **全路由登录拦截 + 登录后返回原目标**：用户点击网站内任意链接时，若未登录则自动跳转至登录页面；登录成功后返回原目标页面；所有路由均受此登录拦截机制保护。

2. **后台页面配置管理系统**：在后台管理系统中控制页面显示内容、可见性、各项配置参数；包括页面启用/禁用、内容编辑（如首页 Hero 文案、平台卡片数据等）、参数动态调整；配置修改实时生效或刷新后立即生效。

---

## 二、产品目标

| # | 目标 | 衡量标准 |
|---|------|----------|
| G1 | **全站零漏放**：所有受保护路由在未登录时一律拦截至登录页，登录后精准返回原目标 | 100% 路由覆盖；登录后 100% 返回原路径（含 query 参数） |
| G2 | **后台可视化控台**：管理员可在后台对前台各页面的可见性、文案内容、展示参数进行集中管理，无需改代码即可上线 | 页面配置项 ≥ 6 个页面 × 3 类配置（可见性/文案/参数）；配置保存后前台刷新即生效（≤ 1 次刷新） |
| G3 | **配置安全可控**：页面配置受 RBAC 权限保护，关键操作有审计日志，防止误操作可回滚 | 新增 `page:manage` 权限；配置变更写入操作日志；支持配置项默认值兜底 |

---

## 三、用户故事

### 普通访客（未登录用户）

> **US-1**: 作为一名普通访客，我希望在未登录状态下访问任意页面链接时，自动跳转到登录页，这样我不会看到空白或报错页面。
>
> **US-2**: 作为一名普通访客，我希望登录成功后能自动回到我本来想去的那个页面，这样我不用重新寻找入口。
>
> **US-3**: 作为一名普通访客，我希望被管理员禁用的页面在导航栏中不显示或显示「敬请期待」，这样我知道该功能暂未开放。

### 已登录用户

> **US-4**: 作为一名已登录用户，我希望前台页面能展示后台管理员最新配置的文案内容（如首页 Hero 标题），这样我看到的信息始终是最新的。
>
> **US-5**: 作为一名已登录用户，我希望在 Token 过期后再次操作时能被引导重新登录并返回原页面，这样我的操作不会无故中断。

### 后台管理员

> **US-6**: 作为一名后台管理员，我希望在后台「页面配置」模块中对每个前台页面进行启用/禁用切换，这样我可以灵活控制站点功能开放范围。
>
> **US-7**: 作为一名后台管理员，我希望能在后台直接编辑各页面的 Hero 文案（标题、副标题）、展示参数（如卡片数量限制），这样无需开发介入即可更新内容。
>
> **US-8**: 作为一名后台管理员，我希望配置修改保存后前台用户刷新页面即可看到最新配置，这样内容更新能快速触达用户。
>
> **US-9**: 作为一名后台管理员，我希望页面配置操作受权限控制且有操作日志，这样我可以追溯谁在何时改了什么配置。

---

## 四、需求池（按优先级划分）

### P0 — 必须本次实现

| 编号 | 需求 | 说明 | 验收标准 |
|------|------|------|----------|
| P0-1 | 路由守卫全量覆盖审计 | 审计现有 `ProtectedRoute` + `ProtectedLayout` 覆盖情况，补全遗漏路由 | 所有非公开路由（`/cloud-games`、`/cloud-desktops`、`/deals`、`/library`、`/free-games`、`/sms-platforms`、`/search`、`/messages`、`/profile`、`/announcements`、`/admin/*`）均受 `ProtectedRoute` 拦截；`/login`、`/admin/login` 为唯一公开路由 |
| P0-2 | 登录后返回原目标（含 query） | `ProtectedRoute` 已传 `state={{ from: location }}`（含 pathname），需扩展为携带完整 `pathname + search + hash`；`AuthPage.getRedirectPath()` 同步读取完整路径 | 登录后 `navigate` 到 `from.pathname + from.search`；用户从 `/search?q=xxx` 被拦截后登录能返回带参数的搜索页 |
| P0-3 | 统一外部链接登录拦截 | `useExternalLink` hook 跳转 `/login` 时补充 `state={{ from: location }}`，与路由守卫行为一致 | 外部链接点击未登录时跳登录页；登录后返回当前所在页面 |
| P0-4 | Token 过期实时拦截 | 在 `AuthContext` 中增加 Token 过期检测：当 API 返回 401 或本地检测到 Token 过期时，自动 `logout()` 并跳转登录页（携带 `from`） | Token 过期后任意操作触发 401 → 自动登出并跳 `/login`，URL 携带 redirect |
| P0-5 | 页面配置数据模型 | 新增 `page_configs` 表（D1 迁移）：`page_key`、`title`、`subtitle`、`description`、`is_enabled`、`params`（JSON）、`sort_order`、`updated_at`、`updated_by` | 迁移脚本可幂等执行；预置 6 个页面（cloud-games / cloud-desktops / deals / library / free-games / sms-platforms）的默认配置行 |
| P0-6 | 后台页面配置管理界面 | 在后台新增「页面配置」菜单项（`/admin/page-configs`），提供列表 + 编辑表单：可见性开关、Hero 标题/副标题/描述编辑、自定义参数（JSON 键值对） | 管理员可查看所有页面配置列表；可编辑每个页面的文案与开关；保存成功有反馈提示 |
| P0-7 | 页面配置 CRUD API | 新增 `/api/admin/page-configs`（GET 列表 / POST 新建）、`/api/admin/page-configs/:key`（GET / PUT / DELETE），受 `page:manage` 权限保护 | API 返回统一 `{ code, message, data }` 格式；无权限返回 403；写入操作记录操作日志 |
| P0-8 | 前台页面配置消费 | 新增公开 API `/api/page-configs`（GET，返回所有启用页面的配置）；前台各页面读取配置渲染 Hero 文案；Header 导航根据 `is_enabled` 过滤 Tab | 前台 Hero 标题/副标题来自后台配置而非硬编码；被禁用页面的 Tab 在导航栏不显示，直接访问该路由显示「页面已关闭」提示页 |
| P0-9 | 新增 `page:manage` 权限 | 在 `permissions` 表新增 `page:manage` 权限码；`ALL_PERMISSION_CODES`、`PERMISSION_GROUPS`、`NAV_PERMISSIONS` 同步更新；`super_admin` 角色自动获得该权限 | 权限码出现在权限分配面板；超级管理员可见「页面配置」菜单；运营人员默认不可见 |

### P1 — 应该本次实现

| 编号 | 需求 | 说明 | 验收标准 |
|------|------|------|----------|
| P1-1 | 页面配置缓存优化 | 前台通过 `apiClient.getPageConfigs()` 拉取配置，加入 localStorage 缓存（TTL 5 分钟），减少请求；后台修改后前台下次刷新或缓存过期后生效 | 首次加载请求 API；5 分钟内重复访问走缓存；缓存过期自动刷新 |
| P1-2 | 页面配置操作日志 | 页面配置的新增/修改/删除操作写入 `operation_logs` 表，`module = 'page_config'` | 操作日志页可按 `page_config` 模块筛选查看 |
| P1-3 | 禁用页面友好提示 | 被禁用的页面直接通过 URL 访问时，展示「该页面暂未开放」的友好提示页，而非 404 或空白 | 访问被禁用页面路由 → 显示提示组件 + 返回首页按钮 |
| P1-4 | 页面排序配置 | 后台可调整页面在导航栏中的排列顺序（`sort_order`），前台 Header Tab 按配置排序 | 后台拖拽或输入序号调整顺序；前台导航 Tab 顺序随之变化 |

### P2 — 后续可选实现

| 编号 | 需求 | 说明 |
|------|------|------|
| P2-1 | 配置实时推送（无需刷新） | 通过 SSE 或轮询实现后台修改后前台自动更新（当前 P0/P1 采用刷新生效方案） |
| P2-2 | 页面配置版本历史 | 记录每次配置变更的历史版本，支持回滚到任意历史版本 |
| P2-3 | 多语言文案配置 | 页面配置支持多语言（中/英），根据用户语言偏好展示对应文案 |
| P2-4 | 页面配置导入导出 | 支持以 JSON 文件批量导入/导出页面配置，便于环境迁移 |

---

## 五、UI 设计稿 / 页面结构说明

### 5.1 后台「页面配置」管理界面

#### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  AdminLayout (已有)                                      │
│  ┌──────────┐ ┌──────────────────────────────────────┐  │
│  │ Sidebar  │ │ TopBar                                │  │
│  │ (已有)    │ ├──────────────────────────────────────┤  │
│  │          │ │ Main Content Area                     │  │
│  │ + 新增    │ │                                       │  │
│  │ 「页面配置」│ │  ┌────────────────────────────────┐  │  │
│  │  菜单项   │ │  │ 页面标题: 页面配置管理           │  │  │
│  │          │ │  │ [刷新]                          │  │  │
│  │          │ │  └────────────────────────────────┘  │  │
│  │          │ │                                       │  │
│  │          │ │  ┌────────────────────────────────┐  │  │
│  │          │ │  │ 页面配置列表 (表格)             │  │  │
│  │          │ │  │ ┌──┬────────┬──────┬────┬────┐ │  │  │
│  │          │ │  │ │  │ 页面   │ 状态 │ 排序│ 操作│ │  │  │
│  │          │ │  │ ├──┼────────┼──────┼────┼────┤ │  │  │
│  │          │ │  │ │1 │云游戏  │ ✅启用│  1 │编辑│ │  │  │
│  │          │ │  │ │2 │云电脑  │ ✅启用│  2 │编辑│ │  │  │
│  │          │ │  │ │3 │薅羊毛  │ ❌禁用│  3 │编辑│ │  │  │
│  │          │ │  │ │4 │游戏库  │ ✅启用│  4 │编辑│ │  │  │
│  │          │ │  │ │5 │免费资源│ ✅启用│  5 │编辑│ │  │  │
│  │          │ │  │ │6 │接码平台│ ✅启用│  6 │编辑│ │  │  │
│  │          │ │  │ └──┴────────┴──────┴────┴────┘ │  │  │
│  │          │ │  └────────────────────────────────┘  │  │
│  └──────────┘ └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### 编辑表单（弹窗 / 抽屉）

```
┌──────────────────────────────────────────┐
│  编辑页面配置 — 云游戏                     │
├──────────────────────────────────────────┤
│                                          │
│  页面标识 (只读): cloud-games             │
│                                          │
│  ┌─ 基础信息 ─────────────────────────┐  │
│  │ 页面名称:  [云游戏          ]      │  │
│  │ 是否启用:  [●  开启]               │  │
│  │ 排序权重:  [1            ]         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Hero 文案 ───────────────────────┐  │
│  │ 标题:  [不用高配电脑，也能畅玩3A]  │  │
│  │ 副标题:[汇聚 N 大云游戏平台...]   │  │
│  │ 描述:  [                    ]      │  │
│  │       [                    ]       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ 自定义参数 (JSON 键值对) ────────┐  │
│  │ key: [card_limit]  value: [12  ]  │  │
│  │ key: [show_tags ]  value: [true ]  │  │
│  │                          [+ 添加]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│              [取消]    [保存配置]         │
└──────────────────────────────────────────┘
```

#### 侧边栏菜单变更

在现有 Sidebar 的「内容管理」分组下方新增「页面配置」菜单项：

```
内容管理
  ├── 云游戏平台
  ├── 办公云电脑
  ├── 薅羊毛
  └── 游戏库
消息通知
  ├── 公告管理
  ├── 轮播图管理
  └── 站内信
系统
  ├── 权限角色
  ├── 日志查看
  ├── 系统设置
  └── 页面配置  ← 新增 (icon: LayoutTemplate)
```

### 5.2 前台禁用页面提示

```
┌─────────────────────────────────────────┐
│              (Header 已有)               │
├─────────────────────────────────────────┤
│                                         │
│            ┌─────────┐                  │
│            │  🚫     │                  │
│            └─────────┘                  │
│                                         │
│        该页面暂未开放                    │
│   管理员已暂时关闭此功能，请稍后再来      │
│                                         │
│         [ 返回首页 ]                     │
│                                         │
└─────────────────────────────────────────┘
```

### 5.3 登录拦截流程（时序）

```
用户访问 /deals?category=steam
        │
        ▼
  ProtectedRoute 检查 authState
        │
   ┌────┴────┐
   │ 已登录?  │
   └────┬────┘
    否  │  是 → 渲染目标页面
        ▼
  Navigate to /login
  state={{ from: { pathname: '/deals', search: '?category=steam' } }}
        │
        ▼
  AuthPage 登录成功
        │
        ▼
  getRedirectPath() → '/deals?category=steam'
  navigate(redirectPath, { replace: true })
        │
        ▼
  用户回到原目标页面 ✅
```

---

## 六、技术规范

### 6.1 数据库设计

#### 新增表：`page_configs`

```sql
CREATE TABLE IF NOT EXISTS page_configs (
  page_key    TEXT    PRIMARY KEY,          -- 页面标识，如 'cloud-games'
  page_name   TEXT    NOT NULL,             -- 页面显示名称，如 '云游戏'
  title       TEXT    NOT NULL DEFAULT '',  -- Hero 标题
  subtitle    TEXT    NOT NULL DEFAULT '',  -- Hero 副标题
  description TEXT    NOT NULL DEFAULT '',  -- 页面描述
  is_enabled  INTEGER NOT NULL DEFAULT 1,   -- 1=启用, 0=禁用
  params      TEXT    NOT NULL DEFAULT '{}',-- 自定义参数 JSON
  sort_order  INTEGER NOT NULL DEFAULT 0,   -- 导航排序
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  INTEGER,                       -- 最后修改人 user_id
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_page_configs_enabled ON page_configs(is_enabled, sort_order);
```

#### 预置数据

```sql
INSERT OR IGNORE INTO page_configs (page_key, page_name, title, subtitle, is_enabled, sort_order) VALUES
  ('cloud-games',    '云游戏',   '不用高配电脑，也能畅玩 3A 大作', '汇聚各大云游戏平台，按需选择最划算的方案', 1, 1),
  ('cloud-desktops', '云电脑',   '随时随地，高效办公',           '汇聚优质办公云电脑方案',                   1, 2),
  ('deals',          '薅羊毛',   '精选优惠，天天薅羊毛',         '最新游戏优惠信息一网打尽',                 1, 3),
  ('library',        '游戏库',   '探索你的下一款游戏',           '精选游戏推荐与评测',                       1, 4),
  ('free-games',     '免费资源', '免费也能玩得爽',               '精选免费游戏资源',                         1, 5),
  ('sms-platforms',  '接码平台', '接码平台导航',                 '精选靠谱的接码平台',                       1, 6);
```

#### 新增权限

```sql
INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('page:manage', '管理页面配置', 'page', 'manage', 19);

-- 超级管理员自动获得
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin' AND p.code = 'page:manage';
```

### 6.2 API 设计

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/page-configs` | 已登录用户 | 获取所有**启用**的页面配置（前台消费） |
| GET | `/api/admin/page-configs` | `page:manage` | 获取全部页面配置列表（含禁用） |
| GET | `/api/admin/page-configs/:key` | `page:manage` | 获取单个页面配置详情 |
| PUT | `/api/admin/page-configs/:key` | `page:manage` | 更新页面配置（文案/开关/参数/排序） |
| POST | `/api/admin/page-configs` | `page:manage` | 新增页面配置（扩展新页面时使用） |
| DELETE | `/api/admin/page-configs/:key` | `page:manage` | 删除页面配置 |

### 6.3 前端改动点

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/components/ProtectedRoute.tsx` | 修改 | `state.from` 携带 `search + hash`（当前仅 `pathname`） |
| `src/pages/AuthPage.tsx` | 修改 | `getRedirectPath()` 拼接 `pathname + search` |
| `src/hooks/useExternalLink.ts` | 修改 | `navigate("/login", { state: { from: location } })` |
| `src/contexts/AuthContext.tsx` | 修改 | 增加 Token 过期检测 + 401 自动登出跳转逻辑 |
| `src/services/api.ts` | 新增方法 | `getPageConfigs()`、`getAdminPageConfigs()`、`updatePageConfig()` 等 |
| `src/constants/permissions.ts` | 修改 | 新增 `page:manage` 权限码与分组 |
| `src/components/admin/Sidebar.tsx` | 修改 | 新增「页面配置」菜单项 |
| `src/pages/admin/PageConfigsPage.tsx` | **新增** | 页面配置管理列表 + 编辑表单 |
| `src/components/PageDisabledNotice.tsx` | **新增** | 禁用页面提示组件 |
| `src/App.tsx` | 修改 | 注册 `/admin/page-configs` 路由；各前台页面读取配置 |
| `src/components/Header.tsx` | 修改 | TABS 改为从 `page_configs` 动态读取（含排序、可见性过滤） |
| `src/pages/CloudGamesPage.tsx` 等 | 修改 | Hero 文案从配置读取，替代硬编码 |

---

## 七、非功能性需求

### 7.1 性能

| 指标 | 要求 |
|------|------|
| 页面配置 API 响应 | P95 < 200ms（D1 单表查询，数据量小） |
| 前台配置加载 | 不阻塞首屏渲染；配置加载前使用默认值/静态数据兜底 |
| 配置缓存 | 前台 localStorage 缓存 TTL 5 分钟，减少重复请求 |
| 路由守卫开销 | `ProtectedRoute` 检查为同步内存读取（`authState`），无额外网络请求 |

### 7.2 安全

| 项目 | 要求 |
|------|------|
| 路由守卫 | 前端拦截仅为 UX 层；所有数据 API 必须在服务端验证 JWT（已有 `_middleware.ts`） |
| 页面配置写入 | 仅 `page:manage` 权限可操作；服务端 `requirePermission()` 校验 |
| XSS 防护 | 页面配置的文案内容通过 React JSX 渲染（自动转义），禁止使用 `dangerouslySetInnerHTML` |
| 参数校验 | `params` 字段为 JSON 字符串，服务端须 `JSON.parse` 校验合法性；非法 JSON 拒绝写入 |
| 操作审计 | 页面配置增删改写入 `operation_logs`，记录 `user_id`、`action`、`target`、`detail` |

### 7.3 权限

| 角色 | 页面配置权限 | 说明 |
|------|-------------|------|
| 超级管理员 (super_admin) | `page:manage` ✅ | 全部操作 |
| 运营人员 (operator) | ❌ 默认无 | 可由超级管理员手动分配 |
| 普通用户 | ❌ | 仅前台消费配置，无后台权限 |

### 7.4 兼容性

- 已有 `ProtectedRoute` + `AuthPage` 重定向逻辑保持向后兼容，仅扩展 `from` 携带的信息
- 已有 `settings` 表（系统设置）与新增 `page_configs` 表（页面配置）分离，互不影响
- 已有 `SettingsPage`（系统设置页）保持不变，新增独立的 `PageConfigsPage`

---

## 八、待确认问题

| # | 问题 | 影响范围 | 建议默认值 |
|---|------|----------|-----------|
| Q1 | 页面配置的「自定义参数」(params JSON) 具体需要哪些字段？是否每个页面有不同 schema？ | P0-6 编辑表单设计 | 先做通用键值对，后续按页面定制 |
| Q2 | 禁用页面后，已收藏该页面链接的用户访问时展示提示页还是直接 404？ | P1-3 | 展示「页面已关闭」提示页 + 返回首页按钮 |
| Q3 | 配置生效策略：刷新后生效（P0）是否满足需求？还是必须实时推送（SSE/轮询）？ | P0-8 vs P2-1 | 先做刷新生效，实时推送列为 P2 |
| Q4 | 是否需要支持页面配置的「定时上下线」（如活动页定时开启）？ | P2 范围 | 当前不做，后续可扩展 `start_time` / `end_time` |
| Q5 | `useExternalLink` 外部链接场景下，登录后是否需要回到当前页？还是直接打开外部链接？ | P0-3 | 回到当前页（用户需再次点击链接打开外部 URL） |
| Q6 | 首页 `/` 重定向到 `/cloud-games`，若云游戏页面被禁用，`/` 应重定向到哪里？ | P0-1 | 重定向到第一个启用的页面（按 sort_order） |

---

## 九、现状分析（供架构师参考）

> 以下为对现有代码的调研结论，帮助开发团队准确理解已有基础与差距。

### 9.1 路由登录拦截现状

| 组件 | 现状 | 差距 |
|------|------|------|
| `ProtectedRoute.tsx` | ✅ 已实现：检查 `authState.isAuthenticated`，未登录时 `Navigate to="/login" state={{ from: location }}` | ⚠️ `from` 仅含 `pathname`，缺少 `search` + `hash` |
| `AuthPage.tsx` | ✅ 已实现 `getRedirectPath()`：读取 `location.state.from.pathname`，登录后 `navigate(redirectPath)` | ⚠️ 仅拼接 `pathname`，未含 `search` |
| `ProtectedLayout` | ✅ 已包裹所有前台内容路由 | — |
| `AdminProtectedLayout` | ✅ 已包裹所有后台路由（`ProtectedRoute` + `AdminRoute`） | — |
| `useExternalLink.ts` | ✅ 已实现外部链接登录检查 | ⚠️ `navigate("/login")` 未传 `state.from`，登录后无法返回 |
| Token 过期处理 | ⚠️ AuthContext 初始化时检测过期，但运行时 401 无自动处理 | 需新增 401 拦截 → 自动登出 + 跳转 |

**结论**：路由拦截基础设施已存在，P0-1~P0-4 为补全与统一工作，改动量小。

### 9.2 后台配置管理现状

| 模块 | 现状 | 差距 |
|------|------|------|
| `settings` 表 | ✅ 已有 key/value/group 结构，预置 15 项系统设置 | 仅系统级设置，无页面级配置 |
| `SettingsPage.tsx` | ✅ 已有 3 Tab（basic/params/logging） | 管理系统设置，不管理页面内容 |
| 内容管理 (platforms/desktops/deals/games) | ✅ 已有完整 CRUD | 管理具体内容数据，不管理页面文案/可见性 |
| 页面 Hero 文案 | ❌ 前台页面硬编码（如 `CloudGamesPage` Hero 标题） | 需改为从配置读取 |
| 页面可见性控制 | ❌ 不存在 | 需新增 `page_configs` 表 + 管理界面 |
| 页面排序 | ❌ Header TABS 为静态数组 | 需改为从配置动态读取 |

**结论**：页面级配置管理为全新功能，P0-5~P0-9 为核心开发工作。

---

## 十、附录

### 10.1 涉及的现有文件清单

```
src/
├── App.tsx                              # 路由配置
├── contexts/AuthContext.tsx             # 认证状态管理
├── components/
│   ├── ProtectedRoute.tsx               # 路由守卫（修改）
│   ├── AdminRoute.tsx                   # 管理员守卫（无需改）
│   ├── Header.tsx                       # 导航（修改：动态 Tab）
│   └── admin/
│       ├── Sidebar.tsx                  # 侧边栏（修改：新增菜单）
│       └── AdminLayout.tsx              # 后台布局（无需改）
├── pages/
│   ├── AuthPage.tsx                     # 登录页（修改：redirect）
│   ├── CloudGamesPage.tsx               # 前台页（修改：读配置）
│   ├── CloudDesktopsPage.tsx            # 前台页（修改：读配置）
│   ├── DealsPage.tsx                    # 前台页（修改：读配置）
│   ├── LibraryPage.tsx                  # 前台页（修改：读配置）
│   ├── FreeGamesPage.tsx                # 前台页（修改：读配置）
│   ├── SmsPlatformsPage.tsx             # 前台页（修改：读配置）
│   └── admin/
│       ├── PageConfigsPage.tsx          # 新增：页面配置管理
│       └── SettingsPage.tsx             # 已有：系统设置（无需改）
├── hooks/useExternalLink.ts             # 外部链接 hook（修改）
├── services/api.ts                      # API 客户端（新增方法）
├── constants/permissions.ts             # 权限常量（修改）
└── types/index.ts                       # 类型定义（新增类型）

functions/
├── api/
│   ├── page-configs.ts                  # 新增：公开配置 API
│   └── admin/
│       ├── page-configs.ts              # 新增：管理配置 API
│       └── page-configs/[key].ts        # 新增：单条配置 API
└── _middleware.ts                       # 已有：JWT 解析（无需改）

migrations/
└── schema-page-configs.sql              # 新增：页面配置迁移脚本
```

### 10.2 术语表

| 术语 | 说明 |
|------|------|
| 路由守卫 (Route Guard) | React Router 中拦截未授权访问的组件，如 `ProtectedRoute` |
| 页面配置 (Page Config) | 针对单个前台页面的显示内容、可见性、参数的配置集合 |
| 系统设置 (Settings) | 已有的全局系统级配置（站名、Logo、密码策略等），与页面配置分离 |
| RBAC | 基于角色的访问控制，本项目已有 roles/permissions/role_permissions 体系 |
