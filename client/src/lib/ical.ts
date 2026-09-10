import { addDays, format, parseISO } from "date-fns";
import type { MyDutyItem } from "../types/duty";

/**
 * Định dạng Date object sang chuỗi chuẩn iCalendar (UTC hoặc Local datetime)
 * Format: YYYYMMDDTHHmmss
 */
function toIcsDateTime(dateStr: string, timeStr: string, isNextDay = false): string {
  try {
    const parsedDate = parseISO(dateStr);
    const targetDate = isNextDay ? addDays(parsedDate, 1) : parsedDate;
    const [hours, minutes] = timeStr.split(":").map((v) => v.trim());
    
    const year = format(targetDate, "yyyy");
    const month = format(targetDate, "MM");
    const day = format(targetDate, "dd");
    const h = (hours || "00").padStart(2, "0");
    const m = (minutes || "00").padStart(2, "0");

    return `${year}${month}${day}T${h}${m}00`;
  } catch {
    const cleanDate = dateStr.replace(/-/g, "");
    const cleanTime = (timeStr || "00:00").replace(/:/g, "").padEnd(4, "0");
    return `${cleanDate}T${cleanTime}00`;
  }
}

/**
 * Format timestamp sang chuẩn iCalendar UTC (Z)
 */
function toIcsTimestamp(d: Date = new Date()): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escape các ký tự đặc biệt theo RFC 5545
 */
function escapeIcsText(str: string): string {
  return (str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export interface GenerateIcsOptions {
  employeeName: string;
  employeeCode?: string;
  items: MyDutyItem[];
  companyName?: string;
}

/**
 * Tạo chuỗi iCalendar (.ics) tiêu chuẩn RFC 5545 cho danh sách ca trực cá nhân
 * Bao gồm cấu hình báo thức (VALARM) đổ chuông tự động trước 2 tiếng và trước 30 phút.
 */
export function generateIcsCalendar({
  employeeName,
  employeeCode,
  items,
  companyName = "DutyFlow",
}: GenerateIcsOptions): string {
  const nowStamp = toIcsTimestamp();
  const calName = `Lịch trực ${companyName} - ${employeeName}`;
  const calDesc = `Lịch phân công trực ca cá nhân của ${employeeName}${employeeCode ? ` (${employeeCode})` : ""} trên hệ thống ${companyName}`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DutyFlow//Lich Truc Ca 24/7//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    `X-WR-CALDESC:${escapeIcsText(calDesc)}`,
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
    // Timezone definition
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Ho_Chi_Minh",
    "X-LIC-LOCATION:Asia/Ho_Chi_Minh",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0700",
    "TZOFFSETTO:+0700",
    "TZNAME:+07",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const item of items) {
    const s = item.schedule;
    if (!s || s.status === "CANCELLED" || item.assignmentStatus === "CANCELLED") {
      continue;
    }

    const startDT = toIcsDateTime(s.date, s.startTime);
    // Kiểm tra ca trực qua đêm: nếu endTime <= startTime thì kết thúc vào ngày hôm sau
    const isOvernight = s.endTime <= s.startTime;
    const endDT = toIcsDateTime(s.date, s.endTime, isOvernight);

    const summary = `[Trực ca] ${s.shiftName} - ${s.location}`;
    const desc = [
      `Ca trực: ${s.shiftName} (${s.startTime} – ${s.endTime})`,
      `Phòng ban: ${s.departmentName || "Toàn cơ quan"}`,
      `Địa điểm trực: ${s.location || "Văn phòng"}`,
      `Trạng thái: ${item.assignmentStatus === "CONFIRMED" ? "Đã xác nhận" : "Được phân công"}`,
      `Nhân viên: ${employeeName}${employeeCode ? ` (${employeeCode})` : ""}`,
      `Ghi chú: Vui lòng có mặt trước 15 phút để nhận bàn giao ca.`,
      `Hệ thống: ${companyName}`,
    ].join("\\n");

    const uid = `dutyflow-${s.id}-${item.assignmentId}@dutyflow.vn`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;TZID=Asia/Ho_Chi_Minh:${startDT}`,
      `DTEND;TZID=Asia/Ho_Chi_Minh:${endDT}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${escapeIcsText(s.location || "Văn phòng")}`,
      "STATUS:CONFIRMED",
      // BÁO THỨC 1: Đổ chuông & hiện thông báo trước 2 tiếng
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:Nhắc nhở: Sắp đến ca trực ${escapeIcsText(s.shiftName)} (${s.startTime} - ${s.endTime}) sau 2 tiếng!`,
      "TRIGGER:-PT2H",
      "END:VALARM",
      // BÁO THỨC 2: Đổ chuông & thông báo trước 30 phút chuẩn bị nhận ca
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:Chuẩn bị: Ca trực ${escapeIcsText(s.shiftName)} sẽ bắt đầu sau 30 phút!`,
      "TRIGGER:-PT30M",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // Format with CRLF as required by RFC 5545
  return lines.join("\r\n");
}

/**
 * Tải file .ics trực tiếp về máy người dùng (tự động tối ưu cho iPhone iOS Safari)
 */
export function downloadIcsFile(filename: string, icsContent: string) {
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const cleanFilename = filename.endsWith(".ics") ? filename : `${filename}.ics`;

  if (isIOS) {
    // Trên iOS Safari, điều hướng đến data URI text/calendar sẽ kích hoạt ngay ứng dụng Lịch của Apple
    const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    window.location.href = dataUri;
    return;
  }

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Tạo link thêm nhanh 1 ca trực vào Google Calendar trên web
 */
export function getGoogleCalendarEventUrl(item: MyDutyItem, employeeName: string): string {
  const s = item.schedule;
  const startDT = toIcsDateTime(s.date, s.startTime);
  const isOvernight = s.endTime <= s.startTime;
  const endDT = toIcsDateTime(s.date, s.endTime, isOvernight);

  const title = encodeURIComponent(`[Lịch trực] ${s.shiftName} - ${s.location}`);
  const details = encodeURIComponent(
    `Ca trực: ${s.shiftName} (${s.startTime} - ${s.endTime})\n` +
    `Phòng ban: ${s.departmentName || "Toàn cơ quan"}\n` +
    `Địa điểm: ${s.location}\n` +
    `Nhân viên: ${employeeName}\n` +
    `Nhắc nhở: Có mặt trước 15 phút bàn giao ca.`
  );
  const location = encodeURIComponent(s.location || "");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDT}/${endDT}&details=${details}&location=${location}&ctz=Asia/Ho_Chi_Minh`;
}
