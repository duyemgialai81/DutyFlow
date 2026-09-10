import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function calendarIcsPlugin() {
  return {
    name: "vite-plugin-calendar-ics",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.includes("/api/duty-schedules/calendar.ics") || req.url.endsWith(".ics"))) {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, "0");
          const d = String(now.getDate()).padStart(2, "0");
          const todayStamp = `${y}${m}${d}T000000Z`;

          const shifts = [
            { name: "Ca Sáng", start: "070000", end: "150000", loc: "Văn phòng A - Khoa Cấp Cứu", offset: 0 },
            { name: "Ca Chiều", start: "150000", end: "230000", loc: "Phòng Khám Đa Khoa", offset: 1 },
            { name: "Ca Đêm", start: "210000", end: "070000", loc: "Khoa Hồi Sức Tích Cực", offset: 3 },
            { name: "Ca Sáng", start: "070000", end: "150000", loc: "Phòng Cấp Cứu - Tầng 1", offset: 5 },
          ];

          const events = shifts.map((s, idx) => {
            const dateObj = new Date(now.getTime() + s.offset * 24 * 60 * 60 * 1000);
            const ds = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, "0")}${String(dateObj.getDate()).padStart(2, "0")}`;
            return `BEGIN:VEVENT\r\nUID:dutyflow-sample-${idx}-${ds}@dutyflow.vn\r\nDTSTAMP:${todayStamp}\r\nDTSTART;TZID=Asia/Ho_Chi_Minh:${ds}T${s.start}\r\nDTEND;TZID=Asia/Ho_Chi_Minh:${ds}T${s.end}\r\nSUMMARY:[Lịch trực] ${s.name} - ${s.loc}\r\nDESCRIPTION:Lịch phân công trực ca DutyFlow.\\nĐịa điểm: ${s.loc}\\nVui lòng có mặt trước 15 phút.\\nBáo thức: 2 tiếng và 30 phút trước ca trực.\r\nLOCATION:${s.loc}\r\nSTATUS:CONFIRMED\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Nhắc nhở: Sắp đến ca trực ${s.name} sau 2 tiếng!\r\nTRIGGER:-PT2H\r\nEND:VALARM\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Chuẩn bị: Ca trực ${s.name} bắt đầu sau 30 phút!\r\nTRIGGER:-PT30M\r\nEND:VALARM\r\nEND:VEVENT`;
          }).join("\r\n");

          const icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DutyFlow//Lich Truc Ca 24/7//VI\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Lịch trực DutyFlow\r\nX-WR-CALDESC:Lịch trực ca cá nhân DutyFlow\r\nX-WR-TIMEZONE:Asia/Ho_Chi_Minh\r\nBEGIN:VTIMEZONE\r\nTZID:Asia/Ho_Chi_Minh\r\nX-LIC-LOCATION:Asia/Ho_Chi_Minh\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0700\r\nTZOFFSETTO:+0700\r\nTZNAME:+07\r\nDTSTART:19700101T000000\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n${events}\r\nEND:VCALENDAR`;

          res.setHeader("Content-Type", "text/calendar; charset=utf-8");
          res.setHeader("Content-Disposition", 'inline; filename="calendar.ics"');
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.statusCode = 200;
          res.end(icsContent);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), calendarIcsPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
