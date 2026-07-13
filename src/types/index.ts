/**
 * Type definitions for the Cloud Game Hub application (v2.0).
 */

// ── Game Types ────────────────────────────────────────────

/** Game category types. */
export type GameType =
  | "3A大作"
  | "MOBA"
  | "FPS射击"
  | "动作RPG"
  | "策略"
  | "休闲"
  | "独立"
  | "模拟经营"
  | "格斗"
  | "生存"
  | "竞速"
  | "卡牌";

/** Hardware configuration requirement level. */
export type Config = "low" | "mid" | "high";

// ── Platform Types ────────────────────────────────────────

/** Cloud gaming platform identifiers (10+ platforms). */
export type PlatformId =
  | "netease"
  | "start"
  | "shunwang"
  | "dalong"
  | "todesk"
  | "haima"
  | "gelaiyun"
  | "caiji"
  | "hongshouzhi"
  | "moguyun";

/** A cloud gaming platform. */
export interface Platform {
  /** Unique platform identifier. */
  id: PlatformId;
  /** Display name. */
  name: string;
  /** Brand color in hex. */
  color: string;
  /** Price summary string. */
  price: string;
  /** Free-tier highlights. */
  freeInfo: string;
  /** Official website URL. */
  url: string;
  /** Short description. */
  desc: string;
  /** Feature tags. */
  tags: string[];
  /** Current promotional activity. */
  activity: string;
}

// ── Cloud Desktop Types ───────────────────────────────────

/** An office cloud desktop platform. */
export interface CloudDesktop {
  /** Unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Official website URL. */
  url: string;
  /** Short description. */
  desc: string;
  /** Applicable use scenarios. */
  scenarios: string[];
  /** Price range string. */
  priceRange: string;
  /** Current promotional activity. */
  activity: string;
}

// ── Deal (薅羊毛) Types ──────────────────────────────────

/** Deal category identifiers. */
export type DealCategory =
  | "checkin"
  | "limited_free"
  | "coupon"
  | "new_user"
  | "wildcard";

/** A deal / freebie / coupon entry. */
export interface Deal {
  /** Unique identifier. */
  id: string;
  /** Deal title. */
  title: string;
  /** Description text. */
  description: string;
  /** Direct link to the deal. */
  link: string;
  /** Category of the deal. */
  category: DealCategory;
  /** Extra tag chips. */
  tags: string[];
  /** Last updated date (ISO 8601). */
  updatedAt: string;
  /** Expiration date (ISO 8601), null means long-term valid. */
  expiresAt: string | null;
}

/** Deal filter options including "all". */
export interface DealCategoryOption {
  value: DealCategory | "all";
  label: string;
}

/** All deal category filter options. */
export const DEAL_CATEGORIES: DealCategoryOption[] = [
  { value: "all", label: "全部" },
  { value: "checkin", label: "签到免费" },
  { value: "limited_free", label: "限免监控" },
  { value: "coupon", label: "优惠码" },
  { value: "new_user", label: "新用户" },
  { value: "wildcard", label: "野路子" },
];

// ── Game Types (continued) ────────────────────────────────

/** A single game entry. */
export interface Game {
  /** Unique slug identifier. */
  id: string;
  /** Display name of the game. */
  name: string;
  /** Primary genre category. */
  type: GameType;
  /** Rating on a 0–10 scale (one decimal). */
  rating: number;
  /** Hardware config requirement. */
  config: Config;
  /** IDs of cloud platforms that support this game. */
  platforms: PlatformId[];
  /** Short description (2–3 sentences). */
  desc: string;
  /** Recommendation reason. */
  reason: string;
  /** Extra tag chips. */
  tags: string[];
  /** Representative emoji for the cover. */
  emoji: string;
  /** 游戏封面图 URL（Steam CDN），无则使用 emoji fallback。 */
  cover?: string;
}

// ── Auth Types ────────────────────────────────────────────

/** A registered user. */
export interface User {
  /** Numeric user ID. */
  id: number;
  /** User's email address (empty string for SMS-only users). */
  email: string;
  /** Username (auto-generated from email prefix or phone number). */
  username: string;
  /** Whether the user has admin privileges. */
  isAdmin: boolean;
  /** Role codes assigned to the user (from JWT). */
  roles: string[];
  /** Permission codes assigned to the user (from JWT). */
  permissions: string[];
  /** Account creation timestamp (ISO 8601). */
  createdAt: string;
  /** User's phone number (present for SMS-registered users). */
  phone?: string;
}

/** Authentication state. */
export interface AuthState {
  /** Current user, null if not logged in. */
  user: User | null;
  /** JWT token, null if not logged in. */
  token: string | null;
  /** Whether the user is authenticated. */
  isAuthenticated: boolean;
  /** Whether auth state is still loading (initial check). */
  loading: boolean;
}

/** Auth context value exposed to consumers. */
export interface AuthContextValue {
  /** Current authentication state. */
  authState: AuthState;
  /** Log in with email and password. */
  login: (email: string, password: string) => Promise<void>;
  /** Register a new account with email verification code. */
  register: (email: string, code: string, password: string) => Promise<void>;
  /** Log in / register with phone number and SMS verification code. */
  smsLogin: (phone: string, code: string) => Promise<void>;
  /** Passwordless login / register with email and verification code. */
  emailLogin: (email: string, code: string) => Promise<void>;
  /** Log out and clear token. */
  logout: () => void;
}

