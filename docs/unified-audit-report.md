# 云玩汇 cloudgame-hub 全站统一审计报告

> **审计对象**：`C:/cloudgame-hub-build`（Cloudflare Pages + Functions + D1 + KV + React SPA）
> **审计日期**：2026-07-12
> **审计方法**：7 人专家团 + 多 Agent 并行（后端安全 / 前端缺陷 / UI 兼容 / 后台覆盖）
> **子报告来源**：`security-audit-backend.md`、`frontend-audit.md`、`ui-compat-audit.md`、`admin-coverage-audit.md`
> **本报告的定位**：将四份专项审计合并为一份可直接用于整改排期的统一结论，并给出跨域的优先级路线图。

---

## 0. 总览与严重程度汇总

用户需求拆解为三块独立审查，结论分别如下（详细清单见后）：

| 审查维度 | P0（阻断/严重） | P1（高） | P2（中） | P3（低） | 合计/备注 |
|---|---|---|---|---|---|
| **A. 安全漏洞与代码缺陷** | 0 | 4 | 9 | 20 | 后端 21 + 前端 12；无直接数据泄露/接管类 P0 |
| **B. UI/设计兼容性** | 3（基础设施，修复优先级） | 组件/页面级 | emoji/响应式 | — | ~48 处致命不兼容 + 30+ 中等 + 8+ emoji 违规 |
| **C. 后台内容覆盖度** | 3（架构级缺陷） | 7 | 4 | — | 主页可展示内容后台覆盖度 ≈ **30%**，缺口 14 项 |

### 跨域「必须优先处理」的阻断项（真正的上线/目标阻塞）

> 以下任何一项不解决，网站都称不上"完成"——要么安全有敞口，要么新设计只装修了门面，要么后台根本管不到主页。

| 编号 | 来源 | 阻断性质 | 一句话 |
|---|---|---|---|
| **B1** | UI-P0 | 视觉割裂根因 | 设计 Token 未迁移，`/app` 与 `/admin` 仍是旧色板/系统字体 |
| **I1** | UI-P0 | 字体被 CSP 拦截 | 两份 `_headers` 冲突，Google Fonts 可能被拦 |
| **SEC-P1-1** | 后端 | 账户接管风险 | SMS 验证码可无限爆破（非恒定时间 + 无锁定） |
| **SEC-P1-2** | 后端 | 邮件/短信轰炸 | 发码接口 IP 限流失效 |
| **SEC-P1-3** | 后端 | 权限提升 | 持 `user:manage` 即可赋 `super_admin` |
| **ADM-P0-1** | 后台 | 前后台联动失败 | 根落地页 `/` 100% 硬编码，完全脱离后台 |
| **ADM-P0-2** | 后台 | 后台改动对公众不可见 | 4 个公共内容读接口需登录，匿名永远走静态 |
| **ADM-P0-3** | 后台+前端 | 文案/开关失效 | `getConfig` 键不匹配（下划线 vs 连字符）+ `is_enabled===0` 类型比较错误 |

---

# 第一部分：安全漏洞与代码缺陷（按严重程度分类）

> 合并自《后端安全审计报告》与《前端代码缺陷审查报告》。**结论：无 P0 级可直接利用的漏洞**（无注入、无鉴权绕过、无密钥硬编码）。主要风险集中在「滥用类」（爆破/轰炸/提权）与一致性/纵深。

## 1.1 后端安全（Cloudflare Pages Functions）

### P0 — 严重：无
所有管理写操作均经 `requirePermission`；D1 全参数化查询，无 SQL 注入；JWT 双密钥；无密钥进源码。

### P1 — 高（上线前必须修复）

**SEC-P1-1 · SMS 登录验证码无暴力破解防护**
- **位置**：`functions/api/sms-login.ts:125-129`（比对 `if (storedCode !== code)`），整文件无 `failed_attempts` 锁定。
- **对比**：`register.ts:146-174`、`email-login.ts:128-156` 已实现「5 次错锁定并标记 used」。
- **影响**：6 位码在 5 分钟窗口内可被穷举，存在**账户接管**风险，且 SMS 路径明显弱于 email 路径。
- **修复**：复用 `verification_codes.failed_attempts`，达 5 次标记 `used=1`；改用恒定时间比对；增加 SMS 登录失败全局频率限制。

**SEC-P1-2 · 发码接口 IP 级限流失效（邮箱/短信轰炸）**
- **位置**：`functions/api/send-code.ts:169-183`（首行 `ipResult` 为死代码未使用，实际查 `login_logs`）；`send-sms.ts:148-164` 同。
- **问题**：发码请求不写 `login_logs`，故该限流永不触发；每邮箱/每手机号 60s 限制只约束同一目标，不约束向大量不同目标连续发码；两接口无认证/CAPTCHA。
- **影响**：匿名攻击者可持续向第三方发验证码，耗尽 Brevo/SMSBao 额度、污染域名信誉。
- **修复**：在 `verification_codes` 增发送者 IP 列或改用 KV/Ratelimit binding 做真实「每 IP 每窗口 ≤N 次」限制；删除 `send-code.ts:169-173` 死代码；高安全场景加 CAPTCHA。

