import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FileQuestion,
  Home,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../state/AppProviders";
import { apiClient } from "../api/http";

/* =========================================================================
 * 1. TRANG 404 - KHÔNG TÌM THẤY TRANG (NOT FOUND)
 * ========================================================================= */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm border border-amber-100">
        <FileQuestion className="h-10 w-10 animate-bounce" />
      </div>

      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 uppercase tracking-wide">
        Mã lỗi 404 · Not Found
      </span>

      <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
        Không tìm thấy trang yêu cầu
      </h1>

      <p className="mt-2 max-w-md text-sm text-gray-600 leading-relaxed">
        Đường dẫn bạn vừa truy cập không tồn tại, đã bị gỡ bỏ hoặc bạn đã nhập sai địa chỉ URL.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/overview">
          <Button className="gap-2 shadow-sm font-semibold">
            <Home className="h-4 w-4" /> Về trang tổng quan
          </Button>
        </Link>
        <Link to="/duty/calendar">
          <Button variant="secondary" className="gap-2">
            Xem lịch trực toàn viện
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* =========================================================================
 * 2. TRANG 403 - TỪ CHỐI TRUY CẬP (FORBIDDEN / ACCESS DENIED)
 * ========================================================================= */
export function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm border border-red-100">
        <ShieldAlert className="h-10 w-10" />
      </div>

      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 uppercase tracking-wide">
        Mã lỗi 403 · Quyền truy cập bị từ chối
      </span>

      <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
        Bạn không có quyền vào khu vực này
      </h1>

      <p className="mt-2 max-w-md text-sm text-gray-600 leading-relaxed">
        Tính năng này yêu cầu quyền quản trị cấp <b>Quản trị viên (Admin)</b> hoặc <b>Tổ trưởng / Trưởng khoa (Leader)</b>.
      </p>

      {user && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700">
          <span>Tài khoản hiện tại: <b>{user.name}</b></span>
          <span className="rounded bg-gray-200 px-2 py-0.5 font-bold text-gray-800">
            {user.title || user.role}
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to={user?.role === "EMPLOYEE" ? "/my-duty" : "/overview"}>
          <Button className="gap-2 shadow-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> 
            {user?.role === "EMPLOYEE" ? "Về lịch trực của tôi" : "Về trang tổng quan"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* =========================================================================
 * 3. TRANG 500 - LỖI MÁY CHỦ / MẤT KẾT NỐI (SERVER ERROR)
 * ========================================================================= */
export function ServerErrorPage() {
  const [searchParams] = useSearchParams();
  const traceId = searchParams.get("traceId") || "N/A";
  const [copied, setCopied] = useState(false);

  const handleCopyTraceId = () => {
    if (traceId && traceId !== "N/A") {
      navigator.clipboard.writeText(traceId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm border border-rose-100">
        <AlertTriangle className="h-10 w-10" />
      </div>

      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 uppercase tracking-wide">
        Mã lỗi 500 · Server Error
      </span>

      <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
        Máy chủ gặp sự cố xử lý
      </h1>

      <p className="mt-2 max-w-lg text-sm text-gray-600 leading-relaxed">
        Hệ thống đang gặp gián đoạn tạm thời hoặc mất kết nối tới cơ sở dữ liệu. Mọi thông tin đã được ghi nhận vào nhật ký hệ thống.
      </p>

      {traceId !== "N/A" && (
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/90 p-2.5">
          <span className="text-xs text-gray-500 font-medium">Mã tra cứu lỗi (Trace ID):</span>
          <code className="rounded bg-white px-2 py-1 font-mono text-xs font-bold text-gray-800 border border-gray-200 shadow-2xs">
            {traceId}
          </code>
          <Button
            size="xs"
            variant={copied ? "primary" : "secondary"}
            onClick={handleCopyTraceId}
            className="gap-1 font-semibold"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-300" /> Đã chép mã!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Sao chép
              </>
            )}
          </Button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => window.location.reload()}
          className="gap-2 shadow-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" /> Tải lại trang
        </Button>
        <Link to="/overview">
          <Button variant="secondary" className="gap-2">
            <Home className="h-4 w-4" /> Về trang tổng quan
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* =========================================================================
 * 4. TRANG 503 - MẤT KẾT NỐI MÁY CHỦ / LỖI MẠNG (NETWORK ERROR)
 * ========================================================================= */
export function NetworkErrorPage() {
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await apiClient.get("/api/auth/me");
      window.location.href = "/overview";
    } catch {
      setTimeout(() => {
        setChecking(false);
      }, 1000);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-sm border border-orange-100">
        <AlertTriangle className="h-10 w-10 animate-pulse" />
      </div>

      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 uppercase tracking-wide">
        Mã lỗi 503 · Lỗi kết nối mạng
      </span>

      <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
        Mất kết nối tới máy chủ Backend
      </h1>

      <p className="mt-2 max-w-lg text-sm text-gray-600 leading-relaxed">
        Trình duyệt không thể kết nối tới máy chủ API (Hugging Face Spaces hoặc Localhost). Vui lòng kiểm tra lại đường truyền Internet hoặc máy chủ đang trong quá trình khởi động lại.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={handleRetry}
          loading={checking}
          className="gap-2 shadow-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" /> Thử kết nối lại
        </Button>
        <Link to="/overview">
          <Button variant="secondary" className="gap-2">
            <Home className="h-4 w-4" /> Về trang tổng quan
          </Button>
        </Link>
      </div>
    </div>
  );
}

