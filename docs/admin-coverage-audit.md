# 后台内容管理覆盖度审查报告 — cloudgame-hub

> 审查目标：**确保网站主页（根路径落地页 `/` + `/app` 内各内容展示页）所有可展示内容（文本、图片、列表、布局参数）都能在后台管理系统中控制与配置，实现前端内容与后台管理的完全联动。**
>
> 审查日期：2026-07-12
> 审查范围：`C:/cloudgame-hub-build`（Cloudflare Pages Functions + D1）
> 结论摘要：**根路径落地页 0% 可配；`/app` 内容页部分覆盖（约 40%）；综合"主页可展示内容"后台覆盖度 ≈ 30%，缺口 14 项（含 3 个 P0 架构级缺陷）。**

---

## 0. 架构事实（审查基础）

项目存在**两套前端**，经 `vite.config.ts`（双入口）、`functions/app/[[path]].ts`、`_redirects`、`App.tsx` 路由确认：

| 前端 | 路由 | 技术形态 | 数据来源 |
|------|------|----------|----------|
| **A. 根路径落地页** | `/` | 静态 `index.html` + `public/landing.js`（纯 HTML/CSS/JS） | **全部硬编码** |
| **B. SPA 应用** | `/app/*`（basename=`/app`） | React（`app/index.html` → `src/main.tsx`） | D1 API + `src/data/*.ts` 静态回退 + 硬编码 JSX |

内容数据存在**三级来源**，优先级从低到高：

1. **硬编码**（HTML/JSX 字面量）——最不可控；
2. **静态 TS 文件** `src/data/*.ts`——编译期固定，需发版才能改；
3. **D1 数据库**（经 `/api/*` 接口）——后台可配。

关键机制（决定覆盖度）：

- `queryWithFallback(db, sql, params, fallback)`：D1 为空/抛错时回退静态数据。
  - ⚠️ 注意：**只有 `platforms/desktops/deals/games` 四个接口用了它**；`page-configs/banners/announcements` 公共接口**直接查 D1，无回退**（D1 空则返空数组，不会用静态）。
- `requireAuth(context.data)`（`functions/lib/response.ts`）：返回 `data.user ?? null`。**匿名用户（无 JWT）返回 null → 401**。
  - ⚠️ `platforms/desktops/deals/games` 四个读接口**都调用了 `requireAuth`**，因此**未登录访客必然 401 → 前端走静态回退**。这是覆盖度的致命阻断点。
- `getConfig(page_key)`（`usePageConfigs` 钩子）：按 `page_key` 精确匹配 `page_configs`。
  - ⚠️ **DB 中 `page_key` 用连字符**（`cloud-games`），**SPA 中 4 个页面用下划线查找**（`cloud_games`）→ 永远匹配不到 → Hero 文案与 `is_enabled` 开关对这些页面失效。

---

## 1. 数据模型清单

### 1.1 已存在的 D1 表（schema.sql + 5 个 migration）

| 表 | 用途 | 关键字段 | 是否种子数据 |
|----|------|----------|--------------|
| `page_configs` | 页面配置（Hero 文案/开关/排序） | page_key, page_name, title, subtitle, description, is_enabled, params, sort_order | ✅ 6 行（cloud-games/cloud-desktops/deals/library/free-games/sms-platforms） |
| `settings` | 系统设置 | key, value, group | ✅ 15 行（site_name/logo_url/icp_number/contact_*/site_description/password_*/verification_*/registration_enabled/log_*） |
| `banners` | 轮播图 | id, title, image_url, link_url, sort_order, is_active, start_time, end_time, description | ✅ 2 行 |
| `announcements` | 公告 | id, title, content, type, status, sort_order, published_at | ❌ 空（需后台添加） |
| `messages` | 站内信 | id, sender_id, recipient_id, title, content, is_read, read_at | ❌ 空 |
| `platforms` | 云游戏平台 | id(TEXT), name, color, price, free_info, url, description, tags(JSON), activity, sort_order | ✅ 10 行 |
| `cloud_desktops` | 办公云电脑 | id(TEXT), name, url, description, scenarios(JSON), price_range, activity, sort_order | ✅ 5 行 |
| `deals` | 薅羊毛 | id(TEXT), title, description, link, category, tags(JSON), updated_at, expires_at, sort_order | ✅ 19 行 |
| `games` | 游戏库 | id(TEXT), name, type, rating, config, platforms(JSON), description, reason, tags(JSON), emoji, sort_order | ❌ **空（schema 建表但 seed.sql 未插入）** |
| `users` / `verification_codes` / `favorites` / `roles` / `permissions` / `role_permissions` / `user_roles` / `operation_logs` / `login_logs` | 账户/权限/日志 | — | 角色权限有种子 |

