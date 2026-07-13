import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, LogIn, Eye, EyeOff, Mail } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";

/** Regular expression for basic email format validation. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standalone administrator login page.
 *
 * Distinct from the regular {@link AuthPage} in three ways:
 * 1. Login only — no registration tab, no verification code, no confirm password.
 * 2. Amber/orange "admin" visual theme instead of the blue/purple neon theme.
 * 3. After a successful login it verifies `authState.user.isAdmin`; non-admin
 *    accounts are logged back out with a permission error.
 *
 * The component is intentionally a PUBLIC route (`/admin/login`), so it must not
 * be nested inside the protected `/admin` layout in App.tsx.
 */
export default function AdminLoginPage() {
  const { authState, login, logout } = useAuthContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Set to true right after a successful `login()` call.
   *
   * The admin-permission check cannot be done inline in the submit handler
   * because `authState` captured in the closure is stale immediately after
   * `await login()` (React state updates are not reflected synchronously).
   * Instead we flag it and let the effect below read the freshly-updated
   * `authState` once the component re-renders.
   */
  const [pendingCheck, setPendingCheck] = useState(false);

  /** Evaluate admin permission once auth state is refreshed after login. */
  useEffect(() => {
    if (!pendingCheck) return;
    if (authState.isAuthenticated && authState.user) {
      if (authState.user.isAdmin) {
        navigate("/admin/dashboard", { replace: true });
        setPendingCheck(false);
      } else {
        logout().then(() => {
          setError("该账号无管理员权限，请使用用户登录入口");
          setPendingCheck(false);
        });
      }
    }
  }, [pendingCheck, authState, navigate, logout]);

  /** Handle form submission. */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("请输入邮箱");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("邮箱格式不正确");
      return;
    }

    // Validate password
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      // Defer the admin check to the effect (see `pendingCheck`).
      setPendingCheck(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-game-dark px-4 py-8">
      {/* Ambient amber glow decorations */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-amber-500/5 blur-3xl" />

      {/* Logo */}
      <div className="relative mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          管理员登录
        </h1>
        <p className="mt-1 text-sm text-amber-400">云玩汇 · 管理后台</p>
      </div>

      {/* Admin Login Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-game-border bg-game-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              邮箱
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入管理员邮箱"
                autoComplete="email"
                className="w-full rounded-lg border border-game-border bg-game-darker/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位密码"
                autoComplete="current-password"
                className="w-full rounded-lg border border-game-border bg-game-darker/60 px-4 py-2.5 pr-11 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-amber-400"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="animate-fade-in rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                登录中…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                管理员登录
              </>
            )}
          </button>
        </form>

        {/* Back to user login */}
        <p className="relative mt-4 text-center text-sm text-slate-400">
          不是管理员？{" "}
          <Link
            to="/login"
            className="font-medium text-amber-400 transition-colors hover:text-amber-300"
          >
            返回用户登录
          </Link>
        </p>
      </div>

      {/* Hint */}
      <p className="relative mt-6 text-center text-xs text-slate-600">
        管理后台需管理员账号登录 · 请勿泄露凭证
      </p>
    </div>
  );
}
