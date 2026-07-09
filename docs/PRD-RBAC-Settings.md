# 增量 PRD：权限角色（RBAC）+ 系统设置模块

> **项目**: cloudgame-hub 后台管理系统
> **版本**: V4.0 增量
> **日期**: 2026-07-06
> **状态**: 待评审

---

## 1. 项目信息

| 字段 | 值 |
|------|-----|
| 项目名称 | cloudgame-hub |
| 技术栈 | Vite + React + TypeScript + Tailwind CSS + Cloudflare Pages Functions + D1 (SQLite) |
| 编程语言 | TypeScript |
| 原始需求 | 完善后台管理系统的权限角色和系统设置模块。权限角色部分需包含角色创建、编辑、删除，角色与权限的灵活分配，用户角色绑定，以及基于角色的访问控制（RBAC）。系统设置部分需涵盖基础配置、参数管理、日志设置等常用后台配置功能。整体设计参考主流企业级后台管理系统的标准做法，确保功能完整、逻辑严谨、交互友好。后台各模块需结构清晰，代码规范，具备良好的可维护性和可扩展性。 |

### 现有系统基线

- **前端**: React Router v6 嵌套路由，AdminLayout（暗色侧边栏 #1a1d2e + 亮色内容区 #f5f6fa），AuthContext 管理 JWT 认证状态
- **后端**: Cloudflare Pages Functions，_middleware.ts 解析 JWT 注入 context.data.user，各 admin 端点检查 context.data.user?.isAdmin 布尔值
- **数据库**: D1 (SQLite)，users 表含 is_admin 字段（0/1 整数），无 roles/permissions/settings 表
- **侧边栏**: 已有「权限角色」(/admin/roles) 和「系统设置」(/admin/settings) 两个占位入口，当前指向 PlaceholderPage
- **API 响应格式**: 统一信封 { code: number, data: T | null, message: string }，code === 0 为成功

### 变更范围

本次增量**不改动**前台页面和现有内容管理功能，仅新增/修改以下部分：

- 新增 D1 表：roles、permissions、role_permissions、user_roles、settings
- 新增前端页面：角色管理页、系统设置页（替换现有 PlaceholderPage）
- 新增后端 API：角色 CRUD、权限分配、用户角色绑定、设置读写
- 改造现有逻辑：AdminRoute 从 isAdmin 布尔判断升级为 RBAC 权限校验；JWT payload 新增 roles 字段

---

## 2. 产品目标

| # | 目标 | 衡量标准 |
|---|------|----------|
| G1 | **实现细粒度 RBAC 权限控制**，替代当前单一的 is_admin 布尔值，支持按「模块+操作」粒度控制后台各功能的访问 | 至少支持 6 个模块的独立权限控制；前端路由级 + 后端 API 级双重校验，无越权漏洞 |
| G2 | **提供可视化角色与权限管理界面**，使超级管理员无需改代码即可创建角色、分配权限、绑定用户 | 角色创建/编辑/删除/分配权限/绑定用户全流程可在 UI 完成，操作不超过 3 次点击到达目标功能 |
| G3 | **集中管理后台运营参数**，将硬编码配置迁移到数据库，支持动态读写无需重新部署 | 网站名称、Logo、备案号等基础配置 + 验证码有效期等参数 + 日志开关，均可在设置页修改并即时生效 |

---

## 3. 用户故事

### 超级管理员（Super Admin）

> **US-1**: 作为超级管理员，我希望能够创建自定义角色并为其分配特定模块的权限，这样不同岗位的人员只能看到和操作他们职责范围内的功能。

> **US-2**: 作为超级管理员，我希望能够给用户分配一个或多个角色，这样当人员岗位变动时可以快速调整其权限范围，而不需要逐个修改功能开关。

> **US-3**: 作为超级管理员，我希望系统设置页能集中管理网站名称、Logo、备案号等基础信息，这样前端展示的信息可以随时调整而无需发版。

> **US-4**: 作为超级管理员，我希望能够配置验证码有效期、密码长度限制等运营参数，这样我可以根据安全要求灵活调整策略。

### 普通管理员 / 运营人员（Operator）

> **US-5**: 作为运营人员，我希望登录后台后只能看到我有权限的菜单和页面，这样我不会误入不相关的功能模块造成误操作。

