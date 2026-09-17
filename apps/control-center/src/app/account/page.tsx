'use client';

import React, { useState } from 'react';

export default function AccountPage() {
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const mockApiKey = 'huy_live_sec_9948a8e1b23f890123ef';

  const copyKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">Hồ Sơ &amp; Cài Đặt Tài Khoản</h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý thông tin quản trị viên, tổ chức và khóa xác thực kết nối API.
        </p>
      </div>

      {/* User Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Thông Tin Quản Trị Viên</h2>
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold border-2 border-blue-400/30">
            HA
          </div>
          <div>
            <div className="text-lg font-bold text-white">Huy Technology Admin</div>
            <div className="text-sm text-slate-400">admin@huycncdsai.io.vn</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Super Admin
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                RLS Verified
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm">
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Tổ chức trực thuộc</label>
            <div className="text-white font-medium bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800">
              Huy Technology AI Ecosystem
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Cụm máy chủ On-Premises</label>
            <div className="text-white font-medium bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span>Dell Precision M4800</span>
              <span className="text-xs text-emerald-400 font-mono">huy-ai-node-01</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-2">Khóa Xác Thực API (API Keys)</h2>
        <p className="text-xs text-slate-400 mb-4">
          Dùng để kết nối an toàn từ các website vệ tinh (Huy AI Portfolio, Smart Teacher Schedule, SmartTax AI) vào Control Center.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-300">Production Satellite Secret Key</div>
              <div className="font-mono text-xs text-blue-400 mt-1">
                huy_live_sec_••••••••••••••••••••••••ef
              </div>
            </div>
            <button
              onClick={copyKey}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              {apiKeyCopied ? '✓ Đã sao chép' : 'Sao chép API Key'}
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
            <span>🛡️ Quyền truy cập:</span>
            <span className="text-slate-400 font-mono">tasks:create</span>
            <span className="text-slate-400 font-mono">tasks:read</span>
            <span className="text-slate-400 font-mono">outputs:read</span>
          </div>
        </div>
      </div>

      {/* Security & Zero-Touch Guarantee */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-3">Chính Sách Bảo Toàn Hệ Thống (Zero-Touch)</h2>
        <div className="space-y-3 text-xs text-slate-400">
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-400">✓</span>
            <span>
              <strong>Cô lập cơ sở dữ liệu:</strong> Control Center sử dụng schema riêng biệt, không can thiệp hay chia sẻ bảng trực tiếp với cơ sở dữ liệu của 3 website hiện tại.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-400">✓</span>
            <span>
              <strong>Bảo lưu cấu hình DNS:</strong> Tên miền sản xuất không bị thay đổi trong quá trình chạy thử nghiệm Staging Preview.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-400">✓</span>
            <span>
              <strong>Chống phụ thuộc thời gian thực (Decoupled):</strong> Mọi tác vụ đều qua hàng đợi và lưu trạng thái, máy chủ nội bộ Dell có thể offline mà không gây treo ứng dụng.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
