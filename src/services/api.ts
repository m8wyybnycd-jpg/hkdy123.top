import type {
  AdminDashboardStats,
  AdminUserItem,
  ApiResponse,
  AuthResponse,
  CloudDesktop,
  Deal,
  DealCategory,
  Game,
  PaginatedResponse,
  Platform,
  FreeGame,
  SmsPlatform,
  SearchResult,
  RoleListItem,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  User,
  Permission,
  RoleOption,
  SettingItem,
  Announcement,
  SaveAnnouncementRequest,
  Message,
  SendMessageRequest,
  OperationLog,
  LoginLog,
  LogQueryParams,
  Banner,
  BannerCreateRequest,
  BannerUpdateRequest,
  BannerSortItem,
  PageConfig,
  CreatePageConfigPayload,
  UpdatePageConfigPayload,
  GalleryImage,
  GalleryListResponse,
} from "../types";

// ── Lazy-loaded static data (only loaded when API is unavailable) ──
// These ~85KB of data are dynamically imported on first use,
// keeping the main bundle small.
let _platforms: Platform[] | null = null;
let _games: Game[] | null = null;
let _desktops: CloudDesktop[] | null = null;
let _deals: Deal[] | null = null;
let _freeGames: FreeGame[] | null = null;
let _smsPlatforms: SmsPlatform[] | null = null;

async function getStaticFreeGames(): Promise<FreeGame[]> {
  if (!_freeGames) {
    const mod = await import("../data/freeGames");
    _freeGames = mod.freeGames;
  }
  return _freeGames;
}

async function getStaticSmsPlatforms(): Promise<SmsPlatform[]> {
  if (!_smsPlatforms) {
    const mod = await import("../data/smsPlatforms");
    _smsPlatforms = mod.smsPlatforms;
  }
  return _smsPlatforms;
}

async function getStaticPlatforms(): Promise<Platform[]> {
  if (!_platforms) {
    const mod = await import("../data/platforms");
    _platforms = mod.platforms;
  }
  return _platforms;
}

async function getStaticGames(): Promise<Game[]> {
  if (!_games) {
    const mod = await import("../data/games");
    _games = mod.games;
  }
  return _games;
}

async function getStaticDesktops(): Promise<CloudDesktop[]> {
  if (!_desktops) {
    const mod = await import("../data/desktops");
    _desktops = mod.desktops;
  }
  return _desktops;
}

async function getStaticDeals(): Promise<Deal[]> {
  if (!_deals) {
    const mod = await import("../data/deals");
    _deals = mod.deals;
  }
  return _deals;
}

/**
 * API client that wraps fetch with cookie-based auth,
 * unified error handling, and static data fallback.
 *
 * S-05: Auth now uses HttpOnly cookies. The browser automatically sends
 * the auth_token cookie with same-origin requests. No manual token
 * injection needed. credentials:'include' is set for cross-origin dev.
 */
export class ApiClient {
  /** Callback invoked when the server returns HTTP 401 Unauthorized. */
  onUnauthorized: (() => void) | null = null;

  /**
   * Base request method: sends credentials via cookie, parses the
   * ApiResponse envelope, and throws on non-zero code.
   * On HTTP 401, triggers the onUnauthorized callback once (if registered).
   *
   * GET requests automatically retry on network errors and 5xx responses
   * (max 2 retries with exponential backoff: 500ms, 1000ms).
   */
  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const method = (options.method || "GET").toUpperCase();
    const isRetryable = method === "GET";
    const maxRetries = isRetryable ? 2 : 0;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // FormData: let the browser set Content-Type (multipart/form-data + boundary)
        const isFormData = options.body instanceof FormData;
        const headers: Record<string, string> = {
          ...((options.headers as Record<string, string>) || {}),
        };
        if (!isFormData) {
          headers["Content-Type"] = headers["Content-Type"] || "application/json";
        }

        const response = await fetch(path, {
          ...options,
          headers,
          credentials: "include",
        });