// ── API Types ─────────────────────────────────────────────

/** Generic API response envelope. */
export interface ApiResponse<T = unknown> {
  /** 0 = success, non-0 = error code. */
  code: number;
  /** Response data payload, null on error. */
  data: T;
  /** Status message. */
  message: string;
}

/** Auth response (register / login). */
export interface AuthResponse {
  /** JWT token. */
  token: string;
  /** User info. */
  user: User;
}

/** Search result containing matches across multiple content types. */
export interface SearchResult {
  /** Matching games. */
  games: Game[];
  /** Matching platforms. */
  platforms: Platform[];
  /** Matching deals. */
  deals: Deal[];
}

// ── Constants ─────────────────────────────────────────────

/** All selectable game types (including "全部" for "all"). */
export const ALL_GAME_TYPES: (GameType | "全部")[] = [
  "全部",
  "3A大作",
  "MOBA",
  "FPS射击",
  "动作RPG",
  "策略",
  "休闲",
  "独立",
  "模拟经营",
  "格斗",
  "生存",
  "竞速",
  "卡牌",
];

/** All selectable config levels (including "all" for "all"). */
export const ALL_CONFIGS: { value: Config | "all"; label: string }[] = [
  { value: "all", label: "全部配置" },
  { value: "low", label: "低配" },
  { value: "mid", label: "中配" },
  { value: "high", label: "高配" },
];

// ── Admin Types (V3.0) ────────────────────────────────────

/** Pagination query parameters for admin list endpoints. */
export interface PaginationParams {
  /** Page number (1-based). */
  page: number;
  /** Items per page. */
  pageSize: number;
}

/** Paginated response wrapper for admin list endpoints. */
export interface PaginatedResponse<T> {
  /** Array of items for the current page. */
  list: T[];
  /** Total number of items across all pages. */
  total: number;
  /** Current page number (1-based). */
  page: number;
  /** Items per page. */
  pageSize: number;
}

/** Admin user list item (extends User with additional fields). */
export interface AdminUserItem {
  /** Numeric user ID. */
  id: number;
  /** User's email address. */
  email: string;
  /** Username. */
  username: string;
  /** Whether the user has admin privileges. */
  isAdmin: boolean;
  /** Account creation timestamp (ISO 8601). */
  createdAt: string;
  /** Last update timestamp (ISO 8601). */
  updatedAt: string;
}

/** Content type for admin CRUD operations. */
export type AdminContentType = "platforms" | "cloud_desktops" | "deals" | "games";

/** Generic admin item shape (varies by content type, but shares common fields). */
export interface AdminContentItem {
  /** Unique identifier. */
  id: string;
  /** Display name or title. */
  name: string;
  /** Sort order value. */
  sortOrder: number;
  /** Last updated timestamp (ISO 8601). */
  updatedAt: string;
  /** Raw record data (content-type-specific fields). */
  [key: string]: unknown;
}

/** Admin dashboard statistics. */
export interface AdminDashboardStats {
  /** Total number of registered users. */
  totalUsers: number;
  /** Number of users registered today (UTC). */
  todayNewUsers: number;
  /** Total number of cloud gaming platforms. */
  totalPlatforms: number;
  /** Total number of cloud desktops. */
  totalDesktops: number;
  /** Total number of deals. */
  totalDeals: number;
  /** Total number of games. */
  totalGames: number;
}

/** Send-code API request body. */
export interface SendCodeRequest {
  /** Email address to send the verification code to. */
  email: string;
}

/** Register API request body (V3.0 with verification code). */
export interface RegisterRequest {
  /** Email address. */
  email: string;
  /** 6-digit verification code. */
  code: string;
  /** Account password. */
  password: string;
}

/** SMS login API request body. */
export interface SmsLoginRequest {
  /** Phone number (11 digits, Chinese mobile). */
  phone: string;
  /** 6-digit SMS verification code. */
  code: string;
}

// ── Free Games (Quark Pan resources) ─────────────────────

/** A free single-player game resource shared via Quark Pan. */
export interface FreeGame {
  id: string;
  name: string;
  type: string;
  platform: string;
  description: string;
  quarkLink: string;
  emoji: string;
  sortOrder?: number;
}

// ── SMS Platforms (接码平台导航) ─────────────────────────

/** A receive-SMS / verification-code platform. */
export interface SmsPlatform {
  id: string;
  name: string;
  url: string;
  category: string;
  countries: string;
  isFree: boolean;
  needRegister: boolean;
  supportChinese: boolean;
  retention: string;
  description: string;
  features: string[];
  sortOrder?: number;
}

// ── RBAC + Settings Types (re-export) ─────────────────────

export * from "./rbac";

// ── Extra Module Types (re-export) ────────────────────────

export * from "./extra";

// ── Banner Types (re-export) ─────────────────────────────

export * from "./banner";

// ── Page Config Types (re-export) ────────────────────────

export * from "./pageConfig";
