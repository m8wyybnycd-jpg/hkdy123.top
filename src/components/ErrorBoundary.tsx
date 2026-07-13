import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary component.
 *
 * Catches runtime errors from any child component (especially lazy-loaded
 * route components) and displays a friendly fallback UI instead of a
 * white screen. Users can click "reload" to retry.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    Sentry.captureException(error, { extra: { errorInfo } });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
              页面出了点问题
            </h2>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              页面加载时发生了错误。您可以尝试刷新页面，如果问题持续存在，请联系管理员。
            </p>
            <button
              onClick={this.handleReload}
              className="rounded-lg bg-neon-blue px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