> **US-6**: 作为运营人员，当我没有某模块的操作权限但需要查看数据时，我希望页面能以只读模式展示数据而非完全隐藏，这样我可以了解业务状况但不能修改。

> **US-7**: 作为运营人员，如果尝试通过直接输入 URL 访问无权限的页面，我希望看到明确的 403 提示而非白屏或报错。
---

## 4. 需求池

### 4.1 权限角色模块

#### P0 — Must Have

| ID | 需求 | 描述 | 验收标准 |
|----|------|------|----------|
| RBAC-01 | 角色列表页 | 展示所有角色的表格，含角色名称、标识、描述、绑定用户数、创建时间、状态、操作按钮 | 支持分页；显示每角色绑定的用户数；操作列含「编辑」「分配权限」「删除」 |
| RBAC-02 | 创建角色 | 表单创建新角色，字段：角色名称、角色标识（英文唯一）、描述、状态（启用/禁用） | 角色标识仅允许 [a-z_]+，自动转小写；名称重复时提示冲突 |
| RBAC-03 | 编辑角色 | 修改角色名称、描述、状态 | 角色标识创建后不可修改；超级管理员角色不可禁用/删除 |
| RBAC-04 | 删除角色 | 删除角色前检查是否仍有用户绑定 | 有绑定用户时拒绝删除并提示用户数；超级管理员角色不可删除 |
| RBAC-05 | 权限定义体系 | 权限按「模块:操作」粒度定义，前端硬编码权限清单 | 见下方权限清单表 |
| RBAC-06 | 角色权限分配 | 角色编辑页内 Tab 切换到「权限分配」，树形/分组 Checkbox 展示所有权限，勾选后保存 | 按模块分组展示；支持全选/反选某模块；保存后立即生效 |
| RBAC-07 | 用户角色绑定 | 用户管理页新增「分配角色」操作，弹窗展示可选角色列表（多选），保存后绑定 | 一个用户可绑定多个角色；权限取所有角色并集；显示用户当前角色标签 |
| RBAC-08 | 前端路由级权限控制 | AdminRoute 升级为基于权限的路由守卫，无权限路由重定向到 403 页面 | 超级管理员拥有全部权限；侧边栏仅展示有权限的菜单项 |
| RBAC-09 | 后端 API 级权限校验 | 所有 admin API 端点增加权限校验中间件，校验 permission 而非仅 isAdmin | 未持有所需权限返回 403；超级管理员角色自动通过所有校验 |
| RBAC-10 | JWT Payload 升级 | JWT 签发时注入 roles 和 permissions 数组，前端 AuthContext 解析后用于路由守卫 | 现有 isAdmin 字段保留向后兼容；新增 roles: string[] 和 permissions: string[] |
| RBAC-11 | 预置角色初始化 | 系统首次部署时自动创建「超级管理员」和「运营人员」两个预置角色 | 超级管理员拥有全部权限且不可修改权限分配；运营人员拥有内容管理查看+用户查看权限 |

#### P1 — Should Have

| ID | 需求 | 描述 | 验收标准 |
|----|------|------|----------|
| RBAC-12 | 权限粒度区分 view/manage | 对内容管理类模块区分 :view（只读）和 :manage（增删改）两个操作级别 | 只有 :view 权限时，页面隐藏新增/编辑/删除按钮；API 层面 :manage 操作返回 403 |
| RBAC-13 | 用户管理页角色筛选 | 用户列表支持按角色筛选，显示该角色下的所有用户 | 筛选下拉含「全部」「超级管理员」「运营人员」+ 自定义角色 |
| RBAC-14 | 角色状态禁用 | 禁用角色后，该角色绑定的用户立即失去对应权限 | 禁用操作需二次确认；禁用后用户权限实时收缩 |

#### P2 — Nice to Have

| ID | 需求 | 描述 | 验收标准 |
|----|------|------|----------|
| RBAC-15 | 操作日志查看 | 记录角色/权限/用户角色变更操作，提供日志列表页 | 记录操作人、操作类型、目标对象、时间；支持按时间范围筛选 |
### 4.2 系统设置模块

#### P0 — Must Have