### 1.2 静态 TS 数据文件（无对应表、无接口，编译期固定）

| 文件 | 内容 | 是否为该内容的唯一来源 |
|------|------|------------------------|
| `src/data/platforms.ts` | 云游戏平台（回退用） | 否（DB 优先） |
| `src/data/desktops.ts` | 云电脑（回退用） | 否（DB 优先） |
| `src/data/deals.ts` | 羊毛（回退用） | 否（DB 优先） |
| `src/data/games.ts` | 游戏库（回退用） | 否（DB 优先，但 DB 空） |
| **`src/data/freeGames.ts`** | **免费资源 26 款** | **是（唯一来源，无 DB/接口）** |
| **`src/data/smsPlatforms.ts`** | **接码平台 24 个** | **是（唯一来源，无 DB/接口）** |
| **`src/data/seoConfig.ts`** | **各页 SEO 标题/描述/关键词** | **是（唯一来源，无 DB/接口）** |

### 1.3 ❌ 缺失的表（导致对应内容无法后台管理）

- `free_games` —— 免费资源页无表、无接口、无后台 UI
- `sms_platforms` —— 接码平台页无表、无接口、无后台 UI
- `seo_configs`（或并入 `page_configs`）—— SEO 文案无表、无接口、无后台 UI
- `subscriptions`（邮箱订阅）—— 落地页/CTA 订阅无表、无接口
- `site_content`（落地页区块）—— 根路径落地页整体无结构化存储

---

## 2. 后台接口清单

### 2.1 公共读接口（`functions/api/*`）

| 接口 | 数据源 | 是否需登录 | 前端是否消费 |
|------|--------|-----------|--------------|
| `/api/page-configs` | `page_configs`（仅启用） | ❌ 公开 | ✅ Header 导航 + 内容页 Hero（部分失效） |
| `/api/banners` | `banners`（生效中） | ❌ 公开 | ✅ SPA `BannerCarousel`（仅 /app） |
| `/api/announcements` | `announcements`（已发布） | ❌ 公开 | ✅ SPA `AnnouncementBar/Modal`（仅 /app） |
| `/api/platforms` | `platforms` + 静态回退 | ✅ **需登录** | ✅ CloudGamesPage（匿名走静态） |
| `/api/desktops` | `cloud_desktops` + 静态回退 | ✅ **需登录** | ✅ CloudDesktopsPage（匿名走静态） |
| `/api/deals` | `deals` + 静态回退 | ✅ **需登录** | ✅ DealsPage（匿名走静态） |
| `/api/games` | `games` + 静态回退 | ✅ **需登录** | ✅ LibraryPage（匿名走静态，且 DB 空） |
| `/api/messages` `/api/messages/unread-count` `/api/messages/[id]` | `messages` | ✅ 需登录 | ✅ 用户站内信 |

### 2.2 后台读写接口（`functions/api/admin/*`）

用户/角色/权限/日志（`users` `roles` `permissions` `role_permissions` `operation_logs` `login_logs`）、`settings`、`page-configs`、`banners`（含 upload-image/sort/toggle）、`announcements`、`messages`、`platforms`、`desktops`、`deals`、`games`。

### 2.3 ❌ 缺失的后台接口

- 免费资源 CRUD（`/api/admin/free-games`）、公开读（`/api/free-games`）
- 接码平台 CRUD（`/api/admin/sms-platforms`）、公开读（`/api/sms-platforms`）
- SEO 配置读写（无）
- 邮箱订阅写接口（无，仅有登录用的 Brevo 发码）

---

## 3. 后台 UI 清单（`src/pages/admin/*`）

| 后台页面 | 路径 | 管理的表 |
|----------|------|----------|
| 仪表盘 | `/admin/dashboard` | （统计） |
| 用户管理 | `/admin/users` | users / user_roles |
| 内容-平台 | `/admin/content/platforms` | platforms |
| 内容-云电脑 | `/admin/content/desktops` | cloud_desktops |
| 内容-羊毛 | `/admin/content/deals` | deals |
| 内容-游戏库 | `/admin/content/games` | games |
| 角色/权限 | `/admin/roles` | roles / permissions / role_permissions |
| 系统设置 | `/admin/settings` | settings |
| 公告 | `/admin/announcements` | announcements |
| 轮播图 | `/admin/banners` | banners |
| 站内信 | `/admin/messages` | messages |
| 日志 | `/admin/logs/operation` `/admin/logs/login` | operation_logs / login_logs |
| 页面配置 | `/admin/page-configs` | page_configs |

