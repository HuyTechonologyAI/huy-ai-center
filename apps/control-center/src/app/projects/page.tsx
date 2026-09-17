'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string;
  app: string;
  itemCount: number;
  updatedAt: string;
  status: 'active' | 'archived';
}

export default function ProjectsPage() {
  const [projects] = useState<Project[]>([
    {
      id: 'proj-thcs-tin-hoc-8',
      name: 'Giáo Án Tin Học Lớp 8 - Năm Học 2025-2026',
      description: 'Trọn bộ giáo án, slide bài giảng và ngân hàng trắc nghiệm 35 tuần theo chuẩn GDPT 2018.',
      app: 'Teacher AI',
      itemCount: 35,
      updatedAt: '2 giờ trước',
      status: 'active',
    },
    {
      id: 'proj-thpt-toan-12-on-thi',
      name: 'Ôn Thi Tốt Nghiệp THPT - Chuyên Đề Hàm Số & Tích Phân',
      description: 'Bộ đề thi thử phân hóa 4 mức độ kèm sơ đồ tư duy Mindmap và ma trận đáp án chi tiết.',
      app: 'Teacher AI',
      itemCount: 18,
      updatedAt: '1 ngày trước',
      status: 'active',
    },
    {
      id: 'proj-tax-q3-2025',
      name: 'Khai Thuế GTGT & Thu Nhập Quý 3 - Nhóm DN Công Nghệ',
      description: 'Báo cáo phân tích rủi ro hóa đơn và đối chiếu tờ khai thuế GTGT định kỳ.',
      app: 'SmartTax AI',
      itemCount: 12,
      updatedAt: '3 ngày trước',
      status: 'active',
    },
    {
      id: 'proj-business-brand-2025',
      name: 'Kế Hoạch Khởi Nghiệp Công Nghệ Giáo Dục Huy AI',
      description: 'Kịch bản truyền thông và tài liệu thuyết trình gọi vốn nhà đầu tư thiên thần.',
      app: 'Business AI',
      itemCount: 6,
      updatedAt: '1 tuần trước',
      status: 'archived',
    },
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dự Án Của Tôi</h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý các bộ giáo án, học liệu chuyên đề và hồ sơ tư vấn AI theo từng nhóm mục tiêu.
          </p>
        </div>
        <button
          onClick={() => alert('Tính năng tạo Dự án mới sẽ sẵn sàng trong bản nâng cấp.')}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-sm transition"
        >
          + Tạo Dự Án Mới
        </button>
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {proj.app}
                </span>
                <span className="text-xs text-slate-500">Cập nhật: {proj.updatedAt}</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition mb-2">
                {proj.name}
              </h3>
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                {proj.description}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                📁 <strong>{proj.itemCount}</strong> tài liệu / tác vụ
              </span>
              <Link
                href="/history"
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Mở thư mục &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
