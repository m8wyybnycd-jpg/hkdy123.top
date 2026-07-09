/**
 * 轮播图（Banner）类型定义。
 *
 * 对应 D1 表: banners。
 * 字段命名采用 camelCase，与项目现有类型（如 Announcement）保持一致；
 * API 处理器负责 snake_case → camelCase 映射。
 */

/** 轮播图项（对应 banners 表）。 */
export interface Banner {
  /** 主键 ID。 */
  id: number;
  /** 轮播图标题。 */
  title: string;
  /** 图片 URL。 */
  imageUrl: string;
  /** 点击跳转链接，空字符串表示不可点击。 */
  linkUrl: string;
  /** 排序值，越小越靠前。 */
  sortOrder: number;
  /** 是否启用：1=启用, 0=禁用。 */
  isActive: number;
  /** 生效开始时间（ISO 8601），null 表示立即生效。 */
  startTime: string | null;
  /** 生效结束时间（ISO 8601），null 表示长期有效。 */
  endTime: string | null;
  /** 备注描述。 */
  description: string;
  /** 创建时间（ISO 8601）。 */
  createdAt: string;
  /** 更新时间（ISO 8601）。 */
  updatedAt: string;
}

/** 创建轮播图请求体。 */
export interface BannerCreateRequest {
  /** 轮播图标题。 */
  title: string;
  /** 图片 URL。 */
  imageUrl: string;
  /** 点击跳转链接。 */
  linkUrl?: string;
  /** 排序值。 */
  sortOrder?: number;
  /** 是否启用。 */
  isActive?: number;
  /** 生效开始时间。 */
  startTime?: string | null;
  /** 生效结束时间。 */
  endTime?: string | null;
  /** 备注描述。 */
  description?: string;
}

/** 编辑轮播图请求体（所有字段可选）。 */
export interface BannerUpdateRequest extends Partial<BannerCreateRequest> {}

/** 批量排序项。 */
export interface BannerSortItem {
  /** 轮播图 ID。 */
  id: number;
  /** 新排序值。 */
  sortOrder: number;
}

/** 批量排序请求。 */
export interface BannerSortRequest {
  /** 排序项列表。 */
  items: BannerSortItem[];
}

/** 切换启用/禁用请求。 */
export interface BannerToggleRequest {
  /** 是否启用：1=启用, 0=禁用。 */
  isActive: number;
}

/** 轮播图列表响应（分页）。 */
export interface BannerListResponse {
  /** 轮播图项数组。 */
  items: Banner[];
  /** 总条数。 */
  total: number;
  /** 当前页码（1-based）。 */
  page: number;
  /** 每页条数。 */
  pageSize: number;
}

/** 图片上传响应。 */
export interface BannerImageUploadResponse {
  /** 上传后的图片 URL。 */
  imageUrl: string;
}