        // Detect HTTP 401: token expired or invalid — trigger auto-logout
        // Exception: login/register endpoints return 401 for wrong credentials,
        // which should NOT trigger auto-logout or override the error message.
        if (response.status === 401) {
          // Try to parse the response body for the actual error message
          let bodyMessage = "认证已过期，请重新登录";
          try {
            const body: { message?: string } = await response.json();
            if (body && typeof body.message === "string") {
              bodyMessage = body.message;
            }
          } catch {
            // Response body is not JSON — use default message
          }

          // Only trigger auto-logout for authenticated API calls,
          // not for login/register/refresh-token attempts
          const isAuthEndpoint =
            path === "/api/login" ||
            path === "/api/register" ||
            path === "/api/refresh-token" ||
            path === "/api/email-login" ||
            path === "/api/send-code";

          if (!isAuthEndpoint && this.onUnauthorized) {
            const cb = this.onUnauthorized;
            this.onUnauthorized = null; // Ensure callback fires only once
            cb();
          }

          return {
            code: 401,
            data: null,
            message: bodyMessage,
          } as ApiResponse<T>;
        }

        // Retry on 5xx for GET requests
        if (response.status >= 500 && attempt < maxRetries) {
          await this._delay(500 * Math.pow(2, attempt));
          continue;
        }

        const result = (await response.json()) as ApiResponse<T>;

