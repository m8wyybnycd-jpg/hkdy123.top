# cloudgame-hub 全站审计报告

> **审计日期**：2026-07-10
> **审计范围**：前端 66 个 .tsx + 21 个 .ts 文件 / 后端 60+ 个 Functions 文件 / 配置文件
> **审计人**：郝交付（交付总监）+ 专家团 4 路并行审查
> **当前版本**：V14.0（含 37/39 项历史修复）

---

## 一、审计总览

| 严重程度 | 数量 | 占比 |
|---------|------|------|
| **P0 — 严重（必须立即修复）** | 5 | 7% |
| **P1 — 高优先级（短期修复）** | 9 | 12% |
| **P2 — 中等优先级（中期修复）** | 11 | 15% |
| **P3 — 低优先级（长期优化）** | 24 | 32% |
| **备注** | 25 项合并/重叠（已去重） | 34% |
| **总计（独立问题）** | **49** | 100% |

> 注：初始 4 路并行审查共发现 75 项，经交叉去重和合并同类项后，独立问题为 49 项。

---

## 二、P0 — 严重问题（必须立即修复）

### P0-1. AuthPage 密码输入框 placeholder 与实际验证不一致
- **文件**：`src/pages/AuthPage.tsx` 第 529 行
- **类型**：UX 缺陷 / 数据一致性
- **描述**：密码输入框 placeholder 显示"至少 6 位密码"，但前端验证（第 254 行）和后端验证（`functions/api/register.ts` 第 109 行）都要求**至少 8 位**。用户看到"6位"提示输入 6-7 位密码后会被拒绝，造成困惑。
- **修复方案**：将 placeholder 从"至少 6 位密码"改为"至少 8 位密码"。
```diff
- placeholder="至少 6 位密码"
+ placeholder="至少 8 位密码"
```

### P0-2. CORS 缺少 PATCH 方法，导致 Banner 排序/切换功能失效
- **文件**：`functions/_middleware.ts` 第 72 行、第 108 行
- **类型**：功能性 Bug — CORS 配置不完整
- **描述**：`Access-Control-Allow-Methods` 设置为 `"GET, POST, PUT, DELETE, OPTIONS"`，但项目中 `banners/sort.ts` 和 `banners/[id]/toggle.ts` 使用 `onRequestPatch`（PATCH 方法）。浏览器在发送 PATCH 请求前会进行 CORS 预检，发现 PATCH 不在允许列表中，导致**请求被阻止**。管理员无法排序 Banner 或切换 Banner 状态。
- **修复方案**：在两处 `Access-Control-Allow-Methods` 中添加 `PATCH`：
```diff
- "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
+ "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
```

### P0-3. sms-login.ts 完全缺少速率限制（验证码暴力破解）
- **文件**：`functions/api/sms-login.ts` 整个 `onRequestPost` 函数
- **类型**：安全漏洞 — 认证绕过
- **描述**：`login.ts` 有 IP 级速率限制（10分钟内5次失败则阻止），但 `sms-login.ts` **完全没有速率限制**。攻击者可以无限次尝试不同的验证码，对用户手机号进行暴力破解。6位数字验证码有100万种组合，如果不限制尝试次数，理论上可穷举。
- **修复方案**：(1) 添加与 `login.ts` 类似的 IP 级速率限制；(2) 在 `verification_codes` 表添加 `attempts` 字段，每次失败递增，超过5次自动标记为已使用。

### P0-4. 验证码验证失败后不删除或失效，可无限重试
- **文件**：`functions/api/register.ts` 第 138-141 行、`functions/api/sms-login.ts` 第 126-129 行
- **类型**：安全漏洞 — 验证码暴力破解
- **描述**：验证码不匹配时仅返回错误消息，验证码记录保持 `used = 0`。攻击者可以在验证码有效期内（5分钟）持续尝试不同验证码值，直到猜中或过期。验证码只有在**验证成功**后才标记 `used = 1`。
- **修复方案**：在 `verification_codes` 表添加 `failed_attempts` 计数器，每次失败递增，超过5次自动标记为已使用。