| ID | 需求 | 描述 | 验收标准 |
|----|------|------|----------|
| SET-01 | 设置页 Tab 布局 | 系统设置页使用 Tab 切换：基础配置 / 参数管理 / 日志设置 | Tab 切换不刷新页面；URL hash 同步当前 Tab |
| SET-02 | 基础配置表单 | 表单字段：网站名称、网站 Logo URL、备案号、联系邮箱、客服 QQ/微信、网站描述 | 保存成功后 toast 提示；字段校验非空；Logo URL 格式校验 |
| SET-03 | 参数管理表单 | 可配置参数：验证码有效期（分钟）、密码最小长度、密码最大尝试次数、用户注册开关、邮箱验证码发送间隔（秒） | 数值型参数校验范围；开关型参数使用 Toggle 组件；保存后即时生效 |
| SET-04 | 日志设置表单 | 配置项：操作日志记录开关、日志保留天数（天）、登录日志记录开关 | 日志保留天数范围 7-365；开关型使用 Toggle；保存后即时生效 |
| SET-05 | settings 表结构 | D1 新建 settings 表，key-value 结构，含分组字段 | 表结构：key TEXT PK, value TEXT, group TEXT, updated_at TEXT；支持按 group 批量读取 |
| SET-06 | 设置读写 API | GET /api/admin/settings 批量读取，PUT /api/admin/settings 批量更新 | 需要 settings:manage 权限；返回按 group 分组的配置项 |

#### P1 — Should Have

| ID | 需求 | 描述 | 验收标准 |
|----|------|------|----------|
| SET-07 | 基础配置实时生效 | 网站名称、Logo 等前端展示信息从 settings API 读取，修改后前台即时更新 | 前台 Header/Footer 从 API 读取配置；API 不可用时 fallback 到默认值 |
| SET-08 | 参数管理校验逻辑联动 | 密码最小长度修改后，注册/修改密码接口的实际校验逻辑读取该配置 | 注册接口校验密码长度时读取 settings 值而非硬编码 |

#### P2 — Nice to Have

| ID | 需求 | 描述 | 验收标准 |
|----|------|------|----------|
| SET-09 | 操作日志查看页 | 独立的日志查看页面，展示操作日志列表 | 需配合 RBAC-15；支持按操作类型、时间范围、操作人筛选 |

---

### 4.3 权限清单

权限以 模块:操作 格式定义，前端硬编码为常量，后端 API 校验时比对。

| 权限标识 | 模块 | 操作 | 说明 |
|----------|------|------|------|
| dashboard:view | 仪表盘 | 查看 | 查看仪表盘统计数据 |
| user:view | 用户管理 | 查看 | 查看用户列表 |
| user:manage | 用户管理 | 管理 | 设为/取消管理员、删除用户、分配角色 |
| platform:view | 云游戏平台 | 查看 | 查看平台列表 |
| platform:manage | 云游戏平台 | 管理 | 增删改平台信息 |
| desktop:view | 办公云电脑 | 查看 | 查看云电脑列表 |
| desktop:manage | 办公云电脑 | 管理 | 增删改云电脑信息 |
| deal:view | 薅羊毛 | 查看 | 查看薅羊毛列表 |
| deal:manage | 薅羊毛 | 管理 | 增删改薅羊毛信息 |
| game:view | 游戏库 | 查看 | 查看游戏列表 |
| game:manage | 游戏库 | 管理 | 增删改游戏信息 |
| role:manage | 权限角色 | 管理 | 角色 CRUD、权限分配、用户角色绑定 |
| settings:manage | 系统设置 | 管理 | 读取和修改系统配置 |

### 4.4 预置角色权限分配

| 权限标识 | 超级管理员 (super_admin) | 运营人员 (operator) |
|----------|:---:|:---:|
| dashboard:view | YES | YES |
| user:view | YES | YES |
| user:manage | YES | - |
| platform:view | YES | YES |
| platform:manage | YES | - |
| desktop:view | YES | YES |
| desktop:manage | YES | - |
| deal:view | YES | YES |
| deal:manage | YES | YES |
| game:view | YES | YES |
| game:manage | YES | - |
| role:manage | YES | - |
| settings:manage | YES | - |

> **说明**: 超级管理员拥有全部权限且不可在 UI 上修改其权限分配；运营人员拥有全部模块的查看权限 + 薅羊毛的管理权限（运营核心功能）。
---

## 5. UI 设计稿描述

### 5.1 整体布局

保持现有 AdminLayout 结构不变（暗色侧边栏 #1a1d2e + 亮色内容区 #f5f6fa）。侧边栏「系统」分组下的「权限角色」和「系统设置」入口从 PlaceholderPage 替换为实际功能页面。

