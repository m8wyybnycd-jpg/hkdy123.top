# PRD — Cloudgame Hub V5（前台用户体验补全）

> 版本：V5.0 ｜ 日期：2026-07-08 ｜ 作者：产品经理 Alice ｜ 状态：待评审

---

## 1. 项目信息

| 项 | 值 |
|---|---|
| 项目名称 | cloudgame-hub |
| 域名 | hkdy123.top |
| 技术栈 | Vite + React 18 + TypeScript + Tailwind CSS + Cloudflare Pages + Functions + D1 |
| 编程语言 | TypeScript（前后端同构类型） |
| 当前版本 | V4.1 |
| 目标版本 | V5.0 |
| 文档类型 | 简单 PRD（不含竞品分析） |

### 原始需求复述

> "参考主流网站的通用功能标准，对比当前项目，识别缺失的功能模块或体验缺陷（例如：用户个人中心、搜索功能、消息提醒、分页加载、响应式适配、错误页面处理、数据加载状态等），请直接进行修复或补充实现。"

V4.1 已完成后台管理（RBAC、公告/站内信/日志 CRUD、账号系统），但**前台用户侧**存在明显缺口：后端 API（公告、站内信、未读数）已就绪，前台却没有消费入口，导致普通用户登录后"没有用户感"。

---

## 2. 现状诊断（基于代码审计）

### 2.1 已有可复用资源（后端 API + 前端工具，V5 不新增后端 API）

| 资源 | 位置 | 状态 |
|---|---|---|
| 公告 API `GET /api/announcements` | `functions/api/announcements.ts` | ✅ 正常，返回已发布公告数组 |
| 站内信 API `GET /api/messages` | `functions/api/messages.ts` | ✅ 正常，返回个人+群发消息 |
| 未读数 API `GET /api/messages/unread-count` | `functions/api/messages/unread-count.ts` | ✅ 正常，返回 `{ count }` |
| 标记已读 API `PUT /api/messages/:id/read` | `functions/api/messages/[id].ts` | ✅ 正常 |
| 用户信息 `GET /api/me` | `functions/api/me.ts` | ✅ 正常 |
| 前端 API 方法 | `src/services/api.ts` | ✅ `getPublishedAnnouncements()` / `getMyMessages()` / `markMessageRead(id)` / `getUnreadCount()` 已实现 |
| 类型定义 | `src/types/extra.ts` | ✅ `Announcement` / `Message` / `PaginatedResponse<T>` 已定义 |
| 认证上下文 | `src/contexts/AuthContext.tsx` | ✅ `authState.user`（id/email/username/isAdmin/roles/permissions） |

### 2.2 前台缺失清单（V5 要解决的）

| # | 缺陷 | 影响 | 严重度 |
|---|---|---|---|
| 1 | 公告 API 有数据，前台**无任何展示区域** | 管理员发的公告用户看不到，运营失效 | P0 |
| 2 | 站内信 API 有数据，普通用户**无查看入口**（仅管理后台可见） | 群发消息触达不了用户 | P0 |
| 3 | Header 无消息提醒（铃铛/未读角标） | 用户不知道有新消息 | P0→P1 |
| 4 | 无用户个人中心页面 | 登录后"没有用户感"，无法查看/管理自己的账号 | P1 |
| 5 | 无 404 错误页面（`*` 路由直接重定向到 /cloud-games） | 用户输错 URL 无反馈，SEO/UX 不佳 | P1 |
| 6 | 部分页面缺统一加载/错误状态 | 网络异常时白屏或卡顿无提示 | P1 |
| 7 | Header 头像点击无跳转（不可点） | 无法进入个人中心 | P1 |
| 8 | 搜索无分页、无空状态优化建议 | 结果多时一次性渲染，体验差 | P2 |
| 9 | 移动端站内信/个人中心入口未规划 | 移动端用户路径不完整 | P2 |

---

## 3. 产品定义

### 3.1 产品目标

V5 聚焦"前台用户体验补全"，围绕三个正交目标：

