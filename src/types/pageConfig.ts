/**
 * Type definitions for page configuration management.
 *
 * PageConfig maps to the D1 `page_configs` table and drives the frontend
 * navigation tabs, page hero sections, and page enable/disable state.
 */

/** 页面配置完整数据模型（与 D1 page_configs 表对应）。 */
export interface PageConfig {
  /** 唯一标识，如 "cloud-games"。 */
  page_key: string;
  /** 页面显示名称，如 "云游戏"。 */
  page_name: string;
  /** 页面主标题。 */
  title: string;
  /** 页面副标题。 */
  subtitle: string;
  /** 页面描述文案。 */
  description: string;
  /** 是否启用（前台可见）。API 返回 boolean（D1 INTEGER 0/1 → boolean）。 */
  is_enabled: boolean;
  /** JSON 字符串，自定义参数（预留扩展）。 */
  params: string;
  /** 排序权重（升序）。 */
  sort_order: number;
  /** 最后更新时间（ISO 8601）。 */
  updated_at: string;
  /** 最后更新者用户 ID。 */
  updated_by: number | null;
}

/** 后台创建/编辑页面配置时的请求体。 */
export interface SavePageConfigRequest {
  /** 页面显示名称。 */
  page_name: string;
  /** 页面主标题。 */
  title: string;
  /** 页面副标题。 */
  subtitle: string;
  /** 页面描述文案。 */
  description: string;
  /** 是否启用。API 接受 boolean（内部转 D1 INTEGER 0/1）。 */
  is_enabled: boolean;
  /** JSON 字符串，自定义参数。 */
  params: string;
  /** 排序权重。 */
  sort_order: number;
}

/** 后台新建页面配置时的请求体（包含 page_key）。 */
export interface CreatePageConfigPayload extends SavePageConfigRequest {
  /** 唯一标识（创建时必填，如 "cloud-games"）。 */
  page_key: string;
}

/** 后台更新页面配置时的请求体（与 SavePageConfigRequest 相同）。 */
export type UpdatePageConfigPayload = SavePageConfigRequest;

/** localStorage 缓存结构，用于前台页面配置的本地缓存。 */
export interface PageConfigCache {
  /** 缓存的页面配置列表。 */
  data: PageConfig[];
  /** 缓存写入时间戳（毫秒）。 */
  timestamp: number;
}

/** Header 导航 Tab 数据（从 PageConfig 映射而来）。 */
export interface NavTab {
  /** 页面标识（即 page_key）。 */
  key: string;
  /** Tab 显示文案（即 page_name）。 */
  label: string;
  /** 前台路由路径（由 page_key 派生，如 "/cloud-games"）。 */
  path: string;
  /** 排序权重。 */
  sort_order: number;
}
