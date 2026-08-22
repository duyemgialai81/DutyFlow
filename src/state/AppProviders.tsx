import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { getSession, setSession as persistSession, demoUsers } from "../api/http";
import type { StoredSession } from "../api/http";
import { subscribeDbChange } from "../api/mock/adapter-reexport";
import { cx } from "../lib/utils";

/* ================= Auth ================= */
interface AuthCtx {
  user: StoredSession;
  isAdmin: boolean;
  switchUser: (sub: string) => void;
}
const AuthContext = createContext<AuthCtx | null>(null);
export function useAuth(): AuthCtx {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside provider");
  return v;
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
  const [user, setUser] = useState<StoredSession>(() => getSession());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4600);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  /* engine (mô phỏng event system backend) thay đổi → làm mới query */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    return subscribeDbChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void queryClient.invalidateQueries(), 120);
    });
  }, []);

  useEffect(() => {
    const onSession = () => {
      setUser(getSession());
      void queryClient.invalidateQueries();
    };
    window.addEventListener("trucca:session-changed", onSession);
    return () => window.removeEventListener("trucca:session-changed", onSession);
  }, []);

  const switchUser = useCallback((sub: string) => persistSession(sub), []);

  const auth = useMemo<AuthCtx>(
    () => ({ user, isAdmin: user.role === "ADMIN", switchUser }),
    [user, switchUser],
  );
  const toast = useMemo<ToastCtx>(() => ({ push }), [push]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <ToastContext.Provider value={toast}>
          {children}
          <ToastHost toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export { demoUsers };