1. **打通消息触达闭环**：让管理员在后台发布的公告与站内信能真正触达普通用户，形成"后台发布 → 前台展示 → 用户已读"的完整链路，结束"发了但没人看"的现状。
2. **建立用户身份感知**：通过个人中心 + Header 头像/昵称/未读角标，让普通用户登录后明确感知到"这是我的账号"，从"匿名浏览者"升级为"已登录会员"。
3. **补齐基础体验基线**：对标主流网站通用标准，补全 404 错误页、统一加载/错误状态、响应式适配，消除"白屏/卡顿/无反馈"等体验缺陷。

### 3.2 用户故事

- **作为普通用户**，我想在登录后立刻看到网站公告（维护通知、活动公告），以便了解平台最新动态，不被"蒙在鼓里"。
- **作为普通用户**，我想在 Header 看到消息铃铛和未读数量角标，以便第一时间知道有新站内信等我查看。
- **作为普通用户**，我想点击铃铛进入"我的消息"列表，区分"系统群发"和"个人消息"并标记已读，以便管理我的通知。
- **作为普通用户**，我想点击头像进入"个人中心"，查看我的账号信息（邮箱/手机/注册时间/角色）和退出登录，以便确认账号归属。
- **作为普通用户**，当我访问不存在的页面时，我想看到友好的 404 提示并提供返回首页按钮，而不是被默默重定向。
- **作为管理员**，我想我在后台发的公告和站内信能在前台被用户看到，以便我的运营动作真正生效。

---

## 4. 技术规范

### 4.1 需求池（P0 / P1 / P2）

#### P0 — 必须实现（核心缺陷修复）

| ID | 需求 | 验收标准 | 复用资源 |
|---|---|---|---|
| P0-1 | **前台公告展示组件** `AnnouncementBar` | ① 在内容页（云游戏/云电脑/薅羊毛/游戏库）顶部 Header 下方横向展示最新 1 条公告；② maintenance 类型用醒目橙色横幅，notice/announcement 用蓝紫色；③ 可点击展开/收起查看完整内容；④ 无公告时不占位；⑤ 调用 `apiClient.getPublishedAnnouncements()` | `/api/announcements`、`Announcement` 类型 |
| P0-2 | **用户站内信页面** `MessagesPage`（路由 `/messages`） | ① 列表展示个人消息 + 群发消息（`recipientId=-1`），按 `createdAt` 倒序；② 未读消息加粗/高亮，已读灰色；③ 点击消息展开详情并自动调用 `markMessageRead(id)` 标记已读；④ 空状态"暂无消息"插画；⑤ 加载骨架屏 + 加载失败重试 | `getMyMessages()`、`markMessageRead()`、`Message` 类型 |
| P0-3 | **Header 消息铃铛 + 未读角标** | ① Header 右侧（头像旁）新增铃铛图标 `Bell`；② 登录后调用 `getUnreadCount()` 显示红色数字角标（>0 显示，0 不显示，>99 显示 99+）；③ 点击铃铛跳转 `/messages`；④ 角标每 60s 轮询刷新一次 | `getUnreadCount()`、`useAuthContext` |

#### P1 — 应该实现（体验基线）

