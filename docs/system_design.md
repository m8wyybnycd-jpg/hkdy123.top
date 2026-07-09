# System Design — Cloudgame Hub V5（前台用户体验补全）

> 版本：V5.0 ｜ 日期：2026-07-08 ｜ 作者：架构师 Bob ｜ 基于 PRD-V5

---

## Part A: System Design

### 1. 实现方案（Implementation Approach）

#### 1.1 核心决策

无需变更技术栈。V5 为纯前端增量，全部复用现有后端 API，遵循现有代码模式：

| 决策 | 说明 |
|------|------|
| **框架不变** | Vite + React 18 + TypeScript + Tailwind CSS，版本锁定 |
| **API 层不变** | 全部复用 `apiClient` 已有方法：`getPublishedAnnouncements()` / `getMyMessages()` / `getUnreadCount()` / `markMessageRead(id)` |
| **类型复用** | `Announcement` / `Message` / `User` 已定义，不重复声明 |
| **路由守卫复用** | `ProtectedRoute` + `ProtectedLayout` 保持不变，新页面挂入即可 |
| **无新依赖** | 图标 `lucide-react` 已安装，无 npm 新增 |
| **状态同步** | 新增轻量 `UnreadContext` 解决 MessageBell ↔ MessagesPage 未读数实时同步 |

#### 1.2 组件树设计

```
App (Routes)
│
├── 公开路由（无守卫）
│   ├── /login            → AuthPage
│   ├── /admin/login      → AdminLoginPage
│   └── *                 → NotFoundPage          ★ NEW（替换重定向）
│
├── ProtectedLayout（ProtectedRoute → Header + AnnouncementBar + Outlet + Footer）
│   │
│   ├── AnnouncementBar                            ★ NEW（Header 下方，全局公告）
│   │
│   ├── /cloud-games      → CloudGamesPage
│   ├── /cloud-desktops   → CloudDesktopsPage
│   ├── /deals            → DealsPage
│   ├── /library          → LibraryPage
│   ├── /search           → SearchPage
│   ├── /messages         → MessagesPage           ★ NEW（站内信列表）
│   ├── /profile          → ProfilePage            ★ NEW（个人中心）
│   └── /announcements    → AnnouncementsListPage  ★ NEW（公告归档）
│
└── AdminProtectedLayout
    └── /admin/* → 现有后台路由（不变）
```

**设计要点**：
- `AnnouncementBar` 放在 `ProtectedLayout` 的 `<main>` 内部、`<Outlet>` 上方，使其在所有需要登录的内容页生效
- `MessageBell` 挂入 `Header` 组件（桌面端 + 移动端菜单）
- `UnreadContext` 的 Provider 包裹 `ProtectedLayout`，使 `MessageBell` 和 `MessagesPage` 共享未读数状态
- `NotFoundPage` 放在 `AuthProvider` 内部但 `ProtectedLayout` 外部，公开可访问

---

### 2. 文件列表（File List）

#### 2.1 新建文件（NEW）

| # | 相对路径 | 职责 | 关联 PRD ID |
|---|----------|------|-------------|
| 1 | `src/components/StateView.tsx` | 统一加载/错误/空状态组件 | P1-4 |
| 2 | `src/components/AnnouncementBar.tsx` | 公告横幅（Header 下方） | P0-1, P1-6 |
| 3 | `src/components/MessageBell.tsx` | Header 铃铛 + 未读角标 | P0-3 |
| 4 | `src/contexts/UnreadContext.tsx` | 未读数状态共享（MessageBell ↔ MessagesPage） | P0-3, P0-2 |
| 5 | `src/pages/MessagesPage.tsx` | 用户站内信列表页 | P0-2, P2-4 |
| 6 | `src/pages/ProfilePage.tsx` | 用户个人中心页 | P1-1 |
| 7 | `src/pages/AnnouncementsListPage.tsx` | 公告归档列表页 | P1-6 |
| 8 | `src/pages/NotFoundPage.tsx` | 404 错误页面 | P1-3 |

#### 2.2 修改现有文件（MODIFY）