**SEC-P1-3 · 权限提升：持 `user:manage` 即可赋 `super_admin`**
- **位置**：`functions/api/admin/users/[id]/roles.ts:114-145`（PUT 全量覆盖角色，未禁止赋 `super_admin`）。
- **对比**：`roles/[id]/permissions.ts:106-108` 已禁止改 `super_admin` 权限——两处防护不对称。
- **影响**：低权管理员 → 超级管理员，完全接管后台。
- **修复**：赋角色时若含 `super_admin` 要求调用者自身 `roles.includes("super_admin")`；或强制 `user:manage` 与 `super_admin` 绑定不可拆分；禁止非超级管理员改/删超级管理员用户。

### P2 — 中（防御纵深 / 潜在问题）

| # | 位置 | 问题 | 修复 |
|---|---|---|---|
| SEC-P2-1 | `login.ts:126` vs `refresh-token.ts:97` | `isAdmin` 双真相源（角色 vs `is_admin` 列）可背离 | 统一以 `super_admin` 角色为单一真相源 |
| SEC-P2-2 | `functions/admin/banners.ts:123-152` 等遗留端点 | 旧 `admin/*` 端点未校验 URL（`javascript:`/`data:` 可入库）→ 存储型 XSS/开放重定向 | 接入 `validateUrl` 或下线 `functions/admin/*` |
| SEC-P2-3 | `lib/revocation.ts:58-65` + `_middleware.ts:104-115` | 令牌吊销在 KV 故障时 **fail-open**（登出失效临时失效） | 生产确保配 `TOKEN_BLACKLIST`；管理操作 fail-closed |
| SEC-P2-4 | `refresh-token.ts:42-129` | 刷新不吊销旧令牌、无限频，令牌增殖 | 刷新时把旧 `jti` 写 KV 黑名单；加频率限制 |
| SEC-P2-5 | `_headers` vs `_middleware.ts` | 安全响应头（HSTS/X-Content-Type-Options/Referrer-Policy/CSP）可能未覆盖 `/api/*` 响应 | 在 `_middleware.ts` 对 API 响应显式加安全头 |
| SEC-P2-6 | `sms-login.ts:216` | SMS 登录 Cookie 用 `auth_token`（无 `__Host-` 前缀）+ `SameSite=Lax`，与主流 `__Host-auth_token; Strict` 并存 | 统一为 `__Host-auth_token; HttpOnly; Secure; SameSite=Strict` |
| SEC-P2-7 | `lib/logger.ts:174-181` + `login.ts:15-32` | 限流依赖可被伪装的 `X-Forwarded-For`（源站直连可绕过 5 次失败/IP 限流） | 安全限流只信 `CF-Connecting-IP`；源站不可公网直连 |

### P3 — 低（健壮性 / 最佳实践，11 项）

| # | 位置 | 问题 | 修复 |
|---|---|---|---|
| SEC-P3-1 | `lib/auth.ts:221-241` | JWT 验签未断言 `alg==="HS256"` | 验签前校验 alg |
| SEC-P3-2 | `lib/cbf4217a-34ff-412c-bfcb-a73acaf78b9f.ts` | 旧版 `auth.ts` 副本，未被引用，非恒定时间、无 jti/双密钥 | 直接删除 |
| SEC-P3-3 | `lib/auth.ts:11` | PBKDF2 迭代 100,000 < OWASP 2023 建议 600,000 | 提升到 ≥300,000（权衡 Worker 耗时） |
| SEC-P3-4 | `send-code.ts:197`、`send-sms.ts:174` | 验证码明文入库 | 存 `HMAC(secret, code)` |
| SEC-P3-5 | `send-code.ts:43-46` 等 | `getRandomValues % 1000000` 取模偏差 | rejection sampling |
| SEC-P3-6 | 各 admin 端点 `detail: body` | 操作日志记录完整请求体，可能记敏感字段 | 仅记白名单字段 |
| SEC-P3-7 | `logs/login.ts:96-108` 等 | CSV 导出未防公式注入（`= + - @` 开头被 Excel 执行） | 首字符加 `'` 前缀 |
| SEC-P3-8 | `lib/auth.ts:271-307` | `JWT_SECRET_OLD` 长期不清理则旧密钥令牌持续有效 | 轮换窗口后移除 |
| SEC-P3-9 | `api/admin/page-configs.ts` 等 | `params` 原样存字符串，未校验合法 JSON | `JSON.parse` 校验 |
| SEC-P3-10 | `register.ts:109-120` | 密码长度硬编码 8，与 `settings.password_min_length` 配置项不一致 | 从 settings 读取或删未用项 |
| SEC-P3-11 | `lib/backup.ts:53,62` | 备份拼接表名执行 SQL；导出含 `users.password_hash/salt` 到 R2 | 表名白名单；`BACKUP_BUCKET` 受限加密 |

### 后端正面实践（保留）
参数化查询、PBKDF2+盐+恒定时间、JWT 双密钥、RBAC 实时查库（不信任 JWT 权限）、`__Host-` Cookie、无用户枚举、CORS 白名单、错误不泄露堆栈、密码哈希不回传、无 IDOR、静态资源安全头。

---

## 1.2 前端代码缺陷（React SPA）

> 评分 8/10（高质量）。全仓无 `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function`/`javascript:` 等任何注入 sink；唯一 `window.open` 带 `noopener,noreferrer`。

### P0 — 无

### P1 — 高

