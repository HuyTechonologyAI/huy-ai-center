'use client';

import React, { useState, useEffect } from 'react';

interface HealthData {
  plane: string;
  node_id: string;
  status: string;
  uptime_seconds: number;
  planes_status: {
    control_plane: string;
    orchestration_plane_n8n: string;
    media_compute_plane: string;
    credential_plane_vault: string;
    database_plane: string;
  };
}

interface IntentData {
  id: string;
  campaign_id: string;
  target_platforms: string[];
  schedule_type: string;
  status: string;
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  created_at: string;
}

export default function SocialPublishingCockpit() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [intents, setIntents] = useState<IntentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState('');
  const [topic, setTopic] = useState('Smart Teacher Schedule — Trợ lý Sư Phạm AI tối ưu thời khóa biểu');

  const fetchHealthAndIntents = async () => {
    try {
      const [healthRes, intentsRes] = await Promise.all([
        fetch('/api/v1/social/health'),
        fetch('/api/v1/social/publish-intents')
      ]);

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealth(hData);
      }
      if (intentsRes.ok) {
        const iData = await intentsRes.json();
        setIntents(iData.intents || []);
      }
    } catch (err) {
      console.error('Error fetching social publishing data:', err);
    }
  };

  useEffect(() => {
    fetchHealthAndIntents();
    const interval = setInterval(fetchHealthAndIntents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatchBroadcast = async () => {
    setLoading(true);
    setDispatchMsg('Đang tạo publish intent và dispatch qua Note-01 Gateway...');
    try {
      const res = await fetch('/api/v1/social/publish-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: 'FIRST-REVENUE-V3',
          target_platforms: ['facebook', 'instagram', 'threads', 'tiktok', 'youtube'],
          schedule_type: 'IMMEDIATE',
          contents: {
            default: {
              title: topic,
              body: `Giới thiệu ${topic}. Giải pháp chuyển đổi số sư phạm hàng đầu dành cho giáo viên Việt Nam.\n\nTrải nghiệm ngay tại: https://www.gvcncdsai.io.vn/`,
              ai_label_applied: true,
              tags: ['#NoiDungDoAILam', '#MadeWithAI', '#ChuyenDoiSoGiaoDuc', '#SmartTeacherSchedule']
            }
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setDispatchMsg(`✅ Xuất bản thành công! Intent ID: ${data.intent_id} (${data.total_jobs} platform jobs queued)`);
        fetchHealthAndIntents();
      } else {
        setDispatchMsg(`❌ Lỗi dispatch: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setDispatchMsg(`❌ Ngoại lệ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          padding: '24px 28px',
          borderRadius: '16px',
          border: '1px solid #312e81',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>📢</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>
              Trung Tâm Đăng Bài Đa Nền Tảng 24/7 — Note-01 + n8n
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Kiến trúc 5-Plane · Tự động hóa đăng bài & kênh video đa nền tảng · Khung giờ vàng GMT+7
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#10b98122',
              color: '#34d399',
              border: '1px solid #059669'
            }}
          >
            🛡️ Tuân Thủ Pháp Luật Việt Nam
          </span>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#3b82f622',
              color: '#60a5fa',
              border: '1px solid #2563eb'
            }}
          >
            🤖 Minh Bạch AI (100% Gắn Nhãn)
          </span>
        </div>
      </div>

      {/* 5-Plane Architecture Status Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}
      >
        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plane 1: Control</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>Note-01 Gateway</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>● Status: {health?.planes_status.control_plane || 'UP'}</div>
        </div>

        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plane 2: Orchestration</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>n8n 21 Workflows</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>● Status: {health?.planes_status.orchestration_plane_n8n || 'UP'} (Port 5678)</div>
        </div>

        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plane 3: Media Compute</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>Media Worker</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>● Status: {health?.planes_status.media_compute_plane || 'UP'} (FFmpeg/TTS)</div>
        </div>

        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plane 4: Credential</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>Token Broker / Vault</div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '6px' }}>🔒 Zero Secret Exposure (URI)</div>
        </div>

        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plane 5: Providers</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>5 Platform Adapters</div>
          <div style={{ fontSize: '12px', color: '#eab308', marginTop: '6px' }}>⚡ TikTok Default: UPLOAD_DRAFT</div>
        </div>
      </div>

      {/* Broadcast Dispatcher Control Box */}
      <div
        style={{
          background: '#0f172a',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>
            🚀 Lệnh Phát Sóng Tức Thời (Broadcast Dispatcher)
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            🎯 Target: Facebook · Instagram · Threads · TikTok (Draft) · YouTube
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              flex: 1,
              minWidth: '280px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '14px',
              outline: 'none'
            }}
            placeholder="Nhập tiêu đề hoặc chủ đề nội dung sư phạm AI..."
          />
          <button
            onClick={handleDispatchBroadcast}
            disabled={loading}
            style={{
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Đang điều phối...' : 'Kích Hoạt Phát Sóng 24/7'}
          </button>
        </div>

        {dispatchMsg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: dispatchMsg.startsWith('✅') ? '#064e3b' : '#7f1d1d',
              color: '#f8fafc',
              fontSize: '14px'
            }}
          >
            {dispatchMsg}
          </div>
        )}
      </div>

      {/* Official Channel Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}
      >
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>Facebook Page Official</span>
            <span style={{ fontSize: '11px', background: '#0369a133', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px' }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '8px' }}>Smart Teacher Schedule — Trợ Lý Sư Phạm AI</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Account: @SmartTeacherAI.VN</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Khung giờ vàng: 11:30 - 13:00 | 19:30 - 21:30 GMT+7</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#ec4899' }}>Instagram Business</span>
            <span style={{ fontSize: '11px', background: '#be185d33', color: '#f472b6', padding: '2px 8px', borderRadius: '6px' }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '8px' }}>Smart Teacher AI Vietnam</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Account: @smartteacher.ai.vn</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Định dạng: Feed (1:1, 4:5), Reels (9:16)</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#10b981' }}>Threads Platform</span>
            <span style={{ fontSize: '11px', background: '#05966933', color: '#34d399', padding: '2px 8px', borderRadius: '6px' }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '8px' }}>Smart Teacher AI Threads</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Account: @smartteacher.ai.vn</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Tần suất: 2 bài / ngày</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#f43f5e' }}>TikTok Video Channel</span>
            <span style={{ fontSize: '11px', background: '#e11d4833', color: '#fb7185', padding: '2px 8px', borderRadius: '6px' }}>SAFE DRAFT</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '8px' }}>Thầy Huy AI & Trợ Lý Giáo Viên</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Account: @smartteacher.ai</div>
          <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '8px' }}>Chính sách: UPLOAD_DRAFT (R3 Gate for Direct Post)</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>YouTube Channel</span>
            <span style={{ fontSize: '11px', background: '#b91c1c33', color: '#f87171', padding: '2px 8px', borderRadius: '6px' }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '8px' }}>Smart Teacher Schedule Official</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Định dạng: YouTube Shorts 9:16 & Hướng dẫn dài</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Tần suất: 2 video / ngày</div>
        </div>
      </div>

      {/* Recent Intents & Executions Table */}
      <div
        style={{
          background: '#0f172a',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>
          📋 Lịch Sử Các Publish Intent Đã Đăng Ký
        </h3>

        {intents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            Chưa có publish intent nào được gửi. Hãy bấm &quot;Kích Hoạt Phát Sóng 24/7&quot; ở trên để bắt đầu!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 10px' }}>Intent ID</th>
                  <th style={{ padding: '12px 10px' }}>Chiến Dịch</th>
                  <th style={{ padding: '12px 10px' }}>Nền Tảng Đích</th>
                  <th style={{ padding: '12px 10px' }}>Số Tác Vụ</th>
                  <th style={{ padding: '12px 10px' }}>Trạng Thái</th>
                  <th style={{ padding: '12px 10px' }}>Thời Gian Tạo</th>
                </tr>
              </thead>
              <tbody>
                {intents.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38bdf8' }}>{item.id}</td>
                    <td style={{ padding: '12px 10px', color: '#e2e8f0' }}>{item.campaign_id}</td>
                    <td style={{ padding: '12px 10px', color: '#a5b4fc' }}>{item.target_platforms.join(', ')}</td>
                    <td style={{ padding: '12px 10px', color: '#e2e8f0' }}>{item.total_jobs}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: item.status === 'PUBLISHED' ? '#065f46' : '#1e3a8a',
                          color: '#f8fafc'
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', color: '#94a3b8', fontSize: '12px' }}>
                      {new Date(item.created_at).toLocaleString('vi-VN')}
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
