'use client';

import React from 'react';
import Link from 'next/link';

export default function CreditsPage() {
  const transactions = [
    {
      id: 'tx-01',
      desc: 'Khởi tạo ví Credits tài khoản dùng thử',
      amount: '+5,000',
      balance: '5,000',
      date: '17/09/2026 14:00',
      type: 'credit',
    },
    {
      id: 'tx-02',
      desc: 'Tạo giáo án Tin học 8 (Teacher AI - Node Dell M4800)',
      amount: '0',
      balance: '5,000',
      date: '17/09/2026 15:10',
      type: 'free',
      note: 'Miễn phí trên On-Premises Node',
    },
    {
      id: 'tx-03',
      desc: 'Tạo slide bài giảng Internet (Teacher AI - Node Dell M4800)',
      amount: '0',
      balance: '5,000',
      date: '17/09/2026 15:15',
      type: 'free',
      note: 'Miễn phí trên On-Premises Node',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hạn Mức &amp; Ví Credits</h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý số dư tác vụ AI và theo dõi chi phí xử lý trên Cloud API hoặc Máy chủ nội bộ Dell.
          </p>
        </div>
      </div>

      {/* Balance Card & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-900/50 rounded-2xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
            Số Dư Khả Dụng
          </div>
          <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
            5,000 <span className="text-sm font-semibold text-blue-400">Credits</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Đủ để sinh khoảng 250 bộ giáo án và slide chất lượng cao trên Cloud LLM.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            On-Premises Node Dell
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            0đ <span className="text-sm font-semibold text-slate-400">/ tác vụ</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Mọi tác vụ định tuyến qua Dell M4800 (Ollama/Qwen 2.5) được miễn phí 100% Credits.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
            Gói Tài Khoản
          </div>
          <div className="text-3xl font-extrabold text-white">
            Developer <span className="text-sm font-normal text-purple-400">Preview</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Hạn mức ưu đãi trong giai đoạn Staging &amp; Internal Testing.
          </p>
        </div>
      </div>

      {/* Pricing Options */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Các Gói Mở Rộng Hạn Mức</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Gói Giáo Viên Cá Nhân</h3>
              <div className="text-xl font-bold text-blue-400 mt-2">100.000 đ <span className="text-xs text-slate-400 font-normal">/ tháng</span></div>
              <ul className="text-xs text-slate-400 mt-3 space-y-2">
                <li>✓ 2,000 Cloud Credits / tháng</li>
                <li>✓ Không giới hạn tác vụ trên Node Dell</li>
                <li>✓ Xuất file Word, PPTX và JSON chuẩn CV 5512</li>
              </ul>
            </div>
            <button
              onClick={() => alert('Đang kích hoạt môi trường Staging Preview.')}
              className="mt-5 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Chọn Gói Này
            </button>
          </div>

          <div className="bg-slate-950 border border-blue-600/50 rounded-xl p-5 flex flex-col justify-between relative">
            <div className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Khuyên Dùng
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gói Tổ Chuyên Môn / Trường</h3>
              <div className="text-xl font-bold text-blue-400 mt-2">500.000 đ <span className="text-xs text-slate-400 font-normal">/ tháng</span></div>
              <ul className="text-xs text-slate-400 mt-3 space-y-2">
                <li>✓ 15,000 Cloud Credits / tháng</li>
                <li>✓ Quản lý đồng bộ đến 20 giáo viên</li>
                <li>✓ Ưu tiên hàng đợi tác vụ trên cụm Dell Node</li>
                <li>✓ Ngân hàng câu hỏi trắc nghiệm ma trận 4 mức độ</li>
              </ul>
            </div>
            <button
              onClick={() => alert('Đang kích hoạt môi trường Staging Preview.')}
              className="mt-5 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              Nâng Cấp Tổ Chuyên Môn
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Cụm Máy Chủ Doanh Nghiệp</h3>
              <div className="text-xl font-bold text-blue-400 mt-2">Liên hệ riêng</div>
              <ul className="text-xs text-slate-400 mt-3 space-y-2">
                <li>✓ Triển khai trực tiếp trên máy chủ Dell M4800 / On-Prem</li>
                <li>✓ Bảo mật dữ liệu nội bộ 100% không qua Internet</li>
                <li>✓ Tùy biến Fine-tune mô hình AI riêng biệt</li>
              </ul>
            </div>
            <Link
              href="https://www.huycncdsai.io.vn/#contact"
              target="_blank"
              className="mt-5 text-center w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Liên Hệ Kỹ Thuật &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 font-semibold text-sm text-white">
          Lịch Sử Biến Động Credits
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Thời Gian</th>
              <th className="py-3 px-4">Nội Dung Tác Vụ</th>
              <th className="py-3 px-4">Biến Động</th>
              <th className="py-3 px-4">Số Dư Sau Giao Dịch</th>
              <th className="py-3 px-4">Ghi Chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                <td className="py-3 px-4 text-slate-400">{tx.date}</td>
                <td className="py-3 px-4 text-white font-medium">{tx.desc}</td>
                <td className="py-3 px-4 font-mono font-semibold">
                  <span
                    className={
                      tx.amount.startsWith('+')
                        ? 'text-emerald-400'
                        : tx.amount === '0'
                        ? 'text-slate-400'
                        : 'text-rose-400'
                    }
                  >
                    {tx.amount}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">{tx.balance}</td>
                <td className="py-3 px-4 text-slate-500 italic">{tx.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