**FE-P1-1 · 后台"禁用页面"功能完全失效（核心功能性缺陷，与 ADM-P0-3 同源）**
- **位置**：取值侧 6 个公开页（`CloudGamesPage.tsx:36,59` / `CloudDesktopsPage.tsx:34,57` / `FreeGamesPage.tsx:19,34` / `DealsPage.tsx:37,74` / `LibraryPage.tsx:41,72` / `SmsPlatformsPage.tsx:38,80`）；类型 `types/pageConfig.ts:21,43`；`hooks/usePageConfigs.ts:17-90`。
- **双重错误叠加**：
  1. **Key 不匹配**：公开页用 `getConfig("cloud_games")`（下划线），数据源（`DEFAULT_PAGE_CONFIGS`、DB）一律连字符 `"cloud-games"` → `configs.find(c => c.page_key === pageKey)` 永远 `null`；
  2. **类型比较错误**：`PageConfig.is_enabled` 为 `boolean`，但 6 页均用 `config?.is_enabled === 0`（数字）→ `true === 0` 永远 false。
- **影响**：管理员在后台禁用某页并保存后，前台该页仍完整渲染，`PageDisabledNotice` 永不显示；导航 Tab（用正确的 `=== true`）会隐藏，但**直接 URL 仍可访问**——内容管控泄漏。
- **修复**：统一 `page_key` 为连字符；`config?.is_enabled === 0` 改为 `!config?.is_enabled`；补单测。若"页面禁用"用于合规下线，应升 P0。

### P2 — 中

**FE-P2-1 · 后台写操作前端权限校验不一致（RBAC 纵深缺口）**
- **位置**：路由闸门仅 `:view`/`:read`（`App.tsx:207/215/223/231/263/255/199`），但 `PlatformsPage/GamesPage/DesktopsPage/DealsPage/BannersPage/AnnouncementsPage/UsersPage` 的增删改按钮**未**用 `HasPermission code="...:manage"` 包裹。
- **影响**：持有"查看"但无"管理"权限的管理员在前端仍可触发写操作（真实权威在后端，但属纵深缺口）。
- **修复**：写操作控件统一 `<HasPermission code="platform:manage">…</HasPermission>`。

**FE-P2-2 · `/api/refresh-token` 的 401 前端未处理（注释与行为不符）**
- **位置**：`AuthContext.tsx:113-136`（自动刷新用裸 `fetch`，未过 `apiClient` → 其 401 不会触发 `onUnauthorized`）。
- **影响**：token 过期后 refresh 静默失败，用户状态仍为"已登录"直到下次经 `apiClient` 的接口 401 才跳登录；注释承诺的行为未发生。
- **修复**：refresh 失败时主动调 `handleUnauthorized`；校正注释。

### P3 — 低（9 项）

| # | 位置 | 问题 | 修复 |
|---|---|---|---|
| FE-P3-1 | `BannerCarousel.tsx:28`、`AnnouncementBar.tsx:20` | 卸载守卫用 `let mounted=true` 而非 `useRef` | 改 `useRef(true)` |
| FE-P3-2 | `AuthContext.tsx:52-69` | 登出后 `PermissionContext` 权限未同步清理 | 一并重置 |
| FE-P3-3 | `UnreadContext.tsx:67-71` | 未登录仍空转轮询（60s 调 `refreshUnreadCount` 直接 return） | 未登录 `stopPolling` |
| FE-P3-4 | `data/seoConfig.ts:15` | SEO canonical/OG URL 可能遗漏 `/app` 基路径 | 结合部署确认补 `/app` |
| FE-P3-5 | `src/pages/bab81023-e4c3-4c75-b090-31550079d116.tsx` | 旧版 3-tab AuthPage 死代码，无 import | 删除 |
| FE-P3-6 | `ProfilePage.tsx:94` | 日期无兜底，`Invalid Date` 可能显示 | 加 `try/catch` |
| FE-P3-7 | `AuthPage.tsx:582` vs `:291` | 密码占位"至少 6 位" vs 校验"至少 8 位" | 统一 |
| FE-P3-8 | `PageConfigsPage.tsx` | 深色表面 vs 同级后台浅色表面不一致 | 统一主题 |
| FE-P3-9 | `types/rbac.ts:9-27` | `PermissionCode` 缺失 `banner:read`/`banner:write`/`page:manage` | 补齐类型 |

---

# 第二部分：UI / 设计兼容性审查

> **核心矛盾（结论先行）**：新品牌视觉（极光暗色 `#030014` / `#2EA7FF` / `#9381FF` / `#13DDC4`、玻璃白低透卡、pill 渐变按钮、Inter + Noto Sans SC）**只落地在根落地页**；真正的产品交互层（`/app` SPA 与 `/admin` 后台）100% 停留于旧设计体系，且后台是**第三套相互冲突的浅色主题**。从落地页点进 `/app` 会经历明显视觉割裂。

## 2.1 区块兼容性一览