### P0-5. AuthContext 中 login/register/smsLogin 未使用 apiClient，绕过 401 自动登出
- **文件**：`src/contexts/AuthContext.tsx` 第 139-202 行
- **类型**：架构缺陷 / 潜在 Bug
- **描述**：`login`、`register`、`smsLogin` 方法直接使用 `fetch()` 而非 `apiClient.request()`，这意味着：(1) 不会触发 `apiClient.onUnauthorized` 回调；(2) 不会设置 `Content-Type` 以外的 headers；(3) 虽然 `credentials: "include"` 已设置，但与 API 客户端的统一错误处理不一致。如果后端返回 401，这些方法会直接抛出 Error，但不会触发自动登出和重定向。
- **修复方案**：将这三个方法改为使用 `apiClient` 的统一请求方法，或在 catch 中手动检查 401 状态码并触发 `handleUnauthorized`。

---

## 三、P1 — 高优先级问题（短期修复）

### P1-1. 中间件未设置安全响应头
- **文件**：`functions/_middleware.ts` 第 96-114 行
- **类型**：安全头缺失
- **描述**：中间件只设置 CORS 头，缺少 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy` 等关键安全头。虽然 Cloudflare Pages 会自动添加部分头，但 HSTS 和 X-Frame-Options 通常需要显式设置。
- **修复方案**：
```typescript
corsResponse.headers.set("X-Content-Type-Options", "nosniff");
corsResponse.headers.set("X-Frame-Options", "DENY");
corsResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

### P1-2. login.ts email 查询未做 LOWER 处理
- **文件**：`functions/api/login.ts` 第 77-81 行
- **类型**：数据一致性 / 认证缺陷
- **描述**：SQL 查询为 `WHERE email = ? OR LOWER(username) = ?`，绑定参数 `accountLower`。`LOWER(username)` 做了处理但 `email = ?` 没有包 `LOWER()`。如果 D1 中存在大写邮箱（通过直接数据库操作插入），则 email 匹配会失败。
- **修复方案**：改为 `WHERE LOWER(email) = ? OR LOWER(username) = ?`

### P1-3. 权限常量与类型定义不一致
- **文件**：`src/constants/permissions.ts` 第 9-31 行 vs `src/types/rbac.ts` 第 9-27 行
- **类型**：类型定义不匹配
- **描述**：`permissions.ts` 的 `ALL_PERMISSION_CODES` 包含 21 个权限码（含 `banner:read`、`banner:write`、`page:manage`），但 `rbac.ts` 的 `PermissionCode` 类型仅定义了 18 个，缺少这三个。TypeScript 编译时可能报类型错误。
- **修复方案**：在 `rbac.ts` 的 `PermissionCode` 类型中补充 `| "banner:read" | "banner:write" | "page:manage"`。

### P1-4. 多个 catch 块静默吞异常，丢失错误信息
- **文件**：`functions/lib/permission.ts` 第 38-40、68-70 行 / `functions/lib/db.ts` 第 38-40、66-68、88-90 行 / `functions/_middleware.ts` 第 90-93 行
- **类型**：错误处理不当
- **描述**：大量 catch 块完全吞掉异常（`catch { }`），不打印任何错误信息。权限查询失败时默认返回空数组，意味着用户会丢失所有权限，但管理员无法知道原因。
- **修复方案**：在所有 catch 块中添加 `console.error` 记录错误信息。

### P1-5. Cookie 缺少 `__Host-` 前缀
- **文件**：`functions/api/login.ts` 第 147 行 / `register.ts` 第 224 行 / `sms-login.ts` 第 216 行
- **类型**：Cookie 安全增强
- **描述**：Cookie 设置为 `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`，虽已包含基本安全属性，但缺少 `__Host-` 前缀。
- **修复方案**：将 Cookie 名称从 `auth_token` 改为 `__Host-auth_token`，并更新 `_middleware.ts` 中的提取逻辑。

