/* ============================================================
 * Axios adapter mô phỏng REST gateway của Spring Boot backend.
 * Mọi api/*.api.ts gọi đúng endpoint + method + body như tài liệu API;
 * khi VITE_API_URL được cấu hình, adapter này tự tắt và Axios dùng HTTP thật.
 * ============================================================ */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { AxiosError, AxiosHeaders } from "axios";
import * as E from "./engine";
import type { Session } from "./engine";

function decodeSession(authHeader?: string | null): Session | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(atob(authHeader.slice(7).split(".")[1]));
    return payload as Session;
  } catch {
    return null;
  }
}

const delay = () => new Promise((r) => setTimeout(r, 180 + Math.random() * 260));

type Handler = (ctx: {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  session: Session;
}) => unknown;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [];
function route(method: string, pattern: RegExp, handler: Handler) {
  routes.push({ method, pattern, handler });
}

/* ---------- org ---------- */
route("GET", /^\/api\/departments$/, () => E.listDepartments());
route("GET", /^\/api\/shifts$/, () => E.listShifts());
route("GET", /^\/api\/employees$/, ({ session }) => E.listEmployees(session));

/* ---------- schedules ---------- */
route("GET", /^\/api\/duty-schedules\/calendar$/, ({ query }) =>
  E.calendar(query.get("month") ?? "", {
    departmentId: qn(query, "departmentId"),
    shiftId: qn(query, "shiftId"),
    status: query.get("status") ?? undefined,
    employeeId: qn(query, "employeeId"),
  }),
);
route("GET", /^\/api\/duty-schedules\/my-calendar$/, ({ query, session }) =>
  E.myCalendar(session, query.get("from") ?? undefined, query.get("to") ?? undefined),
);
route("POST", /^\/api\/duty-schedules\/auto-assign\/preview$/, ({ body }) =>
  E.runAutoAssignPreview(body as Parameters<typeof E.runAutoAssignPreview>[0]),
);
route("POST", /^\/api\/duty-schedules\/auto-assign\/confirm$/, ({ body, session }) =>
  E.commitAutoAssign(body as Parameters<typeof E.commitAutoAssign>[0], session),
);
route("GET", /^\/api\/duty-schedules\/(\d+)$/, ({ params, session: _s }) =>
  E.getSchedule(Number(params.id)),
);
route("POST", /^\/api\/duty-schedules$/, ({ body, session }) =>
  E.createSchedule(body as Parameters<typeof E.createSchedule>[0], session),
);
route("PUT", /^\/api\/duty-schedules\/(\d+)$/, ({ params, body, session }) =>
  E.updateSchedule(Number(params.id), body as Parameters<typeof E.updateSchedule>[1], session),
);
route("DELETE", /^\/api\/duty-schedules\/(\d+)$/, ({ params, session }) =>
  E.deleteSchedule(Number(params.id), session),
);
route("POST", /^\/api\/duty-schedules\/(\d+)\/confirm$/, ({ params, session }) =>
  E.confirmSchedule(Number(params.id), session),
);
route("POST", /^\/api\/duty-schedules\/(\d+)\/lock$/, ({ params, session }) =>
  E.lockSchedule(Number(params.id), session),
);
route("POST", /^\/api\/duty-schedules\/(\d+)\/cancel$/, ({ params, session }) =>
  E.cancelSchedule(Number(params.id), session),
);

/* ---------- assignments ---------- */
route("POST", /^\/api\/duty-schedules\/(\d+)\/assignments$/, ({ params, body, session }) =>
  E.addAssignment(Number(params.id), (body as { employeeId: number }).employeeId, session),
);
route("PUT", /^\/api\/duty-schedules\/(\d+)\/assignments\/(\d+)$/, ({ params, body, session }) =>
  E.replaceAssignment(Number(params.id), Number(params.aid), (body as { employeeId: number }).employeeId, session),
);
route("DELETE", /^\/api\/duty-schedules\/(\d+)\/assignments\/(\d+)$/, ({ params, session }) =>
  E.removeAssignment(Number(params.id), Number(params.aid), session),
);
route("POST", /^\/api\/duty-schedules\/(\d+)\/assignments\/(\d+)\/confirm$/, ({ params, session }) =>
  E.respondAssignment(Number(params.id), Number(params.aid), true, session),
);
route("POST", /^\/api\/duty-schedules\/(\d+)\/assignments\/(\d+)\/decline$/, ({ params, session }) =>
  E.respondAssignment(Number(params.id), Number(params.aid), false, session),
);

/* ---------- day offs ---------- */
route("GET", /^\/api\/day-offs$/, ({ session }) => E.listDayOffs(session));
route("POST", /^\/api\/day-offs$/, ({ body, session }) =>
  E.createDayOff(session, body as Parameters<typeof E.createDayOff>[1]),
);
route("PUT", /^\/api\/day-offs\/(\d+)$/, ({ params, body, session }) =>
  E.updateDayOff(Number(params.id), (body as { status: "APPROVED" | "REJECTED" }).status, session),
);
route("DELETE", /^\/api\/day-offs\/(\d+)$/, ({ params, session }) =>
  E.deleteDayOff(Number(params.id), session),
);

