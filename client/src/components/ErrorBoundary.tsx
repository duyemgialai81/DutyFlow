import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "./ui";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary:
 * Bắt trọn vẹn mọi ngoại lệ runtime khi render giao diện,
 * chống triệt để hiện tượng "màn hình trắng xóa" (White Screen of Death).
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DutyFlow ErrorBoundary] Phát hiện lỗi giao diện:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-sm">
            <AlertOctagon className="h-8 w-8" />
          </div>

          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 uppercase tracking-wide">
            Sự cố giao diện
          </span>

          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Ứng dụng gặp lỗi ngoài dự kiến
          </h2>

          <p className="mt-2 max-w-md text-sm text-gray-600 leading-relaxed">
            Hệ thống đã tự động kích hoạt lá chắn bảo vệ để ngăn ứng dụng bị sập. Bạn có thể nhấn nút bên dưới để tải lại trang.
          </p>

          {this.state.error && (
            <div className="mt-4 max-w-lg rounded-xl border border-red-200 bg-red-50/70 p-3 text-left">
              <p className="font-mono text-xs text-red-700 break-words">
                {this.state.error.message || String(this.state.error)}
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="gap-2 shadow-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Tải lại trang web
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
            >
              Xóa bộ nhớ đệm &amp; Đăng nhập lại
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