### P1-6. login.ts 速率限制 fail-open 策略
- **文件**：`functions/api/login.ts` 第 15-31 行
- **类型**：安全 — 速率限制绕过
- **描述**：`isRateLimited` 在数据库查询失败时返回 `false`（fail-open），即"不阻止登录"。如果攻击者通过请求洪水导致 D1 超时，可绕过速率限制。
- **修复方案**：考虑 fail-closed 策略，或至少添加告警日志。

### P1-7. Header 移动端菜单缺少 Escape 键关闭和焦点陷阱
- **文件**：`src/components/Header.tsx` 第 167-273 行
- **类型**：无障碍 (a11y) 缺陷
- **描述**：移动端展开菜单没有 Escape 键关闭处理，也没有焦点陷阱（focus trap）。打开菜单后按 Tab 会聚焦到菜单外的元素，键盘用户无法正常操作。此外，菜单打开时不应阻塞背景内容滚动。
- **修复方案**：(1) 添加 `useEffect` 监听 `Escape` 键关闭菜单；(2) 使用 `FocusTrap` 组件或在菜单内管理 tab 焦点；(3) 菜单打开时给 `body` 添加 `overflow: hidden`。

### P1-8. PublicLayout 缺少"跳转到主要内容"链接
- **文件**：`src/App.tsx` 第 66-83 行
- **类型**：无障碍 (a11y) 缺陷
- **描述**：`ProtectedLayout` 有 skip-link `跳转到主要内容`（第 96-100 行），但 `PublicLayout` 没有。公开页面的键盘用户需要跳过 Header 导航才能到达内容区。
- **修复方案**：在 `PublicLayout` 中添加与 `ProtectedLayout` 相同的 skip-link。

### P1-9. send-sms.ts 中 SMSBAO 凭证通过 URL 查询参数传递
- **文件**：`functions/api/send-sms.ts` 第 60 行
- **类型**：凭证泄露风险
- **描述**：SMSBAO API 的用户名和密钥通过 GET 请求的 URL 查询参数传递，可能通过 Workers fetch 日志、中间代理日志等途径泄露。
- **修复方案**：迁移到支持 POST + Header 认证的 SMS 服务商，或使用 Workers fetch 重写将凭证移到请求头。

---

## 四、P2 — 中等优先级问题（中期修复）

### P2-1. `let mounted = true` 组件级声明反模式（8 处）
- **文件**：`src/components/BannerCarousel.tsx` 第 26 行 / `src/components/AnnouncementBar.tsx` 第 20 行 / `src/pages/CloudGamesPage.tsx` 第 39 行 / `src/pages/CloudDesktopsPage.tsx` 第 37 行 / `src/pages/DealsPage.tsx` 第 40 行 / `src/pages/MessagesPage.tsx` 第 38 行 / `src/pages/AnnouncementsListPage.tsx` 第 56 行 / `src/contexts/AuthContext.tsx` 第 82 行
- **类型**：React 反模式 / 潜在内存泄漏
- **描述**：`mounted` 变量在组件函数体中用 `let` 声明（非 `useRef`），用于 `useEffect` 内的异步操作取消。在 React 严格模式或并发特性下，每次渲染都会重新声明 `mounted = true`，cleanup 函数引用的 `mounted` 可能不准确。其中 `BannerCarousel` 和 `AnnouncementBar` 的 `let mounted = true` 在组件级声明，问题最严重；其余 6 处在 `useEffect` 内部声明（`let mounted = true` 在 useEffect 第一行），虽可用但非惯用写法。
- **修复方案**：
  - 组件级的 2 处（BannerCarousel、AnnouncementBar）：删除组件级声明，`useEffect` 内已有 `mounted = true`。
  - useEffect 内的 6 处：可改为 `useRef` 或保持现状（在 useEffect 内声明是安全的，只是不够 idiom）。