| # | 相对路径 | 修改内容 | 关联 PRD ID |
|---|----------|----------|-------------|
| 1 | `src/App.tsx` | ① ProtectedLayout 内嵌 AnnouncementBar + UnreadProvider；② 新增 `/messages` `/profile` `/announcements` 路由；③ `*` 路由改为 `NotFoundPage` | P0-2, P1-1, P1-3, P1-6 |
| 2 | `src/components/Header.tsx` | ① 桌面端头像旁插入 `MessageBell`；② 头像 + 昵称包裹 `NavLink to="/profile"`；③ 移动端菜单增加"个人中心""我的消息"入口（P2-3） | P0-3, P1-2, P2-3 |
| 3 | `src/pages/SearchPage.tsx` | ① 搜索结果 >12 条时分页（"加载更多"按钮）；② 空状态推荐热门标签 | P2-1, P2-2 |

---

### 3. 数据结构与接口（Data Structures & Interfaces）

#### 3.1 新增类型定义

```typescript
// — 以下类型内联定义在各组件中，无需新增 types/ 文件 —

// StateView 组件 Props
interface LoadingStateProps {
  lines?: number;        // 骨架屏行数，默认 3
  className?: string;
}
interface ErrorStateProps {
  message?: string;      // 错误提示文案
  onRetry: () => void;   // 重试回调
}
interface EmptyStateProps {
  message?: string;      // 空状态文案
  icon?: ReactNode;      // 自定义图标
}

// UnreadContext 值类型
interface UnreadContextValue {
  unreadCount: number;
  setUnreadCount: (n: number | ((prev: number) => number)) => void;
  refreshUnreadCount: () => Promise<void>;
}

// AnnouncementBar 内部状态
// announcements: Announcement[]     — 从 apiClient.getPublishedAnnouncements()
// expandedId: number | null         — 当前展开的公告 ID
// currentIndex: number              — 轮播当前索引（P2-5）

// MessagesPage 内部状态
// messages: Message[]               — 从 apiClient.getMyMessages()
// loading / error                   — 标准加载/错误状态
// filterTab: 'all' | 'unread' | 'read'  — P2-4 筛选
// expandedId: number | null         — 当前展开的消息 ID
```

#### 3.2 类图（Class Diagram）

见 `docs/class-diagram.mermaid`，核心关系：

```
┌──────────────────────┐     ┌──────────────────────┐
│     AuthContext       │     │    UnreadContext      │  ★ NEW
│  (已有, 不变)         │     │  unreadCount          │
│  user: User          │     │  setUnreadCount()     │
│  isAuthenticated     │     │  refreshUnreadCount() │
│  logout()            │     └──────┬───────────────┘
└──────┬───────────────┘            │
       │                            │ 消费
       │ 消费                       │
       ▼                            ▼
┌──────────────────────────────────────────┐
│              ProtectedLayout              │  (MODIFY)
│  ┌─────────────────────────────────┐     │
│  │        AnnouncementBar          │ ★NEW│──► apiClient.getPublishedAnnouncements()
│  └─────────────────────────────────┘     │
│  ┌─────────────────────────────────┐     │
│  │            Outlet                │     │
│  │  ┌───────────────────────────┐  │     │
│  │  │ MessagesPage              │★ │     │──► apiClient.getMyMessages()
│  │  │                           │  │     │──► apiClient.markMessageRead()
│  │  │ ProfilePage               │★ │     │──► authState.user
│  │  │ AnnouncementsListPage     │★ │     │──► apiClient.getPublishedAnnouncements()
│  │  └───────────────────────────┘  │     │
│  └─────────────────────────────────┘     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│                Header                     │  (MODIFY)
│  ┌─────────────────────────────────┐     │
│  │ MessageBell (★NEW)              │     │──► UnreadContext
│  │  - 60s 轮询 getUnreadCount()    │     │──► apiClient.getUnreadCount()
│  │  - 角标显示逻辑                  │     │
│  └─────────────────────────────────┘     │
│  ┌─────────────────────────────────┐     │
│  │ Avatar (MODIFY)                 │     │──► NavLink to /profile
│  └─────────────────────────────────┘     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│            NotFoundPage (★NEW)            │  (公开, 无守卫)
└──────────────────────────────────────────┘
```

---

### 4. 程序调用流程（Program Call Flow）

#### 4.1 用户登录后看到公告 + 铃铛角标

见 `docs/sequence-diagram.mermaid` — **图 1: 登录后初始化流程**

简要描述：
1. 用户登录成功 → AuthContext 更新 `isAuthenticated=true`
2. ProtectedLayout 渲染 → AnnouncementBar 挂载 → 调用 `apiClient.getPublishedAnnouncements()` → 渲染第一条公告
3. UnreadProvider 挂载 → 初始调用 `apiClient.getUnreadCount()` → 设置 `unreadCount`
4. Header 内 MessageBell 消费 UnreadContext → 显示角标数字
5. MessageBell 启动 60s 轮询定时器，页面隐藏时暂停（`visibilitychange`）