| 区块 | 是否匹配新设计 | 结论 |
|---|---|---|
| 根落地页 `index.html` | ✅ | 新设计唯一合规实现（仅文案 emoji 待清） |
| `public/landing.js` | ✅ 基本一致 | 同源同参（仅 emoji 待清） |
| `app/index.html`（SPA 壳） | ❌ | 未引 Google Fonts、未设 theme-color |
| React SPA 全部页面/组件 | ❌ | 全量旧 token（`game-dark`/`neon-*`/`slate-*`） |
| `/admin` 后台 | ❌ | 第三套浅色主题，与新旧暗色都不统一 |
| 构建配置（`_headers`/`_redirects`） | ⚠️ 冲突 | 根目录与 `public/` 两份不一致，字体 CSP 隐患 |

## 2.2 权威新设计 vs 当前 SPA 旧参数

| 维度 | 新设计（权威） | 旧设计（SPA 现状） | 差异 |
|---|---|---|---|
| 画布底 | `#030014` | `game-dark:#0e131c` | 大 |
| 极光主色 | `#2EA7FF`/`#9381FF`/`#13DDC4` | `#3b9eff`/`#a78bfa`/`#34d399` | 大 |
| 玻璃卡填充 | 白 SOLID 0.03–0.05 | `bg-game-card:#171e2b` 实色 | 大 |
| 玻璃卡描边 | 白 SOLID 0.08–0.12 | `border-game-border:#283044` | 大 |
| 按钮 | pill `radius:99px` + 青→紫渐变 | `rounded-lg/xl` + `from-neon-blue to-neon-purple` | 大 |
| 字体 | Inter Bold + Noto Sans SC | `system-ui` | 大 |
| 阴影 | 双阴影无模糊 | `backdrop-blur-xl` + 模糊投影 | 中 |
| 环境光晕 | 多色 aurora `blur(90px)` | 单色 `blur-3xl` 仅蓝/紫 | 中 |
| 圆角 | 16–20px | `rounded-2xl`(16)/`rounded-3xl`(24) 混用 | 中 |

## 2.3 逐文件 / 组件不兼容清单（位置 · 差异 · 原因 · 修复）

### 基础设施（最严重，全站根因）

| 编号 | 位置 | 当前实现 / 差异 | 修复 |
|---|---|---|---|
| **B1** | `tailwind.config.js:8-18,20-30,31-36` | 旧色板 + `fontFamily.sans=system-ui` | 新增极光 token（`bg/surface/aurora-cyan/purple/teal/glass`），`fontFamily.sans` 改 Inter+Noto |
| **B2** | `src/index.css:5-73` | body 旧底；`.glass-card` 模糊实色卡；`.gradient-text` 旧色 | body 改 `#030014`；重写 `.glass-card` 白低透+双阴影；`.gradient-text` 改极光 |
| **B3** | `app/index.html:1-69` | 未引 Google Fonts、未设 `theme-color` | `<head>` 增与落地页一致的字体 link + `theme-color` |
| **I1** | 根 `_headers` vs `public/_headers` | 两份 CSP 冲突（一放行字体一禁止） | 合并单源，放行 `fonts.googleapis.com`/`fonts.gstatic.com` |
| **I3** | `vite.config.ts:19-22` | 双 HTML 入口，`app/index.html` 未挂字体 | 见 B3 |

### 共享组件（22 个，全部旧设计）

| 编号 | 组件 | 关键位置 / 差异 | 修复 |
|---|---|---|---|
| C1 | `Header.tsx` | `bg-game-darker/80`、登录按钮 `rounded-xl` 非 pill、`from-neon-blue to-neon-purple` | 底改 `#030014`；按钮 `rounded-full` 极光渐变；文字 `text-white/70` |
| C2 | `Footer.tsx` | 旧底 + 旧渐变分隔线 | 改暗底 + 极光分隔线 |
| C3 | `GameCard.tsx` | `typeGradients` 用默认紫/青/橙、`{game.emoji}` 封面、实色卡 | emoji→Lucide；渐变收敛极光三色；套 `.glass-card` |
| C4 | `DesktopCard.tsx` | `<span>🎁</span>` emoji、`neon` 渐变 | 🎁→Lucide `Gift`；极光 |
| C5 | `DealCard.tsx` | 实色卡 + `neon-purple/15` | 套玻璃；强调 `#9381FF`/`#2EA7FF` |
| C6 | `PlatformCard.tsx` | `<span>🎁</span>`、`neon` | 🎁→`Gift`；极光 |
| C7 | `SearchBar.tsx` | 旧色 + 搜索按钮 `rounded-lg` 非 pill | 输入框玻璃；按钮 `rounded-full` 极光 |
| C8 | `FilterBar.tsx` | 旧色板 | 激活 pill 改极光；容器玻璃 |
| C9 | `AnnouncementBar.tsx` | `bg-neon-blue/*` 旧蓝 | 改 `#2EA7FF` 系 |
| C10 | `AnnouncementModal.tsx` | 旧卡 + 旧渐变按钮 | 弹窗玻璃；按钮 `rounded-full` 极光 |
| C11 | `BannerCarousel.tsx` | `<style>` 硬编码 `#3b9eff`（旧蓝，分页器激活点） | `#3b9eff`→`#2EA7FF`；`#fff`→`rgba(255,255,255,.9)` |
| C12 | `MessageBell.tsx` | 旧色 | 统一极光 |
| C13 | `GameModal.tsx` | `{game.emoji}` 封面 + 旧色 | emoji→Lucide；玻璃+极光 |
| C14 | `PlatformModal.tsx` | 旧卡 + 强调旧蓝/紫 | 玻璃；强调极光 |
| C15 | `BannerSkeleton.tsx:10` | 用 `slate-800`（与其他骨架 `game-elevated` 不一致） | 统一 `bg-white/[.04]` |
| C16 | `DealFilter.tsx` | 旧色 | 极光 + 玻璃 |
| C17 | `ErrorBoundary.tsx:62` | 按钮 `bg-neon-blue` | 改极光 `from-[#2EA7FF] to-[#13DDC4]` |
| C18 | `PageDisabledNotice.tsx` | 旧色 | 玻璃 + 极光 |
| C19 | `PlatformBar.tsx` | 旧色 | 极光 |
| C20 | `RelatedLinks.tsx` | 图标五颜六色 + 旧卡 | 收敛极光三色；玻璃化 |
| C21 | `StateView.tsx:40,64` | `slate-700/50` 骨架（不一致）+ 旧渐变按钮 | 统一骨架底；按钮极光 pill |
| C22 | `TipsSection.tsx` | amber 暖色 + 旧卡 | 卡片玻璃化（暖色点缀可留） |
| C23 | `SEO.tsx` | 仅 meta，无视觉 token | 无需改 |