### P2-2. 验证码比较使用非常量时间比较
- **文件**：`functions/api/register.ts` 第 139 行 / `sms-login.ts` 第 127 行
- **类型**：时序攻击风险（低概率）
- **描述**：验证码比较使用 `storedCode !== code`（字符串直接比较），而非常量时间比较。密码哈希验证已用常量时间比较，但验证码没有。
- **修复方案**：使用常量时间比较函数。

### P2-3. 验证码过期检查使用字符串比较
- **文件**：`register.ts` 第 132-134 行 / `sms-login.ts` 第 120-122 行
- **类型**：潜在 Bug
- **描述**：`expiresAt <= now` 是 ISO 8601 字符串比较，虽在 UTC 格式下与时间顺序一致，但如果 D1 存储了非 UTC 格式的时间，会出错。
- **修复方案**：使用 `Date.parse()` 转时间戳进行数值比较。

### P2-4. send-code / send-sms 速率限制仅按邮箱/手机号，不按 IP
- **文件**：`functions/api/send-code.ts` 第 130-142 行 / `send-sms.ts` 第 129-142 行
- **类型**：速率限制不足
- **描述**：仅按邮箱/手机号限制（60秒一次），不按 IP 限制。攻击者可用大量不同邮箱/手机号从同一 IP 发送验证码，导致 Brevo API 配额耗尽或 smsbao 余额耗尽。
- **修复方案**：添加 IP 级速率限制（如每 IP 每小时最多10次）。

### P2-5. sms-login.ts 自动注册用户无密码保护
- **文件**：`functions/api/sms-login.ts` 第 155-180 行
- **类型**：认证缺陷
- **描述**：短信登录自动注册新用户时，`password_hash` 和 `salt` 设为空字符串。如果增加邮箱+密码登录路径，这些空密码账户面临风险。
- **修复方案**：为自动注册用户设置随机高强度密码，或添加 `has_password` 标志位。

### P2-6. banners/sort.ts 批量排序未使用事务
- **文件**：`functions/api/admin/banners/sort.ts` 第 48-54 行
- **类型**：数据一致性
- **描述**：批量排序使用循环逐条更新，如果中途失败，前面的更新不会回滚。D1 支持 `db.batch()` 事务操作。
- **修复方案**：使用 `db.batch(statements)` 确保原子性。

### P2-7. register.ts 密码强度验证不足
- **文件**：`functions/api/register.ts` 第 109-111 行
- **类型**：输入验证不足
- **描述**：密码仅验证最小长度 8 位，没有复杂度要求。用户可使用 `aaaaaaaa` 或 `12345678` 等弱密码。
- **修复方案**：添加密码复杂度验证（至少包含字母和数字）。

### P2-8. PageConfig 类型使用 snake_case
- **文件**：`src/types/pageConfig.ts` 第 9-30 行
- **类型**：代码风格不一致
- **描述**：`PageConfig` 使用 snake_case（`page_key`、`is_enabled`），而项目中其他类型都用 camelCase。`page-configs` API 也没有做 snake_case → camelCase 映射。
- **修复方案**：在 `mapPageConfigRow` 中做映射，统一使用 camelCase。

### P2-9. 前端 API 客户端缺少请求超时
- **文件**：`src/services/api.ts`
- **类型**：可靠性
- **描述**：`fetch` 调用没有设置 `AbortController` 超时，如果后端响应慢，前端会无限等待。
- **修复方案**：添加 `AbortController` 设置 30 秒超时。

