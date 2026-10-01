'use client';

import React, { useState } from 'react';

export default function AutomationPilotLanding() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    problem: '',
    current_tools: '',
    preferred_contact_time: 'Giờ hành chính (8h00 - 17h00)',
    consent: true,
    honeypot: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/automation-pilot/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          utm_source: 'google_search',
          landing_session_id: `SES_${Date.now()}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra khi gửi thông tin. Quý khách vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-black text-white text-lg">H</span>
            <span className="font-bold text-lg text-slate-100 tracking-tight">HUY TECHNOLOGY AI</span>
          </div>
          <a
            href="#dang-ky"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all"
          >
            Đăng Ký Đánh Giá 15 Phút
          </a>
        </div>
      </header>

      {/* 01. HERO SECTION */}
      <section className="py-20 px-4 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/50 text-blue-300 border border-blue-700/50 mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          Chương Trình Ứng Dụng AI Cho Doanh Nghiệp Sản Xuất & Cơ Khí
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          TỰ ĐỘNG HÓA MỘT QUY TRÌNH ĐANG LÀM DOANH NGHIỆP TỐN THỜI GIAN
        </h1>
        <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Đăng ký đánh giá quy trình 15 phút cùng Kỹ sư Tự động hóa. Xác định chính xác luồng dữ liệu nghẽn, công cụ hiện có và khả năng triển khai AI thí điểm hoàn thành trong 7 ngày.
        </p>
        <a
          href="#dang-ky"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold text-base sm:text-lg px-8 py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
        >
          ĐĂNG KÝ ĐÁNH GIÁ QUY TRÌNH 15 PHÚT
        </a>
      </section>

      {/* 02. PROBLEM SECTION */}
      <section className="py-16 bg-slate-950 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Những Quy Trình Đang Tiêu Tốn Thời Gian Tại Xưởng & Văn Phòng</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-red-900/30 text-red-400 flex items-center justify-center font-bold text-lg mb-4">✕</div>
              <h3 className="font-semibold text-lg text-white mb-2">Báo Giá & Tiếp Nhận Đơn Hàng</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nhân viên phải sao chép qua lại giữa Zalo, Excel, bản vẽ PDF và email gây chậm trễ báo giá cho khách và dễ thất lạc yêu cầu kỹ thuật.
              </p>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-amber-900/30 text-amber-400 flex items-center justify-center font-bold text-lg mb-4">✕</div>
              <h3 className="font-semibold text-lg text-white mb-2">Theo Dõi Tiến Độ Xưởng Thủ Công</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Quản đốc mất hàng giờ gọi điện, nhắn tin hỏi từng máy, từng công đoạn để tổng hợp báo cáo ngày cho Giám đốc.
              </p>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-orange-900/30 text-orange-400 flex items-center justify-center font-bold text-lg mb-4">✕</div>
              <h3 className="font-semibold text-lg text-white mb-2">Tra Cứu Bản Vẽ & Quy Chuẩn</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Kỹ thuật viên mất nhiều thời gian lục tìm lại tiêu chuẩn vật liệu, dung sai và thông số thiết bị cũ trong kho lưu trữ rời rạc.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 04. HOW 15-MINUTE AUDIT WORKS */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Quy Trình Đánh Giá Cơ Hội 15 Phút Diễn Ra Thế Nào?</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Bước 1</span>
            <h4 className="font-semibold text-white mt-1 mb-2">Điền Nhu Cầu</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Nêu rõ một quy trình cụ thể đang làm tốn thời gian nhất qua form bên dưới.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Bước 2</span>
            <h4 className="font-semibold text-white mt-1 mb-2">Khảo Sát 15 Phút</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Kỹ sư AI phân tích đầu vào, đầu ra, dữ liệu và công cụ hiện có của doanh nghiệp.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Bước 3</span>
            <h4 className="font-semibold text-white mt-1 mb-2">Báo Cáo Cơ Hội</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Nhận bản đồ quy trình đề xuất và phương án triển khai cụ thể không cam kết ảo.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Bước 4</span>
            <h4 className="font-semibold text-white mt-1 mb-2">Lựa Chọn Thí Điểm</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Nếu phù hợp, triển khai gói AI Automation Pilot trọn gói hoàn thành trong 7 ngày.</p>
          </div>
        </div>
      </section>

      {/* 05 & 06. PAID PILOT SPECIFICATION */}
      <section className="py-16 bg-slate-950 border-y border-slate-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-slate-900 p-8 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <span className="text-xs font-bold px-3 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                  Gói Dịch Vụ Thí Điểm
                </span>
                <h3 className="text-2xl font-bold text-white mt-2">AI Automation Pilot</h3>
                <p className="text-slate-400 text-sm mt-1">Dành cho 1 quy trình tác nghiệp then chốt của doanh nghiệp</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-3xl font-black text-white">4.900.000 <span className="text-lg font-normal text-slate-400">VNĐ</span></div>
                <div className="text-xs text-slate-400 mt-1">Triển khai trong 07 ngày làm việc</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-white text-sm mb-3 uppercase tracking-wider text-blue-400">Phạm Vi Bao Gồm:</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">✓ <span>Số quy trình tự động hóa: <strong>01 quy trình</strong></span></li>
                  <li className="flex items-start gap-2">✓ <span>Phòng ban áp dụng: <strong>01 phòng ban / xưởng</strong></span></li>
                  <li className="flex items-start gap-2">✓ <span>Kết nối ngoài tối đa: <strong>02 kết nối (Zalo, Google Sheet, Webhook...)</strong></span></li>
                  <li className="flex items-start gap-2">✓ <span>Báo cáo đối chiếu hiệu quả Trước / Sau triển khai</span></li>
                  <li className="flex items-start gap-2">✓ <span>Tài liệu bàn giao và hướng dẫn nhân sự vận hành</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm mb-3 uppercase tracking-wider text-slate-400">Không Bao Gồm (Minh Bạch):</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">• <span>Thay thế toàn bộ hệ thống ERP / phần mềm lớn</span></li>
                  <li className="flex items-start gap-2">• <span>Trang bị phần cứng hoặc thiết bị vật lý</span></li>
                  <li className="flex items-start gap-2">• <span>Phí phần mềm SaaS của bên thứ ba</span></li>
                  <li className="flex items-start gap-2">• <span>Các yêu cầu ngoài phạm vi 01 quy trình thỏa thuận</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 07. FOUNDER CREDIBILITY */}
      <section className="py-16 max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Đơn Vị Chủ Trì Triển Khai</h2>
        <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed mb-6">
          Được điều hành trực tiếp bởi <strong>Thầy Ngô Quốc Huy</strong> (Giáo viên Trường Cơ Khí - Công Nghệ Đồng Nai), sáng lập hệ sinh thái <strong>HUY Technology AI</strong>. Chúng tôi kết hợp sâu sắc giữa thực tiễn kỹ thuật cơ khí, sản xuất và công nghệ tự động hóa AI thực chứng.
        </p>
        <div className="inline-flex gap-8 text-xs text-slate-400 font-mono">
          <div>Trụ sở: Đồng Nai, Việt Nam</div>
          <div>Hotline: 0961.364.600</div>
          <div>Email: huytechnologyai2025@gmail.com</div>
        </div>
      </section>

      {/* 09. FORM SECTION */}
      <section id="dang-ky" className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white">Đăng Ký Đánh Giá Quy Trình 15 Phút</h2>
            <p className="text-slate-400 text-sm mt-2">Điền thông tin quy trình của bạn để Kỹ sư AI chuẩn bị hồ sơ khảo sát.</p>
          </div>

          {submitted ? (
            <div className="bg-emerald-950/50 border border-emerald-500/50 p-8 rounded-2xl text-center">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">✓</div>
              <h3 className="text-xl font-bold text-white mb-2">Đăng Ký Thành Công!</h3>
              <p className="text-slate-300 text-sm mb-4">
                Hệ thống HUY AI đã ghi nhận yêu cầu của Quý doanh nghiệp. Đội ngũ Kỹ sư Tự động hóa sẽ liên hệ qua số điện thoại/email trong vòng 24 giờ làm việc.
              </p>
              <div className="text-xs text-slate-400">Cảm ơn Quý doanh nghiệp đã tin tưởng giải pháp thực chứng của HUY Technology AI.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              {errorMsg && (
                <div className="p-4 rounded-lg bg-red-950/50 border border-red-500/50 text-red-300 text-sm">
                  {errorMsg}
                </div>
              )}

              {/* Honeypot for bot detection */}
              <input
                type="text"
                name="honeypot"
                value={formData.honeypot}
                onChange={e => setFormData({ ...formData, honeypot: e.target.value })}
                className="hidden"
                autoComplete="off"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Họ và Tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Doanh Nghiệp / Cơ Sở *</label>
                  <input
                    type="text"
                    required
                    placeholder="Công ty Cơ Khí ABC"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Số Điện Thoại (Zalo) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Doanh Nghiệp *</label>
                  <input
                    type="email"
                    required
                    placeholder="lienhe@doanhnghiep.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chức Vụ Của Bạn</label>
                <input
                  type="text"
                  placeholder="Giám đốc / Quản đốc xưởng / Trưởng phòng Kỹ thuật"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Quy Trình Nào Đang Tiêu Tốn Thời Gian Nhất? *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ví dụ: Báo giá cho khách phải dò tìm bản vẽ cũ mất 2 ngày; hoặc tổng hợp báo cáo sản xuất xưởng bằng Excel mất 3 tiếng mỗi ngày..."
                  value={formData.problem}
                  onChange={e => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Công Cụ Đang Sử Dụng Hiện Tại</label>
                <input
                  type="text"
                  placeholder="Zalo, Excel, Google Sheets, phần mềm kế toán..."
                  value={formData.current_tools}
                  onChange={e => setFormData({ ...formData, current_tools: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Khung Giờ Thuận Tiện Để Trao Đổi</label>
                <select
                  value={formData.preferred_contact_time}
                  onChange={e => setFormData({ ...formData, preferred_contact_time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option>Giờ hành chính (8h00 - 17h00)</option>
                  <option>Buổi sáng (8h30 - 11h30)</option>
                  <option>Buổi chiều (14h00 - 17h00)</option>
                  <option>Buổi tối (18h30 - 20h00)</option>
                </select>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="consent-check"
                  required
                  checked={formData.consent}
                  onChange={e => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-1 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <label htmlFor="consent-check" className="text-xs text-slate-400 leading-normal">
                  Tôi đồng ý cho HUY Technology AI liên hệ khảo sát nhu cầu tự động hóa và cam kết thông tin doanh nghiệp được bảo mật tuyệt đối theo chính sách bảo mật v3.0.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-base"
              >
                {loading ? 'Đang Gửi Thông Tin...' : 'ĐĂNG KÝ ĐÁNH GIÁ QUY TRÌNH 15 PHÚT'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 HUY Technology AI Group. Chủ sở hữu: Ngô Quốc Huy.</p>
        <p className="mt-1">Hệ thống điều phối AI tự động hóa vận hành 24/7 theo tiêu chuẩn Canonical V3.0.</p>
      </footer>
    </div>
  );
}
