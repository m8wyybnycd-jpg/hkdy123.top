/**
 * 图片库（Gallery）类型定义。
 *
 * 对应 D1 表: images。
 * 字段命名采用 camelCase，与项目现有类型保持一致；
 * API 处理器负责 snake_case → camelCase 映射。
 */

/** 图片库中的一张图片（对应 images 表）。 */
export interface GalleryImage {
  /** 主键 UUID。 */
  id: string;
  /** 用户自定义名称。 */
  name: string;
  /** 图片 URL（CF Images public variant）。 */
  url: string;
  /** 文件大小（字节）。 */
  fileSize: number;
  /** MIME 类型。 */
  mimeType: string;
  /** 图片宽度（px），可能为 null。 */
  width: number | null;
  /** 图片高度（px），可能为 null。 */
  height: number | null;
  /** 创建时间（ISO 8601）。 */
  createdAt: string;
  /** 更新时间（ISO 8601）。 */
  updatedAt: string;
}

/** 图片列表响应（分页）。 */
export interface GalleryListResponse {
  /** 图片数组。 */
  list: GalleryImage[];
  /** 总条数。 */
  total: number;
  /** 当前页码（1-based）。 */
  page: number;
  /** 每页条数。 */
  pageSize: number;
}
