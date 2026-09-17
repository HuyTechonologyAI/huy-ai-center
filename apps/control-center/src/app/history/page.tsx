'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface TaskItem {
  task_id: string;
  source_app: string;
  task_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  claimed_by_worker_id?: string;
}

export default function HistoryPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch('/api/ai/history', {
          headers: {
            'x-api-key': 'preview-dev-key',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tasks && data.tasks.length > 0) {
            setTasks(data.tasks);
          } else {
            // Provide default fallback demo tasks
            setTasks(getDefaultMockTasks());
          }
        } else {
          setTasks(getDefaultMockTasks());
        }
      } catch {
        setTasks(getDefaultMockTasks());
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const getDefaultMockTasks = (): TaskItem[] => [
    {
      task_id: 'task-lesson-8821',
      source_app: 'education',
      task_type: 'lesson_plan',
      status: 'completed',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      claimed_by_worker_id: 'dell-m4800-worker-01',
    },
    {
      task_id: 'task-quiz-9104',
      source_app: 'education',
      task_type: 'quiz_generator',
      status: 'completed',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (2 * 3600 - 45) * 1000).toISOString(),
      claimed_by_worker_id: 'dell-m4800-worker-01',
    },
    {
      task_id: 'task-slide-4301',
      source_app: 'education',
      task_type: 'presentation_slides',
      status: 'queued',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      task_id: 'task-tax-1029',
      source_app: 'tax',
      task_type: 'vat_classification',
      status: 'completed',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (24 * 3600 - 120) * 1000).toISOString(),
      claimed_by_worker_id: 'dell-m4800-worker-01',
    },
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchesFilter = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      t.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.task_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.source_app.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ● Hoàn thành
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            ● Đang chạy
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ● Chờ xử lý
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            ● Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lịch Sử Tác Vụ AI</h1>
          <p className="text-sm text-slate-400 mt-1">
            Theo dõi tất cả các tác vụ đã gửi từ Teacher AI, SmartTax AI và API Clients.
          </p>
        </div>
        <Link
          href="/apps/teacher-ai"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-sm transition"
        >
          + Tạo Tác Vụ Mới
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'queued', label: 'Chờ xử lý' },
            { id: 'running', label: 'Đang chạy' },
            { id: 'completed', label: 'Hoàn thành' },
            { id: 'failed', label: 'Thất bại' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm theo Task ID hoặc loại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải lịch sử tác vụ...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Không tìm thấy tác vụ nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã Tác Vụ</th>
                  <th className="py-3.5 px-4">Ứng Dụng</th>
                  <th className="py-3.5 px-4">Loại Tác Vụ</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Worker Phụ Trách</th>
                  <th className="py-3.5 px-4">Thời Gian Tạo</th>
                  <th className="py-3.5 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredTasks.map((t) => (
                  <tr key={t.task_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-400 font-medium">
                      {t.task_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {t.source_app === 'education'
                        ? 'Teacher AI'
                        : t.source_app === 'tax'
                        ? 'SmartTax AI'
                        : t.source_app}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 capitalize">
                      {t.task_type.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {t.claimed_by_worker_id || (
                        <span className="text-slate-600 italic">Chưa claim</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/tasks/${t.task_id}`}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition underline underline-offset-4"
                      >
                        Xem kết quả &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
