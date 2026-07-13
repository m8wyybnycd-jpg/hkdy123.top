# cloudgame-hub 后端安全审计报告（MVP）

- **审计对象**：`C:/cloudgame-hub-build` 后端 Cloudflare Pages Functions（TypeScript）
- **审计范围**：`functions/` 全部 `.ts`（lib ×9、_middleware、api ×24、api/admin ×31、admin ×5）、`_headers`、`wrangler.toml`、`.dev.vars`、`schema.sql`、`migrations/*`
- **审计维度**：输入校验、认证授权（JWT/RBAC）、传输安全（CORS/响应头/Cookie）、错误处理、边界与注入、速率限制/爆破防护、密钥与敏感数据
- **审计日期**：2026-07-12

---

## 一、总体安全评估

**结论：后端整体安全水平「中等偏上」，正式上线前应修复全部 P1 与关键 P2 项。**

核心安全底座扎实：
- 所有 D1 查询均使用参数化 `prepare().bind()`，**未发现任何 SQL 注入点**；动态 SQL 的字段名均来自硬编码白名单。
- 密码使用 PBKDF2-SHA256 + 随机盐 + **恒定时间比对**；JWT 使用 HMAC-SHA256 验签，支持双密钥平滑轮换。
- **RBAC 实时查库**（`requirePermission` 不信任 JWT 中的权限字段），且 `api/admin/*`（31 个文件）与 `admin/*`（5 个文件）**全部**调用了 `requirePermission`，无任何管理端点裸奔。
- 登录错误统一为「账号或密码错误」，无用户枚举；CORS 严格白名单；API 错误不向客户端泄露堆栈/内部错误；`password_hash/salt` 不回传。
- favorites 删除用 `user_id` 绑定、messages 校验接收者，无 IDOR。

主要短板集中在**滥用类（发码限流失效、SMS 验证码可爆破）**与**权限模型纵深（user:manage→super_admin 提权）**，以及若干一致性/纵深问题。

**未发现可直接导致数据泄露或服务接管的 P0 级漏洞**（无注入、无鉴权绕过、无密钥硬编码进源码）。

---

## 二、正面实践（值得保留）

| 维度 | 体现位置 |
|------|----------|
| 参数化查询防注入 | 所有 `db.prepare(sql).bind(...)` |
| 密码哈希 | `lib/auth.ts` PBKDF2 + 随机盐 + 恒定时间比对 |
| JWT 双密钥轮换 | `getJWTSecrets` / `verifyJWTAny` |
| RBAC 实时校验 | `lib/permission.ts`（不信任 JWT 权限） |
| 安全 Cookie | 多数端点 `__Host-auth_token; HttpOnly; Secure; SameSite=Strict` |
| 无用户枚举 | `login.ts` 统一错误文案 |
| CORS 白名单 | `_middleware.ts` ALLOWED_ORIGINS |
| 无错误泄露 | 全部 `catch` 返回 `serverError` 通用文案 |
| 无密码哈希回传 | users 查询均不含 `password_hash/salt` |
| IDOR 防护 | favorites DELETE 绑 user_id；messages 校验 recipient_id |
| 安全响应头 | `_headers` 对静态资源设 HSTS/CSP/X-Frame-Options 等 |

---

## 三、按严重程度分级的发现清单

> 每条格式：精确位置 → 问题描述 → 潜在影响 → 修复建议

### 🔴 P0 — 严重（可被人利用导致数据泄露/越权/接管）

**无。** 详见「总体评估」。所有管理写操作均经 `requirePermission`；无注入、无签名绕过、无密钥泄露进源码。

---

### 🟠 P1 — 高（明确的安全缺陷，上线前必须修复）

