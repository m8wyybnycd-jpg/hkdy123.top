import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Gamepad2,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Send,
  Smartphone,
} from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";

/** Standard API envelope returned by the backend functions. */
interface ApiResponse {
  code: number;
  message?: string;
  data?: any;
}

type AuthTab = "login" | "register" | "sms";

/** Regular expression for basic email format validation. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Regular expression for Chinese mobile phone number validation. */
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/** Countdown duration in seconds for the send-code button. */
const COUNTDOWN_SECONDS = 60;

/** Location state passed by ProtectedRoute when redirecting to login. */
interface LocationState {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

/**
 * Authentication page with login / register / SMS login tab switching.
 *
 * - Login tab: email + password.
 * - Register tab: email + verification code + password + confirm password.
 * - SMS tab: phone number + SMS verification code (auto-registers new users).
 *
 * Centered card layout on a dark themed background with ambient glow accents.
 */
export default function AuthPage() {
  const { login, register, smsLogin } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Send-code button state (email)
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);

  // SMS login state
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [smsSent, setSmsSent] = useState(false);

  /** Email countdown timer effect — decrements every second until 0. */
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  /** SMS countdown timer effect — decrements every second until 0. */
  useEffect(() => {
    if (smsCountdown <= 0) return;
    const timer = setInterval(() => {
      setSmsCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [smsCountdown]);

  /** Determine the redirect target after successful auth. */
  const getRedirectPath = (): string => {
    const state = location.state as LocationState | null;
    const from = state?.from;
    if (from) {
      const search = from.search || "";
      const hash = from.hash || "";
      return `${from.pathname}${search}${hash}`;
    }
    return "/cloud-games";
  };

  /** Send a verification code to the entered email. */
  const handleSendCode = useCallback(async () => {
    setError("");

    // Validate email before sending code
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("请输入邮箱");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("邮箱格式不正确");
      return;
    }

    setSendingCode(true);
    try {
      const response = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const result: ApiResponse = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "验证码发送失败");
      }
      setCodeSent(true);
      setCountdown(COUNTDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证码发送失败");
    } finally {
      setSendingCode(false);
    }
  }, [email]);

  /** Send an SMS verification code to the entered phone number. */
  const handleSendSms = useCallback(async () => {
    setError("");

    // Validate phone before sending SMS
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError("请输入手机号");
      return;
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      setError("手机号格式不正确");
      return;
    }

    setSendingSms(true);
    try {
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone }),
      });
      const result: ApiResponse = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "验证码发送失败");
      }
      setSmsSent(true);
      setSmsCountdown(COUNTDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证码发送失败");
    } finally {
      setSendingSms(false);
    }
  }, [phone]);

  /** Handle form submission for login, register, and SMS login. */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // ── SMS login branch ──
    if (tab === "sms") {
      const trimmedPhone = phone.trim();
      if (!trimmedPhone) {
        setError("请输入手机号");
        return;
      }
      if (!PHONE_REGEX.test(trimmedPhone)) {
        setError("手机号格式不正确");
        return;
      }
      if (!smsCode.trim()) {
        setError("请输入验证码");
        return;
      }
      if (!/^\d{6}$/.test(smsCode.trim())) {
        setError("验证码为 6 位数字");
        return;
      }
      if (!smsSent) {
        setError("请先获取验证码");
        return;
      }

      setLoading(true);
      try {
        await smsLogin(trimmedPhone, smsCode.trim());
        navigate(getRedirectPath(), { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "登录失败，请重试");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Email login / register branch ──
    // Validate account (email for register; email or username for login)
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(tab === "login" ? "请输入邮箱或用户名" : "请输入邮箱");
      return;
    }
    // Only enforce strict email format for registration;
    // login accepts either an email address or a username.
    if (tab === "register" && !EMAIL_REGEX.test(trimmedEmail)) {
      setError("邮箱格式不正确");
      return;
    }

    // Register: validate verification code
    if (tab === "register") {
      if (!code.trim()) {
        setError("请输入验证码");
        return;
      }
      if (!/^\d{6}$/.test(code.trim())) {
        setError("验证码为 6 位数字");
        return;
      }
      if (!codeSent) {
        setError("请先获取验证码");
        return;
      }
    }

    // Validate password
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }

    // Register: confirm password
    if (tab === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      if (tab === "login") {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedEmail, code.trim(), password);
      }
      navigate(getRedirectPath(), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  /** Switch between tabs, resetting relevant state. */
  const switchTab = (newTab: AuthTab) => {
    setTab(newTab);
    setError("");
    setConfirmPassword("");
    setCode("");
    setCodeSent(false);
    setCountdown(0);
    setSmsCode("");
    setSmsSent(false);
    setSmsCountdown(0);
  };

  /** Whether the email send-code button is disabled. */
  const isSendCodeDisabled = sendingCode || countdown > 0 || loading;

  /** Label for the email send-code button. */
  const sendCodeLabel = (() => {
    if (sendingCode) return "发送中…";
    if (countdown > 0) return `${countdown}s 后重发`;
    return "发送验证码";
  })();

  /** Whether the SMS send-code button is disabled. */
  const isSendSmsDisabled = sendingSms || smsCountdown > 0 || loading;

  /** Label for the SMS send-code button. */
  const sendSmsLabel = (() => {
    if (sendingSms) return "发送中…";
    if (smsCountdown > 0) return `${smsCountdown}s 后重发`;
    return "发送验证码";
  })();

  /** Submit button label based on active tab. */
  const submitLabel = (() => {
    if (loading) return "处理中…";
    if (tab === "login") return "登录";
    if (tab === "register") return "注册";
    return "短信登录";
  })();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-game-dark px-4 py-8">
      {/* Ambient glow decorations */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-neon-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-neon-purple/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-neon-blue/5 blur-3xl" />

      {/* Logo */}
      <div className="relative mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple shadow-lg shadow-neon-blue/30">
          <Gamepad2 className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">云玩汇</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          云游戏 × 云电脑 × 薅羊毛聚合站
        </p>
      </div>

      {/* Auth Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-game-border bg-game-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Tab Switch */}
        <div className="mb-6 flex rounded-xl bg-game-darker/60 p-1">
          <button
            onClick={() => switchTab("login")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 ${
              tab === "login"
                ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn className="h-4 w-4" />
            邮箱登录
          </button>
          <button
            onClick={() => switchTab("register")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 ${
              tab === "register"
                ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            邮箱注册
          </button>
          <button
            onClick={() => switchTab("sms")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 ${
              tab === "sms"
                ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            短信登录
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "sms" ? (
            <>
              {/* Phone + Send SMS */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  手机号
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                      }
                      placeholder="请输入手机号"
                      autoComplete="tel"
                      className="w-full rounded-lg border border-game-border bg-game-darker/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={isSendSmsDisabled}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neon-blue/30 bg-neon-blue/10 px-3 py-2.5 text-sm font-medium text-neon-blue transition-all duration-200 hover:bg-neon-blue/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sendSmsLabel}
                  </button>
                </div>
              </div>

              {/* SMS Verification Code */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  验证码
                </label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={smsCode}
                    onChange={(e) =>
                      setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="请输入 6 位验证码"
                    autoComplete="one-time-code"
                    className="w-full rounded-lg border border-game-border bg-game-darker/60 py-2.5 pl-10 pr-4 text-sm tracking-widest text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                  />
                </div>
              </div>

              {/* SMS hint */}
              <p className="text-center text-xs text-slate-500">
                未注册手机号验证后自动注册
              </p>
            </>
          ) : (
            <>
              {/* Email + Send Code (register) */}
              {tab === "register" ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    邮箱
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="请输入邮箱"
                        autoComplete="email"
                        className="w-full rounded-lg border border-game-border bg-game-darker/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendCodeDisabled}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neon-blue/30 bg-neon-blue/10 px-3 py-2.5 text-sm font-medium text-neon-blue transition-all duration-200 hover:bg-neon-blue/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendCodeLabel}
                    </button>
                  </div>
                </div>
              ) : (
                /* Email / Username (login) */
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    邮箱/用户名
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱或用户名"
                      autoComplete="username"
                      className="w-full rounded-lg border border-game-border bg-game-darker/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                    />
                  </div>
                </div>
              )}

              {/* Verification Code (register only) */}
              {tab === "register" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    验证码
                  </label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="请输入 6 位验证码"
                      autoComplete="one-time-code"
                      className="w-full rounded-lg border border-game-border bg-game-darker/60 py-2.5 pl-10 pr-4 text-sm tracking-widest text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                    />
                  </div>
                </div>
              )}

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
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-lg border border-game-border bg-game-darker/60 px-4 py-2.5 pr-11 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
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

              {/* Confirm Password (register only) */}
              {tab === "register" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    确认密码
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-game-border bg-game-darker/60 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/20"
                  />
                </div>
              )}
            </>
          )}

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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple py-2.5 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20 transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {submitLabel}
              </>
            ) : (
              <>
                {tab === "login" && <LogIn className="h-4 w-4" />}
                {tab === "register" && <UserPlus className="h-4 w-4" />}
                {tab === "sms" && <Smartphone className="h-4 w-4" />}
                {submitLabel}
              </>
            )}
          </button>
        </form>

        {/* Switch tab link */}
        <p className="mt-4 text-center text-sm text-slate-400">
          {tab === "login" && (
            <>
              没有账号？{" "}
              <button
                onClick={() => switchTab("register")}
                className="font-medium text-neon-blue transition-colors hover:text-neon-blue/80"
              >
                去注册
              </button>
            </>
          )}
          {tab === "register" && (
            <>
              已有账号？{" "}
              <button
                onClick={() => switchTab("login")}
                className="font-medium text-neon-blue transition-colors hover:text-neon-blue/80"
              >
                去登录
              </button>
            </>
          )}
          {tab === "sms" && (
            <>
              使用邮箱？{" "}
              <button
                onClick={() => switchTab("login")}
                className="font-medium text-neon-blue transition-colors hover:text-neon-blue/80"
              >
                邮箱登录
              </button>
            </>
          )}
        </p>
      </div>

      {/* Hint */}
      <p className="relative mt-6 text-center text-xs text-slate-600">
        全站需登录后才能访问内容 · 密码使用 PBKDF2 加密存储
      </p>

      {/* Admin channel — subtle, low-profile link to the admin login entry */}
      <p className="relative mt-2 text-center text-xs text-slate-600">
        管理员？{" "}
        <Link
          to="/admin/login"
          className="text-slate-500 transition-colors hover:text-slate-300"
        >
          管理员通道 →
        </Link>
      </p>
    </div>
  );
}
