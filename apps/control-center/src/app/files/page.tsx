'use client';

import React, { useState } from 'react';

interface StorageFile {
  id: string;
  name: string;
  bucket: string;
  size: string;
  createdAt: string;
  type: 'docx' | 'pptx' | 'pdf' | 'json' | 'md';
}

export default function FilesPage() {
  const [activeBucket, setActiveBucket] = useState('all');

  const files: StorageFile[] = [
    {
      id: 'f-1',
      name: 'Giao_An_Tin_Hoc_8_Mang_May_Tinh_CV5512.docx',
      bucket: 'lesson-plans',
      size: '245 KB',
      createdAt: '15 phút trước',
      type: 'docx',
    },
    {
      id: 'f-2',
      name: 'Slide_Thuyet_Trinh_Internet_Toan_Cau.pptx',
      bucket: 'teaching-slides',
      size: '3.4 MB',
      createdAt: '12 phút trước',
      type: 'pptx',
    },
    {
      id: 'f-3',
      name: 'Ngan_Hang_15_Cau_Trac_Nghiem_Kem_Dap_An.json',
      bucket: 'evaluations',
      size: '42 KB',
      createdAt: '10 phút trước',
      type: 'json',
    },
    {
      id: 'f-4',
      name: 'To_Khai_Thue_GTGT_Q3_Kiem_Tra_Doi_Chieu.pdf',
      bucket: 'tax-documents',
      size: '1.2 MB',
      createdAt: '2 ngày trước',
      type: 'pdf',
    },
    {
      id: 'f-5',
      name: 'Ma_Tran_Phan_Hoa_Trac_Nghiem_Toan_12.docx',
      bucket: 'evaluations',
      size: '180 KB',
      createdAt: '3 ngày trước',
      type: 'docx',
    },
  ];

  const buckets = [
    { id: 'all', name: 'Tất cả tệp', count: files.length },
    { id: 'lesson-plans', name: 'Giáo án (CV 5512)', count: 1 },
    { id: 'teaching-slides', name: 'Slide bài giảng', count: 1 },
    { id: 'evaluations', name: 'Ngân hàng kiểm tra', count: 2 },
    { id: 'tax-documents', name: 'Hồ sơ thuế', count: 1 },
  ];

  const filteredFiles = files.filter(
    (f) => activeBucket === 'all' || f.bucket === activeBucket
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'docx':
        return '📄';
      case 'pptx':
        return '📊';
      case 'pdf':
        return '📑';
      case 'json':
        return '🧩';
      default:
        return '📁';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kho Tệp &amp; Học Liệu</h1>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý tài liệu đầu ra được lưu trữ an toàn trên Supabase Storage Buckets.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <span>Dung lượng đã dùng:</span>
          <strong className="text-blue-400 font-mono">5.07 MB / 10 GB</strong>
        </div>
      </div>

      {/* Bucket Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {buckets.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBucket(b.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
              activeBucket === b.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>{b.name}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] ${
                activeBucket === b.id ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {b.count}
            </span>
          </button>
        ))}
      </div>

      {/* Files List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Tên Tệp</th>
              <th className="py-3.5 px-4">Storage Bucket</th>
              <th className="py-3.5 px-4">Dung Lượng</th>
              <th className="py-3.5 px-4">Ngày Tạo</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredFiles.map((f) => (
              <tr key={f.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-4 flex items-center gap-3">
                  <span className="text-xl">{getFileIcon(f.type)}</span>
                  <span className="font-medium text-white truncate max-w-md">{f.name}</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {f.bucket}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{f.size}</td>
                <td className="py-3.5 px-4 text-xs text-slate-400">{f.createdAt}</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() =>
                      alert(`Đang tải tệp "${f.name}" từ Supabase Storage Bucket...`)
                    }
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                  >
                    Tải về ⬇
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
