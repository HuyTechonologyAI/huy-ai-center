import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const ecosystemSites = [
    {
      name: 'Huy AI Portfolio',
      url: 'https://www.huycncdsai.io.vn/',
      status: 'Online',
      desc: 'Cổng thông tin & danh mục sản phẩm EdTech AI',
    },
    {
      name: 'Smart Teacher Schedule',
      url: 'https://www.gvcncdsai.io.vn/',
      status: 'Online',
      desc: 'Quản lý thời khóa biểu & kế hoạch giảng dạy giáo viên',
    },
    {
      name: 'SmartTax AI',
      url: 'https://smarttax-ai.vercel.app/',
      status: 'Online',
      desc: 'Trợ lý rà soát hóa đơn & phân loại thuế tự động',
    },
  ];

  const aiApps = [
    {
      name: 'Teacher AI',
      category: 'Giáo dục & Sư phạm',
      desc: 'Soạn giáo án CV 5512, tạo slide thuyết trình, ngân hàng trắc nghiệm và video script.',
      href: '/apps/teacher-ai',
      badge: 'Đang hoạt động',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: '🎓',
    },
    {
      name: 'Student AI',
      category: 'Học tập thông minh',
      desc: 'Gia sư ảo giải toán, chữa văn, sinh đề ôn tập và bản đồ tư duy bài học.',
      href: '/apps',
      badge: 'Sắp ra mắt',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
      icon: '📚',
    },
    {
      name: 'SmartTax AI',
      category: 'Tài chính & Thuế',
      desc: 'Kiểm tra rủi ro hóa đơn GTGT, đối chiếu tờ khai và phân loại chi phí khấu trừ.',
      href: '/apps',
      badge: 'Đang kết nối',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: '📊',
    },
    {
      name: 'Business AI',
      category: 'Doanh nghiệp',
      desc: 'Tự động hóa quy trình nghiệp vụ, tóm tắt hợp đồng và soạn thảo văn bản điều hành.',
      href: '/apps',
      badge: 'Sắp ra mắt',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
      icon: '💼',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Huy Technology Control Center v1.0
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Trung Tâm Điều Phối AI Tập Trung
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Quản lý hàng đợi tác vụ AI độc lập cho toàn bộ hệ sinh thái website giáo dục và tài chính, sẵn sàng kết nối cụm máy chủ On-Premises Dell Precision M4800.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/apps/teacher-ai"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition"
            >
              🎓 Dùng Ngay Teacher AI
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
            >
              Xem Hàng Đợi Tác Vụ
            </Link>
          </div>
        </div>
      </div>

      {/* Grid Telemetry & Cluster Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-semibold mb-2">
            <span>Primary On-Premises Node</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400">
            Dell Precision M4800
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <strong>huy-ai-node-01</strong> (32GB RAM, 1TB)
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
            <span>Chế độ điều phối:</span>
            <span className="text-slate-300 font-semibold">Decoupled Queue Ready</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-semibold mb-2">
            <span>AI Task Processing</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">
            Hàng Đợi Trực Tuyến
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Chờ xử lý: <strong className="text-white">1</strong> | Đang chạy: <strong className="text-white">0</strong> | Hoàn thành: <strong className="text-white">3</strong>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
            <span>Tự động giải phóng:</span>
            <span className="text-emerald-400 font-semibold">Skip-Locked Active</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-semibold mb-2">
            <span>Bảo Toàn Hệ Sinh Thái</span>
            <span className="w-2 h-2 rounded-full bg-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-400">
            Zero-Touch Production
          </div>
          <p className="text-xs text-slate-400 mt-1">
            3 Website hoạt động ổn định 100% không gián đoạn
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
            <span>Môi trường hiện tại:</span>
            <span className="text-blue-300 font-semibold">Preview / Staging</span>
          </div>
        </div>
      </div>

      {/* AI Applications Directory */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Ứng Dụng AI Trung Tâm</h2>
          <Link
            href="/apps"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
          >
            Xem tất cả ứng dụng &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiApps.map((app) => (
            <div
              key={app.name}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-2xl">{app.icon}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${app.badgeColor}`}
                  >
                    {app.badge}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {app.category}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition mb-2">
                  {app.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {app.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80">
                <Link
                  href={app.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  {app.name === 'Teacher AI' ? 'Mở ứng dụng' : 'Xem thông tin'} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connected Websites Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">3 Website Vệ Tinh Đang Hoạt Động</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Được bảo toàn nguyên vẹn, kết nối qua API Contract độc lập.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            3/3 Online
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ecosystemSites.map((site) => (
            <div
              key={site.name}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-white">{site.name}</span>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {site.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{site.desc}</p>
              </div>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-blue-400 hover:underline break-all"
              >
                {site.url} &rarr;
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