| ID | 需求 | 验收标准 | 复用资源 |
|---|---|---|---|
| P1-1 | **用户个人中心页面** `ProfilePage`（路由 `/profile`） | ① 展示头像首字母、用户名、邮箱、手机（如有）、注册时间、角色标签；② 角色标签来自 `authState.user.roles`；③ 提供"退出登录"按钮（复用 `logout()`）；④ 管理员显示"进入管理后台"入口；⑤ 卡片式布局，移动端自适应 | `authState.user`、`logout()` |
| P1-2 | **Header 头像可点击** | ① 桌面端头像 + 昵称点击跳转 `/profile`；② 移动端头像点击跳转 `/profile`；③ 下拉菜单可选（头像→下拉：个人中心/我的消息/退出登录） | `useNavigate` |
| P1-3 | **404 错误页面** `NotFoundPage` | ① 路由 `*` 改为渲染 `NotFoundPage` 而非重定向；② 大号 404 + 文案"页面走丢了"；③ "返回首页"按钮跳 `/cloud-games`；④ "返回上一页"按钮 `navigate(-1)`；⑤ 居中布局，暗色风格一致 | 新增页面 |
| P1-4 | **统一加载/错误状态组件** `StateView` | ① 抽象 `<LoadingState/>`（骨架屏）、`<ErrorState onRetry/>`（错误+重试）、`<EmptyState/>`（空状态）；② 各内容页统一替换裸 `loading` 变量；③ 网络错误显示"加载失败，点击重试" | 复用现有 `skeleton` CSS |
| P1-5 | **站内信消息详情抽屉/弹窗** | ① P0-2 中点击消息可用 `Drawer`/`Modal` 展示完整内容（长文本可滚动）；② 展示发送时间、来源（系统/管理员） | `Message` 类型 |
| P1-6 | **公告历史归档入口** | ① AnnouncementBar 增加"查看全部公告"链接；② 跳转 `/announcements` 列表页展示所有已发布公告；③ 按 type 筛选（全部/通知/公告/维护） | `getPublishedAnnouncements()` |

#### P2 — 可以做（增强优化）

| ID | 需求 | 验收标准 | 复用资源 |
|---|---|---|---|
| P2-1 | **搜索结果分页** | ① 各分类结果 >12 条时分页加载（"加载更多"按钮，非传统分页器）；② 避免一次性渲染过多卡片 | `SearchResult` |
| P2-2 | **搜索空状态推荐** | ① 无结果时推荐热门游戏/平台标签可点击；② "试试这些关键词" | `staticGames` |
| P2-3 | **移动端响应式优化** | ① Header 移动菜单增加"个人中心""我的消息"入口；② 个人中心/消息页移动端单列布局；③ 触控热区 ≥44px | Tailwind 响应式 |
| P2-4 | **消息已读/未读筛选** | ① MessagesPage 顶部 Tab：全部/未读/已读；② 本地过滤即可 | `Message.isRead` |
| P2-5 | **公告自动轮播** | ① 多条公告时 AnnouncementBar 自动轮播切换（5s/条），支持手动左右切换 | `Announcement[]` |

---

### 4.2 UI 设计建议

#### 布局架构（V5 前台）

```
┌─────────────────────────────────────────────┐
│ Header（sticky）                             │
│  Logo | 云游戏 云电脑 薅羊毛 游戏库 | 🔍 🔔 👤 │  ← 新增 🔔铃铛(角标) + 👤头像可点
├─────────────────────────────────────────────┤
│ AnnouncementBar（P0-1，仅有公告时显示）       │  ← 新增：横向公告横幅
│  📢 [维护公告] 系统将于今晚 22:00 维护…  展开  │
├─────────────────────────────────────────────┤
│                                             │
│  Main 内容区（Outlet）                       │
│                                             │
├─────────────────────────────────────────────┤
│ Footer                                      │
└─────────────────────────────────────────────┘
```

#### 各模块布局细节

**① AnnouncementBar（公告横幅）**
- 位置：Header 正下方，全宽，高度 ~44px
- maintenance 类型：`bg-amber-500/10 border-amber-500/30` + ⚠️ 图标
- notice/announcement 类型：`bg-neon-blue/10 border-neon-blue/20` + 📢 图标
- 左侧图标 + 标题（单行省略），右侧"展开 ↓"按钮
- 展开后：多行内容区，`max-h-60 overflow-y-auto`
- 右上角"查看全部"链接 → `/announcements`
- 无公告：整个组件 `return null`，不占位

**② Header 铃铛 + 头像区（桌面端）**
```
[🔍搜索框] [🛡管理(仅admin)] [🔔③] [👤头像 昵称]
                          ↑                ↑
                     红色角标(未读数)    可点击→/profile
```
- 铃铛：`relative` 容器，角标 `absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-red-500 text-[10px]`
- 角标 0：不渲染；>99：显示 "99+"
- 头像 hover：`cursor-pointer` + 下拉菜单（P1-2 可选实现下拉）