### 公共页面（12 个，全部旧设计）

| 编号 | 页面 | 关键差异 | 修复 |
|---|---|---|---|
| D1 | `HomePage.tsx` | 容器 `max-w-6xl`(1152)、旧底、`rounded-xl` 非 pill CTA、仅双色光晕 | 容器 `max-w-[1200px]`；玻璃；CTA `rounded-full` 极光；光晕加 `#13DDC4` |
| D2 | `CloudGamesPage.tsx` | 旧底 + 旧渐变 + 非 pill 入口 | 同 D1 |
| D3 | `CloudDesktopsPage.tsx` | 旧色 | 极光+玻璃 |
| D4 | `DealsPage.tsx` | hero 用 `neon-green`（非 `#13DDC4`） | `neon-green/10`→`#13DDC4/10`；玻璃化 |
| D5 | `FreeGamesPage.tsx` | `⚠️` emoji + 封面 emoji + 非 pill 按钮 | ⚠️→`AlertTriangle`；emoji→图标；按钮 `rounded-full` |
| D6 | `LibraryPage.tsx` | 旧色 | 极光+玻璃 |
| D7 | `MessagesPage.tsx` | 旧色 + 激活 tab 旧渐变 | 极光+玻璃 |
| D8 | `ProfilePage.tsx` | 旧渐变 + 非 pill 按钮 | 按钮 `rounded-full` 极光 |
| D9 | `SearchPage.tsx` | 旧色；"加载更多"非 pill | 极光；按钮玻璃/pill |
| D10 | `SmsPlatformsPage.tsx` | 旧色 + 非 pill CTA | 极光；CTA `rounded-full` |
| D11 | `AnnouncementsListPage.tsx` | 旧色 | 极光+玻璃 |
| D12 | `NotFoundPage.tsx` | 旧底 + 旧渐变 + 非 pill | `bg-[#030014]`；按钮 `rounded-full` 极光 |

### 认证页

| 编号 | 页面 | 差异 | 修复 |
|---|---|---|---|
| E1 | `AuthPage.tsx` | 已有光晕（方向对）但全旧色板、按钮非 pill、字体 system | 光晕加 `#13DDC4`；所有主按钮 `rounded-full` 极光；底 `#030014` |
| E2 | `AdminLoginPage.tsx` | **独立 amber 暖色主题**（与极光暗色冲突）、按钮非 pill | 统一暗底 `#030014`+玻璃+pill；强调色收为 `#9381FF` 而非橙 |

### 管理后台（第三套浅色主题，最割裂）

| 编号 | 页面 | 差异 | 修复 |
|---|---|---|---|
| F1 | `admin/AdminLayout.tsx:17` | `bg-[#f5f6fa]` 浅灰亮底（全站唯一浅色大背景） | 改暗色 `#030014` 或统一玻璃外壳 |
| F2 | `admin/Sidebar.tsx` | `bg-[#1a1d2e]` + 硬编码旧蓝 `#3b9eff` | `#3b9eff`→`#2EA7FF`；侧栏底 `#07021c` |
| F3 | `admin/TopBar.tsx` | 纯白顶栏 + 灰字（典型浅色后台） | 暗色顶栏 + 白字 |
| F4 | `admin/DashboardPage.tsx` | 白卡 + Tailwind 默认蓝/紫/橙/粉/青 + 硬编码旧蓝 | 卡片玻璃+暗底；强调收敛极光三色；图表柱色替换 |
| F5 | `admin/SettingsPage.tsx` | 浅色表单 + 旧蓝 + **emoji `✕`** + 暗灰字 | 表单暗色玻璃化；`✕`→Lucide `X`；强调极光 |
| F6 | 其他 admin 页（Users/内容管理/Roles/Logs/Banners/Messages/PageConfigs/Forbidden） | 继承浅色外壳 + slate/默认色；`content/GamesPage` 含 emoji 占位 | 随 F1–F5 统一迁移暗色极光；清 emoji |

### 数据层 emoji（渲染为图标）