### P2-10. SearchPage 初始搜索的 performSearch 依赖问题
- **文件**：`src/pages/SearchPage.tsx` 第 86-91 行
- **类型**：潜在 Bug — React Hooks 依赖
- **描述**：`useEffect` 中调用 `performSearch(initialQuery)`，但 `performSearch` 不是 `useCallback` 包装的，且 `eslint-disable-next-line` 抑制了依赖警告。如果 `performSearch` 引用了状态变量，可能导致使用过期闭包。
- **修复方案**：将 `performSearch` 用 `useCallback` 包装，或直接在 `useEffect` 内实现搜索逻辑。

### P2-11. DashboardPage 使用硬编码颜色值而非 Tailwind 主题 token
- **文件**：`src/pages/admin/DashboardPage.tsx` 第 69、79-86 行
- **类型**：主题不一致 / 可维护性
- **描述**：管理后台 Dashboard 页面大量使用硬编码颜色值（`#3b9eff`、`bg-white`、`text-slate-800`、`border-slate-200` 等），而非前台页面使用的 Tailwind 自定义 token（`bg-game-card`、`text-neon-blue` 等）。这导致管理后台与前台视觉风格不统一。
- **修复方案**：统一管理后台使用主题 token，或明确管理后台使用独立浅色主题。

---

## 五、P3 — 低优先级问题（长期优化）

### P3-1. AuthContext 中重复定义 ApiResponse 接口
- **文件**：`src/contexts/AuthContext.tsx` 第 15-19 行
- **类型**：代码重复
- **描述**：`ApiResponse` 接口在 AuthContext 中重新定义，而非从 `types/` 导入。项目中可能有多处重复定义。
- **修复方案**：统一从 `types/` 导入。

### P3-2. AuthPage 中的 ApiResponse 接口也重复定义
- **文件**：`src/pages/AuthPage.tsx` 第 16-21 行
- **类型**：代码重复
- **描述**：同 P3-1。
- **修复方案**：统一从 `types/` 导入。

### P3-3. MessagesPage 标题使用 emoji
- **文件**：`src/pages/MessagesPage.tsx` 第 114 行
- **类型**：UI 一致性
- **描述**：标题使用 📬 emoji，而项目中其他页面标题不使用 emoji。在不同操作系统上 emoji 渲染不一致。
- **修复方案**：替换为 Lucide 图标组件。

### P3-4. AnnouncementsListPage 标题使用 emoji
- **文件**：`src/pages/AnnouncementsListPage.tsx` 第 102 行
- **类型**：UI 一致性
- **描述**：标题使用 📢 emoji。
- **修复方案**：替换为 Lucide 图标组件。

### P3-5. ErrorBoundary fallback 使用 emoji
- **文件**：`src/components/ErrorBoundary.tsx` 第 52 行
- **类型**：UI 一致性
- **描述**：错误页面使用 😵 emoji。
- **修复方案**：替换为 SVG 图标。

### P3-6. JWT 中 permissions 字段冗余
- **文件**：`functions/lib/auth.ts` 第 156-163 行
- **类型**：设计权衡
- **描述**：JWT 包含 `permissions` 数组，但 `requirePermission()` 每次从 D1 实时查询，不信任 JWT。JWT 中的 permissions 变得冗余。如果前端基于 JWT 做 UI 控制，权限变更后前端不会立即更新。
- **修复方案**：考虑从 JWT 移除 permissions 字段，或在前端定期刷新。

### P3-7. 重复的 escapeCsvField 函数
- **文件**：`functions/api/admin/logs/login.ts` 第 157-162 行 / `operation.ts` 第 153-158 行
- **类型**：代码重复
- **描述**：两个日志导出端点各自定义了完全相同的 `escapeCsvField` 函数。
- **修复方案**：提取到 `functions/lib/csv.ts` 共享模块。

### P3-8. NotFoundPage 缺少 SEO 元标签
- **文件**：`src/pages/NotFoundPage.tsx`
- **类型**：SEO
- **描述**：404 页面没有使用 `SEO` 组件设置 `<title>` 和 `meta name="robots" content="noindex">`。搜索引擎可能索引 404 页面。
- **修复方案**：添加 `<SEO>` 或直接设置 `<meta name="robots" content="noindex" />`。