### 3.1 ❌ 缺失的后台 UI

- **免费资源管理中台**（无）
- **接码平台管理中台**（无）
- **SEO/页面 Meta 管理中台**（无）
- **邮箱订阅管理中台**（无）
- **根路径落地页区块编辑器中台**（无——落地页完全不在后台体系内）

---

## 4. 主页展示内容 × 后台可配性 总映射表

> 图例：✅ 后台可配 ｜ ⚠️ 部分可配（有条件/有 bug） ｜ ❌ 硬编码不可配

### 4.1 根路径落地页 `/`（整体 0%）

| 区块 | 展示内容 | 配置方式 | 表/接口 | 缺口 |
|------|----------|----------|---------|------|
| Header | 品牌"云玩汇"、导航(云游戏/云电脑/薅羊毛/免费资源)、搜索占位、注册按钮 | ❌ 硬编码 | 无 | 无后台 |
| Hero | kicker、标题"一个入口，玩转所有云端世界"、副标题"3000+云游戏…"、双 CTA、8 个 mock 游戏瓦片 | ❌ 硬编码 | 无 | 无后台 |
| 三大业务模块 | 云游戏/云电脑/薅羊毛卡片（标题+描述+链接） | ❌ 硬编码 | 无 | 无后台 |
| 云游戏区 | 区块标题、筛选 chip(3A大作/热门网游/竞技对抗)、12 个游戏名、"加载更多"(假) | ❌ 硬编码 | 无 | 无后台（与 /app 数据无关） |
| 云电脑区 | 标题、副标题、4 条卖点、**3 档套餐价格(¥9.9/¥29.9/¥59.9)+规格+标签** | ❌ 硬编码 | 无 | 价格/套餐不可配 |
| 羊毛区 | 6 条优惠(京东PLUS/百亿补贴/美团神券/爱优腾/123云盘/游戏点券)+金额 | ❌ 硬编码 | 无 | 与 /app/deals 数据无关 |
| 免费资源区 | 3 张卡片(夸克网盘/Steam周免/MOD库) | ❌ 硬编码 | 无 | 与 /app/free-games 数据无关 |
| 社会证明 | **数据条"50万+/1000万+/99.9%/4.9"、2 条用户好评** | ❌ 硬编码 | 无 | 虚假/不可配 |
| 最终 CTA | 标题、副标题、**邮箱订阅表单（假提交，仅 toast）** | ❌ 硬编码 | 无 | 订阅未接入后端 |
| Footer | 品牌、链接组、版权"© 2026 云玩汇"、ICP"沪ICP备 2026xxxx 号" | ❌ 硬编码 | 无（settings 表未消费） | 与 settings 表脱节 |
| Banner/公告/站内信 | —— | ❌ 未集成 | 无 | 落地页不渲染后端 Banner/公告 |

### 4.2 `/app` 内容展示页