| 编号 | 文件 | 差异 | 修复 |
|---|---|---|---|
| G1 | `src/data/games.ts` | 多处 `emoji:"⚡"/"🔥"/"🎮"/"🎲"` 作封面 | 优先真图（`cover` 字段），无图回退 Lucide（按类型 `Gamepad2`/`Monitor`/`Gift`） |
| G2 | `src/data/freeGames.ts` | `🔥/⚡/🎲` 等同理 | 同上 |
| G3 | `src/data/smsPlatforms.ts` | 分类渐变用非极光色 | 收敛极光三色 |

### 死代码

| 编号 | 文件 | 说明 | 修复 |
|---|---|---|---|
| H1 | `src/pages/bab81023-e4c3-4c75-b090-31550079d116.tsx` | `AuthPage` 重复副本，未被 `App.tsx` 引用 | 确认无 import 后删除 |

## 2.4 UI 修复路线图（优先级）

| 优先级 | 任务 | 影响面 |
|---|---|---|
| **P0（根因）** | B3 给 `app/index.html` 加字体 + `theme-color`；I1 合并 `_headers` 放行字体；B1+B2 新增极光 token 并重写 `.glass-card`/`.gradient-text`/body | 全站设计语言根因 |
| **P1** | C/D/E 全组件页面：旧 `neon-*`/`game-*` → 极光 token；卡片套玻璃；主按钮 `rounded-full` 极光渐变 | 公共端视觉统一 |
| **P1** | F1–F6：后台从浅色迁移暗色极光；硬编码 `#3b9eff`/`#2b8ae6`→`#2EA7FF`；白卡→玻璃 | 消除第三套主题割裂 |
| **P2** | 清除所有 emoji（G1–G3、C3/C4/C5/C13/D5、F5 `✕`、A1/A2 文案） | 满足"禁止 emoji 作图标" |
| **P2** | 响应式对齐：容器 `max-w-6xl`→`max-w-[1200px]`；补 760px 档 | 对齐权威 1440/1024/760 |
| **P2** | H1：删除 `bab81023-*.tsx` 死代码 | 消除维护歧义 |

---

# 第三部分：后台内容管理覆盖度（主页可展示内容可配性）

> **核心结论：根路径落地页 `/` 整体 0% 可配；`/app` 内容页约 40%；综合"主页可展示内容"后台覆盖度 ≈ 30%，缺口 14 项（含 3 个 P0 架构级缺陷）。** 这与"前端内容与后台管理完全联动"的目标直接冲突。

## 3.1 架构事实（审查基础）

项目存在**两套前端**（经 `vite.config.ts` 双入口、`functions/app/[[path]].ts`、`_redirects`、`App.tsx` 确认）：

| 前端 | 路由 | 数据来源 |
|---|---|---|
| A. 根路径落地页 `/` | 静态 `index.html` + `public/landing.js` | **全部硬编码** |
| B. SPA 应用 `/app/*` | React（`app/index.html` → `src/main.tsx`） | D1 API + `src/data/*.ts` 静态回退 + 硬编码 JSX |

三级数据来源（可控度递增）：硬编码（HTML/JSX）＜ 静态 TS 文件（编译期固定）＜ D1 数据库（后台可配）。

三处致命机制：
- `queryWithFallback` **只有 `platforms/desktops/deals/games` 四接口用了它**；`page-configs/banners/announcements` 直接查 D1 无回退。
- `requireAuth` → 匿名返回 null **401**；而 `platforms/desktops/deals/games` 四个读接口**都调用了 `requireAuth`** → 未登录访客必然 401 → 前端走静态回退（覆盖度致命阻断）。
- `getConfig(page_key)`：`page_key` DB 用**连字符**，但 4 个 SPA 页面用**下划线**查找 → 永远 `null`。

## 3.2 主页展示内容 × 后台可配性 总映射表

### 根路径落地页 `/`（整体 0%）

| 区块 | 内容 | 配置方式 | 缺口 |
|---|---|---|---|
| Header | 品牌、导航、搜索占位、注册按钮 | ❌ 硬编码 | 无后台 |
| Hero | 标题"一个入口，玩转所有云端世界"、副标题、双 CTA、8 个 mock 瓦片 | ❌ 硬编码 | 无后台 |
| 三大模块 | 云游戏/云电脑/薅羊毛卡片 | ❌ 硬编码 | 无后台 |
| 云游戏区 | 区块标题、筛选 chip、12 游戏名、"加载更多"(假) | ❌ 硬编码 | 与 /app 数据无关 |
| 云电脑区 | 4 卖点、**3 档套餐价格(¥9.9/¥29.9/¥59.9)** | ❌ 硬编码 | 价格/套餐不可配 |
| 羊毛区 | 6 条优惠+金额 | ❌ 硬编码 | 与 /app/deals 无关 |
| 免费资源区 | 3 张卡片 | ❌ 硬编码 | 与 /app/free-games 无关 |
| 社会证明 | "50万+/1000万+/99.9%/4.9"、2 条好评 | ❌ 硬编码+失真 | 不可配 |
| 最终 CTA | 标题、副标题、**邮箱订阅表单（假提交）** | ❌ 硬编码 | 订阅未接后端 |
| Footer | 品牌、链接、版权、ICP | ❌ 硬编码（`settings` 表未消费） | 与 settings 脱节 |
| Banner/公告/站内信 | —— | ❌ 未集成 | 落地页不渲染后端 Banner/公告 |

### `/app` 内容展示页

