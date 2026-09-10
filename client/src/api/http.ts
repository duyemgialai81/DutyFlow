/* ============================================================
 * apiClient — Axios instance chuẩn:
 *  - Gọi API thật tới http://localhost:8080
 *  - Lấy JWT thật từ backend
 * ============================================================ */
import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "../types/duty";

const TOKEN_KEY = "trucca.token";
const JWT_KEY = "trucca.jwt";

/* ---------- token store ---------- */
export interface StoredSession { sub: string; role: "ADMIN" | "LEADER" | "EMPLOYEE"; name: string; employeeId?: number; title: string }

export function getSession(): StoredSession | null {
  const raw = localStorage.getItem("trucca.session");
  if (raw) {
    try {
      let data = JSON.parse(raw);
      if (data && data.data && typeof data.data === "object") {
        data = data.data;
      }
      const roleStr = String(data.role ?? "");
      const role: "ADMIN" | "LEADER" | "EMPLOYEE" =
        roleStr.includes("ADMIN") ? "ADMIN" : roleStr.includes("LEADER") ? "LEADER" : "EMPLOYEE";
      const title =
        role === "ADMIN" ? "Quản trị viên" : role === "LEADER" ? "Tổ trưởng / Trưởng phòng" : "Nhân viên";
      const displayName = data.fullName || data.name || data.username || "Người dùng";
      return {
        sub: data.username || "user",
        role,
        name: displayName,
        employeeId: data.employeeId,
        title,
      };
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function setSession(sub: string) {
  try {
    const res = await apiClient.post("/api/auth/login", {
      username: sub,
      password: "kyta@1234",
    });
    const payload = res.data ?? res;
    const token = payload.token || payload?.data?.token;
    if (token) {
      localStorage.setItem(JWT_KEY, token);
      localStorage.setItem("trucca.session", JSON.stringify(payload));
    }
  } catch (error) {
    console.error("Login error", error);
  }
  
  localStorage.setItem(TOKEN_KEY, sub);
  window.dispatchEvent(new CustomEvent("trucca:session-changed"));
}

const rawBaseUrl = (import.meta.env.VITE_API_URL || "").trim();
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_KEY);
  if (token && token !== "undefined" && token !== "null" && token.trim() !== "") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      res.data = body.data;
    }
    return res;
  },
  (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      // Mất mạng hoặc máy chủ không phản hồi
      window.dispatchEvent(new CustomEvent("trucca:network-error", {
        detail: { message: "Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra đường truyền mạng." }
      }));
    } else if (error.response.status === 401) {
      window.dispatchEvent(new CustomEvent("trucca:unauthorized"));
    } else if (error.response.status === 403) {
      window.dispatchEvent(new CustomEvent("trucca:forbidden"));
    } else if (error.response.status >= 500) {
      const traceId = (error.response.headers?.["x-trace-id"] as string) || error.response.data?.traceId || "";
      window.dispatchEvent(new CustomEvent("trucca:server-error", { detail: { traceId } }));
    }
    return Promise.reject(error);
  },
);

/** Đọc message thân thiện từ lỗi chuẩn hoá của backend */
export function apiErrorMessage(err: unknown, fallback = "Có lỗi xảy ra, vui lòng thử lại."): string {
  if (err instanceof AxiosError && err.response?.data?.message) return err.response.data.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