侧边栏菜单项根据当前用户权限动态显示/隐藏：
- 无 role:manage 权限则隐藏「权限角色」入口
- 无 settings:manage 权限则隐藏「系统设置」入口

### 5.2 权限角色页 (/admin/roles)

#### 5.2.1 角色列表（默认视图）

布局说明：
- 页面顶部右上角「+ 新建角色」蓝色按钮
- 表格列：ID、角色名称、角色标识（等宽字体灰色显示）、描述、绑定用户数（可点击跳转用户管理页筛选该角色）、状态（绿色「启用」/ 红色「禁用」标签）、操作
- 操作列：「编辑」（打开编辑弹窗）、「权限」（跳转权限分配视图）、「删除」（红色文字，超级管理员角色不显示删除按钮）
- 超级管理员行特殊处理：操作列只显示「编辑」，不显示「权限」和「删除」（权限不可修改）
- 底部分页：共 N 条记录 + 页码导航

#### 5.2.2 创建/编辑角色弹窗

弹窗字段：
- **角色名称**: 必填，1-20 字符
- **角色标识**: 必填，创建时可编辑（仅 [a-z_]+，自动转小写），编辑时灰显不可修改
- **描述**: 选填，最多 100 字符
- **状态**: 单选，默认「启用」

编辑模式下标题改为「编辑角色」，确认按钮改为「保存修改」。弹窗底部「取消」+「确认创建/保存修改」按钮。

#### 5.2.3 权限分配视图

角色列表页点击「权限」按钮后，页面切换为该角色的权限分配视图（路由参数 ?tab=permissions&roleId=1）：

- 顶部：「返回角色列表」+「角色名称 - 权限分配」标题
- 权限按三个分组展示 Checkbox：「用户管理」「内容管理」「系统管理」
- 内容管理分组支持「全选/反选」快速操作
- 每个 Checkbox 后显示权限中文名称和说明
- 超级管理员角色的权限分配视图为只读（所有 Checkbox 灰显勾选状态），不显示「保存权限」按钮
- 底部「重置」+「保存权限」按钮，保存成功后 toast 提示「权限已更新」

#### 5.2.4 用户角色绑定弹窗（用户管理页内）

在现有用户管理页 (/admin/users) 的操作列新增「分配角色」按钮：
- 弹窗标题：「分配角色 - 用户邮箱」
- 弹窗内容：角色列表多选 Checkbox，显示所有启用状态的角色
- 底部提示文字：「一个用户可绑定多个角色，权限取所有角色的并集。」
- 用户列表「角色」列从显示 isAdmin 标签改为显示角色标签（多个角色用彩色 Tag 展示）
- 仍保留 is_admin 字段用于向后兼容，但 UI 上以角色为准
### 5.3 系统设置页 (/admin/settings)

#### 5.3.1 整体布局

左侧垂直 Tab 导航（或顶部水平 Tab），三个选项：「基础配置」「参数管理」「日志设置」。切换时更新 URL hash（#basic / #params / #logging），不刷新页面。

#### 5.3.2 基础配置 Tab

表单字段（Label 在上方，Input 全宽，字段间 1.5rem 间距）：
- 网站名称（必填）
- 网站 Logo URL（选填，输入后实时显示预览图，加载失败显示占位符）
- 备案号（选填）
- 联系邮箱（选填）
- 客服 QQ（选填）
- 客服微信（选填）
- 网站描述（选填，多行文本）

底部「重置」+「保存配置」按钮，保存成功后 toast 提示「配置已保存」。

#### 5.3.3 参数管理 Tab

按三个分组展示：
- **安全策略**：密码最小长度（数字输入 6-32）、密码最大尝试次数（数字输入 3-10）
- **验证码策略**：验证码有效期分钟（数字输入 1-30）、发送间隔秒（数字输入 30-300）
- **注册策略**：允许用户注册（Toggle 开关）

数值型参数使用数字输入框 + 上下箭头，标注范围提示。开关型参数使用 Toggle 组件（蓝色开关）。

#### 5.3.4 日志设置 Tab

配置项：
- 操作日志记录（Toggle 开关 + 灰色描述「记录后台所有增删改操作」）
- 登录日志记录（Toggle 开关 + 灰色描述「记录管理员登录时间和 IP」）
- 日志保留天数（数字输入 7-365 + 描述「超过此天数的日志将被自动清理」）

