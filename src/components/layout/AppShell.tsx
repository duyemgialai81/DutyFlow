import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, Bell, CalendarCheck2, CalendarDays, Check, ChevronDown, ChevronsLeft, ChevronsRight,
  Clock3, LayoutDashboard, Menu, Repeat, Search, Settings, Users, X,
} from "lucide-react";
import { useAuth, demoUsers } from "../../state/AppProviders";
import { NotificationBell } from "../notification/NotificationBell";
import { CommandSearch } from "../duty/CommandSearch";
import { Avatar, Kbd, Tip } from "../ui";
import { cx } from "../../lib/utils";

/* ---------- logo ---------- */
function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <path d="M9 14h14M9 19h9" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="9" y="7" width="14" height="3" rx="1.5" fill="white" opacity=".55" />
      <circle cx="23" cy="22" r="4.4" fill="#16A34A" stroke="white" strokeWidth="1.6" />
      <path d="M21.4 22l1.2 1.2 2-2.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/overview": { title: "Tổng quan", subtitle: "Bức tranh trực ca của đội ngũ trong tháng" },
  "/duty/calendar": { title: "Phân lịch trực", subtitle: "Quản lý lịch trực và phân công nhân sự" },
  "/my-duty": { title: "Ca trực của tôi", subtitle: "Lịch trực cá nhân và xác nhận ca" },
  "/users": { title: "Nhân viên", subtitle: "Danh sách nhân sự và trạng thái kết nối" },
  "/shifts": { title: "Ca trực", subtitle: "Khung giờ trực cố định của hệ thống" },
  "/requests": { title: "Đổi ca & Nghỉ phép", subtitle: "Phê duyệt yêu cầu từ nhân viên" },
  "/notifications": { title: "Thông báo", subtitle: "Nhật ký gửi thông báo qua Zalo" },
  "/reports": { title: "Báo cáo", subtitle: "Mức độ phủ lịch và hiệu suất phân công" },
  "/settings": { title: "Cài đặt", subtitle: "Tài khoản, kết nối Zalo và tuỳ chọn" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, switchUser } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("df.sidebar") === "1");
  const [mobileNav, setMobileNav] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMobileNav(false), [location.pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const persistCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("df.sidebar", next ? "1" : "0");
  };

  const adminNav: NavItem[] = [
    { to: "/overview", label: "Tổng quan", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    { to: "/duty/calendar", label: "Lịch trực", icon: <CalendarDays className="h-[18px] w-[18px]" /> },
    { to: "/users", label: "Nhân viên", icon: <Users className="h-[18px] w-[18px]" /> },
    { to: "/shifts", label: "Ca trực", icon: <Clock3 className="h-[18px] w-[18px]" /> },
    { to: "/requests", label: "Đổi ca", icon: <Repeat className="h-[18px] w-[18px]" /> },
    { to: "/notifications", label: "Thông báo", icon: <Bell className="h-[18px] w-[18px]" /> },
    { to: "/reports", label: "Báo cáo", icon: <BarChart3 className="h-[18px] w-[18px]" /> },
    { to: "/settings", label: "Cài đặt", icon: <Settings className="h-[18px] w-[18px]" /> },
  ];
  const employeeNav: NavItem[] = [
    { to: "/overview", label: "Tổng quan", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    { to: "/duty/calendar", label: "Lịch trực", icon: <CalendarDays className="h-[18px] w-[18px]" /> },
    { to: "/my-duty", label: "Ca của tôi", icon: <CalendarCheck2 className="h-[18px] w-[18px]" /> },
    { to: "/requests", label: "Đổi ca", icon: <Repeat className="h-[18px] w-[18px]" /> },
    { to: "/notifications", label: "Thông báo", icon: <Bell className="h-[18px] w-[18px]" /> },
    { to: "/settings", label: "Cài đặt", icon: <Settings className="h-[18px] w-[18px]" /> },
  ];
  const nav = isAdmin ? adminNav : employeeNav;
  const meta = PAGE_META[location.pathname] ?? PAGE_META["/overview"];

  const mobileNavItems = isAdmin
    ? [
        { to: "/duty/calendar", label: "Lịch", icon: <CalendarDays className="h-5 w-5" /> },
        { to: "/shifts", label: "Ca trực", icon: <Clock3 className="h-5 w-5" /> },
        { to: "/notifications", label: "Thông báo", icon: <Bell className="h-5 w-5" /> },
        { to: "/settings", label: "Tài khoản", icon: <Settings className="h-5 w-5" /> },
      ]
    : [
        { to: "/duty/calendar", label: "Lịch", icon: <CalendarDays className="h-5 w-5" /> },
        { to: "/my-duty", label: "Ca trực", icon: <CalendarCheck2 className="h-5 w-5" /> },
        { to: "/notifications", label: "Thông báo", icon: <Bell className="h-5 w-5" /> },
        { to: "/settings", label: "Tài khoản", icon: <Settings className="h-5 w-5" /> },
      ];

  const SidebarInner = ({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className={cx("flex h-16 items-center gap-2.5 border-b border-edgesoft px-4", compact && "justify-center px-0")}>
        <LogoMark />
        {!compact && (
          <span className="min-w-0">
            <span className="block text-[15px] font-bold leading-tight tracking-tight text-ink">DutyFlow</span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400">Scheduling</span>
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
        {!compact && <p className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-gray-400">Quản lý</p>}
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                "group flex h-9.5 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium transition-all duration-150",
                compact && "justify-center px-0",
                isActive ? "bg-blue-50 font-semibold text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cx("transition-colors", isActive ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600")}>
                  {item.icon}
                </span>
                {!compact && item.label}
                {compact && <span className="sr-only">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-edgesoft p-3">
        {!compact && (
          <div className="mb-2 rounded-[10px] bg-gray-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-gray-500">Phiên demo</p>
            <p className="text-[11px] leading-snug text-gray-400">Đổi tài khoản ở góc phải trên để thử vai trò khác.</p>
          </div>
        )}
        <button
          onClick={persistCollapse}
          className="hidden h-9 w-full items-center justify-center gap-2 rounded-[10px] text-[12.5px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 lg:flex"
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Thu gọn</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* ===== desktop sidebar ===== */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-edge bg-surface transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-[240px]",
        )}
      >
        <SidebarInner compact={collapsed} />
      </aside>

      {/* ===== mobile sidebar overlay ===== */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div className="anim-fade absolute inset-0 bg-gray-900/45" onClick={() => setMobileNav(false)} />
          <div className="anim-pop absolute inset-y-0 left-0 w-[260px] bg-surface shadow-[var(--shadow-pop)]">
            <button onClick={() => setMobileNav(false)} aria-label="Đóng menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4.5 w-4.5" />
            </button>
            <SidebarInner compact={false} onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      {/* ===== main column ===== */}
      <div className={cx("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]")}>
        {/* header */}
        <header className="sticky top-0 z-30 border-b border-edge bg-surface/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileNav(true)}
              className="rounded-[10px] p-2 text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="lg:hidden"><LogoMark size={28} /></span>

            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-ink">{meta.title}</h1>
              <p className="truncate text-[12px] text-sub">{meta.subtitle}</p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("df:open-search"))}
                className="hidden h-9 w-60 items-center gap-2 rounded-[10px] border border-edge bg-gray-50 px-3 text-[13px] text-faint transition-all duration-150 hover:border-gray-300 hover:bg-surface md:flex"
                aria-label="Tìm kiếm"
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Tìm nhân viên, ca trực...</span>
                <Kbd>⌘K</Kbd>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("df:open-search"))}
                className="rounded-[10px] p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden"
                aria-label="Tìm kiếm"
              >
                <Search className="h-5 w-5" />
              </button>

              <NotificationBell />

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-[10px] py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user.name} size="sm" />
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[130px] truncate text-[13px] font-semibold leading-tight text-ink">{user.name}</span>
                    <span className="block text-[11px] leading-tight text-gray-400">{isAdmin ? "Quản trị viên" : "Nhân viên"}</span>
                  </span>
                  <ChevronDown className={cx("h-4 w-4 text-gray-400 transition-transform duration-150", menuOpen && "rotate-180")} />
                </button>

                {menuOpen && (
                  <div className="anim-pop absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-edge bg-surface shadow-[var(--shadow-pop)]" role="menu">
                    <div className="border-b border-edgesoft px-4 py-3">
                      <p className="text-[13px] font-bold text-ink">{user.name}</p>
                      <p className="text-[11.5px] text-sub">{user.title}</p>
                    </div>
                    <div className="px-2 py-2">
                      <p className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">Chuyển tài khoản demo</p>
                      {demoUsers.map((u) => (
                        <button
                          key={u.sub}
                          role="menuitem"
                          onClick={() => { switchUser(u.sub); setMenuOpen(false); }}
                          className={cx(
                            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50",
                            u.sub === user.sub && "bg-blue-50/60",
                          )}
                        >
                          <Avatar name={u.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-ink">{u.name}</span>
                            <span className="block text-[11px] text-gray-400">{u.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}</span>
                          </span>
                          {u.sub === user.sub && <Check className="h-4 w-4 text-brand-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>

      {/* ===== mobile bottom nav ===== */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-white/85 backdrop-blur-md lg:hidden"
        style={{ height: 64 }}
        aria-label="Điều hướng di động"
      >
        <div className="mx-auto flex h-full max-w-md items-stretch justify-around">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors",
                  isActive ? "text-brand-600" : "text-gray-400 hover:text-gray-600",
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <CommandSearch />
    </div>
  );
}