**③ MessagesPage（我的消息，路由 /messages）**
```
┌──────────────────────────────────┐
│  📬 我的消息          [全部|未读|已读] │  ← P2-4 筛选 Tab
├──────────────────────────────────┤
│ ● [系统] 限时免费活动上线啦！        │  ← 未读：加粗 + 左侧圆点
│   2026-07-08 10:30        展开 ↓   │
│ ──────────────────────────────── │
│ ○ [管理员] 欢迎加入云玩汇           │  ← 已读：灰色
│   2026-07-07 18:00        展开 ↓   │
├──────────────────────────────────┤
│        暂无消息（空状态插画）        │
└──────────────────────────────────┘
```
- 群发消息（`recipientId=-1`）标签显示"系统通知"，个人消息显示"个人消息"
- 点击整行展开详情（`max-h-0 → max-h-96` 过渡动画），自动标记已读
- 未读数实时更新（标记后铃铛角标 -1）

**④ ProfilePage（个人中心，路由 /profile）**
```
┌──────────────────────────────────┐
│        👤  (大头像首字母)          │
│        用户名 (username)           │
│  ──────────────────────────────  │
│  📧 邮箱     user@example.com     │
│  📱 手机     138****8888          │
│  📅 注册时间  2026-07-01           │
│  🏷 角色     [普通用户]            │
│  ──────────────────────────────  │
│  [🛡 进入管理后台]  (仅admin)      │
│  [📤 退出登录]                    │
└──────────────────────────────────┘
```
- 居中卡片，`max-w-md`
- 手机号脱敏显示（中间 4 位 `****`）
- 退出登录：`logout()` + `navigate('/login')`

**⑤ NotFoundPage（404）**
```
        ┌─────────┐
        │   404   │   ← 大号渐变文字 gradient-text
        └─────────┘
      页面走丢了 ~
   你访问的页面不存在或已移除

   [← 返回首页]  [返回上一页]
```
- 居中，`py-20`
- 两个按钮：返回首页 → `/cloud-games`；返回上一页 → `navigate(-1)`

**⑥ 移动端 Header 菜单（P2-3）**
```
☰ 展开后：
  云游戏 / 云电脑 / 薅羊毛 / 游戏库
  ─────────────────
  🔍 [搜索框]
  ─────────────────
  👤 个人中心     ← 新增
  🔔 我的消息 (3) ← 新增，显示未读数
  🛡 管理后台     (仅admin)
  📤 退出登录
```

#### 新增路由总览

| 路由 | 页面 | 守卫 | 优先级 |
|---|---|---|---|
| `/messages` | MessagesPage | ProtectedRoute（需登录） | P0 |
| `/profile` | ProfilePage | ProtectedRoute（需登录） | P1 |
| `/announcements` | AnnouncementsListPage | ProtectedRoute（需登录） | P1 |
| `*` | NotFoundPage | 无（公开） | P1 |

#### 新增组件清单

| 组件 | 路径 | 职责 |
|---|---|---|
| `AnnouncementBar.tsx` | `src/components/` | 公告横幅（P0-1） |
| `MessageBell.tsx` | `src/components/` | 铃铛+未读角标（P0-3） |
| `StateView.tsx` | `src/components/` | 统一加载/错误/空状态（P1-4） |
| `MessagesPage.tsx` | `src/pages/` | 站内信列表（P0-2） |
| `ProfilePage.tsx` | `src/pages/` | 个人中心（P1-1） |
| `AnnouncementsListPage.tsx` | `src/pages/` | 公告归档列表（P1-6） |
| `NotFoundPage.tsx` | `src/pages/` | 404 页面（P1-3） |

---

## 5. 待确认问题（Open Questions）

> 以下问题需用户/团队决策后进入开发，默认值已标注。