#### 4.2 用户点击铃铛进入消息列表并标记已读

见 `docs/sequence-diagram.mermaid` — **图 2: 查看消息 → 标记已读流程**

简要描述：
1. 用户点击 Header 铃铛 → `navigate('/messages')`
2. MessagesPage 挂载 → 调用 `apiClient.getMyMessages()` → 渲染消息列表
3. 用户点击某条未读消息 → 展开详情 + 调用 `apiClient.markMessageRead(id)`
4. 成功后 → 本地 `messages` 状态更新该条 `isRead=1` + 调用 `setUnreadCount(prev => prev - 1)`
5. UnreadContext 更新 → MessageBell 角标自动 -1

---

### 5. 待明确事项（Anything UNCLEAR）

| # | 问题 | 默认决策 | 风险 |
|---|------|----------|------|
| Q1 | AnnouncementBar 展示范围：所有 ProtectedLayout 页面 or 仅 4 个内容页？ | 所有 ProtectedLayout 页面（含 /messages /profile /announcements），更简单且公告应全局可见 | 消息页/个人中心略显冗余 |
| Q7 | 头像点击：直接跳转 or 下拉菜单？ | 直接跳转 `/profile`（PRD 默认值），简单可靠 | 跳转体验不如下拉菜单便捷 |
| Q5 | 消息列表前端全量渲染 or 后端分页？ | 前端全量渲染 + 本地筛选（PRD 默认值），消息量 <50 条 | 未来消息量大时需改为虚拟滚动 |

---

## Part B: Task Decomposition

### 6. 依赖包列表（Required Packages）

```
— 无新增依赖 —
现有依赖已满足需求：
- react@^18.3.1          : UI 框架
- react-dom@^18.3.1      : DOM 渲染
- react-router-dom@^6.26 : 路由（新增路由即可）
- lucide-react@^0.460.0  : 图标库（Bell, Mail, User, AlertTriangle 等）
- tailwindcss@^3.4.14    : 样式引擎
```

---

### 7. 任务列表（Task List — Ordered by Dependency）

#### T01 — 共享基础设施 + 公告横幅

| 字段 | 内容 |
|------|------|
| **Task ID** | T01 |
| **Task Name** | 共享组件 StateView + 公告横幅 AnnouncementBar + ProtectedLayout 改造 |
| **Source Files** | `src/components/StateView.tsx` (NEW), `src/components/AnnouncementBar.tsx` (NEW), `src/App.tsx` (MODIFY) |
| **Dependencies** | 无 |
| **Priority** | P0/P1 |

**实现要点**：
1. `StateView.tsx`：导出 `LoadingState`（骨架屏，参数 `lines`）、`ErrorState`（错误文案 + 重试按钮）、`EmptyState`（空状态插画 + 文案）
2. `AnnouncementBar.tsx`：调用 `apiClient.getPublishedAnnouncements()`，取最新 1 条；`maintenance` 用 `bg-amber-500/10 border-amber-500/30`，其他用 `bg-neon-blue/10 border-neon-blue/20`；支持点击展开/收起；无公告 `return null`；右上角"查看全部 → /announcements"
3. `App.tsx` (MODIFY)：在 `ProtectedLayout` 的 `<main>` 内、`<Outlet />` 上方插入 `<AnnouncementBar />`

---

#### T02 — 消息模块（铃铛 + 列表 + 状态同步）

| 字段 | 内容 |
|------|------|
| **Task ID** | T02 |
| **Task Name** | MessageBell + MessagesPage + UnreadContext + Header 集成 + 路由 |
| **Source Files** | `src/contexts/UnreadContext.tsx` (NEW), `src/components/MessageBell.tsx` (NEW), `src/pages/MessagesPage.tsx` (NEW), `src/components/Header.tsx` (MODIFY), `src/App.tsx` (MODIFY) |
| **Dependencies** | T01（使用 StateView 组件） |
| **Priority** | P0 |

