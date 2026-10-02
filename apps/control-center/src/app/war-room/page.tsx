import React from 'react';
import Link from 'next/link';
import { getServerAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WarRoomPage() {
  let leads: any[] = [];
  let orders: any[] = [];
  let payments: any[] = [];
  let verifiedPaidCount = 0;
  let qualifiedLeadsCount = 0;

  try {
    const supabase = getServerAdminSupabase();
    const [leadsRes, ordersRes, paymentsRes] = await Promise.all([
      supabase.from('first_revenue_leads').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('first_revenue_orders').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('first_revenue_payment_transactions').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    leads = leadsRes.data || [];
    orders = ordersRes.data || [];
    payments = paymentsRes.data || [];

    verifiedPaidCount = payments.filter((p: any) => p.counts_as_revenue === true && p.environment === 'LIVE').length;
    qualifiedLeadsCount = leads.filter((l: any) => l.icp_fit === 'FIT' && !l.is_test).length;
  } catch (err) {
    console.error('Error fetching war room data:', err);
  }

  const realLeads = leads.filter(l => !l.is_test);
  const testLeads = leads.filter(l => l.is_test);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                🔴 LIVE WAR ROOM
              </span>
              <span className="text-xs font-mono text-slate-400">CAMPAIGN: FIRST-REVENUE-V3</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mt-2">
              BẢN ĐỒ TÁC CHIẾN DOANH THU 24/7
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Chiến dịch tạo đơn hàng trả tiền thật đầu tiên có kiểm chứng · Human-on-Exception · Thầy Ngô Quốc Huy Chủ trì
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/automation-pilot"
              target="_blank"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <span>Xem Landing Page</span>
              <span>↗</span>
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              Quay lại Dashboard
            </Link>
          </div>
        </div>

        {/* North Star Display */}
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-9xl select-none">
            #1
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-wider font-bold text-blue-400">
                Mục Tiêu Tối Thượng (North Star)
              </div>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">
                {verifiedPaidCount} / 1 <span className="text-lg font-normal text-slate-400">VERIFIED PAID ORDER</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 max-w-lg">
                Chỉ tính khi: Khách hàng bên ngoài thật + Nhu cầu thật + Chấp nhận thật + Tiền thật về tài khoản SePay (Live). Tuyệt đối không tính tiền test hoặc bot tự sinh.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-xs text-slate-400 font-semibold uppercase">Đơn hàng mục tiêu (Offer)</div>
              <div className="text-lg font-bold text-emerald-400">VIP 1 GIÁO VIÊN</div>
              <div className="text-xs text-slate-400">Giá: 39.000 VNĐ · Phễu Sư phạm EduViet</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-xs text-slate-400 font-semibold uppercase">Kênh tiếp cận tối ưu</div>
              <div className="text-lg font-bold text-blue-400">CỘNG ĐỒNG 0 ĐỒNG</div>
              <div className="text-xs text-slate-400">Tiết kiệm tối đa ngân sách theo lệnh Thầy Huy</div>
            </div>
          </div>
        </div>

        {/* Funnel Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">1. Lượt đăng ký thật</div>
            <div className="text-2xl font-black text-white mt-1">{realLeads.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Nguồn Google Ingress</div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">2. Đạt chuẩn ICP</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{qualifiedLeadsCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">SME Cơ khí / Sản xuất</div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">3. Khảo sát 15 phút</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {leads.filter(l => l.status === 'AUDIT_BOOKED' || l.status === 'AUDIT_COMPLETED').length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Thầy Huy trực tiếp gọi</div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">4. Đề xuất chấp thuận</div>
            <div className="text-2xl font-black text-purple-400 mt-1">
              {orders.filter(o => o.customer_accepted && !o.is_test).length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Cam kết 7 ngày giao việc</div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">5. Doanh thu thực nhận</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {(verifiedPaidCount * 4900000).toLocaleString('vi-VN')} đ
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Cổng SePay đối chiếu live</div>
          </div>
        </div>

        {/* 3 Lean Core Agents Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Trạng Thái 3 Agent Tác Chiến Thu Nhỏ (Lean Hot Path Core)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400">AGENT A1</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">READY</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">Intent / Qualification AI</div>
              <p className="text-xs text-slate-400 mt-2">
                Tự động bóc tách bản đăng ký thành FACT, HYPOTHESIS, UNKNOWN; kiểm tra khớp ICP Cơ khí.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400">AGENT A2</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">READY</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">SDR / Founder Briefing AI</div>
              <p className="text-xs text-slate-400 mt-2">
                Soạn hồ sơ tóm tắt BRIEF 15 phút, giả thuyết giải pháp và câu hỏi trọng tâm cho Thầy Ngô Quốc Huy.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-purple-400">AGENT A3</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">ENFORCING</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">CRM / Evidence AI (Truth Keeper)</div>
              <p className="text-xs text-slate-400 mt-2">
                Khóa chặn bất biến thương mại: chỉ kích hoạt đơn khi đủ tiền thật + webhook SePay hợp lệ.
              </p>
            </div>
          </div>
        </div>

        {/* Live Leads Feed */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Dòng dữ liệu Lead & Đơn hàng mới nhất</h2>
            <span className="text-xs text-slate-400">Hiển thị {leads.length} bản ghi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Doanh nghiệp</th>
                  <th className="px-4 py-3">Vấn đề cần tự động hóa</th>
                  <th className="px-4 py-3">ICP Fit</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Phân loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Chưa có dữ liệu đăng ký. Hãy triển khai chiến dịch quảng cáo Google Search để thu hút lead thật đầu tiên.
                    </td>
                  </tr>
                ) : (
                  leads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {new Date(l.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {l.name}
                        {l.phone && <div className="text-xs font-normal text-slate-400">{l.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{l.company}</td>
                      <td className="px-4 py-3 text-xs text-slate-300 max-w-xs truncate" title={l.problem}>
                        {l.problem}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          l.icp_fit === 'FIT'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {l.icp_fit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.is_test ? (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                            TEST / MẪU
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                            REAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Human Gate Alert */}
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span>⚠️</span>
              <span>CỔNG PHÊ DUYỆT HUMAN GATE (R4) — GOOGLE SEARCH ADS</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Ngân sách quảng cáo Google Ads thực tế cần sự phê duyệt và cấp kinh phí từ Human Owner (Thầy Ngô Quốc Huy). AI tuyệt đối không tự ý quẹt thẻ hoặc kích hoạt ngân sách tài chính mà chưa có sự đồng ý bằng văn bản/email.
            </p>
          </div>
          <div className="text-xs text-amber-300 font-mono bg-amber-950 px-3 py-1.5 rounded border border-amber-800 whitespace-nowrap">
            GATE: GATE-ADS-001 (PENDING REVIEW)
          </div>
        </div>
      </div>
    </div>
  );
}