| 模块 | 内容 | 配置方式 | 缺口 |
|---|---|---|---|
| SPA 首页 Hero `/app/` | 标题、副标题、特性卡片 | ❌ 硬编码 JSX | Hero 不可配 |
| 云游戏列表 | 平台列表 + Hero | ⚠️ 列表 D1 可管但**需登录才生效**；Hero 键错失效 | ①匿名走静态 ②Hero bug |
| 云端办公 | 云电脑列表 + Hero | ⚠️ 同上 | ①匿名走静态 ②键错 |
| 羊毛聚合 | 羊毛列表 + Hero | ⚠️ 列表需登录；Hero `getConfig("deals")` **正确✅** | 仅匿名走静态 |
| 游戏库 | 游戏列表 + Hero | ⚠️ 列表需登录；Hero `getConfig("library")` **正确✅**；但 `games` 表**空** | ①匿名走静态 ②DB 未种子 |
| 免费资源 | 26 款 | ❌ 静态 `freeGames.ts` | 无表/接口/后台 |
| 接码平台 | 24 个 | ❌ 静态 `smsPlatforms.ts` | 无表/接口/后台 |
| Banner 轮播 | 轮播图 | ✅ 后台可配（仅 /app） | 落地页无 |
| 公告 | 公告栏/弹窗 | ✅ 后台可配（仅 /app） | 落地页无；初始空 |
| 站内信 | 收件箱 | ✅ 后台可配 | 仅登录用户 |
| SEO/Meta | 各页 title/desc/keywords/OG | ❌ 静态 `seoConfig.ts` | 后台完全不可改 |
| page_configs 导航/开关 | 导航显隐、排序 | ⚠️ Header 导航✅；4 页 `is_enabled`/文案❌（键错） | 4/6 页失效 |
| Footer(/app) | 品牌/链接/版权 | ❌ 硬编码（settings 孤儿） | settings 未消费 |
| 邮箱订阅(/app) | —— | ❌ 无 | 订阅能力缺失 |

## 3.3 重大架构缺陷（P0，必须优先修复）

**ADM-P0-1 · 根落地页 100% 硬编码，脱离后台**
网站真正的"主页"`/` 所有内容不可后台管理，且不渲染后台 Banner/公告。
- **方案 A（推荐）**：以 `/app` SPA 首页为唯一主页，根 `/` 重定向/重写到 SPA，复用已有 Banner/公告/内容接口。
- **方案 B（保守）**：保留静态落地页，在 `landing.js` 增 `fetch('/api/banners')`/`/api/announcements`/`/api/page-configs`/`/api/settings/public` 动态渲染，并为落地页区块新建 `site_content` 表。

**ADM-P0-2 · 公共内容读接口需登录，匿名看不到后台改动**
`/api/platforms`、`/api/desktops`、`/api/deals`、`/api/games` 均 `requireAuth`。对 SEO 聚合站，未登录访客才是主体，他们始终走 `src/data/*.ts` 静态回退——**后台对核心业务内容的增删改对公众不可见**。
- **修复**：移除这四读接口的 `requireAuth`（内容本就公开）；保留写接口鉴权。确保 D1 已迁移+种子，否则仍显示静态。

**ADM-P0-3 · `getConfig` 键不匹配，4/6 页 Hero 与开关失效**（与 FE-P1-1 同源）
DB `page_key` 为连字符（`cloud-games`），代码中 `CloudGamesPage/CloudDesktopsPage/FreeGamesPage/SmsPlatformsPage` 用下划线查找 → 永远 null → Hero 文案恒为硬编码默认、`is_enabled` 禁用开关无效。仅 `deals`/`library` 正确。
- **修复**：统一为连字符（4 处：`CloudGamesPage.tsx:36`、`CloudDesktopsPage.tsx:34`、`FreeGamesPage.tsx:19`、`SmsPlatformsPage.tsx:38`）；并修 `is_enabled === 0` → `!is_enabled`（见 FE-P1-1）。

## 3.4 缺口清单（P1×7 / P2×4）

| 编号 | 优先级 | 缺口 | 补全方案 |
|---|---|---|---|
| P1-1 | P1 | 免费资源无表/接口/后台（纯静态） | 新建 `free_games` 表 + `/api/free-games`(公开) + `/api/admin/free-games`(CRUD) + 后台页 + `FreeGamesPage` 改读 API |
| P1-2 | P1 | 接码平台无表/接口/后台 | 同上模式，`sms_platforms` 表对齐 `SmsPlatform.ts` 字段 |
| P1-3 | P1 | SEO 文案无后台 | `page_configs` 增 `seo_title/seo_description/seo_keywords`（或新 `seo_configs`）；`SEO` 组件改 API 取数，去 `seoConfig.ts` 硬依赖 |
| P1-4 | P1 | `games` 表空（seed.sql 未插） | 补种子数据，使游戏库 D1 驱动 |
| P1-5 | P1 | `settings` 表前端未消费（孤儿） | 新增 `/api/settings/public` 仅返 site_name/logo_url/icp/contact_*；Header/Footer 消费；统一站名"云玩汇" |
| P1-6 | P1 | 落地页不渲染 Banner/公告 | 若保留静态页，在 `landing.js` 注入 `/api/banners`、`/api/announcements`（绑定 ADM-P0-1 方案 B） |
| P1-7 | P1 | 社会证明数据硬编码失真 | 纳入 `settings` 或 `site_stats` 表，后台可改 |
| P2-1 | P2 | 邮箱订阅能力缺失（假提交） | `subscriptions` 表 + `/api/subscribe`（含限流）+ 后台列表 + 接线两处 CTA |
| P2-2 | P2 | `queryWithFallback` 掩盖后台改动未生效 | 后台增"数据源状态"指示/监控告警 |
| P2-3 | P2 | 内容模型未统一 | 抽象通用"内容集"管理，减重复 CRUD |
| P2-4 | P2 | 无全站可配性回归测试 | 断言"后台改 X → 前端(匿名+登录)展示 X" |