| 模块 | 展示内容 | 配置方式 | 表/接口 | 缺口 |
|------|----------|----------|---------|------|
| SPA 首页 Hero (`/app/`) | 标题"云游戏平台哪个好？"、副标题、特性卡片、SEO 文案、优势区 | ❌ 硬编码 JSX | 无（非 page_configs） | Hero 不可配 |
| 云游戏列表 (`/app/cloud-games`) | 平台列表 + Hero 文案 | ⚠️ 列表 D1 可管但**需登录才生效**；Hero `getConfig("cloud_games")` 键错→失效 | platforms / `/api/platforms` | ①匿名走静态 ②Hero bug |
| 云端办公 (`/app/cloud-desktops`) | 云电脑列表 + Hero | ⚠️ 同云游戏 | cloud_desktops | ①匿名走静态 ②Hero `cloud_desktops` 键错 |
| 羊毛聚合 (`/app/deals`) | 羊毛列表 + Hero | ⚠️ 列表需登录；**Hero `getConfig("deals")` 正确✅** | deals | 仅匿名走静态 |
| 游戏库 (`/app/library`) | 游戏列表 + Hero | ⚠️ 列表需登录；**Hero `getConfig("library")` 正确✅**；但 games 表**空** | games | ①匿名走静态 ②DB 未种子 |
| 免费资源 (`/app/free-games`) | 26 款游戏(名称/类型/平台/夸克链接) | ❌ 静态 `freeGames.ts` | 无 | 无表/接口/后台 |
| 接码平台 (`/app/sms-platforms`) | 24 个平台 | ❌ 静态 `smsPlatforms.ts` | 无 | 无表/接口/后台 |
| Banner 轮播 (`/app`) | 轮播图 | ✅ 后台可配 | banners / `/api/banners` | 仅 /app，落地页无 |
| 公告 (`/app`) | 公告栏/弹窗 | ✅ 后台可配 | announcements / `/api/announcements` | 仅 /app，落地页无；初始空 |
| 站内信 | 用户收件箱 | ✅ 后台可配 | messages | 仅登录用户 |
| SEO / 页面 Meta | 各页 title/description/keywords/OG | ❌ 静态 `seoConfig.ts` | 无 | 后台完全不可改 |
| page_configs 导航/开关 | 顶部导航标签显隐、排序 | ⚠️ Header 导航✅；4 页(`cloud-games/cloud-desktops/free-games/sms-platforms`)的 `is_enabled` 开关/文案❌（键错） | page_configs | 4/6 页开关与 Hero 失效 |
| Footer (`/app`) | 品牌/链接/版权/免责 | ❌ 硬编码 | settings 未消费 | settings 孤儿 |
| 邮箱订阅 (`/app`) | ——（SPA 无订阅表单） | ❌ 无 | 无 | 订阅能力缺失 |

---

## 5. 按内容模块分组详述（结论 + 缺口 + 补充方案）

### 5.1 落地页-Hero（根路径）
- **当前配置方式**：❌ 硬编码（`index.html` 第 320–349 行）。
- **对应表与接口**：无。
- **缺口**：主标题、副标题、CTA 文案、背景图、mock 游戏瓦片全部不可改；无任何后台入口。
- **补充建议**：见 §6 P0-1，将根落地页纳入后台体系（推荐直接以 `/app` 的 SPA 首页为唯一主页，或给 `index.html` 注入 API 拉取 Hero/Banner/公告）。

### 5.2 落地页-Banner / 公告 / 站内信
- **当前配置方式**：❌ 根落地页**完全未集成** `banners`/`announcements`/`messages`（落地页是纯静态 HTML，`landing.js` 无任何 fetch）。
- **对应表与接口**：表与 `/api/*` 均存在且 `/app` 内可用，但落地页不消费。
- **缺口**：后台配置的轮播图、公告无法显示在网站首页（最重要的曝光位）。
- **补充建议**：在 `index.html` 中增加轻量 JS，调用 `/api/banners`、`/api/announcements` 渲染；或统一以 SPA 为首页。

### 5.3 云游戏列表（`/app/cloud-games`）
- **当前配置方式**：⚠️ 部分。列表数据 `platforms` 表可后台 CRUD（后台 UI + `/api/admin/platforms` 齐全）；但：
  1. 公共读接口 `/api/platforms` **需登录** → 匿名访客（绝大多数 SEO 流量）永远看到 `src/data/platforms.ts` 静态数据，后台改动对他们不可见；
  2. Hero 文案 `getConfig("cloud_games")` 键错（`cloud-games` vs `cloud_games`）→ 永远用硬编码默认值。
- **对应表与接口**：`platforms` / `/api/platforms`（AUTH）/ `/api/admin/platforms`。
- **缺口**：①匿名不可见后台改动；②Hero 不可配（bug）。
- **补充建议**：放开公共读接口鉴权（或新增公开变体）；修正 `getConfig` 键为 `cloud-games`。

### 5.4 云端办公（`/app/cloud-desktops`）
- **当前配置方式**：⚠️ 同 5.3（列表 D1 可管但需登录；Hero 键 `cloud_desktops` 错误）。
- **补充建议**：同 5.3，修正键为 `cloud-desktops`，放开读接口鉴权。

### 5.5 羊毛聚合（`/app/deals`）
- **当前配置方式**：⚠️ 列表 D1 可管但**需登录**；Hero `getConfig("deals")` **键正确✅**，标题/副标题/开关可用。
- **补充建议**：放开 `/api/deals` 匿名访问即可达到"列表后台可联动"。这是四个业务页中覆盖最好的。

