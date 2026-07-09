/**
 * RBAC + Settings type definitions.
 *
 * Covers roles, permissions, role-permission associations,
 * user-role bindings, and system settings for cloudgame-hub admin.
 */

/** 权限码联合类型（18种）。 */
export type PermissionCode =
  | "dashboard:view"
  | "user:view"
  | "user:manage"
  | "platform:view"
  | "platform:manage"
  | "desktop:view"
  | "desktop:manage"
  | "deal:view"
  | "deal:manage"
  | "game:view"
  | "game:manage"
  | "role:manage"
  | "settings:manage"
  | "announcement:view"
  | "announcement:manage"
  | "message:view"
  | "message:manage"
  | "log:view";

/** 权限项（对应 permissions 表）。 */
export interface Permission {
  /** Primary key. */
  id: number;
  /** Unique permission code, e.g. "user:manage". */
  code: string;
  /** Human-readable name. */
  name: string;
  /** Module grouping, e.g. "user". */
  module: string;
  /** Action type: "view" or "manage". */
  action: string;
  /** Sort order for display. */
  sortOrder: number;
}

/** 按模块分组的权限（用于权限分配视图）。 */
export interface PermissionGroup {
  /** Module identifier. */
  module: string;
  /** Display label for the module. */
  moduleLabel: string;
  /** Permissions belonging to this module. */
  permissions: Permission[];
}

/** 角色（对应 roles 表）。 */
export interface Role {
  /** Primary key. */
  id: number;
  /** Display name. */
  name: string;
  /** Unique role code, e.g. "super_admin". */
  code: string;
  /** Description text. */
  description: string;
  /** Whether this is a built-in system role (cannot delete or disable). */
  isSystem: boolean;
  /** Status: 1 = enabled, 0 = disabled. */
  status: number;
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Last update timestamp (ISO 8601). */
  updatedAt: string;
}

/** 角色列表项（含绑定用户数和权限数）。 */
export interface RoleListItem extends Role {
  /** Number of users bound to this role. */
  userCount: number;
  /** Number of permissions assigned to this role. */
  permissionCount: number;
}

/** 创建角色请求体。 */
export interface CreateRoleRequest {
  /** Display name. */
  name: string;
  /** Unique code (lowercase letters + underscore only). */
  code: string;
  /** Optional description. */
  description?: string;
  /** Optional status (default 1). */
  status?: number;
}

/** 更新角色请求体（code 不可改）。 */
export interface UpdateRoleRequest {
  /** Display name. */
  name?: string;
  /** Description text. */
  description?: string;
  /** Status: 1 = enabled, 0 = disabled. */
  status?: number;
}

/** 更新角色权限请求体（全量覆盖）。 */
export interface UpdateRolePermissionsRequest {
  /** Array of permission IDs to assign (replaces existing). */
  permissionIds: number[];
}

/** 简化角色信息（用户角色绑定弹窗用）。 */
export interface RoleOption {
  /** Primary key. */
  id: number;
  /** Display name. */
  name: string;
  /** Unique role code. */
  code: string;
  /** Status: 1 = enabled, 0 = disabled. */
  status: number;
}

/** 更新用户角色请求体（全量覆盖）。 */
export interface UpdateUserRolesRequest {
  /** Array of role IDs to assign (replaces existing). */
  roleIds: number[];
}

/** 系统设置项（对应 settings 表）。 */
export interface SettingItem {
  /** Setting key. */
  key: string;
  /** Setting value (stored as string). */
  value: string;
  /** Group: "basic" | "params" | "logging". */
  group: string;
  /** Last update timestamp (ISO 8601). */
  updatedAt: string;
}

/** 按分组返回的设置（GET /api/admin/settings 响应）。 */
export type SettingsByGroup = Record<string, SettingItem[]>;

/** 批量更新设置请求体。 */
export interface UpdateSettingsRequest {
  /** Key-value pairs to update. */
  settings: Record<string, string>;
}