        // Also detect response body code === 401 (some endpoints may return 200 with code 401)
        if (result.code === 401) {
          if (this.onUnauthorized) {
            const cb = this.onUnauthorized;
            this.onUnauthorized = null; // Ensure callback fires only once
            cb();
          }
        }

        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await this._delay(500 * Math.pow(2, attempt));
          continue;
        }
      }
    }

    // All retries exhausted — re-throw the last error
    throw lastError || new Error("Request failed after retries");
  }

  /** Exponential backoff delay helper. */
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Auth Endpoints ──────────────────────────────────────

  /** Get the current user's full profile (includes phone, createdAt, etc. beyond JWT claims). */
  async getMe(): Promise<User> {
    const res = await this.request<User>("/api/me");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Register a new user account with email, verification code, and password. */
  async register(email: string, code: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, code, password }),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Log in with email and password. */
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  // ── Content Endpoints (with static fallback) ────────────

  /** Get all cloud gaming platforms (fallback: static data). */
  async getPlatforms(): Promise<Platform[]> {
    try {
      const res = await this.request<Platform[]>("/api/platforms");
      if (res.code === 0 && res.data && res.data.length > 0) {
        return res.data;
      }
      return await getStaticPlatforms();
    } catch {
      return await getStaticPlatforms();
    }
  }

  /** Get a single platform by ID (fallback: static data). */
  async getPlatformById(id: string): Promise<Platform | null> {
    try {
      const res = await this.request<Platform>(`/api/platforms/${id}`);
      if (res.code === 0 && res.data) {
        return res.data;
      }
      const platforms = await getStaticPlatforms();
      return platforms.find((p) => p.id === id) ?? null;
    } catch {
      const platforms = await getStaticPlatforms();
      return platforms.find((p) => p.id === id) ?? null;
    }
  }

  /** Get all office cloud desktops (fallback: static data). */
  async getDesktops(): Promise<CloudDesktop[]> {
    try {
      const res = await this.request<CloudDesktop[]>("/api/desktops");
      if (res.code === 0 && res.data && res.data.length > 0) {
        return res.data;
      }
      return await getStaticDesktops();
    } catch {
      return await getStaticDesktops();
    }
  }

  /** Get all deals, optionally filtered by category (fallback: static data). */
  async getDeals(category?: DealCategory): Promise<Deal[]> {
    const query = category ? `?category=${category}` : "";
    try {
      const res = await this.request<Deal[]>(`/api/deals${query}`);
      if (res.code === 0 && res.data && res.data.length > 0) {
        return res.data;
      }
      const deals = await getStaticDeals();
      return category
        ? deals.filter((d) => d.category === category)
        : deals;
    } catch {
      const deals = await getStaticDeals();
      return category
        ? deals.filter((d) => d.category === category)
        : deals;
    }
  }

  /** Get all games (fallback: static data). */
  async getGames(): Promise<Game[]> {
    try {
      const res = await this.request<Game[]>("/api/games");
      if (res.code === 0 && res.data && res.data.length > 0) {
        return res.data;
      }
      return await getStaticGames();
    } catch {
      return await getStaticGames();
    }
  }

  /** Global search across games, platforms, and deals. */
  async search(query: string): Promise<SearchResult> {
    try {
      const res = await this.request<SearchResult>(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      if (res.code === 0 && res.data) {
        return res.data;
      }
      return await this.localSearch(query);
    } catch {
      return await this.localSearch(query);
    }
  }

  /**
   * Local search fallback: matches games, platforms, and deals
   * against the query string (supports space-separated keywords).
   */
  private async localSearch(query: string): Promise<SearchResult> {
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) {
      return { games: [], platforms: [], deals: [] };
    }

    const match = (text: string): boolean =>
      keywords.every((kw) => text.toLowerCase().includes(kw));

    const [games, platforms, deals] = await Promise.all([
      getStaticGames(),
      getStaticPlatforms(),
      getStaticDeals(),
    ]);

    return {
      games: games.filter(
        (g) =>
          match(g.name) ||
          match(g.type) ||
          g.tags.some((t) => match(t))
      ),
      platforms: platforms.filter(
        (p) =>
          match(p.name) ||
          match(p.desc) ||
          p.tags.some((t) => match(t))
      ),
      deals: deals.filter(
        (d) =>
          match(d.title) ||
          match(d.description) ||
          d.tags.some((t) => match(t))
      ),
    };
  }

  // ── Admin Endpoints (V3.0) ─────────────────────────────

  /**
   * Admin: Get dashboard statistics (total users, today's new users,
   * and counts for each content table). Requires admin JWT.
   */
  async getAdminDashboard(): Promise<AdminDashboardStats> {
    const res = await this.request<AdminDashboardStats>("/api/admin/dashboard");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /**
   * Admin: Get paginated user list with optional email search.
   * Requires admin JWT.
   */
  async getAdminUsers(
    search?: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<AdminUserItem>> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await this.request<PaginatedResponse<AdminUserItem>>(
      `/api/admin/users${query}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a user (toggle isAdmin, update username). */
  async updateAdminUser(
    id: number,
    data: { isAdmin?: boolean; username?: string }
  ): Promise<AdminUserItem> {
    const res = await this.request<AdminUserItem>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a user. */
  async deleteAdminUser(id: number): Promise<void> {
    const res = await this.request<null>(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Create a new platform. */
  async createPlatform(data: Record<string, unknown>): Promise<Platform> {
    const res = await this.request<Platform>("/api/admin/platforms", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a platform. */
  async updatePlatform(
    id: string,
    data: Record<string, unknown>
  ): Promise<Platform> {
    const res = await this.request<Platform>(`/api/admin/platforms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a platform. */
  async deletePlatform(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/platforms/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Create a new cloud desktop. */
  async createDesktop(data: Record<string, unknown>): Promise<CloudDesktop> {
    const res = await this.request<CloudDesktop>("/api/admin/desktops", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a cloud desktop. */
  async updateDesktop(
    id: string,
    data: Record<string, unknown>
  ): Promise<CloudDesktop> {
    const res = await this.request<CloudDesktop>(`/api/admin/desktops/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a cloud desktop. */
  async deleteDesktop(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/desktops/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Create a new deal. */
  async createDeal(data: Record<string, unknown>): Promise<Deal> {
    const res = await this.request<Deal>("/api/admin/deals", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a deal. */
  async updateDeal(
    id: string,
    data: Record<string, unknown>
  ): Promise<Deal> {
    const res = await this.request<Deal>(`/api/admin/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a deal. */
  async deleteDeal(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/deals/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Create a new game. */
  async createGame(data: Record<string, unknown>): Promise<Game> {
    const res = await this.request<Game>("/api/admin/games", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a game. */
  async updateGame(
    id: string,
    data: Record<string, unknown>
  ): Promise<Game> {
    const res = await this.request<Game>(`/api/admin/games/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a game. */
  async deleteGame(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/games/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Get all free single-player game resources (fallback: static data). */
  async getFreeGames(): Promise<FreeGame[]> {
    try {
      const res = await this.request<FreeGame[]>("/api/free-games");
      if (res.code === 0 && res.data && res.data.length > 0) {
        return res.data;
      }
      return await getStaticFreeGames();
    } catch {
      return await getStaticFreeGames();
    }
  }

  /** Get all SMS-receiving platforms (fallback: static data). */
  async getSmsPlatforms(): Promise<SmsPlatform[]> {
    try {
      const res = await this.request<SmsPlatform[]>("/api/sms-platforms");
      if (res.code === 0 && res.data && res.data.length > 0) {
        return res.data;
      }
      return await getStaticSmsPlatforms();
    } catch {
      return await getStaticSmsPlatforms();
    }
  }

  /** Admin: Create a free game resource. */
  async createFreeGame(data: Record<string, unknown>): Promise<FreeGame> {
    const res = await this.request<FreeGame>("/api/admin/free-games", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a free game resource. */
  async updateFreeGame(
    id: string,
    data: Record<string, unknown>
  ): Promise<FreeGame> {
    const res = await this.request<FreeGame>(`/api/admin/free-games/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a free game resource. */
  async deleteFreeGame(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/free-games/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Create an SMS platform. */
  async createSmsPlatform(
    data: Record<string, unknown>
  ): Promise<SmsPlatform> {
    const res = await this.request<SmsPlatform>("/api/admin/sms-platforms", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update an SMS platform. */
  async updateSmsPlatform(
    id: string,
    data: Record<string, unknown>
  ): Promise<SmsPlatform> {
    const res = await this.request<SmsPlatform>(
      `/api/admin/sms-platforms/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete an SMS platform. */
  async deleteSmsPlatform(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/sms-platforms/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  // ── RBAC: Roles ─────────────────────────────────────────

  /** Admin: Get all roles with userCount and permissionCount. */
  async getAdminRoles(): Promise<RoleListItem[]> {
    const res = await this.request<RoleListItem[]>("/api/admin/roles");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Create a new role. */
  async createRole(data: CreateRoleRequest): Promise<Role> {
    const res = await this.request<Role>("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update a role (code is not editable). */
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const res = await this.request<Role>(`/api/admin/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a role. */
  async deleteRole(id: number): Promise<void> {
    const res = await this.request<null>(`/api/admin/roles/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  // ── RBAC: Role Permissions ──────────────────────────────

  /** Admin: Get a role's assigned permission IDs and all available permissions. */
  async getRolePermissions(
    id: number
  ): Promise<{ permissionIds: number[]; allPermissions: Permission[] }> {
    const res = await this.request<{
      permissionIds: number[];
      allPermissions: Permission[];
    }>(`/api/admin/roles/${id}/permissions`);
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Full overwrite of a role's permissions. */
  async updateRolePermissions(id: number, permissionIds: number[]): Promise<void> {
    const res = await this.request<null>(`/api/admin/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionIds }),
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  // ── RBAC: Permissions ───────────────────────────────────

  /** Admin: Get all permissions. */
  async getPermissions(): Promise<Permission[]> {
    const res = await this.request<Permission[]>("/api/admin/permissions");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  // ── RBAC: User Roles ────────────────────────────────────

  /** Admin: Get a user's current role IDs and all available roles. */
  async getUserRoles(
    id: number
  ): Promise<{ currentRoleIds: number[]; allRoles: RoleOption[] }> {
    const res = await this.request<{
      currentRoleIds: number[];
      allRoles: RoleOption[];
    }>(`/api/admin/users/${id}/roles`);
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Full overwrite of a user's roles. */
  async updateUserRoles(id: number, roleIds: number[]): Promise<void> {
    const res = await this.request<null>(`/api/admin/users/${id}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roleIds }),
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  // ── Settings ────────────────────────────────────────────

  /** Public: Get public-facing settings (basic group, no auth needed). */
  async getPublicSettings(): Promise<Record<string, string>> {
    const res = await this.request<Record<string, string>>("/api/settings");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Get all settings, optionally filtered by group. */
  async getSettings(group?: string): Promise<SettingItem[]> {
    const query = group ? `?group=${group}` : "";
    const res = await this.request<SettingItem[]>(`/api/admin/settings${query}`);
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Get a single setting item by key. */
  async getSetting(key: string): Promise<SettingItem> {
    const res = await this.request<SettingItem>(`/api/admin/settings/${key}`);
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Batch update settings. */
  async updateSettings(settings: Record<string, string>): Promise<void> {
    const res = await this.request<null>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  // ── Announcements ───────────────────────────────────────

  /** Admin: Get paginated announcement list with optional status filter. */
  async getAdminAnnouncements(
    status?: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Announcement>> {
    const params = new URLSearchParams();
    if (status !== undefined) params.set("status", String(status));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await this.request<PaginatedResponse<Announcement>>(
      `/api/admin/announcements?${params.toString()}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Create a new announcement. */
  async createAnnouncement(data: SaveAnnouncementRequest): Promise<Announcement> {
    const res = await this.request<Announcement>("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update an existing announcement. */
  async updateAnnouncement(id: number, data: SaveAnnouncementRequest): Promise<Announcement> {
    const res = await this.request<Announcement>(`/api/admin/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete an announcement. */
  async deleteAnnouncement(id: number): Promise<void> {
    const res = await this.request<null>(`/api/admin/announcements/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Public: Get published announcements (front-end display). */
  async getPublishedAnnouncements(): Promise<Announcement[]> {
    try {
      const res = await this.request<Announcement[]>("/api/announcements");
      if (res.code === 0 && res.data) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  // ── Banners ─────────────────────────────────────────────

  /** Public: Get active banners for front-end carousel display. */
  async getBanners(): Promise<Banner[]> {
    try {
      const res = await this.request<Banner[]>("/api/banners");
      if (res.code === 0 && res.data) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  /** Admin: Get paginated banner list with search and status filter. */
  async getAdminBanners(
    search?: string,
    status?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<Banner>> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await this.request<PaginatedResponse<Banner>>(
      `/api/admin/banners?${params.toString()}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Create a new banner. */
  async createBanner(data: BannerCreateRequest): Promise<Banner> {
    const res = await this.request<Banner>("/api/admin/banners", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update an existing banner. */
  async updateBanner(id: number, data: BannerUpdateRequest): Promise<Banner> {
    const res = await this.request<Banner>(`/api/admin/banners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a banner. */
  async deleteBanner(id: number): Promise<void> {
    const res = await this.request<null>(`/api/admin/banners/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Toggle banner active/inactive. */
  async toggleBanner(id: number): Promise<{ id: number; isActive: number }> {
    const res = await this.request<{ id: number; isActive: number }>(
      `/api/admin/banners/${id}/toggle`,
      { method: "PATCH" }
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Batch update banner sort order. */
  async updateBannerSort(items: BannerSortItem[]): Promise<void> {
    const res = await this.request<null>("/api/admin/banners/sort", {
      method: "PATCH",
      body: JSON.stringify({ items }),
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** Admin: Upload banner image to Cloudflare Images (returns image URL). */
  async uploadBannerImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await this.request<{ imageUrl: string }>(
      "/api/admin/banners/upload-image",
      {
        method: "POST",
        body: formData,
      }
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data.imageUrl;
  }

  // ── Messages ────────────────────────────────────────────

  /** Admin: Get paginated sent messages list. */
  async getAdminMessages(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Message>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await this.request<PaginatedResponse<Message>>(
      `/api/admin/messages?${params.toString()}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Send a message to a specific user or all users (-1). */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    const res = await this.request<Message>("/api/admin/messages", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a message. */
  async deleteMessage(id: number): Promise<void> {
    const res = await this.request<null>(`/api/admin/messages/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** User: Get my messages (personal + broadcast). */
  async getMyMessages(): Promise<Message[]> {
    const res = await this.request<Message[]>("/api/messages");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** User: Mark a message as read. */
  async markMessageRead(id: number): Promise<void> {
    const res = await this.request<null>(`/api/messages/${id}`, {
      method: "PUT",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  /** User: Get unread message count. */
  async getUnreadCount(): Promise<number> {
    const res = await this.request<{ count: number }>("/api/messages/unread-count");
    if (res.code !== 0) throw new Error(res.message);
    return res.data.count;
  }

  // ── Logs ────────────────────────────────────────────────

  /** Admin: Get paginated operation logs with filters. */
  async getOperationLogs(
    params: LogQueryParams = {}
  ): Promise<PaginatedResponse<OperationLog>> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.module) query.set("module", params.module);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    query.set("page", String(params.page ?? 1));
    query.set("pageSize", String(params.pageSize ?? 20));
    const res = await this.request<PaginatedResponse<OperationLog>>(
      `/api/admin/logs/operation?${query.toString()}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Get paginated login logs with filters. */
  async getLoginLogs(
    params: LogQueryParams = {}
  ): Promise<PaginatedResponse<LoginLog>> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    query.set("page", String(params.page ?? 1));
    query.set("pageSize", String(params.pageSize ?? 20));
    const res = await this.request<PaginatedResponse<LoginLog>>(
      `/api/admin/logs/login?${query.toString()}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Export operation logs as CSV (returns download URL). */
  getOperationLogsExportUrl(params: LogQueryParams = {}): string {
    const query = new URLSearchParams();
    query.set("export", "csv");
    if (params.search) query.set("search", params.search);
    if (params.module) query.set("module", params.module);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    return `/api/admin/logs/operation?${query.toString()}`;
  }

  /** Admin: Export login logs as CSV (returns download URL). */
  getLoginLogsExportUrl(params: LogQueryParams = {}): string {
    const query = new URLSearchParams();
    query.set("export", "csv");
    if (params.search) query.set("search", params.search);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    return `/api/admin/logs/login?${query.toString()}`;
  }

  // ── Page Configs ────────────────────────────────────────

  /** Public: Get all enabled page configs (for frontend navigation/hero). */
  async getPageConfigs(): Promise<PageConfig[]> {
    try {
      const res = await this.request<PageConfig[]>("/api/page-configs");
      if (res.code === 0 && res.data) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  /** Admin: Get all page configs (including disabled ones). */
  async getAdminPageConfigs(): Promise<PageConfig[]> {
    const res = await this.request<PageConfig[]>("/api/admin/page-configs");
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Get a single page config by page_key. */
  async getAdminPageConfig(key: string): Promise<PageConfig> {
    const res = await this.request<PageConfig>(`/api/admin/page-configs/${key}`);
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Create a new page config. */
  async createPageConfig(data: CreatePageConfigPayload): Promise<PageConfig> {
    const res = await this.request<PageConfig>("/api/admin/page-configs", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Update an existing page config by page_key. */
  async updatePageConfig(key: string, data: UpdatePageConfigPayload): Promise<PageConfig> {
    const res = await this.request<PageConfig>(`/api/admin/page-configs/${key}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a page config by page_key. */
  async deletePageConfig(key: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/page-configs/${key}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }

  // ── Gallery (图片库) ─────────────────────────────────────

  /** Admin: Get paginated gallery images with optional search. */
  async getGalleryImages(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<GalleryListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    const res = await this.request<GalleryListResponse>(
      `/api/admin/images${qs ? `?${qs}` : ""}`
    );
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Upload an image file to the gallery. */
  async uploadGalleryImage(file: File): Promise<GalleryImage> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await this.request<GalleryImage>("/api/admin/images", {
      method: "POST",
      body: formData,
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Rename a gallery image. */
  async renameGalleryImage(id: string, name: string): Promise<GalleryImage> {
    const res = await this.request<GalleryImage>(`/api/admin/images/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }

  /** Admin: Delete a gallery image by ID. */
  async deleteGalleryImage(id: string): Promise<void> {
    const res = await this.request<null>(`/api/admin/images/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 0) throw new Error(res.message);
  }
}

/** Singleton API client instance. */
export const apiClient = new ApiClient();