### P3-9. AuthPage 缺少 SEO 元标签
- **文件**：`src/pages/AuthPage.tsx`
- **类型**：SEO
- **描述**：登录/注册页面没有设置 `<title>` 和 `<meta name="robots" content="noindex">`。搜索引擎不应索引登录页面。
- **修复方案**：添加 `noindex` meta 标签。

### P3-10. SearchPage 缺少 SEO 组件
- **文件**：`src/pages/SearchPage.tsx`
- **类型**：SEO
- **描述**：搜索结果页面没有使用 `SEO` 组件，缺少动态 title 和 meta description。
- **修复方案**：添加 `SEO` 组件，根据搜索关键词动态设置 title。

### P3-11. ProfilePage 缺少 SEO 组件
- **文件**：`src/pages/ProfilePage.tsx`
- **类型**：SEO
- **描述**：个人中心页面缺少 `noindex` meta 标签。
- **修复方案**：添加 `<meta name="robots" content="noindex" />`。

### P3-12. MessagesPage 缺少 SEO 组件
- **文件**：`src/pages/MessagesPage.tsx`
- **类型**：SEO
- **描述**：消息页面缺少 `noindex` meta 标签。
- **修复方案**：添加 `<meta name="robots" content="noindex" />`。

### P3-13. FreeGamesPage 动画延迟可能导致首屏渲染跳动
- **文件**：`src/pages/FreeGamesPage.tsx` 第 173 行
- **类型**：UX / 性能
- **描述**：每张卡片有 `animationDelay: ${index * 30}ms`，当有 26 张卡片时，最后一张延迟 780ms 才开始动画。用户需要等待才能看到全部内容。
- **修复方案**：限制最大延迟（如 `Math.min(index * 30, 300)ms`）或使用 `IntersectionObserver` 只在可见时动画。

### P3-14. SmsPlatformsPage 动画延迟同上
- **文件**：`src/pages/SmsPlatformsPage.tsx` 第 271 行
- **类型**：UX / 性能
- **描述**：与 P3-13 相同的问题，24 个平台最后一张延迟 690ms。
- **修复方案**：同 P3-13。

### P3-15. ProfilePage 角色 chip 颜色逻辑与后端不匹配
- **文件**：`src/pages/ProfilePage.tsx` 第 37-42 行
- **类型**：UI 逻辑
- **描述**：`roleColor` 函数判断 `role === "admin"` / `"editor"` / `"viewer"`，但后端角色系统使用 `super_admin`、`editor` 等 code。`admin` 不匹配 `super_admin`，管理员用户可能看不到正确的角色颜色。
- **修复方案**：更新 `roleColor` 匹配实际角色 code 值。

### P3-16. DealsPage Hero 区域副标题显示 deals.length 而非 API 数据长度
- **文件**：`src/pages/CloudDesktopsPage.tsx` 第 77 行
- **类型**：逻辑不一致
- **描述**：CloudDesktopsPage 的 Hero 副标题 `${desktops.length} 大办公云电脑平台`，但 `desktops` 初始值是 `staticDesktops`（静态数据），API 返回后长度可能不同。副标题在初始渲染时显示静态数据数量，API 更新后数量可能变化。
- **修复方案**：这是可接受的行为（静态数据先渲染），但如果数量差异大，可考虑在 loading 完成后更新副标题。

### P3-17. 前端 admin 页面使用浅色主题，与前台深色主题不一致
- **文件**：`src/pages/admin/` 目录下所有页面
- **类型**：主题不一致
- **描述**：管理后台全部使用浅色主题（`bg-white`、`text-slate-800`、`border-slate-200`），而前台使用深色主题（`bg-game-dark`、`text-slate-200`）。切换时有明显的主题跳变。
- **修复方案**：统一为深色主题，或明确管理后台为独立浅色主题（需在 AdminLayout 中设置背景色）。