### 5.6 免费资源（`/app/free-games`）
- **当前配置方式**：❌ 硬编码 `src/data/freeGames.ts`（26 款，含夸克链接/类型/平台/emoji）。无表、无接口、无后台 UI。唯一"后台触点"是 `page_configs.is_enabled`，但键 `free_games` 错误导致开关也失效。
- **对应表与接口**：无。
- **缺口**：100% 不可后台管理；新增/下架游戏必须改代码发版。
- **补充建议**：新建 `free_games` 表 + `/api/free-games`（公开）+ `/api/admin/free-games`（CRUD）+ 后台管理页 + 将 `FreeGamesPage` 改为从 API 读取；修正 `getConfig("free-games")`。

### 5.7 接码平台（`/app/sms-platforms`）
- **当前配置方式**：❌ 硬编码 `src/data/smsPlatforms.ts`（24 个）。无表/接口/后台。键 `sms_platforms` 错误。
- **补充建议**：同 5.6，新建 `sms_platforms` 表 + 接口 + 后台页 + 前端改造；修正键 `sms-platforms`。

### 5.8 游戏库（`/app/library`）
- **当前配置方式**：⚠️ 列表 `games` 表可后台 CRUD（后台 UI + `/api/admin/games` 齐全），Hero `getConfig("library")` 键正确✅；但：
  1. 公共读 `/api/games` 需登录 → 匿名走静态；
  2. **`games` 表 seed.sql 未插入任何数据** → 即使登录，D1 为空也回退静态 `src/data/games.ts`。
- **补充建议**：放开读接口鉴权；为 `games` 表补充种子数据（或确保后台录入后对外可见）。

### 5.9 SEO / 页面配置
- **当前配置方式**：
  - **SEO 文案（title/description/keywords/OG）**：❌ 硬编码 `src/data/seoConfig.ts`，`SEO` 组件直接读取，无任何 DB/后台。
  - **page_configs**：⚠️ 表+后台+公开接口齐全，被 Header 导航与（部分）内容页 Hero 消费；但 4/6 页面因键不匹配失效。
- **缺口**：管理员**无法修改任何页面的 SEO 标题/描述/关键词**——对聚合站流量是重大短板；`page_configs.title/subtitle` 与 SEO meta 是两套互不相干的体系。
- **补充建议**：
  - 在 `page_configs` 增加 `seo_title`/`seo_description`/`seo_keywords` 字段（或新建 `seo_configs` 表）；
  - `SEO` 组件改为按 `pageKey` 调用 `/api/page-configs`（或新增 `/api/seo`）取数，去掉对 `seoConfig.ts` 的硬依赖；
  - 修正 `getConfig` 键不匹配。

### 5.10 Footer（根落地页 + SPA）
- **当前配置方式**：❌ 两处 Footer 均硬编码品牌/链接/版权/免责；`settings` 表虽含 `site_name/logo_url/icp_number/contact_email/contact_qq/contact_wechat`，但**无任何前端消费**（且 `settings.site_name='云游戏中心'` 与显示名"云玩汇"不一致，证实未被使用）。
- **缺口**：备案号、联系信息、版权等均不可后台改；settings 配置项"孤儿化"。
- **补充建议**：Header/Footer 组件消费 `settings`（公开读取接口可新增 `/api/settings/public`）；后台 Settings 页已就绪，只需前端接线。

### 5.11 邮箱订阅
- **当前配置方式**：❌ 根落地页 CTA 表单为**假提交**（`landing.js` 仅 `showToast('注册成功')`，不调接口）；SPA 无订阅入口。
- **缺口**：无订阅表、无接口、无后台；"邮箱订阅"形同虚设。
- **补充建议**：新建 `subscriptions` 表 + `/api/subscribe`（公开，含频率限制）+ 后台订阅者列表；接线两处表单（至少 SPA）。

### 5.12 社会证明（数据条/好评）
- **当前配置方式**：❌ 根落地页"50万+注册/1000万+时长/99.9%/4.9 评分"及 2 条好评均为硬编码，且数据无真实来源。
- **缺口**：不可配、且数值失真。
- **补充建议**：纳入 `settings` 或新建 `site_stats` 表，后台可改；好评可并入 `announcements`（type=testimonial）或独立表。

---

## 6. 重大架构缺陷（P0，必须优先修复）