#### P1-1. SMS 登录验证码无暴力破解防护（非恒定时间 + 无失败锁定）
- **位置**：`functions/api/sms-login.ts:125-129`（比对 `if (storedCode !== code)`），整文件**无** `failed_attempts` 锁定逻辑。
- **对比**：`register.ts:146-174`、`email-login.ts:128-156` 已实现「5 次错误锁定并标记 used」。
- **问题**：短信验证码（6 位，5 分钟有效）可被**无限次尝试**，既无失败次数上限，也比对**非恒定时间**。
- **潜在影响**：攻击者针对某手机号，在 5 分钟窗口内可尝试最多约 100 万次 6 位码，存在**账户接管**风险；相较 email 路径明显更弱，形成鉴权不对称。
- **修复**：
  1. 复用 `verification_codes.failed_attempts`（迁移已加该列），达到 5 次即标记 `used=1`；
  2. 比对改为恒定时间（同 email-login）；
  3. 增加 SMS 登录失败的全局频率限制（参考 `login.ts` 的 IP 限流）。

#### P1-2. 发码接口 IP 级限流失效 → 邮箱/短信轰炸
- **位置**：`functions/api/send-code.ts:169-183`（第一行 `ipResult` 为死代码未使用，实际检查 `login_logs` 计数，`send-sms.ts:148-164` 同）。
- **问题**：期望的「每 IP 限流」查询的是 `login_logs` 表，而**发码请求本身并不写入 `login_logs`**，因此发码永远不会触发该限流。每邮箱/每手机号 60s 的限制只约束同一目标，不约束向**大量不同目标**连续发码。两接口又**无认证/CAPTCHA**。
- **潜在影响**：匿名攻击者可向大量第三方邮箱/手机号持续发送验证码（邮件轰炸/短信轰炸），耗尽 Brevo/SMSBao 额度、污染发件域名信誉、骚扰用户。
- **修复**：
  1. 在 `verification_codes` 增加发送者 IP 列，或改用 KV/Ratelimit binding，对「每 IP 每窗口发送次数」做真实限制（如 10 分钟 ≤ N 次）；
  2. 删除 `send-code.ts:169-173` 的无效死代码；
  3. 高安全场景对发码加 CAPTCHA/行为验证。

#### P1-3. 权限提升：拥有 `user:manage` 即可赋予 `super_admin` 角色
- **位置**：`functions/api/admin/users/[id]/roles.ts:114-145`（PUT 全量覆盖角色，未禁止把 `super_admin` 赋给任意用户）。
- **对比**：`roles/[id]/permissions.ts:106-108` 已明确禁止修改 `super_admin` 权限——**两处防护不对称**。
- **问题**：任何持有 `user:manage` 权限的主体（按 RBAC 设计该权限可与 `super_admin` 拆分）都能把 `super_admin` 角色赋给任意用户（含自己），实现**提权到完全管理员**。
- **潜在影响**：绕过权限模型，低权管理员 → 超级管理员，完全接管后台（含用户/角色/设置管理）。
- **修复**：
  1. 在赋予角色时，若 `roleIds` 含 `super_admin`，要求调用者自身 `roles.includes("super_admin")`（或新增专属 permission）；
  2. 或强制 `user:manage` 永远与 `super_admin` 绑定、不可拆分；
  3. 同时禁止非超级管理员修改/删除超级管理员用户。

---

### 🟡 P2 — 中（防御纵深不足 / 潜在问题）

#### P2-1. `isAdmin` 双源不一致（登录 vs 刷新）
- **位置**：`login.ts:126`（`roles.includes("super_admin")`）vs `refresh-token.ts:97`（`users.is_admin === 1`）。
- **问题**：`isAdmin` 在签发时有两个真相源，且 `admin/users/[id].ts:61-63` 可直接置 `is_admin` 列。二者可背离。
- **潜在影响**：前端管理态在登录与刷新之间可能不一致（误显/隐 admin UI）；双真相源易滋生未来鉴权 bug。
- **修复**：统一以单一真相源（推荐 `super_admin` 角色）派生 `isAdmin`；删除 `users.is_admin` 冗余列或严格双向同步。