### P3-18. SettingsPage 使用硬编码颜色值
- **文件**：`src/pages/admin/SettingsPage.tsx` 第 140、159、178、229 行等
- **类型**：主题不一致
- **描述**：与 P2-12 相同的问题，SettingsPage 使用 `#3b9eff`、`bg-white` 等硬编码值。
- **修复方案**：同 P2-12。

### P3-19. 验证码生成存在微小偏差
- **文件**：`functions/api/send-code.ts` 第 38 行 / `send-sms.ts` 第 33 行
- **类型**：极低风险
- **描述**：`buf[0] % 1000000` 存在约 0.023% 的概率偏差。
- **修复方案**：如需完全消除，使用拒绝采样。

### P3-20. .dev.vars 包含开发环境占位符密钥
- **文件**：`.dev.vars`
- **类型**：信息泄露（低风险）
- **描述**：包含占位符密钥，`.gitignore` 已忽略。
- **修复方案**：保持现状。

### P3-21. BannerCarousel 内联 `<style>` 标签
- **文件**：`src/components/BannerCarousel.tsx` 第 55-92 行
- **类型**：性能 / 可维护性
- **描述**：Swiper 自定义样式通过内联 `<style>` 标签注入，每次组件渲染都会重新创建。
- **修复方案**：将样式移到 CSS 文件或 Tailwind 配置中。

### P3-22. Footer 版权年份硬编码为 2026
- **文件**：`src/components/Footer.tsx` 第 50 行
- **类型**：可维护性
- **描述**：`© 2026 云玩汇` 硬编码年份。
- **修复方案**：使用 `new Date().getFullYear()`。

### P3-23. Footer 数据更新时间硬编码
- **文件**：`src/components/Footer.tsx` 第 43 行
- **类型**：可维护性
- **描述**：`数据更新于 2026 年 7 月` 硬编码。
- **修复方案**：使用动态日期或从配置读取。

### P3-24. HomePage 缺少 loading 状态
- **文件**：`src/pages/HomePage.tsx`
- **类型**：UX
- **描述**：首页为纯静态内容，无 API 调用，不需要 loading 状态。但如果未来添加动态内容，需要注意。当前不是问题。
- **修复方案**：无需修复，记录以备未来参考。

---

## 六、修复优先级建议

### 第一批（立即修复 — P0，预计 2-3 小时）
| 编号 | 问题 | 工作量 |
|------|------|--------|
| P0-1 | AuthPage 密码 placeholder 改为"至少 8 位" | 1 行 |
| P0-2 | CORS 添加 PATCH 方法 | 2 行 |
| P0-3 | sms-login.ts 添加速率限制 | ~30 行 |
| P0-4 | 验证码失败次数限制 | DB 迁移 + ~20 行 |
| P0-5 | AuthContext 使用 apiClient 或处理 401 | ~30 行 |

### 第二批（短期修复 — P1，预计 4-5 小时）
| 编号 | 问题 | 工作量 |
|------|------|--------|
| P1-1 | 中间件添加安全响应头 | ~5 行 |
| P1-2 | login.ts email 查询添加 LOWER() | 1 行 |
| P1-3 | rbac.ts 补充 3 个权限码类型 | 1 行 |
| P1-4 | catch 块添加 console.error | ~10 处 |
| P1-5 | Cookie 添加 __Host- 前缀 | ~6 处 |
| P1-6 | 速率限制 fail-open 添加告警 | ~5 行 |
| P1-7 | Header 移动端 Escape + 焦点管理 | ~20 行 |
| P1-8 | PublicLayout 添加 skip-link | ~5 行 |
| P1-9 | 评估 send-sms 凭证传递方式 | 调研 + 重构 |

### 第三批（中期修复 — P2，按需排期）
P2-1 ~ P2-11，每项工作量在 10-50 行不等。

