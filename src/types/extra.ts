/**
 * 扩展模块类型定义：公告管理 + 站内信 + 日志查看。
 *
 * 对应 D1 表: announcements, messages, operation_logs, login_logs。
 */

// ── 公告类型 ──────────────────────────────────────────────

/** 公告类型。 */
export type AnnouncementType = "notice" | "announcement" | "maintenance";

/** 公告状态：0=草稿, 1=已发布, 2=已归档。 */
export type AnnouncementStatus = 0 | 1 | 2;

/** 公告项（对应 announcements 表）。 */
export interface Announcement {
  /** 主键 ID。 */
  id: number;
  /** 公告标题。 */
  title: string;
  /** 公告内容。 */
  content: string;
  /** 公告类型：notice / announcement / maintenance。 */
  type: AnnouncementType;
  /** 状态：0=草稿, 1=已发布, 2=已归档。 */
  status: AnnouncementStatus;
  /** 排序值，越大越靠前。 */
  sortOrder: number;
  /** 创建者用户 ID。 */
  createdBy: number | null;
  /** 创建时间（ISO 8601）。 */
  createdAt: string;
  /** 更新时间（ISO 8601）。 */
  updatedAt: string;
  /** 发布时间（ISO 8601），草稿为 null。 */
  publishedAt: string | null;
}

/** 创建/编辑公告请求体。 */
export interface SaveAnnouncementRequest {
  /** 公告标题。 */
  title: string;
  /** 公告内容。 */
  content: string;
  /** 公告类型。 */
  type: AnnouncementType;
  /** 状态。 */
  status: AnnouncementStatus;
  /** 排序值。 */
  sortOrder: number;
}

// ── 站内信类型 ────────────────────────────────────────────

/** 站内信项（对应 messages 表）。 */
export interface Message {
  /** 主键 ID。 */
  id: number;
  /** 发送者 ID，0=系统。 */
  senderId: number;
  /** 接收者 ID，-1=全体用户。 */
  recipientId: number;
  /** 消息标题。 */
  title: string;
  /** 消息内容。 */
  content: string;
  /** 是否已读：0=未读, 1=已读。 */
  isRead: number;
  /** 已读时间（ISO 8601）。 */
  readAt: string | null;
  /** 创建时间（ISO 8601）。 */
  createdAt: string;
}

/** 发送消息请求体。 */
export interface SendMessageRequest {
  /** 接收者 ID，-1=全体用户。 */
  recipientId: number;
  /** 消息标题。 */
  title: string;
  /** 消息内容。 */
  content: string;
}

// ── 日志类型 ──────────────────────────────────────────────

/** 操作日志项（对应 operation_logs 表）。 */
export interface OperationLog {
  /** 主键 ID。 */
  id: number;
  /** 操作者用户 ID。 */
  userId: number | null;
  /** 操作者用户名。 */
  username: string | null;
  /** 操作类型：create/update/delete/login/logout 等。 */
  action: string;
  /** 操作模块：user/role/platform/desktop/deal/game/announcement/message/settings。 */
  module: string;
  /** 操作目标标识。 */
  target: string | null;
  /** 操作者 IP。 */
  ip: string | null;
  /** 详细信息（JSON 字符串）。 */
  detail: string | null;
  /** 创建时间（ISO 8601）。 */
  createdAt: string;
}

/** 登录日志项（对应 login_logs 表）。 */
export interface LoginLog {
  /** 主键 ID。 */
  id: number;
  /** 用户 ID。 */
  userId: number | null;
  /** 用户名。 */
  username: string | null;
  /** 登录 IP。 */
  ip: string | null;
  /** User-Agent。 */
  userAgent: string | null;
  /** 登录状态：success / fail。 */
  status: string;
  /** 登录方式：email / sms。 */
  method: string | null;
  /** 创建时间（ISO 8601）。 */
  createdAt: string;
}

/** 日志查询筛选参数。 */
export interface LogQueryParams {
  /** 关键词搜索（用户名）。 */
  search?: string;
  /** 模块筛选（操作日志专用）。 */
  module?: string;
  /** 开始日期（ISO 8601 日期）。 */
  startDate?: string;
  /** 结束日期（ISO 8601 日期）。 */
  endDate?: string;
  /** 页码（1-based）。 */
  page?: number;
  /** 每页条数。 */
  pageSize?: number;
}

/** 日志记录参数（logOperation 函数使用）。 */
export interface LogOperationParams {
  /** 操作者用户 ID。 */
  userId: number | null;
  /** 操作者用户名。 */
  username: string | null;
  /** 操作类型。 */
  action: string;
  /** 操作模块。 */
  module: string;
  /** 操作目标标识。 */
  target?: string;
  /** 操作者 IP。 */
  ip?: string;
  /** 详细信息（会被 JSON.stringify）。 */
  detail?: unknown;
}

/** 登录日志记录参数（logLogin 函数使用）。 */
export interface LogLoginParams {
  /** 用户 ID。 */
  userId: number | null;
  /** 用户名。 */
  username: string | null;
  /** 登录 IP。 */
  ip?: string;
  /** User-Agent。 */
  userAgent?: string;
  /** 登录状态：success / fail。 */
  status: string;
  /** 登录方式：email / sms。 */
  method?: string;
}