此页面仅配置日志记录行为，不包含日志查看功能（日志查看为 P2）。

### 5.4 403 无权限页面

当用户通过 URL 直接访问无权限的页面时，显示居中布局的 403 提示页：
- 锁图标
- 「403 - 无权访问」标题
- 「您没有访问该页面的权限，请联系管理员分配相关角色。」描述
- 「返回仪表盘」+「返回前台」两个按钮

---

## 6. 数据库设计

### 6.1 新增表

```sql
-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  code        TEXT    UNIQUE NOT NULL,
  description TEXT    DEFAULT '',
  is_system   INTEGER NOT NULL DEFAULT 0,
  status      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    UNIQUE NOT NULL,
  name        TEXT    NOT NULL,
  module      TEXT    NOT NULL,
  action      TEXT    NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- 角色-权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- 用户-角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    INTEGER NOT NULL,
  role_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 系统设置表（key-value 结构）
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    DEFAULT '',
  "group"     TEXT    NOT NULL DEFAULT 'basic',
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_settings_group ON settings("group");
```

### 6.2 预置数据

```sql
-- 预置角色
INSERT INTO roles (name, code, description, is_system, status) VALUES
  ('超级管理员', 'super_admin', '拥有系统全部权限，不可删除或禁用', 1, 1),
  ('运营人员', 'operator', '负责日常内容运营，可管理薅羊毛和查看所有数据', 1, 1);

-- 预置权限
INSERT INTO permissions (code, name, module, action, sort_order) VALUES
  ('dashboard:view', '查看仪表盘', 'dashboard', 'view', 1),
  ('user:view', '查看用户', 'user', 'view', 2),
  ('user:manage', '管理用户', 'user', 'manage', 3),
  ('platform:view', '查看云游戏平台', 'platform', 'view', 4),
  ('platform:manage', '管理云游戏平台', 'platform', 'manage', 5),
  ('desktop:view', '查看办公云电脑', 'desktop', 'view', 6),
  ('desktop:manage', '管理办公云电脑', 'desktop', 'manage', 7),
  ('deal:view', '查看薅羊毛', 'deal', 'view', 8),
  ('deal:manage', '管理薅羊毛', 'deal', 'manage', 9),
  ('game:view', '查看游戏库', 'game', 'view', 10),
  ('game:manage', '管理游戏库', 'game', 'manage', 11),
  ('role:manage', '管理权限角色', 'role', 'manage', 12),
  ('settings:manage', '管理系统设置', 'settings', 'manage', 13);

-- 超级管理员拥有全部权限
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'super_admin';

-- 运营人员权限
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'operator' AND p.code IN (
    'dashboard:view', 'user:view',
    'platform:view', 'desktop:view', 'deal:view', 'deal:manage',
    'game:view'
  );

-- 预置系统设置
INSERT INTO settings (key, value, "group") VALUES
  ('site_name', '云游戏中心', 'basic'),
  ('logo_url', '', 'basic'),
  ('icp_number', '', 'basic'),
  ('contact_email', '', 'basic'),
  ('contact_qq', '', 'basic'),
  ('contact_wechat', '', 'basic'),
  ('site_description', '', 'basic'),
  ('password_min_length', '8', 'params'),
  ('password_max_attempts', '5', 'params'),
  ('verification_code_ttl', '10', 'params'),
  ('verification_code_interval', '60', 'params'),
  ('registration_enabled', 'true', 'params'),
  ('operation_log_enabled', 'true', 'logging'),
  ('login_log_enabled', 'true', 'logging'),
  ('log_retention_days', '30', 'logging');
```

---

## 7. API 设计

### 7.1 权限角色 API

| 方法 | 路径 | 所需权限 | 描述 |
|------|------|----------|------|
| GET | `/api/admin/roles` | `role:manage` | 获取角色列表（含每角色绑定的用户数和权限列表） |
| POST | `/api/admin/roles` | `role:manage` | 创建新角色 |
| PUT | `/api/admin/roles/:id` | `role:manage` | 编辑角色（名称、描述、状态） |
| DELETE | `/api/admin/roles/:id` | `role:manage` | 删除角色（需无绑定用户） |
| GET | `/api/admin/roles/:id/permissions` | `role:manage` | 获取角色当前权限列表 |
| PUT | `/api/admin/roles/:id/permissions` | `role:manage` | 更新角色权限（全量覆盖） |
| GET | `/api/admin/permissions` | `role:manage` | 获取全部权限清单（按模块分组） |
| PUT | `/api/admin/users/:id/roles` | `user:manage` | 更新用户角色绑定（全量覆盖） |
| GET | `/api/admin/users/:id/roles` | `user:view` | 获取用户当前角色列表 |

