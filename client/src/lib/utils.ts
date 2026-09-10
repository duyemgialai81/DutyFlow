/* Tiện ích ngày tháng + format — dùng chung toàn frontend */

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/** yyyy-MM-dd (local, không lệch timezone) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "2026-08-25" → "25/08/2026" */
export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-08-25" → "Thứ Ba, 25/08" */
export function fmtDateLong(iso: string): string {
  const d = parseISO(iso);
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${days[d.getDay()]}, ${fmtDate(iso)}`;
}

export function fmtDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDate(toISODate(d))} ${hh}:${mm}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Ma trận 6 tuần (42 ô) cho tháng, bắt đầu từ Thứ Hai */
export function monthMatrix(year: number, month0: number): string[] {
  const first = new Date(year, month0, 1);
  const startDow = (first.getDay() + 6) % 7; // T2 = 0
  const start = new Date(year, month0, 1 - startDow);
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(toISODate(d));
  }
  return cells;
}

/** "5 phút trước" */
export function timeAgo(isoDateTime: string): string {
  const diff = Date.now() - new Date(isoDateTime).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return fmtDate(isoDateTime.slice(0, 10));
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function weekdayShort(iso: string): string {
  const d = parseISO(iso);
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
}

export function maskZaloId(id?: string): string {
  if (!id) return "";
  return id.length <= 8 ? id : `${id.slice(0, 4)}••••${id.slice(-4)}`;
}
