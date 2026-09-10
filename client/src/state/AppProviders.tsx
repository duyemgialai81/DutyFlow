import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { apiClient, getSession } from "../api/http";
import type { StoredSession } from "../api/http";
import { cx } from "../lib/utils";

/* ================= Auth ================= */
interface AuthCtx {
  user: StoredSession;
  isAdmin: boolean;
  isLeader: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
export const AuthContext = createContext<AuthCtx | null>(null);
export function useAuth(): AuthCtx {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside provider or not logged in");
  if (!v.user) throw new Error("not logged in");
  return v as AuthCtx;
}

/* ================= Toast ================= */
export interface ToastItem { id: number; kind: "success" | "error" | "info"; message: string }
interface ToastCtx { push: (kind: ToastItem["kind"], message: string) => void }
const ToastContext = createContext<ToastCtx | null>(null);
export function useToast(): ToastCtx {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast outside provider");
  return v;
}

function ToastHost({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[90] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "anim-toast flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-[var(--shadow-pop)]",
            t.kind === "success" && "border-green-200",
            t.kind === "error" && "border-red-200",
            t.kind === "info" && "border-blue-200",
          )}
        >
          {t.kind === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />}
          {t.kind === "error" && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
          {t.kind === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}
          <p className="flex-1 text-[13.5px] leading-snug text-ink">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-gray-400 transition-colors hover:text-gray-700" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ================= Provider gốc ================= */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 4000 },
  },
});
export { queryClient };

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredSession | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4600);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);


  const initSession = useCallback(() => {
    let token = localStorage.getItem("trucca.jwt");
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
      localStorage.removeItem("trucca.jwt");
      localStorage.removeItem("trucca.session");
      token = null;
    }
    const session = getSession();
    if (token && session) {
      setUser(session);
    } else {
      localStorage.removeItem("trucca.jwt");
      setUser(null as any);
    }
  }, []);

  useEffect(() => {
    const onSession = () => {
      initSession();
      void queryClient.invalidateQueries();
    };
    
    // Initial check
    initSession();

    const onNetworkError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      push("error", detail?.message || "Mất kết nối máy chủ backend. Vui lòng kiểm tra lại mạng.");
    };

    const onServerError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const traceMsg = detail?.traceId ? ` (Mã tra cứu: ${detail.traceId})` : "";
      push("error", `Máy chủ gặp sự cố xử lý${traceMsg}. Vui lòng thử lại.`);
    };

    window.addEventListener("trucca:session-changed", onSession);
    window.addEventListener("trucca:network-error", onNetworkError);
    window.addEventListener("trucca:server-error", onServerError);
    window.addEventListener("trucca:unauthorized", () => {
      localStorage.removeItem("trucca.jwt");
      localStorage.removeItem("trucca.session");
      initSession();
    });

    return () => {
      window.removeEventListener("trucca:session-changed", onSession);
      window.removeEventListener("trucca:network-error", onNetworkError);
      window.removeEventListener("trucca:server-error", onServerError);
    };
  }, [initSession, push]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res: any = await apiClient.post("/api/auth/login", { username, password });
      const payload = res.data ?? res;
      const token = payload.token || payload?.data?.token || res.token;
      if (!token) {
        throw new Error("Không nhận được token xác thực từ máy chủ.");
      }
      localStorage.setItem("trucca.jwt", token);
      localStorage.setItem("trucca.session", JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("trucca:session-changed"));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Tài khoản hoặc mật khẩu không đúng.";
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("trucca.jwt");
    localStorage.removeItem("trucca.session");
    window.dispatchEvent(new CustomEvent("trucca:session-changed"));
  }, []);

  const auth = useMemo(() => {
    const role = user?.role ?? "";
    const isAdmin  = role === "ADMIN";
    const isLeader = role === "LEADER";
    return { user, isAdmin, isLeader, login, logout };
  }, [user, login, logout]);

  const toast = useMemo<ToastCtx>(() => ({ push }), [push]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth as any}>
        <ToastContext.Provider value={toast}>
          {children}
          <ToastHost toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
