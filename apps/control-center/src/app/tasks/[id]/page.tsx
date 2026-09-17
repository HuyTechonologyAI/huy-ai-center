'use client';

import React, { useEffect, useState, use } from 'react';

interface TaskPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: TaskPageProps) {
  const { id } = use(params);

  const [task, setTask] = useState<{
    task_id: string;
    source_app: string;
    task_type: string;
    status: string;
    created_at: string;
    started_at?: string | null;
    completed_at?: string | null;
    claimed_by_worker_id?: string | null;
    progress_pct?: number;
  } | null>(null);

  const [output, setOutput] = useState<{
    text?: string;
    json?: any;
    model?: string;
    tokens?: { prompt?: number; completion?: number; total?: number };
    latency_ms?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'slides' | 'quiz' | 'metrics'>('plan');
  const [pollInterval, setPollInterval] = useState(2500);

  // Fetch task status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/ai/tasks/${id}`, {
        headers: { 'Authorization': 'Bearer mock_session_token' },
      });
      if (res.ok) {
        const data = await res.json();
        setTask(data);

        // If completed, fetch outputs
        if (data.status === 'completed') {
          const outRes = await fetch(`/api/ai/tasks/${id}/outputs`, {
            headers: { 'Authorization': 'Bearer mock_session_token' },
          });
          if (outRes.ok) {
            const outData = await outRes.json();
            setOutput(outData.output);
          }
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Setup polling with backoff
    const timer = setInterval(() => {
      if (task?.status === 'completed' || task?.status === 'failed' || task?.status === 'cancelled') {
        clearInterval(timer);
        return;
      }
      fetchStatus();
      setPollInterval((prev) => Math.min(prev * 1.2, 10000));
    }, pollInterval);

    return () => clearInterval(timer);
  }, [id, task?.status]);

  // Mock processing runner
  const handleMockProcess = () => {
    setTask((prev) => (prev ? { ...prev, status: 'running', progress_pct: 60 } : null));

    setTimeout(() => {
      const mockResult = {
        text: `KẾ HOẠCH BÀI DẠY (GIÁO ÁN CHUẨN CÔNG VĂN 5512/BGDĐT)
MÔN: VẬT LÝ — KHỐI 10
BÀI: ĐỊNH LUẬT II NEWTON VÀ ỨNG DỤNG THỰC TIỄN
Thời lượng: 2 tiết (90 phút)

I. MỤC TIÊU BÀI HỌC
1. Kiến thức:
- Phát biểu được định luật II Newton: Gia tốc của một vật cùng hướng với lực tác dụng lên vật. Độ lớn của gia tốc tỉ lệ thuận với độ lớn của lực và tỉ lệ nghịch với khối lượng của vật (a = F / m).
- Viết được biểu thức vectơ: F = m.a và giải thích ý nghĩa các đại lượng trong hệ SI.

2. Năng lực:
- Năng lực giải quyết vấn đề: Phân tích được các lực tác dụng lên ô tô khi phanh gấp trong an toàn giao thông.
- Năng lực thực nghiệm: Xử lý dữ liệu bảng đo gia tốc và lực kéo từ phần mềm mô phỏng.

3. Phẩm chất:
- Trách nhiệm: Nâng cao ý thức chấp hành luật an toàn giao thông đường bộ (khoảng cách an toàn và tải trọng xe).

II. TIẾN TRÌNH DẠY HỌC
Hoạt động 1: Khởi động & Đặt vấn đề (10 phút)
- Tình huống: So sánh độ lệch vận tốc của xe tải chở nặng và xe con khi cùng đạp phanh gấp.
- Câu hỏi định hướng: Khối lượng và lực tác dụng ảnh hưởng như thế nào đến sự thay đổi vận tốc?

Hoạt động 2: Hình thành kiến thức (35 phút)
- Thí nghiệm ảo PhET: Khảo sát mối quan hệ giữa gia tốc a, lực tác dụng F và khối lượng m.
- Rút ra kết luận và biểu thức định luật II Newton.`,
        json: {
          slides: [
            { slideNumber: 1, title: 'Định Luật II Newton', subtitle: 'Khám phá quy luật chuyển động của vũ trụ', type: 'intro' },
            { slideNumber: 2, title: 'Hiện tượng thực tế', content: 'Tại sao xe chở nặng phanh lâu dừng hơn xe không tải?', visual: 'Tải trọng & Quán tính' },
            { slideNumber: 3, title: 'Biểu thức cốt lõi', formula: 'F = m . a', unit: 'F (N), m (kg), a (m/s²)' },
            { slideNumber: 4, title: 'Ứng dụng an toàn giao thông', content: 'Quy tắc giữ khoảng cách phanh an toàn khi trời mưa', visual: 'Biển báo giao thông' },
          ],
          quiz: [
            { id: 1, question: 'Theo định luật II Newton, gia tốc của một vật có đặc điểm gì?', options: ['A. Tỉ lệ nghịch với lực tác dụng', 'B. Cùng hướng với lực tác dụng', 'C. Ngược hướng với lực tác dụng', 'D. Không phụ thuộc vào khối lượng'], answer: 'B', explanation: 'Vectơ gia tốc a luôn cùng hướng với vectơ hợp lực F tác dụng lên vật.' },
            { id: 2, question: 'Một lực 20N tác dụng lên vật có khối lượng 4kg. Gia tốc của vật là bao nhiêu?', options: ['A. 80 m/s²', 'B. 0.2 m/s²', 'C. 5 m/s²', 'D. 16 m/s²'], answer: 'C', explanation: 'Áp dụng công thức a = F / m = 20 / 4 = 5 m/s².' },
          ],
        },
        model: 'qwen2.5:7b-instruct (Dell M4800 Node Emulated)',
        tokens: { prompt: 240, completion: 780, total: 1020 },
        latency_ms: 1850,
      };

      setTask((prev) => (prev ? { ...prev, status: 'completed', progress_pct: 100, completed_at: new Date().toISOString() } : null));
      setOutput(mockResult);
    }, 1200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return { label: 'Chờ Xử Lý (Queued)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'claimed':
      case 'running':
        return { label: 'Đang Thực Thi (Processing)', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
      case 'completed':
        return { label: 'Đã Hoàn Tất (Completed)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'failed':
        return { label: 'Thất Bại (Failed)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'cancelled':
        return { label: 'Đã Hủy (Cancelled)', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
      default:
        return { label: status, color: '#94a3b8', bg: '#1e293b' };
    }
  };

  if (loading && !task) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div>Đang tải thông tin tác vụ...</div>
      </div>
    );
  }

  const currentStatus = task?.status || 'queued';
  const badge = getStatusBadge(currentStatus);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <a href="/history" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            ← Lịch Sử Tác Vụ
          </a>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{id.substring(0, 8)}...</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentStatus !== 'completed' && (
            <button
              onClick={handleMockProcess}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Mô phỏng tính toán hoàn tất không cần Dell thật"
            >
              <span>⚡</span> Mô phỏng Xử lý (Mock Process)
            </button>
          )}
        </div>
      </div>

      {/* Offline Dell Banner (Always Friendly, Never Fake Error) */}
      {currentStatus === 'queued' && (
        <div
          style={{
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
              Yêu cầu đã được ghi nhận an toàn và đang chờ hệ thống xử lý.
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Kiến trúc hàng đợi phân tán đảm bảo công việc của bạn không bị gián đoạn ngay cả khi node phần cứng nội bộ đang bảo trì hoặc chuyển chế độ chờ.
            </div>
          </div>
        </div>
      )}

      {/* Task Summary Card */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Mã Tác Vụ: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{id}</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0 0' }}>
              Soạn Giáo Án &amp; Slide Bài Dạy — Teacher AI
            </h1>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: badge.bg,
              color: badge.color,
              fontWeight: 700,
              fontSize: '13px',
              border: `1px solid ${badge.color}40`,
            }}
          >
            ● {badge.label}
          </div>
        </div>

        {/* 4-Step Visual Progress Tracker */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '16px 0', borderTop: '1px solid #1e293b' }}>
          {[
            { step: 1, label: 'Tiếp nhận', done: true },
            { step: 2, label: 'Điều phối Worker', done: currentStatus === 'running' || currentStatus === 'completed' },
            { step: 3, label: 'Sinh học liệu', done: currentStatus === 'running' || currentStatus === 'completed' },
            { step: 4, label: 'Hoàn thành', done: currentStatus === 'completed' },
          ].map((s) => (
            <div key={s.step} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  margin: '0 auto 6px auto',
                  backgroundColor: s.done ? '#2563eb' : '#1e293b',
                  color: s.done ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {s.done ? '✓' : s.step}
              </div>
              <div style={{ fontSize: '11px', color: s.done ? '#e2e8f0' : '#64748b', fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output Content Tabs (Visible when completed) */}
      {output && (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', backgroundColor: '#090d16', overflowX: 'auto' }}>
            {[
              { id: 'plan', label: '📝 Giáo Án Chi Tiết' },
              { id: 'slides', label: '🖥️ Slide Bài Giảng' },
              { id: 'quiz', label: '❓ Trắc Nghiệm (Quiz)' },
              { id: 'metrics', label: '📊 Thông Số Kỹ Thuật' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                  color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Lesson Plan */}
          {activeTab === 'plan' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button
                  onClick={() => navigator.clipboard.writeText(output.text || '')}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  📋 Sao chép giáo án
                </button>
              </div>
              <pre
                style={{
                  backgroundColor: '#090d16',
                  padding: '20px',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  margin: 0,
                }}
              >
                {output.text}
              </pre>
            </div>
          )}

          {/* Tab 2: Slides */}
          {activeTab === 'slides' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {output.json?.slides?.map((slide: any) => (
                  <div
                    key={slide.slideNumber}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
                      SLIDE #{slide.slideNumber}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                      {slide.title}
                    </div>
                    {slide.subtitle && <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>{slide.subtitle}</div>}
                    {slide.content && <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{slide.content}</div>}
                    {slide.formula && (
                      <div style={{ backgroundColor: '#0f172a', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', color: '#38bdf8', marginTop: '8px' }}>
                        {slide.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Quiz */}
          {activeTab === 'quiz' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {output.json?.quiz?.map((q: any) => (
                  <div
                    key={q.id}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                      Câu {q.id}: {q.question}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      {q.options?.map((opt: string) => (
                        <div key={opt} style={{ fontSize: '13px', color: '#cbd5e1', padding: '6px 10px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '8px' }}>
                      ✓ Đáp án đúng: {q.answer} — Giải thích: {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Metrics */}
          {activeTab === 'metrics' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Mô Hình Xử Lý</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>{output.model || 'Local Model'}</div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Thời Gian Phản Hồi</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{output.latency_ms ? `${output.latency_ms} ms` : 'N/A'}</div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Tổng Số Token</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#eab308', marginTop: '4px' }}>{output.tokens?.total || 0} tokens</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
