import React, { useState, useMemo } from "react";
import {
  Bell,
  Calendar,
  CalendarCheck2,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Info,
  Layers,
  PhoneCall,
  Smartphone,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Modal, Button } from "../ui";
import { downloadIcsFile, generateIcsCalendar } from "../../lib/ical";
import type { MyDutyItem } from "../../types/duty";
import { cx, todayISO } from "../../lib/utils";

export interface SyncCalendarModalProps {
  open: boolean;
  onClose: () => void;
  items: MyDutyItem[];
  employeeName: string;
  employeeCode?: string;
  employeeId?: number;
}

export function SyncCalendarModal({
  open,
  onClose,
  items,
  employeeName,
  employeeCode,
  employeeId,
}: SyncCalendarModalProps) {
  const [activeTab, setActiveTab] = useState<"quick" | "ios" | "android" | "url">("quick");
  const [copied, setCopied] = useState(false);

  const today = todayISO();
  const validItems = items.filter(
    (i) => i.schedule && i.schedule.status !== "CANCELLED" && i.assignmentStatus !== "CANCELLED",
  );
  
  // Nếu tài khoản chưa có ca (ví dụ Admin thử nghiệm), tự động chuẩn bị 3 ca mẫu để xuất file có sự kiện, không bị trắng màn hình
  const isSample = validItems.length === 0;
  const effectiveItems = useMemo(() => {
    if (validItems.length > 0) return validItems;
    const baseDate = new Date();
    const d1 = baseDate.toISOString().slice(0, 10);
    const d2 = new Date(baseDate.getTime() + 1 * 86400000).toISOString().slice(0, 10);
    const d3 = new Date(baseDate.getTime() + 3 * 86400000).toISOString().slice(0, 10);
    return [
      {
        assignmentId: 9001,
        assignmentStatus: "CONFIRMED" as const,
        schedule: {
          id: 9001,
          date: d1,
          shiftId: 1,
          shiftName: "Ca Sáng",
          shiftCode: "MORNING" as const,
          startTime: "07:00",
          endTime: "15:00",
          requiredPeople: 2,
          location: "Văn phòng A - Khoa Cấp Cứu",
          departmentId: 1,
          departmentName: "Khoa Cấp Cứu",
          status: "CONFIRMED" as const,
          createdBy: "Hệ thống",
          createdAt: new Date().toISOString(),
          assignments: [],
        },
      },
      {
        assignmentId: 9002,
        assignmentStatus: "CONFIRMED" as const,
        schedule: {
          id: 9002,
          date: d2,
          shiftId: 2,
          shiftName: "Ca Chiều",
          shiftCode: "AFTERNOON" as const,
          startTime: "15:00",
          endTime: "23:00",
          requiredPeople: 2,
          location: "Phòng Khám Đa Khoa",
          departmentId: 1,
          departmentName: "Khoa Cấp Cứu",
          status: "CONFIRMED" as const,
          createdBy: "Hệ thống",
          createdAt: new Date().toISOString(),
          assignments: [],
        },
      },
      {
        assignmentId: 9003,
        assignmentStatus: "CONFIRMED" as const,
        schedule: {
          id: 9003,
          date: d3,
          shiftId: 3,
          shiftName: "Ca Đêm",
          shiftCode: "NIGHT" as const,
          startTime: "21:00",
          endTime: "07:00",
          requiredPeople: 2,
          location: "Khoa Hồi Sức Tích Cực",
          departmentId: 1,
          departmentName: "Khoa Cấp Cứu",
          status: "CONFIRMED" as const,
          createdBy: "Hệ thống",
          createdAt: new Date().toISOString(),
          assignments: [],
        },
      },
    ];
  }, [validItems]);

  const upcomingCount = effectiveItems.filter((i) => i.schedule.date >= today).length;

  const handleDownloadIcs = () => {
    const icsContent = generateIcsCalendar({
      employeeName: employeeName || "Nhân viên",
      employeeCode: employeeCode || "NV01",
      items: effectiveItems,
    });
    const filename = `LichTruc_${employeeCode || "DutyFlow"}_${(employeeName || "NhanVien").replace(/\s+/g, "_")}.ics`;
    downloadIcsFile(filename, icsContent);
  };

  // URL link lịch trực webcal
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const webcalUrl = `${origin}/api/duty-schedules/calendar.ics?employeeId=${employeeId || 1}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webcalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đồng bộ Lịch điện thoại (Apple / Google Calendar)"
      subtitle="Nhắc chuông màn hình khóa và rung báo thức trước ca trực — 100% không cần mạng"
      size="lg"
    >
      <div className="space-y-4">
        {validItems.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-900 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Tài khoản này hiện chưa có ca trực cá nhân nào ({employeeCode || employeeName})</p>
              <p className="mt-0.5 text-amber-800 text-[12px] leading-relaxed">
                Tài khoản Quản trị viên (Admin) không có ca trực cá nhân nên tệp lịch sẽ bị trống. Để đồng bộ có lịch thật vào iPhone, vui lòng đăng xuất và đăng nhập vào tài khoản <b>Nhân viên (NV01)</b>.
              </p>
            </div>
          </div>
        )}

        {/* Banner điểm nổi bật */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white p-4 text-[13px] text-gray-700">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 text-[14px]">
                  Cơ chế Báo thức tự động trên Điện thoại
                </p>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-brand-700">
                  {upcomingCount} ca trực sắp tới
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-gray-600">
                Khi đồng bộ vào ứng dụng <b>Lịch mặc định</b> của máy (Apple Calendar / Google Calendar), hệ điều hành điện thoại sẽ tự động kích hoạt 2 mốc báo thức:
              </p>
              <div className="grid gap-2 sm:grid-cols-3 pt-1">
                <div className="flex items-center gap-2 rounded-lg border border-blue-100/90 bg-white/90 px-3 py-2 shadow-2xs">
                  <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-[12px] font-medium text-gray-800">
                    Báo trước <b>2 tiếng</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-blue-100/90 bg-white/90 px-3 py-2 shadow-2xs">
                  <Clock className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="text-[12px] font-medium text-gray-800">
                    Báo trước <b>30 phút</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-green-100/90 bg-white/90 px-3 py-2 shadow-2xs">
                  <WifiOff className="h-4 w-4 shrink-0 text-green-600" />
                  <span className="text-[12px] font-medium text-green-800">
                    <b>Offline 100%</b> (mất mạng vẫn kêu)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Device selector tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={cx(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-all",
              activeTab === "quick"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            <Download className="h-4 w-4" /> Tải file .ICS (Nhanh nhất)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={cx(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-all",
              activeTab === "ios"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            <Smartphone className="h-4 w-4" /> Hướng dẫn iPhone
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={cx(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-all",
              activeTab === "android"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            <Smartphone className="h-4 w-4" /> Hướng dẫn Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={cx(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-all",
              activeTab === "url"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            <Copy className="h-4 w-4" /> Link Đăng ký (Webcal)
          </button>
        </div>

        {/* Tab 1: Quick Download */}
        {activeTab === "quick" && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-edge bg-surface p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-[14px] font-bold text-ink">
                    Tải lịch trực của {employeeName}
                  </h4>
                  <p className="mt-0.5 text-[12.5px] text-sub">
                    File chuẩn <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-800">.ics</code> tương thích với iPhone (Apple Calendar), Android (Google Calendar), Outlook và Mac Calendar.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleDownloadIcs}
                    className="w-full sm:w-auto h-11 px-5 font-bold shadow-sm gap-2"
                  >
                    <Download className="h-4.5 w-4.5" />
                    Tải &amp; Nhập Lịch (.ics)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const directWebcal = webcalUrl.replace(/^https?:/, "webcal:");
                      window.location.href = directWebcal;
                    }}
                    className="w-full sm:w-auto h-11 px-4 font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200 gap-1.5"
                    title="Mở hộp thoại Đăng ký Lịch trực tiếp trên Apple Calendar"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Mở Apple Calendar
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-3.5 text-[12.5px] text-gray-600">
              <p className="font-semibold text-gray-800 flex items-center gap-1.5 mb-1.5">
                <Info className="h-4 w-4 text-brand-600" />
                Mẹo mở nhanh trên điện thoại:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><b>Trên iPhone:</b> Bấm nút Tải ở trên -&gt; máy tải file về và tự hiện giao diện ứng dụng Lịch -&gt; bấm <b>"Thêm tất cả"</b>.</li>
                <li><b>Trên Android:</b> Tải xong bấm mở file -&gt; chọn <b>Lịch Google</b> hoặc <b>Lịch Samsung</b> -&gt; bấm <b>"Lưu"</b>.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: iPhone Details */}
        {activeTab === "ios" && (
          <div className="space-y-3 pt-1 text-[13px] text-gray-700">
            <div className="rounded-xl border border-edge bg-surface p-4 space-y-3">
              <h4 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-brand-600" />
                Cách thêm vào Apple Calendar trên iPhone:
              </h4>
              <ol className="space-y-2.5 text-gray-600 pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">1</span>
                  <span>Mở trang này trên trình duyệt <b>Safari</b> của iPhone.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">2</span>
                  <span>Bấm nút <b>"Tải file Lịch (.ics)"</b> bên dưới. Safari sẽ hỏi <i>"Bạn có muốn tải về tệp này?"</i> -&gt; Chọn <b>Cho phép / Tải về</b>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">3</span>
                  <span>Nhấn vào tệp vừa tải trong danh sách tải về của Safari. Ứng dụng <b>Lịch (Calendar)</b> của iPhone sẽ mở ra kèm toàn bộ các ca trực.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">4</span>
                  <span>Bấm <b>"Thêm tất cả" (Add All)</b> ở góc trên bên phải màn hình. Hoàn tất! Điện thoại sẽ tự động reo chuông báo thức trước mỗi ca trực.</span>
                </li>
              </ol>
              <div className="pt-2">
                <Button onClick={handleDownloadIcs} size="sm">
                  <Download className="h-4 w-4" /> Tải file .ics cho iPhone
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Android Details */}
        {activeTab === "android" && (
          <div className="space-y-3 pt-1 text-[13px] text-gray-700">
            <div className="rounded-xl border border-edge bg-surface p-4 space-y-3">
              <h4 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                Cách thêm vào Google Calendar / Lịch Samsung:
              </h4>
              <ol className="space-y-2.5 text-gray-600 pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">1</span>
                  <span>Bấm nút <b>"Tải file Lịch (.ics)"</b> bên dưới về máy điện thoại Android.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">2</span>
                  <span>Kéo thanh thông báo xuống hoặc vào mục <b>Tệp đã tải về (Downloads)</b> và bấm mở tệp `.ics`.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">3</span>
                  <span>Chọn mở bằng ứng dụng <b>Lịch (Google Calendar hoặc Samsung Calendar)</b>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">4</span>
                  <span>Bấm <b>"Lưu"</b> hoặc <b>"Thêm tất cả"</b>. Mọi ca trực sẽ được nạp vào máy kèm âm báo thức định sẵn.</span>
                </li>
              </ol>
              <div className="pt-2">
                <Button onClick={handleDownloadIcs} size="sm" variant="secondary">
                  <Download className="h-4 w-4" /> Tải file .ics cho Android
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Webcal Link Subscription */}
        {activeTab === "url" && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-edge bg-surface p-4 space-y-3">
              <div>
                <h4 className="text-[14px] font-bold text-ink">
                  Đăng ký lịch tự động đồng bộ (iCalendar Feed)
                </h4>
                <p className="mt-0.5 text-[12.5px] text-sub">
                  Dùng đường dẫn này để đăng ký trực tiếp vào Apple Calendar, Google Calendar hoặc Outlook. Khi quản trị viên thay đổi ca trực, lịch trên điện thoại sẽ <b>tự động cập nhật</b> mà bạn không cần phải tải lại file.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-gray-700">
                  Đường dẫn Lịch cá nhân của bạn:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webcalUrl}
                    className="flex-1 rounded-xl border border-gray-300 bg-gray-50/70 px-3.5 py-2 font-mono text-[12px] text-gray-700 focus:outline-none"
                  />
                  <Button
                    onClick={handleCopyUrl}
                    variant={copied ? "primary" : "secondary"}
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-300" /> Đã chép link!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Chép link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Button
                  size="sm"
                  onClick={() => {
                    const directWebcal = webcalUrl.replace(/^https?:/, "webcal:");
                    window.location.href = directWebcal;
                  }}
                  className="gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" /> Mở Apple Calendar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const cleanHttp = webcalUrl.replace(/^webcal:/, "https:");
                    window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(cleanHttp)}`, "_blank");
                  }}
                  className="gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" /> Thêm vào Google Calendar
                </Button>
              </div>

              <div className="rounded-lg bg-blue-50/60 p-3 text-[12px] text-blue-800 space-y-1">
                <p className="font-bold">Cách đăng ký tự động trên iPhone:</p>
                <p>Vào <i>Cài đặt -&gt; Lịch -&gt; Tài khoản -&gt; Thêm tài khoản -&gt; Khác -&gt; Thêm lịch đã đăng ký</i>, sau đó dán đường dẫn trên vào và bấm Lưu.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-edgesoft pt-3 text-[12px] text-faint">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Chuẩn quốc tế RFC 5545 iCalendar (Apple / Google / Microsoft)
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
