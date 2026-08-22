/* ============================================================
 * apiClient — Axios instance chuẩn:
 *  - baseURL từ VITE_API_URL (không hard-code localhost)
 *  - Bearer JWT từ token store
 *  - interceptor xử lý 401 + chuẩn hoá lỗi { success, code, message }
 *  - Khi chưa có backend thật (không set VITE_API_URL) → dùng mockAdapter
 *    chạy đúng REST contract của Spring Boot module.
 * ============================================================ */
import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "../types/duty";
import { mockAdapter } from "./mock/adapter";

const TOKEN_KEY = "trucca.token";

/* ---------- token store (mock JWT cho demo; backend thật phát JWT riêng) ---------- */
export interface StoredSession { sub: string; role: "ADMIN" | "EMPLOYEE"; name: string; employeeId?: number; title: string }

const DEMO_USERS: StoredSession[] = [
  { sub: "admin", role: "ADMIN", name: "Quản trị viên", title: "Trưởng phòng Vận hành" },
  { sub: "emp-1", role: "EMPLOYEE", name: "Nguyễn Văn An", employeeId: 1, title: "Nhân viên Kỹ thuật" },
  { sub: "emp-2", role: "EMPLOYEE", name: "Trần Thị Bích", employeeId: 2, title: "Nhân viên Vận hành" },
];

export const demoUsers = DEMO_USERS;

function encodeToken(u: StoredSession): string {
  const payload = btoa(JSON.stringify({ sub: u.sub, role: u.role, name: u.name, employeeId: u.employeeId }));
  return `demo.${payload}.sig`;
}

export function getSession(): StoredSession {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (raw) {
    const found = DEMO_USERS.find((u) => u.sub === raw);
    if (found) return found;
  }
  return DEMO_USERS[0];
}
export function setSession(sub: string) {
  localStorage.setItem(TOKEN_KEY, sub);
  window.dispatchEvent(new CustomEvent("trucca:session-changed"));
}

const useMock = !import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
  ...(useMock ? { adapter: mockAdapter } : {}),
});

apiClient.interceptors.request.use((config) => {
  const u = getSession();
  config.headers.Authorization = `Bearer ${encodeToken(u)}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      // hết hạn token → frontend thật sẽ redirect login / gọi refresh-token
      window.dispatchEvent(new CustomEvent("trucca:unauthorized"));
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