### P0-1 根路径落地页 100% 硬编码，完全脱离后台
网站真正的"主页"`/`（静态 `index.html`）所有内容均不可后台管理，且不渲染后台的 Banner/公告。这与"前端内容与后台完全联动"的目标直接冲突。
**修复方向（二选一）**：
- **方案 A（推荐）**：以 `/app` 的 SPA 首页作为唯一主页，将根 `/` 重定向/重写到 SPA（`functions/[[path]].ts` 或在 `index.html` 改为 SPA 壳）。一次性解决落地页所有区块的可配性问题，并复用已有的 Banner/公告/内容接口。
- **方案 B（保守）**：保留静态落地页，但在 `landing.js` 中增加 `fetch('/api/banners')` `/api/announcements` `/api/page-configs` `/api/settings/public`，将 Hero 文案、轮播、公告、Footer 信息动态渲染。需为落地页区块新建结构化存储（如 `site_content` 表）。

### P0-2 公共内容读接口需登录，匿名访客永远看不到后台改动
`/api/platforms`、`/api/desktops`、`/api/deals`、`/api/games` 均 `requireAuth`。对 SEO 聚合站而言，未登录访客才是主体，他们始终走 `src/data/*.ts` 静态回退——**后台对核心业务内容（平台/云电脑/羊毛/游戏）的增删改对公众不可见**，后台管理形同虚设。
**修复**：移除这四个读接口的 `requireAuth`（内容本就公开）；保留写接口（admin）的鉴权。注意 `queryWithFallback` 在 D1 空时回退静态，需确保 D1 已正确迁移+种子，否则仍显示静态。

### P0-3 `getConfig` 键不匹配，4/6 页面 Hero 与开关失效
DB `page_key` 为连字符（`cloud-games`），代码中 `CloudGamesPage`/`CloudDesktopsPage`/`FreeGamesPage`/`SmsPlatformsPage` 用下划线（`cloud_games` 等）查找 → 永远 null → Hero 文案恒为硬编码默认、且 `is_enabled` 禁用开关对这些页面无效。仅 `deals`/`library` 正确。
**修复**：统一为连字符（与 DB 一致），共 4 处（`CloudGamesPage.tsx:36`、`CloudDesktopsPage.tsx:34`、`FreeGamesPage.tsx:19`、`SmsPlatformsPage.tsx:38`）。同时 `usePageConfigs` 的 `DEFAULT_PAGE_CONFIGS` 也用连字符，需与修复后的查找一致。

---

## 7. 后台覆盖度评分

### 7.1 逐项覆盖度

| # | 内容模块 | 覆盖度 | 说明 |
|---|----------|--------|------|
| 1 | 落地页-Hero | 0% | 硬编码 |
| 2 | 落地页-三大模块 | 0% | 硬编码 |
| 3 | 落地页-云游戏(mock) | 0% | 硬编码 |
| 4 | 落地页-云电脑套餐/价格 | 0% | 硬编码 |
| 5 | 落地页-羊毛 | 0% | 硬编码（与 /app 无关） |
| 6 | 落地页-免费资源 | 0% | 硬编码 |
| 7 | 落地页-社会证明 | 0% | 硬编码+失真 |
| 8 | 落地页-邮箱订阅 | 0% | 假提交 |
| 9 | 落地页-Footer | 0% | 硬编码（settings 孤儿） |
| 10 | 落地页-Banner/公告 | 0% | 未集成 |
| 11 | /app 首页 Hero | 0% | 硬编码 JSX |
| 12 | /app 云游戏列表 | 40% | 列表可管但需登录；Hero bug |
| 13 | /app 云端办公 | 40% | 同上 |
| 14 | /app 羊毛聚合 | 55% | 列表需登录；Hero 可配✅ |
| 15 | /app 游戏库 | 50% | 列表需登录；Hero 可配✅；DB 空 |
| 16 | /app 免费资源 | 0% | 静态，无后台 |
| 17 | /app 接码平台 | 0% | 静态，无后台 |
| 18 | /app Banner 轮播 | 100% | 后台可配（仅 /app） |
| 19 | /app 公告 | 100% | 后台可配（仅 /app） |
| 20 | 站内信 | 100% | 后台可配 |
| 21 | SEO/Meta | 0% | 静态 seoConfig |
| 22 | page_configs 导航/开关 | 60% | 导航✅；4 页开关/文案✗ |
| 23 | /app Footer | 0% | 硬编码（settings 孤儿） |

