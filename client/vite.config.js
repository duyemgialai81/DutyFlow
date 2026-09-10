// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Plugin tạo endpoint .ics chỉ dành cho môi trường development.
 * KHÔNG được load trong production build trên Vercel.
 */
function calendarIcsPlugin() {
  return {
    name: 'vite-plugin-calendar-ics',
    configureServer(server) {
      // Bỏ qua hoàn toàn trong production build
      if (process.env.NODE_ENV === 'production') return;

      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (
          url.includes('/api/duty-schedules/calendar.ics') ||
          url.endsWith('.ics')
        ) {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          const todayStamp = `${y}${m}${d}T000000Z`;

          const shifts = [
            { name: 'Ca Sáng', start: '070000', end: '150000', loc: 'Văn phòng A - Khoa Cấp Cứu', offset: 0 },
            { name: 'Ca Chiều', start: '150000', end: '230000', loc: 'Phòng Khám Đa Khoa', offset: 1 },
            { name: 'Ca Đêm', start: '210000', end: '070000', loc: 'Khoa Hồi Sức Tích Cực', offset: 3 },
            { name: 'Ca Sáng', start: '070000', end: '150000', loc: 'Phòng Cấp Cứu - Tầng 1', offset: 5 },
          ];

          const events = shifts.map((s, idx) => {
            const dateObj = new Date(now.getTime() + s.offset * 24 * 60 * 60 * 1000);
            const ds = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
            return [
              'BEGIN:VEVENT',
              `UID:dutyflow-sample-${idx}-${ds}@dutyflow.vn`,
              `DTSTAMP:${todayStamp}`,
              `DTSTART;TZID=Asia/Ho_Chi_Minh:${ds}T${s.start}`,
              `DTEND;TZID=Asia/Ho_Chi_Minh:${ds}T${s.end}`,
              `SUMMARY:[Lịch trực] ${s.name} - ${s.loc}`,
              `DESCRIPTION:Lịch phân công trực ca DutyFlow.\\nĐịa điểm: ${s.loc}\\nVui lòng có mặt trước 15 phút.\\nBáo thức: 2 tiếng và 30 phút trước ca trực.`,
              `LOCATION:${s.loc}`,
              'STATUS:CONFIRMED',
              'BEGIN:VALARM',
              'ACTION:DISPLAY',
              `DESCRIPTION:Nhắc nhở: Sắp đến ca trực ${s.name} sau 2 tiếng!`,
              'TRIGGER:-PT2H',
              'END:VALARM',
              'BEGIN:VALARM',
              'ACTION:DISPLAY',
              `DESCRIPTION:Chuẩn bị: Ca trực ${s.name} bắt đầu sau 30 phút!`,
              'TRIGGER:-PT30M',
              'END:VALARM',
              'END:VEVENT',
            ].join('\r\n');
          }).join('\r\n');

          const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//DutyFlow//Lich Truc Ca 24/7//VI',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Lịch trực DutyFlow',
            'X-WR-CALDESC:Lịch trực ca cá nhân DutyFlow',
            'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
            'BEGIN:VTIMEZONE',
            'TZID:Asia/Ho_Chi_Minh',
            'X-LIC-LOCATION:Asia/Ho_Chi_Minh',
            'BEGIN:STANDARD',
            'TZOFFSETFROM:+0700',
            'TZOFFSETTO:+0700',
            'TZNAME:+07',
            'DTSTART:19700101T000000',
            'END:STANDARD',
            'END:VTIMEZONE',
            events,
            'END:VCALENDAR',
          ].join('\r\n');

          res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
          res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
          res.setHeader('Access-Control-Allow-Origin', '*');
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
  plugins: [
    react(),
    tailwindcss(),
    // Chỉ inject plugin ICS khi đang chạy dev server
    ...(process.env.NODE_ENV !== 'production' ? [calendarIcsPlugin()] : []),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: { port: 3000 },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