#### P2-2. 遗留 `functions/admin/*` 管理端点未校验 URL（存储型 XSS 风险）
- **位置**：`functions/admin/banners.ts:123-152`、`functions/admin/banners/[id].ts:92-119`（`imageUrl/linkUrl` 直接入库，无 `validateUrl`）。
- **对比**：新版 `functions/api/admin/banners.ts:150-153`、`[id].ts:106-113` 已调用 `validateUrl`。
- **问题**：两套管理端点并存，安全以较弱者为准。遗留版允许写入 `javascript:`/`data:` 等危险 URL。
- **潜在影响**：持有 `banner:write` 的账号可存储危险链接，若前端以 `<a href>`/`<img>` 渲染，可能造成**存储型 XSS / 开放重定向**。
- **修复**：遗留端点也接入 `validateUrl`；或下线 `functions/admin/*`，仅保留 `api/admin/*`。

#### P2-3. 令牌吊销在 KV 故障时 fail-open
- **位置**：`lib/revocation.ts:58-65`（`catch` 返回 `false`）+ `_middleware.ts:104-115`（未配置 `TOKEN_BLACKLIST` 直接放行）。
- **潜在影响**：KV 不可用期间，已登出的令牌仍可被使用（仍受 7 天过期约束，但登出失效机制临时失效）。
- **修复**：记录并明确该可用性权衡；确保生产配置 `TOKEN_BLACKLIST`；对管理类操作可考虑 KV 不可用时 fail-closed。

#### P2-4. refresh-token 不吊销旧令牌且无限频
- **位置**：`functions/api/refresh-token.ts:42-129`。
- **问题**：每次刷新签发新 7 天令牌，旧令牌仍有效至自然过期；无刷新频率/复用限制。
- **潜在影响**：令牌增殖；被盗令牌在主动登出前长期可用（又依赖 P2-3 的 fail-open 吊销）。
- **修复**：刷新时把旧 `jti` 写入 KV 黑名单；对刷新接口加频率限制。

#### P2-5. 安全响应头可能未覆盖 API 响应
- **位置**：`_headers:1-9`（仅对静态资源）vs `_middleware.ts:124-139`（仅加 CORS 头，未加安全头）。
- **问题**：Cloudflare Pages 的 `_headers` 一般只作用于静态资源响应，`/api/*`（Functions）响应可能不继承 HSTS/X-Content-Type-Options/Referrer-Policy/CSP 等。
- **潜在影响**：API 响应缺少纵深防御头（如点击劫持/嗅探防护不足）。
- **修复**：在 `_middleware.ts` 中对 API 响应显式设置 `Strict-Transport-Security`、`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Content-Security-Policy`。

#### P2-6. SMS 登录 Cookie 使用 `auth_token`（无 `__Host-` 前缀）且 `SameSite=Lax`
- **位置**：`functions/api/sms-login.ts:216`。
- **对比**：`login/email-login/refresh/logout` 均用 `__Host-auth_token; SameSite=Strict`。
- **问题**：两套 Cookie 名与属性并存，SMS 路径 Cookie 属性较弱（Lax 而非 Strict）。
- **潜在影响**：运维复杂度与混淆风险；Lax 在部分跨站场景下携带 Cookie（虽对 JSON API 实际影响有限）。
- **修复**：统一为 `__Host-auth_token; HttpOnly; Secure; SameSite=Strict`；废弃 `auth_token` 旧名。

#### P2-7. 登录 IP 限流依赖可被伪装的 `X-Forwarded-For`（兜底路径）
- **位置**：`lib/logger.ts:174-181`（`getClientIP` 兜底取 XFF 首段）+ `login.ts:15-32`（据此限流）。
- **问题**：在 CF 上 `CF-Connecting-IP` 优先且可信，但一旦请求绕过 CF 直连源站，攻击者可伪造 XFF 使每次登录呈现不同 IP，从而绕过「5 次失败/IP」限流。
- **潜在影响**：源站直连场景下，密码爆破限流可被绕过。
- **修复**：安全相关限流只信任 `CF-Connecting-IP`（或 `True-Client-IP`），忽略 XFF；确保源站不可公网直连。

---

### 🟢 P3 — 低（代码健壮性 / 最佳实践）

