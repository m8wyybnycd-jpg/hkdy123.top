import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { UnreadProvider } from "./contexts/UnreadContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PermissionRoute from "./components/PermissionRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteProgress from "./components/RouteProgress";
import OfflineBanner from "./components/OfflineBanner";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AnnouncementBar from "./components/AnnouncementBar";
import AnnouncementModal from "./components/AnnouncementModal";
import BannerCarousel from "./components/BannerCarousel";
import AuthPage from "./pages/AuthPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// ── Lazy-loaded public pages (code splitting for performance) ──
const HomePage = lazy(() => import("./pages/HomePage"));
const CloudGamesPage = lazy(() => import("./pages/CloudGamesPage"));
const CloudDesktopsPage = lazy(() => import("./pages/CloudDesktopsPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const UserMessagesPage = lazy(() => import("./pages/MessagesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AnnouncementsListPage = lazy(() => import("./pages/AnnouncementsListPage"));
const FreeGamesPage = lazy(() => import("./pages/FreeGamesPage"));
const SmsPlatformsPage = lazy(() => import("./pages/SmsPlatformsPage"));

// ── Lazy-loaded admin pages ──
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const PlatformsPage = lazy(() => import("./pages/admin/content/PlatformsPage"));
const DesktopsPage = lazy(() => import("./pages/admin/content/DesktopsPage"));
const DealsAdminPage = lazy(() => import("./pages/admin/content/DealsPage"));
const GamesPage = lazy(() => import("./pages/admin/content/GamesPage"));
const FreeGamesAdminPage = lazy(() => import("./pages/admin/content/FreeGamesPage"));
const SmsPlatformsAdminPage = lazy(() => import("./pages/admin/content/SmsPlatformsPage"));
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AnnouncementsPage = lazy(() => import("./pages/admin/AnnouncementsPage"));
const BannersPage = lazy(() => import("./pages/admin/BannersPage"));
const MessagesPage = lazy(() => import("./pages/admin/MessagesPage"));
const LogsPage = lazy(() => import("./pages/admin/LogsPage"));
const PageConfigsPage = lazy(() => import("./pages/admin/PageConfigsPage"));
const ForbiddenPage = lazy(() => import("./pages/admin/ForbiddenPage"));

/** Loading fallback for lazy-loaded routes. */
function LoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-game-border border-t-neon-blue" />
        <span className="text-sm text-slate-500">加载中…</span>
      </div>
    </div>
  );
}

/**
 * Public layout: wraps publicly accessible content pages with
 * Header + Footer + Announcements. No authentication required.
 * Used for HomePage, CloudGamesPage, CloudDesktopsPage, etc.
 */
function PublicLayout() {
  return (
    <UnreadProvider>
      <div className="flex min-h-screen flex-col bg-game-dark text-slate-200">
        <Header />
        <main className="flex-1">
          <AnnouncementBar />
          <BannerCarousel />
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
        <AnnouncementModal />
      </div>
    </UnreadProvider>
  );
}

/**
 * Protected layout: wraps authenticated pages with Header + Footer,
 * AnnouncementBar (global), and UnreadProvider (message badge sync).
 * Redirects to /login if not authenticated.
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <UnreadProvider>
        <div className="flex min-h-screen flex-col bg-game-dark text-slate-200">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-[#3b9eff] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
          >
            跳转到主要内容
          </a>
          <Header />
          <main id="main-content" className="flex-1">
            <AnnouncementBar />
            <BannerCarousel />
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
          <AnnouncementModal />
        </div>
      </UnreadProvider>
    </ProtectedRoute>
  );
}

/**
 * Admin layout: wraps admin pages with AdminRoute guard + AdminLayout.
 */
function AdminProtectedLayout() {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <PermissionProvider>
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout />
          </Suspense>
        </PermissionProvider>
      </AdminRoute>
    </ProtectedRoute>
  );
}

/**
 * Root application component.
 *
 * Public routes (no login required):
 *   /                → HomePage (SEO landing page)
 *   /cloud-games     → CloudGamesPage
 *   /cloud-desktops  → CloudDesktopsPage
 *   /deals           → DealsPage
 *   /library         → LibraryPage
 *   /free-games      → FreeGamesPage
 *   /sms-platforms   → SmsPlatformsPage
 *   /login           → AuthPage
 *   /admin/login     → AdminLoginPage
 *
 * Protected routes (login required):
 *   /search          → SearchPage
 *   /messages        → UserMessagesPage
 *   /profile         → ProfilePage
 *   /announcements   → AnnouncementsListPage
 *
 * Admin routes (login + admin required):
 *   /admin/*         → admin pages
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouteProgress />
        <OfflineBanner />
        <Routes>
        {/* Public routes — content visible without login (SEO friendly) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cloud-games" element={<CloudGamesPage />} />
          <Route path="/cloud-desktops" element={<CloudDesktopsPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/free-games" element={<FreeGamesPage />} />
          <Route path="/sms-platforms" element={<SmsPlatformsPage />} />
        </Route>

        {/* Standalone public routes (no layout) */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedLayout />}>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/messages" element={<UserMessagesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/announcements" element={<AnnouncementsListPage />} />
        </Route>

        {/* Admin routes — require authentication + admin access */}
        <Route path="/admin" element={<AdminProtectedLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <PermissionRoute permission="dashboard:view">
                <DashboardPage />
              </PermissionRoute>
            }
          />
          <Route
            path="users"
            element={
              <PermissionRoute permission="user:view">
                <UsersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="content/platforms"
            element={
              <PermissionRoute permission="platform:view">
                <PlatformsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="content/desktops"
            element={
              <PermissionRoute permission="desktop:view">
                <DesktopsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="content/deals"
            element={
              <PermissionRoute permission="deal:view">
                <DealsAdminPage />
              </PermissionRoute>
            }
          />
          <Route
            path="content/games"
            element={
              <PermissionRoute permission="game:view">
                <GamesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="content/free-games"
            element={
              <PermissionRoute permission="free_game:view">
                <FreeGamesAdminPage />
              </PermissionRoute>
            }
          />
          <Route
            path="content/sms-platforms"
            element={
              <PermissionRoute permission="sms_platform:view">
                <SmsPlatformsAdminPage />
              </PermissionRoute>
            }
          />
          <Route
            path="roles"
            element={
              <PermissionRoute permission="role:manage">
                <RolesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="settings"
            element={
              <PermissionRoute permission="settings:manage">
                <SettingsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="announcements"
            element={
              <PermissionRoute permission="announcement:view">
                <AnnouncementsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="banners"
            element={
              <PermissionRoute permission="banner:read">
                <BannersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="messages"
            element={
              <PermissionRoute permission="message:view">
                <MessagesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="logs/operation"
            element={
              <PermissionRoute permission="log:view">
                <LogsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="logs/login"
            element={
              <PermissionRoute permission="log:view">
                <LogsPage />
              </PermissionRoute>
            }
          />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route
            path="page-configs"
            element={
              <PermissionRoute permission="page:manage">
                <PageConfigsPage />
              </PermissionRoute>
            }
          />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}