### 7.2 综合评分

- **根路径落地页（真正的"主页"）**：0/11 区块可配 → **0%**
- **`/app` 内容页**：9 大模块中 完全可配 3（Banner/公告/站内信）、部分可配 4（云游戏/云电脑/羊毛/游戏库，且均受"需登录"与"键 bug"削弱）、不可配 2（免费资源/接码平台）+ 首页 Hero/SEO/Footer 不可配。
- **综合"主页可展示内容"后台覆盖度 ≈ 30%**（根落地页 0% 严重拉低；即便只看 /app 也仅约 40–50% 且多带条件）。

**缺口总数：14 项**（见 §8，其中 P0×3、P1×7、P2×4）。

---

## 8. 优先级排序待办清单

### P0（阻断"前后台联动"，必须先行）
1. **[P0-1] 根落地页纳入后台**：方案 A（统一以 SPA 为首页）或方案 B（落地页 API 化）。否则首页 0% 覆盖。
2. **[P0-2] 放开四个公共内容读接口鉴权**：`/api/platforms`、`/api/desktops`、`/api/deals`、`/api/games` 移除 `requireAuth`，确保匿名访客看到 D1 数据。
3. **[P0-3] 修复 `getConfig` 键不匹配**：4 处下划线→连字符，使 Hero 文案与 `is_enabled` 开关生效。

### P1（核心内容可配，缺失表/接口/UI）
4. **[P1-1] 免费资源后台化**：新建 `free_games` 表（字段：id, name, type, platform, description, quark_link, emoji, sort_order, is_enabled）+ `/api/free-games`(公开) + `/api/admin/free-games`(CRUD) + 后台管理页 + `FreeGamesPage` 改读 API。
5. **[P1-2] 接码平台后台化**：同上模式，新建 `sms_platforms` 表（对齐 `SmsPlatform.ts` 字段）+ 接口 + 后台页 + `SmsPlatformsPage` 改造。
6. **[P1-3] SEO 后台化**：`page_configs` 增加 `seo_title/seo_description/seo_keywords`（或新建 `seo_configs`）；`SEO` 组件改为 API 取数，去掉 `seoConfig.ts` 硬依赖。
7. **[P1-4] 种子 `games` 表**：补 seed 数据，使游戏库 D1 驱动而非静态回退。
8. **[P1-5] settings 接线前端**：新增公开读取接口（如 `/api/settings/public` 仅返回 site_name/logo_url/icp_number/contact_*），Header/Footer 消费之；统一站点名为"云玩汇"。
9. **[P1-6] 落地页渲染 Banner/公告**：若保留静态落地页，在 `landing.js` 注入 `/api/banners`、`/api/announcements` 渲染（与 P0-1 方案绑定）。
10. **[P1-7] 社会证明数据可配**：纳入 `settings` 或 `site_stats` 表，后台可改，替换硬编码失真数值。

### P2（增强项）
11. **[P2-1] 邮箱订阅能力**：`subscriptions` 表 + `/api/subscribe`（含限流）+ 后台订阅者列表 + 接线两处 CTA 表单（当前为假提交）。
12. **[P2-2] `queryWithFallback` 行为治理**：D1 未迁移/空时回退静态会掩盖"后台改动未生效"，建议在管理后台增加"数据源状态"指示或监控告警。
13. **[P2-3] 统一内容模型**：将 `free_games`/`sms_platforms` 与现有 `platforms/deals/desktops/games` 抽象出通用的"内容集"管理，减少重复 CRUD 代码。
14. **[P2-4] 全站可配性回归测试**：新增测试断言"后台改 X → 前端（匿名+登录）展示 X"，防止再次出现键不匹配/鉴权阻断类回归。

---

## 9. 一句话结论

> 当前后台系统**只真正覆盖了"轮播图、公告、站内信"三项**，以及"页面导航显隐/排序"的部分能力；**网站主页（根 `/`）整体 0% 可配**，且 `/app` 下最核心的"平台/云电脑/羊毛/游戏"四类业务内容因**公共接口需登录**而对匿名访客不可见、"免费资源/接码平台/SEO/Footer"四类**纯静态无后台**。要达到"前端内容与后台管理完全联动"，须先修 P0-1/2/3 三处架构级阻断，再补 P1 的 `free_games`/`sms_platforms`/SEO/settings 接线，综合覆盖度方能从 ≈30% 提升至 90%+。