| # | 位置 | 问题 | 修复建议 |
|---|------|------|----------|
| P3-1 | `lib/auth.ts:221-241` | JWT 验签未断言 `header.alg === "HS256"`（当前因始终 HMAC 且无非对称公钥不可利用，但缺纵深） | 验签前校验 `alg` |
| P3-2 | `lib/cbf4217a-34ff-412c-bfcb-a73acaf78b9f.ts` | 旧版 `auth.ts` 副本，**未被任何文件引用**（grep 确认）；用非恒定时间密码比对、无 jti/双密钥；随机 ID 文件名易致混淆/误引入 | 直接删除该死文件 |
| P3-3 | `lib/auth.ts:11` | PBKDF2 迭代 100,000，低于 OWASP 2023 对 SHA-256 的建议（600,000） | 提升到 ≥300,000（权衡 Worker 耗时） |
| P3-4 | `send-code.ts:197`、`send-sms.ts:174` | 验证码以**明文**入库（短期有效，风险低） | 存储 `HMAC(secret, code)` 而非明文 |
| P3-5 | `send-code.ts:43-46`、`send-sms.ts:33-36` | `getRandomValues % 1000000` 因 2³² 不被 1e6 整除引入极小取模偏差 | rejection sampling 或取更长随机 |
| P3-6 | 各 admin 端点 `detail: body`（如 `banners/[id].ts:188`、`page-configs/[key].ts:189`） | 操作日志记录完整请求体，未来字段变化可能记录敏感数据 | 仅记录白名单字段 |
| P3-7 | `logs/login.ts:96-108`、`logs/operation.ts:90-102` | CSV 导出未防公式注入（字段以 `= + - @` 开头被 Excel 执行） | 对首字符为这些符号的字段加 `'` 前缀 |
| P3-8 | `lib/auth.ts:271-307` | `JWT_SECRET_OLD` 若长期不清理，旧密钥签发令牌持续有效 | 轮换窗口结束后移除 |
| P3-9 | `api/admin/page-configs.ts` 等 | `params` 等字段原样存字符串，未校验为合法 JSON | `JSON.parse` 校验；输出转义 |
| P3-10 | `register.ts:109-120` | 密码长度/复杂度硬编码 8，与 `settings.password_min_length` 等配置项不一致（配置形同虚设） | 从 settings 读取或从代码删除未用项 |
| P3-11 | `lib/backup.ts:53,62` | 备份用字符串拼接表名执行 SQL（表名来自 `sqlite_master`，无外部注入风险，但属不良模式）；导出含 `users.password_hash/salt` 到 R2 | 表名白名单化；确保 `BACKUP_BUCKET` 访问受限并加密 |

---

## 四、修复优先级建议

1. **立刻（上线阻塞）**：P1-1（SMS 验证码加失败锁定+恒定时间）、P1-2（修复发码 IP 限流/加 CAPTCHA）、P1-3（禁止非超级管理员赋予 super_admin）。
2. **上线前**：P2-1（isAdmin 单一真相源）、P2-2（遗留 admin 端点 URL 校验或下线）、P2-3/P2-4（令牌吊销与刷新安全）、P2-5（API 安全头）、P2-6（Cookie 统一）、P2-7（限流仅信 CF-Connecting-IP）。
3. **持续改进**：P3 各项（死代码清理、密钥强度、日志最小化、CSV 注入、备份加固等）。

## 五、关键文件清单（本次审计覆盖）

- 认证/鉴权：`functions/lib/auth.ts`、`functions/lib/permission.ts`、`functions/_middleware.ts`、`functions/lib/revocation.ts`
- 端点（公开）：`login/register/email-login/sms-login/send-code/send-sms/refresh-token/logout/me/search/favorites/messages/health/banners/announcements/page-configs/platforms/desktops/deals/games`
- 端点（管理）：`functions/api/admin/*`（31 个）、`functions/admin/*`（5 个，仅 banners 子树）
- 配置/数据：`_headers`、`wrangler.toml`、`.dev.vars`（已 gitignore）、`schema.sql`、`migrations/*`
