import { useState, useContext } from "react";
import { AuthContext, useToast } from "../state/AppProviders";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("kyta@1234");
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const { push } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await auth.login(username, password);
      push("success", "Đăng nhập thành công!");
    } catch (err: any) {
      push("error", err.message || "Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden className="shrink-0">
              <path d="M9 14h14M9 19h9" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              <rect x="9" y="7" width="14" height="3" rx="1.5" fill="white" opacity=".55" />
              <circle cx="23" cy="22" r="4.4" fill="#16A34A" stroke="white" strokeWidth="1.6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Đăng nhập DutyFlow</h2>
          <p className="mt-2 text-sm text-gray-600">Quản lý lịch trực và phân công nhân sự</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên đăng nhập</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="VD: admin, NV01"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <p className="mb-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Chọn nhanh tài khoản mẫu (MK: kyta@1234)</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setUsername("admin"); setPassword("kyta@1234"); }}
              className="flex flex-col items-center rounded-xl border border-gray-200 p-2.5 text-center transition-all hover:border-blue-500 hover:bg-blue-50/50"
            >
              <span className="text-xs font-bold text-gray-800">Admin</span>
              <span className="text-[10px] text-gray-400">admin</span>
            </button>
            <button
              type="button"
              onClick={() => { setUsername("leader01"); setPassword("kyta@1234"); }}
              className="flex flex-col items-center rounded-xl border border-purple-200 bg-purple-50/30 p-2.5 text-center transition-all hover:border-purple-500 hover:bg-purple-50"
            >
              <span className="text-xs font-bold text-purple-800">Tổ trưởng</span>
              <span className="text-[10px] text-purple-600">leader01</span>
            </button>
            <button
              type="button"
              onClick={() => { setUsername("NV01"); setPassword("kyta@1234"); }}
              className="flex flex-col items-center rounded-xl border border-gray-200 p-2.5 text-center transition-all hover:border-blue-500 hover:bg-blue-50/50"
            >
              <span className="text-xs font-bold text-gray-800">Nhân viên</span>
              <span className="text-[10px] text-gray-400">NV01</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
