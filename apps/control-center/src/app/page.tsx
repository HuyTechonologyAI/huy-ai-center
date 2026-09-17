import React from 'react';

export default function DashboardPage() {
  const ecosystemSites = [
    { name: 'Huy AI Portfolio', url: 'https://www.huycncdsai.io.vn/', status: 'Online' },
    { name: 'Smart Teacher Schedule', url: 'https://www.gvcncdsai.io.vn/', status: 'Online' },
    { name: 'SmartTax AI', url: 'https://smarttax-ai.vercel.app/', status: 'Online' },
  ];

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ borderBottom: '1px solid #1f2937', paddingBottom: '24px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#60a5fa' }}>
          HUY TECHNOLOGY AI CENTER
        </h1>
        <p style={{ color: '#9ca3af', margin: 0 }}>
          Hạ tầng điều phối AI tập trung &amp; Quản trị hàng đợi tác vụ đa nền tảng
        </p>
      </header>

      {/* Grid Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
            Primary Node (On-Premises)
          </h2>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#f59e0b' }}>
            Dell M4800 (huy-ai-node-01)
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
            Trạng thái: <strong>Standby / Decoupled Ready</strong> (32GB RAM, 1TB)
          </p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
            AI Task Queue Status
          </h2>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#10b981' }}>
            Decoupled Mode
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
            Queued: 0 | Running: 0 | Completed: 0
          </p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
            Ecosystem Protection
          </h2>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#3b82f6' }}>
            Zero-Touch Active
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
            3 Website Production được bảo vệ 100%
          </p>
        </div>
      </div>

      {/* Ecosystem Websites */}
      <section style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#e5e7eb' }}>
          Hệ sinh thái Website kết nối
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {ecosystemSites.map((site) => (
            <div key={site.name} style={{ background: '#1f2937', borderRadius: '6px', padding: '16px' }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>{site.name}</div>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none', wordBreak: 'break-all' }}
              >
                {site.url}
              </a>
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px' }}>
                ● {site.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Overview */}
      <section style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0', color: '#e5e7eb' }}>
          Kiến trúc điều phối Decoupled
        </h2>
        <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6', margin: 0 }}>
          Toàn bộ các tác vụ xử lý AI nặng từ các website sẽ được gửi về bảng <code>ai_tasks</code> trên Supabase với trạng thái <code>queued</code>. Dispatcher Worker chạy trên máy chủ Dell M4800 (khi online) sẽ tự động claim tác vụ, đưa qua Ollama/LiteLLM/Langflow/n8n và ghi kết quả trả về. Website không bao giờ phụ thuộc trực tiếp vào thời gian online của máy chủ vật lý.
        </p>
      </section>
    </main>
  );
}