**实现要点**：
1. `UnreadContext.tsx`：Provider 包裹 ProtectedLayout；`useEffect` 启动时调用 `getUnreadCount()` + 60s `setInterval` 轮询；`visibilitychange` 暂停/恢复轮询；导出 `{ unreadCount, setUnreadCount, refreshUnreadCount }`
2. `MessageBell.tsx`：消费 `UnreadContext`；`Bell` 图标 + 红色角标 `absolute -top-1 -right-1`；>99 显示 "99+"，0 不显示；点击 `navigate('/messages')`
3. `MessagesPage.tsx`：调用 `getMyMessages()`；按 `createdAt` 倒序渲染；未读加粗 + 左侧蓝点，已读灰色；点击展开详情 + `markMessageRead(id)` + `setUnreadCount(n => n - 1)`；空状态用 `EmptyState`；加载用 `LoadingState`；错误用 `ErrorState`
4. `Header.tsx` (MODIFY)：桌面端 `<div className="hidden items-center gap-3 md:flex">` 内，在搜索框后、用户区前插入 `<MessageBell />`；`import { Bell } from 'lucide-react'` 已改为 `MessageBell` 组件
5. `App.tsx` (MODIFY)：① ProtectedLayout 用 `<UnreadProvider>` 包裹；② 新增 `<Route path="/messages" element={<MessagesPage />} />`

---

#### T03 — 个人中心 + Header 头像可点击

| 字段 | 内容 |
|------|------|
| **Task ID** | T03 |
| **Task Name** | ProfilePage + Header 头像 NavLink + 路由 |
| **Source Files** | `src/pages/ProfilePage.tsx` (NEW), `src/components/Header.tsx` (MODIFY), `src/App.tsx` (MODIFY) |
| **Dependencies** | T01（使用 StateView） |
| **Priority** | P1 |

**实现要点**：
1. `ProfilePage.tsx`：读取 `authState.user` 渲染；卡片式布局 `max-w-md mx-auto`；头像首字母大圆、用户名、邮箱、手机（脱敏）、注册时间（`new Date(createdAt).toLocaleDateString('zh-CN')`）、角色标签列表、管理员显示 `进入管理后台` 按钮（`navigate('/admin/dashboard')`）、`退出登录` 按钮（`logout()` + `navigate('/login')`）
2. `Header.tsx` (MODIFY)：桌面端头像 `div` + 昵称 `span` 包裹为 `<NavLink to="/profile">`；移动端菜单头像区同理；添加 `hover:opacity-80 cursor-pointer` 交互
3. `App.tsx` (MODIFY)：新增 `<Route path="/profile" element={<ProfilePage />} />`

---

#### T04 — 404 页面 + 公告归档列表

| 字段 | 内容 |
|------|------|
| **Task ID** | T04 |
| **Task Name** | NotFoundPage + AnnouncementsListPage + 路由替换 |
| **Source Files** | `src/pages/NotFoundPage.tsx` (NEW), `src/pages/AnnouncementsListPage.tsx` (NEW), `src/App.tsx` (MODIFY) |
| **Dependencies** | T01（使用 StateView） |
| **Priority** | P1 |

**实现要点**：
1. `NotFoundPage.tsx`：大号 404 渐变文字 `gradient-text text-8xl`；文案"页面走丢了"；两个按钮："返回首页" → `/cloud-games`，"返回上一页" → `navigate(-1)`；居中 `py-20`；公开路由无守卫
2. `AnnouncementsListPage.tsx`：调用 `getPublishedAnnouncements()`；卡片列表按 `createdAt` 倒序；顶部 Type 筛选 Tab（全部/通知/公告/维护）；空状态用 `EmptyState`
3. `App.tsx` (MODIFY)：① `*` 路由从 `<Navigate to="/cloud-games">` 改为 `<Route path="*" element={<NotFoundPage />} />`；② 新增 `<Route path="/announcements" element={<AnnouncementsListPage />} />`

---

#### T05 — P2 增强（搜索分页 + 移动端菜单 + 消息筛选）

| 字段 | 内容 |
|------|------|
| **Task ID** | T05 |
| **Task Name** | 搜索分页/空状态推荐 + 移动端菜单补全 + 消息筛选 Tab |
| **Source Files** | `src/pages/SearchPage.tsx` (MODIFY), `src/components/Header.tsx` (MODIFY), `src/pages/MessagesPage.tsx` (MODIFY) |
| **Dependencies** | T02（MessagesPage 已有基础）, T03（Header 已有头像链接） |
| **Priority** | P2 |

