import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays, CalendarPlus, Wand2, UserCheck, Bell, Palmtree, Plug, ChevronDown,
} from "lucide-react";
import { AppProviders, demoUsers, useAuth } from "../../state/AppProviders";
import { NotificationBell } from "../notification/NotificationBell";
import { Avatar } from "../ui";
import { cx } from "../../lib/utils";

/* ---------- đồng hồ sống + ca hiện tại ---------- */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function currentShiftInfo(now: Date): { label: string; active: boolean; cls: string } {
  const h = now.getHours();
  if (h >= 8 && h < 12) return { label: "Ca sáng · 08:00–12:00", active: true, cls: "bg-gold-100 text-gold-700 border-gold-300/60" };
  if (h >= 13 && h < 17) return { label: "Ca chiều · 13:00–17:00", active: true, cls: "bg-pine-100 text-pine-800 border-pine-300/60" };
  if (h >= 18 && h < 22) return { label: "Ca tối · 18:00–22:00", active: true, cls: "bg-night-100 text-night-600 border-night-600/30" };
  return { label: "Ngoài giờ trực", active: false, cls: "bg-linesoft text-muted border-line" };
}

const TITLES: Array<[string, string]> = [
  ["/duty/calendar", "Lịch trực"],
  ["/duty/create", "Tạo ca trực"],
  ["/duty/auto-assign", "Phân ca tự động"],
  ["/duty-schedules/", "Chi tiết ca trực"],
  ["/my-duty", "Ca trực của tôi"],
  ["/day-offs", "Đăng ký nghỉ"],
  ["/notifications", "Nhật ký thông báo"],
  ["/settings/zalo", "Kết nối Zalo"],
];

function Sidebar() {
  const { isAdmin } = useAuth();
  const nav = [
    { group: "Lịch trực", items: [
      { to: "/duty/calendar", label: "Lịch tổng", icon: CalendarDays, admin: false },
      { to: "/duty/create", label: "Tạo ca trực", icon: CalendarPlus, admin: true },
      { to: "/duty/auto-assign", label: "Phân ca tự động", icon: Wand2, admin: true },
      { to: "/my-duty", label: "Ca của tôi", icon: UserCheck, admin: false },
      { to: "/day-offs", label: "Đăng ký nghỉ", icon: Palmtree, admin: false },
    ]},
    { group: "Hệ thống", items: [
      { to: "/notifications", label: "Thông báo", icon: Bell, admin: false },
      { to: "/settings/zalo", label: "Kết nối Zalo", icon: Plug, admin: false },
    ]},
  ];
  return (
    <aside className="sidebar-grain sticky top-0 flex h-screen w-[232px] shrink-0 flex-col bg-pine-950 text-pine-100 max-lg:hidden">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-300 text-pine-950 shadow-[0_0_0_4px_rgb(232_176_75/0.15)]">
          <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <circle cx="16" cy="16" r="10" />
            <path d="M16 10v6l4.5 3" />
          </svg>
        </div>
        <div>
          <div className="font-display text-[19px] font-extrabold leading-none tracking-tight text-white">TrựcCa</div>
          <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-pine-300">Duty · Zalo</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {nav.map((g) => (
          <div key={g.group} className="mb-5">
            <div className="px-2.5 pb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-pine-400">{g.group}</div>
            <ul className="space-y-1">
              {g.items.filter((i) => !i.admin || isAdmin).map((i) => (
                <li key={i.to}>
                  <NavLink
                    to={i.to}
                    className={({ isActive }) =>
                      cx(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150",
                        isActive
                          ? "bg-pine-800 text-white shadow-[inset_3px_0_0_var(--color-gold-300)]"
                          : "text-pine-200 hover:bg-pine-900 hover:text-white",
                      )
                    }
                  >
                    <i.icon className="h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-110" />
                    {i.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-pine-800/80 px-5 py-4 text-[11px] leading-relaxed text-pine-300">
        <p className="font-semibold text-pine-200">Module Phân lịch trực</p>
        <p>Spring Boot · React · Zalo ZNS</p>
      </div>
    </aside>
  );
}

function UserSwitcher() {
  const { user, switchUser } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-3 shadow-sm transition-all hover:border-pine-300"
      >
        <Avatar name={user.name} />
        <span className="max-w-[130px] text-left">
          <span className="block truncate text-[13px] font-bold leading-tight text-ink">{user.name}</span>
          <span className={cx("block text-[10.5px] font-bold uppercase tracking-wide", user.role === "ADMIN" ? "text-gold-500" : "text-pine-600")}>
            {user.role === "ADMIN" ? "Quản trị" : "Nhân viên"}
          </span>
        </span>
        <ChevronDown className={cx("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="anim-pop absolute right-0 z-50 mt-2 w-64 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)]">
            <div className="px-3 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-muted">
              Đổi phiên đăng nhập (demo RBAC)
            </div>
            {demoUsers.map((u) => (
              <button
                key={u.sub}
                onClick={() => { switchUser(u.sub); setOpen(false); }}
                className={cx(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-pine-50",
                  u.sub === user.sub && "bg-pine-50",
                )}
              >
                <Avatar name={u.name} size="sm" />
                <span className="flex-1">
                  <span className="block text-[13px] font-bold text-ink">{u.name}</span>
                  <span className="block text-[11px] text-muted">{u.title}</span>
                </span>
                <span className={cx(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  u.role === "ADMIN" ? "bg-gold-100 text-gold-700" : "bg-pine-100 text-pine-700",
                )}>
                  {u.role === "ADMIN" ? "Admin" : "NV"}
                </span>
              </button>
            ))}
            <div className="mt-1 border-t border-linesoft px-3 py-2 text-[11px] leading-snug text-muted">
              Backend thật xác thực bằng JWT + @PreAuthorize — xem <code className="font-mono">server/security</code>.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Header() {
  const now = useNow();
  const shift = currentShiftInfo(now);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "TrựcCa";
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="flex items-center gap-4 px-5 py-3 lg:px-8">
        <button className="rounded-lg border border-line bg-white p-2 text-ink lg:hidden" onClick={() => navigate("/duty/calendar")} aria-label="Trang chủ">
          <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <circle cx="16" cy="16" r="10" /><path d="M16 10v6l4.5 3" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-[19px] font-extrabold tracking-tight text-ink">{title}</h1>
        </div>

        <div className={cx("hidden items-center gap-2 rounded-full border px-3 py-1.5 md:flex", shift.cls)}>
          <span className={cx("h-2 w-2 rounded-full", shift.active ? "live-dot bg-current" : "bg-muted/50")} />
          <span className="text-[12px] font-bold">{shift.label}</span>
        </div>
        <div className="hidden rounded-lg border border-line bg-white px-3 py-1.5 font-mono text-[13px] font-semibold tabular-nums text-ink sm:block">
          {hh}:{mm}<span className="text-muted">:{ss}</span>
        </div>

        <NotificationBell />
        <UserSwitcher />
      </div>

      {/* nav mobile */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {[
          ["/duty/calendar", "Lịch tổng"], ["/duty/create", "Tạo ca"], ["/duty/auto-assign", "Phân ca"],
          ["/my-duty", "Ca của tôi"], ["/day-offs", "Nghỉ"], ["/notifications", "Thông báo"], ["/settings/zalo", "Zalo"],
        ].map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => cx(
            "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
            isActive ? "bg-pine-800 text-white" : "bg-white text-inksoft border border-line",
          )}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="workspace-canvas min-w-0 flex-1">
          <Header />
          <main className="mx-auto max-w-[1240px] px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AppProviders>
  );
}