/* ---------- zalo ---------- */
route("GET", /^\/api\/integrations\/zalo\/status$/, ({ session }) => E.zaloStatus(session));
route("GET", /^\/api\/integrations\/zalo\/connect$/, ({ session }) => E.zaloConnect(session));
route("POST", /^\/api\/integrations\/zalo\/connect\/complete$/, ({ session }) => E.zaloCompleteConnect(session));
route("POST", /^\/api\/integrations\/zalo\/disconnect$/, ({ session }) => E.zaloDisconnect(session));
route("PUT", /^\/api\/integrations\/zalo\/preferences$/, ({ body, session }) =>
  E.zaloPreferences(session, (body as { receiveNotifications: boolean }).receiveNotifications),
);
route("GET", /^\/api\/integrations\/zalo\/employees$/, ({ session }) => {
  if (session.role !== "ADMIN") throw new E.ApiError(403, "FORBIDDEN", "Chỉ quản trị viên xem được danh sách này.");
  return E.zaloEmployeeRows();
});
route("PUT", /^\/api\/integrations\/zalo\/dev-failure$/, ({ body, session }) => {
  if (session.role !== "ADMIN") throw new E.ApiError(403, "FORBIDDEN", "Chỉ quản trị viên.");
  E.setDevZaloFailure((body as { enabled: boolean }).enabled);
  return { enabled: E.getDevZaloFailure() };
});
route("GET", /^\/api\/integrations\/zalo\/dev-failure$/, () => ({ enabled: E.getDevZaloFailure() }));

/* ---------- swap requests ---------- */
route("GET", /^\/api\/swap-requests$/, ({ session }) => E.listSwapRequests(session));
route("POST", /^\/api\/swap-requests$/, ({ body, session }) =>
  E.createSwapRequest(session, body as { assignmentId: number; reason: string }),
);
route("PUT", /^\/api\/swap-requests\/(\d+)$/, ({ params, body, session }) =>
  E.updateSwapRequest(Number(params.id), (body as { status: "APPROVED" | "REJECTED" | "CANCELLED" }).status, session),
);

/* ---------- notifications ---------- */
route("GET", /^\/api\/notifications$/, ({ query, session }) =>
  E.listNotifications(session, query.get("all") === "true"),
);
route("GET", /^\/api\/notifications\/unread-count$/, ({ session }) => ({ count: E.unreadCount(session) }));
route("PUT", /^\/api\/notifications\/read-all$/, ({ session }) => E.markAllRead(session));
route("PUT", /^\/api\/notifications\/(\d+)\/read$/, ({ params, session }) =>
  E.markRead(Number(params.id), session),
);

function qn(query: URLSearchParams, key: string): number | undefined {
  const v = query.get(key);
  return v ? Number(v) : undefined;
}

function namedParams(pattern: RegExp, path: string): Record<string, string> {
  // thứ tự capture group: id trước, aid sau (khớp cách khai báo route)
  const m = pattern.exec(path);
  const out: Record<string, string> = {};
  if (!m) return out;
  if (m[1] !== undefined) out.id = m[1];
  if (m[2] !== undefined) out.aid = m[2];
  return out;
}

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  await delay();
  const method = (config.method ?? "get").toUpperCase();
  const fullUrl = config.url ?? "";
  const [path, search] = fullUrl.split("?");
  const query = new URLSearchParams(search ?? "");

  const session = decodeSession((config.headers as AxiosHeaders)?.get?.("Authorization") as string | undefined);
  if (!session) {
    throw makeError(config, 401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  for (const r of routes) {
    if (r.method !== method || !r.pattern.test(path)) continue;
    try {
      const data = r.handler({
        params: namedParams(r.pattern, path),
        query,
        body: config.data ? JSON.parse(config.data as string) : undefined,
        session,
      });
      return {
        data, status: 200, statusText: "OK",
        headers: {}, config,
      } as AxiosResponse;
    } catch (err) {
      if (err instanceof E.ApiError) throw makeError(config, err.status, err.code, err.message);
      throw makeError(config, 500, "INTERNAL_ERROR", "Lỗi hệ thống, vui lòng thử lại.");
    }
  }
  throw makeError(config, 404, "NOT_FOUND", `Không tìm thấy endpoint ${method} ${path}`);
};

function makeError(config: InternalAxiosRequestConfig, status: number, code: string, message: string) {
  const response: AxiosResponse = {
    data: { success: false, code, message, timestamp: new Date().toISOString() },
    status, statusText: code, headers: {}, config,
  };
  return new AxiosError(message, String(status), config, undefined, response);
}