## 3.5 后台覆盖度评分

| 范围 | 覆盖度 |
|---|---|
| 根路径落地页（真正主页） | **0%**（0/11 区块可配） |
| `/app` 内容页 | 完全可配 3（Banner/公告/站内信）、部分可配 4（云游戏/云电脑/羊毛/游戏库，均受"需登录"+键 bug 削弱）、不可配 2（免费资源/接码平台）+ 首页 Hero/SEO/Footer 不可配 |
| **综合** | **≈ 30%**（修 P0-1/2/3 后可达 90%+） |

---

# 第四部分：统一整改路线图（合并所有 P0/P1，按依赖排序）

> 建议分三阶段推进。阶段一为「上线/目标阻塞」，必须先行；阶段二为「高优先功能闭环」；阶段三为「持续改进」。

## 阶段一 · P0 阻断项（必做）

1. **ADM-P0-3 + FE-P1-1（同源，一并修）**：统一 `page_key` 连字符；`is_enabled === 0` → `!is_enabled`；4 处公开页 + `usePageConfigs` 默认值对齐。→ *低成本高收益，建议立即做。*
2. **ADM-P0-2**：移除 `platforms/desktops/deals/games` 四读接口 `requireAuth`；确认 D1 已迁移+种子。→ *低成本，直接打通"后台改动对公众可见"。*
3. **ADM-P0-1**：确定落地页方案 A（SPA 为首页，根重定向）或方案 B（落地页 API 化）。→ *需产品决策，建议方案 A 一劳永逸。*
4. **SEC-P1-1 / SEC-P1-2 / SEC-P1-3**：SMS 验证码加失败锁定+恒定时间；修复发码 IP 限流/加 CAPTCHA；禁止非超级管理员赋 `super_admin`。→ *安全上线门槛。*
5. **UI-B1/B2/B3/I1**：设计 Token 根层迁移（极光色板+Inter/Noto）、`app/index.html` 加字体、合并 `_headers` 放行字体。→ *视觉割裂根因。*

## 阶段二 · P1 高优先

6. **P1-1 / P1-2**：免费资源、接码平台后台化（表+接口+UI+前端改造）。
7. **P1-3**：SEO 后台化（`page_configs` 扩字段或新表，`SEO` 组件 API 取数）。
8. **P1-4**：种子 `games` 表。
9. **P1-5 / P1-6 / P1-7**：`settings` 接线前端、落地页渲染 Banner/公告、社会证明数据可配。
10. **UI-C/D/E/F 全组件页面**：旧 token → 极光；卡片玻璃化；主按钮 `rounded-full` 极光渐变；后台浅色→暗色极光。
11. **FE-P2-1**：后台写操作前端 `HasPermission ...:manage` 收紧。
12. **SEC-P2-1~7**：`isAdmin` 单真相源、遗留 `admin/*` 端点治理、KV 故障 fail-closed、刷新吊销、API 安全头、Cookie 统一、限流只信 `CF-Connecting-IP`。

## 阶段三 · P2/P3 持续改进

13. **P2-1~4**：邮箱订阅能力、fallback 治理、内容模型统一、可配性回归测试。
14. **FE-P2-2 / FE-P3-1~9 / SEC-P3-1~11 / UI-P2(emoji/响应式/死代码)**：逐项清理技术债与最佳实践缺口。

---

## 附录：子报告索引与文件清单

| 子报告 | 路径 | 负责角色 |
|---|---|---|
| 后端安全审计 | `docs/security-audit-backend.md` | 架构师 |
| 前端代码缺陷审查 | `docs/frontend-audit.md` | QA |
| UI/设计兼容性审查 | `docs/ui-compat-audit.md` | 设计总监 |
| 后台内容覆盖度审查 | `docs/admin-coverage-audit.md` | 后端 |
| **本统一报告** | `docs/unified-audit-report.md` | 交付总监汇编 |

**关键交叉项提示**：
- FE-P1-1 与 ADM-P0-3 是同一根因（键不匹配 + 类型比较错误）的两种表现，整改时务必一起修，避免重复劳动。
- ADM-P0-1（落地页 0% 可配）与 UI 审计（落地页是唯一新设计合规页）形成张力：新设计装修的是"管不到的主页"，而"管得到的页面"还是旧设计。建议借 ADM-P0-1 方案 A（统一 SPA 为首页）一次性同时解决"可配性"与"视觉统一"两个问题。
- SEC-P2-5（API 响应缺安全头）与 UI-I1（CSP 字体冲突）都涉及 `_headers`/`_middleware` 响应头配置，可合并处理。