### 7.2 系统设置 API

| 方法 | 路径 | 所需权限 | 描述 |
|------|------|----------|------|
| GET | `/api/admin/settings` | `settings:manage` | 获取全部设置（按 group 分组返回） |
| GET | `/api/admin/settings?group=basic` | `settings:manage` | 按分组获取设置 |
| PUT | `/api/admin/settings` | `settings:manage` | 批量更新设置（传入 key-value 对象） |

### 7.3 JWT Payload 变更

现有 JWT payload:
```json
{
  "userId": 1,
  "email": "admin@example.com",
  "username": "管理员",
  "isAdmin": true,
  "iat": 1234567890,
  "exp": 1234567890
}
```

新增后的 JWT payload:
```json
{
  "userId": 1,
  "email": "admin@example.com",
  "username": "管理员",
  "isAdmin": true,
  "roles": ["super_admin"],
  "permissions": ["dashboard:view", "user:view", "user:manage", "..."],
  "iat": 1234567890,
  "exp": 1234567890
}
```

> **注意**: `isAdmin` 字段保留向后兼容（有任意启用角色即为 true），新增 `roles: string[]` 和 `permissions: string[]`。登录时查询用户角色及权限并注入 JWT。

---

## 8. 待确认问题

| # | 问题 | 影响范围 | 建议默认值 |
|---|------|----------|------------|
| Q1 | 现有 `is_admin` 字段是否保留？还是完全废弃改用角色？ | 数据库、JWT、前后端权限校验 | 建议保留 `is_admin` 向后兼容，同时新增 RBAC 层。有 `super_admin` 角色的用户 `is_admin` 自动为 true |
| Q2 | 已有的 `is_admin = 1` 用户如何迁移到 RBAC？ | 数据迁移 | 建议迁移脚本：所有 `is_admin = 1` 的用户自动绑定 `super_admin` 角色 |
| Q3 | 权限变更后，已登录用户的 JWT 如何更新？ | 用户体验 | 建议方案：权限变更后不强制重新登录，但在下次请求 API 时后端实时校验数据库中的最新权限（JWT 中的 permissions 仅用于前端路由守卫，后端不信任 JWT 中的权限而是实时查库） |
| Q4 | 系统设置中的网站名称/Logo 等是否需要前台实时读取并展示？ | 前台改造范围 | P0 阶段仅做后台配置页面，前台读取展示为 P1。如用户希望前台也立即生效，需额外改造 Header/Footer 组件 |
| Q5 | 是否需要支持角色克隆（复制现有角色权限快速创建新角色）？ | 角色管理交互 | 建议作为 P2 功能，当前 PRD 不包含 |
| Q6 | 操作日志是否需要记录到独立的 D1 表（如 `operation_logs`）？ | 数据库设计 | 日志设置（开关+保留天数）为 P0，日志记录写入和查看为 P2。P0 阶段仅实现配置项，不实际记录日志 |

---

## 9. 技术约束与规范

1. **前端代码规范**: 遵循现有项目风格 — 函数组件 + Hooks，TypeScript 严格类型，Tailwind CSS 类名，lucide-react 图标
2. **后端代码规范**: 遵循现有 Pages Functions 模式 — `onRequestGet/onRequestPost/onRequestPut/onRequestDelete`，使用 `lib/response.ts` 统一响应，`context.data.user` 获取用户信息
3. **权限校验中间件**: 新建 `functions/lib/permission.ts`，导出 `requirePermission(context, permission)` 函数，后端各 admin 端点调用
4. **前端权限守卫**: 新建 `src/components/PermissionRoute.tsx`，替代或增强现有 `AdminRoute`，基于 `authState.user.permissions` 数组判断
5. **前端权限常量**: 新建 `src/constants/permissions.ts`，硬编码权限清单和模块分组，供路由守卫和 UI 渲染使用
6. **数据库迁移**: 新建 `schema-rbac.sql` 迁移脚本，包含建表 + 预置数据，通过 `wrangler d1 execute` 执行