**实现要点**：
1. `SearchPage.tsx` (MODIFY)：① 每个分类（games/platforms/deals）初始显示 12 条，超出显示"加载更多"按钮追加 12 条；② 无结果时展示热门标签（"云游戏""免费""3A""MOBA"），点击填入搜索框
2. `Header.tsx` (MODIFY)：移动端菜单 `<nav>` 后增加分割线 + 用户操作区：`"个人中心" → /profile`、`"我的消息" → /messages`（带未读数）、管理后台（仅 admin）、退出登录
3. `MessagesPage.tsx` (MODIFY)：顶部 Tab 栏 `全部 | 未读 | 已读`，`useMemo` 本地过滤 `messages` 数组

---

### 8. 共享知识（Shared Knowledge — Cross-cutting Concerns）

#### 8.1 样式约定

```
暗色主题 Token（沿用现有）:
  bg-game-dark       → 最深背景 #0a0a1a
  bg-game-darker     → Header 背景 rgba(0,0,0,0.8)
  bg-game-card       → 卡片背景 rgba(255,255,255,0.04)
  bg-game-elevated   → 悬浮层 rgba(255,255,255,0.06)
  border-game-border → 边框 rgba(255,255,255,0.08)
  
  品牌色:
  neon-blue          → #3b82f6
  neon-purple        → #8b5cf6
  neon-green         → #10b981

  文字:
  text-slate-200     → 主文字
  text-slate-400     → 次要文字
  text-slate-500     → 占位符/禁用

新组件约定:
  - 所有新组件卡片使用 rounded-2xl border border-game-border bg-game-card
  - 按钮主操作: bg-gradient-to-r from-neon-blue to-neon-purple
  - 公告 maintenance: bg-amber-500/10 border-amber-500/30 text-amber-400
  - 公告其他类型: bg-neon-blue/10 border-neon-blue/20 text-neon-blue
  - 未读标识: 蓝色圆点 bg-neon-blue h-2 w-2 rounded-full
  - 角标: bg-red-500 text-white text-[10px] min-w-4 h-4 rounded-full
```

#### 8.2 组件约定

```
Props 接口:
  - 所有组件 Props 内联 interface，不单独导出类型文件
  - 回调使用 onXxx 命名（onRetry, onClose）

数据获取:
  - 统一使用 apiClient 单例方法，不直接调用 fetch
  - 使用 useEffect + useState 模式（参考 CloudGamesPage.tsx）
  - cleanup 使用 mounted 标志位防止内存泄漏

错误处理:
  - apiClient 方法已内置 throw on error
  - 组件 catch 后设置 error state，渲染 ErrorState
  - ErrorState 提供 onRetry 重新执行 fetch

加载状态:
  - 初始加载显示 LoadingState（骨架屏）
  - 刷新不显示全屏 loading（静默刷新）
```

#### 8.3 路由守卫规范

```
公开路由（无需登录）:
  /login, /admin/login, * (NotFoundPage)

ProtectedLayout（需登录）:
  所有内容页 + 消息 + 个人中心 + 公告列表
  → 未登录自动重定向 /login（ProtectedRoute 已处理）

AdminProtectedLayout（需登录 + 管理员/权限）:
  所有 /admin/* 路由（不变）
```

#### 8.4 未读数同步机制

```
UnreadContext 包裹 ProtectedLayout:
  - 初始化: 调用 getUnreadCount() 设置初始值
  - 轮询: setInterval 60s，页面隐藏暂停（visibilitychange）
  - 消费方: MessageBell 显示角标，MessagesPage 标记已读后 -1
  - 注意: setUnreadCount 支持函数式更新 setUnreadCount(prev => prev - 1)
```

---

### 9. 任务依赖图（Task Dependency Graph）

```
T01 (基础设施)
 │
 ├──► T02 (消息模块) ──────────────┐
 ├──► T03 (个人中心) ──────────────┤
 └──► T04 (404 + 公告归档)          │
                                   ▼
                              T05 (P2 增强)
                              
并行组: T02 ‖ T03 ‖ T04（三者互不依赖，可并行开发）
串行: T01 → 并行组 → T05
```

---

### 附录：设计原则检查清单

- [x] **不新增后端 API**：全部复用现有 5 个端点
- [x] **不新增 npm 依赖**：lucide-react 已安装
- [x] **类型安全**：全部使用已有 `Announcement` / `Message` / `User` 类型
- [x] **暗色主题一致**：全部使用现有 Tailwind token
- [x] **路由守卫正确**：消息/个人中心/公告列表挂 ProtectedLayout，404 公开
- [x] **XSS 防护**：公告/消息内容按纯文本 + `\n → <br>` 渲染，不使用 `dangerouslySetInnerHTML`
- [x] **轮询优化**：60s + visibilitychange 暂停，降低 D1 读消耗