### 第四批（长期优化 — P3，可与技术债务一起处理）
P3-1 ~ P3-24，主要为代码质量和 SEO 优化。

---

## 七、修复执行计划

### 建议执行顺序

**Step 1：P0-1 + P0-2（10 分钟，1 行级修复）**
这两个是单行修复，立即做：
- AuthPage placeholder "6 位" → "8 位"
- CORS Allow-Methods 添加 PATCH

**Step 2：P0-3 + P0-4（1-2 小时，安全修复）**
验证码暴力破解防护：
- sms-login.ts 添加 IP 级速率限制（参照 login.ts 的实现）
- verification_codes 表添加 failed_attempts 字段
- register.ts 和 sms-login.ts 验证码验证失败时递增计数器

**Step 3：P0-5（30 分钟，架构一致性）**
AuthContext 的 login/register/smsLogin 方法改为使用 apiClient，或在 catch 中检查 401。

**Step 4：P1 批量修复（4-5 小时）**
- P1-1 安全头 + P1-2 LOWER() + P1-3 权限码类型（10 分钟）
- P1-4 catch 块日志 + P1-6 fail-open 告警（30 分钟）
- P1-5 Cookie __Host- 前缀（30 分钟）
- P1-7 Header 移动端 a11y + P1-8 skip-link（1 小时）
- P1-9 send-sms 凭证传递评估（调研）

**Step 5：P2 按需修复**
优先 P2-1（mounted 反模式）、P2-6（事务）、P2-7（密码强度）、P2-9（请求超时）。

**Step 6：P3 长期优化**
SEO noindex 标签批量添加、emoji 替换、硬编码年份修复等，可与日常维护一起做。

---

## 八、架构评估

### 做得好的方面
1. **代码分割**：React.lazy 懒加载所有页面，首屏性能好
2. **静态数据兜底**：API 失败时自动 fallback 到静态数据，用户体验不中断
3. **HttpOnly Cookie 认证**：JWT 存在 HttpOnly Cookie 中，前端 JS 无法读取，防 XSS
4. **PBKDF2 密码哈希**：100000 次迭代 + 随机 salt，安全性足够
5. **实时权限查询**：`requirePermission` 每次从 D1 查询，不信任 JWT 中的 permissions
6. **SEO 组件化**：`SEO` + `RelatedLinks` 组件统一管理元标签和内链
7. **ErrorBoundary**：全局错误边界 + Sentry 上报
8. **骨架屏**：所有数据加载页面都有 skeleton loading

### 需要改进的方面
1. **安全防护**：sms-login 路径缺少速率限制，验证码可被暴力破解
2. **CORS 配置**：缺少 PATCH 方法导致部分管理功能不可用
3. **错误处理**：大量 catch 块吞掉异常，排障困难
4. **a11y**：移动端菜单缺少键盘导航，公开页面缺少 skip-link
5. **SEO**：登录/消息/个人等页面缺少 noindex 标签
6. **类型一致性**：权限码类型定义与常量数组不匹配
7. **主题统一性**：管理后台与前台风格差异大

---

## 九、附录

### 文件审查清单

| 模块 | 文件数 | 审查方式 |
|------|--------|---------|
| 公开页面 | 13 | 逐文件审查 |
| 受保护页面 | 4 | 逐文件审查 |
| 管理后台页面 | 15 | 抽样审查 |
| 组件 | ~20 | 逐文件审查 |
| Contexts/Hooks | ~8 | 逐文件审查 |
| 后端 Functions | 60+ | 逐文件审查 |
| 配置文件 | 5 | 逐文件审查 |
| **总计** | **125+** | |

---

*报告生成时间：2026-07-10 08:25 GMT+8*
*审计工具：4 路并行 Agent + 人工逐行审查*
*去重后独立问题：49 项（P0:5 / P1:9 / P2:11 / P3:24）*