| # | 问题 | 默认建议 | 影响 |
|---|---|---|---|
| Q1 | **公告横幅展示位置**：放 Header 下方全宽，还是放各内容页 Hero 下方？ | Header 下方全宽（更醒目，且一处实现全局生效） | 影响视觉层级 |
| Q2 | **未读数轮询频率**：60s 是否合适？过频会增加 D1 读次数。 | 60s 轮询 + 页面获焦时立即刷新 | 影响成本/实时性 |
| Q3 | **公告是否需要"不再提示"功能**（用户关闭后本次会话不再展示）？ | 暂不做，保持简单；公告有时效性会自然消失 | 影响范围 |
| Q4 | **个人中心是否需要"修改密码"功能**？当前无修改密码 API。 | V5 不做（无后端 API），标注为 V6 待办 | 依赖后端 |
| Q5 | **消息列表是否需要分页**？当前 `getMyMessages()` 一次性返回全部。 | 消息量通常不大，前端全量渲染 + 本地筛选；超 50 条再考虑虚拟滚动 | 性能 |
| Q6 | **404 页面是否保留重定向兜底**（如旧书签自动跳新地址）？ | 直接展示 404，提供返回按钮；不做智能重定向 | UX |
| Q7 | **头像下拉菜单 vs 直接跳转**：P1-2 用下拉菜单还是头像直接跳 /profile？ | 直接跳转更简单；下拉菜单留 V6 | 交互复杂度 |
| Q8 | **公告/消息的 Markdown 渲染**：内容是否含 Markdown？当前按纯文本处理。 | 按纯文本 + 换行渲染（`\n` → `<br>`），不引入 Markdown 解析器 | 安全性/范围 |

---

## 6. 实施建议（非约束，供架构师参考）

### 6.1 开发顺序

```
阶段一（P0，1-2 天）：
  1. AnnouncementBar 组件 → 挂到 ProtectedLayout
  2. MessagesPage 页面 → 注册路由 /messages
  3. MessageBell 组件 → 挂到 Header
  → 验收：后台发公告/站内信，前台能看到

阶段二（P1，2-3 天）：
  4. ProfilePage → 注册路由 /profile
  5. Header 头像可点击
  6. NotFoundPage → 替换 * 路由
  7. StateView 统一状态组件 → 替换各页面裸状态
  8. AnnouncementsListPage → /announcements

阶段三（P2，1 天）：
  9. 搜索分页/空状态推荐
  10. 移动端菜单补全入口
  11. 消息筛选 Tab
```

### 6.2 技术约束

- **不新增后端 API**：全部复用现有 `/api/announcements`、`/api/messages`、`/api/messages/unread-count`、`/api/messages/:id/read`、`/api/me`
- **不改变技术栈**：Vite + React + TS + Tailwind + Cloudflare
- **不引入新依赖**：图标复用 `lucide-react`（已安装），状态管理复用 React hooks
- **类型安全**：所有新组件/页面使用已有 `Announcement`、`Message`、`User` 类型，不重复定义
- **暗色主题一致**：沿用 `bg-game-dark`、`bg-game-card`、`border-game-border`、`neon-blue/purple/green` 设计 token

### 6.3 风险提示

| 风险 | 缓解措施 |
|---|---|
| 未读数轮询增加 D1 读次数 | 60s 间隔 + 页面隐藏时暂停轮询（`document.visibilitychange`） |
| 群发消息（`recipientId=-1`）与个人消息混合展示需区分 | UI 用标签区分"系统通知"/"个人消息"，数据层无需改动 |
| 公告内容 XSS | 按 Q8 默认纯文本渲染，不使用 `dangerouslySetInnerHTML` |
| 移动端 Header 元素过多拥挤 | 铃铛+头像在 `md` 以下移入汉堡菜单 |

---

## 附录：V5 不做（Out of Scope）

以下明确排除，避免范围蔓延：

- ❌ 修改密码 / 找回密码（无后端 API）
- ❌ 头像上传（无文件存储）
- ❌ 消息推送（Web Push / 邮件推送）
- ❌ 公告富文本/Markdown 编辑
- ❌ 消息批量操作（全部已读/删除）
- ❌ 用户通知偏好设置
- ❌ 收藏/历史记录功能（已有 `/api/favorites` 但 V5 不做前台入口）

以上均标注为 V6+ 待办。
