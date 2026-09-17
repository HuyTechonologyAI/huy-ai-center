import React from 'react';

export default function AIAppsPage() {
  const apps = [
    {
      id: 'teacher-ai',
      name: 'Teacher AI',
      category: 'Sư Phạm & Giáo Dục',
      description: 'Trợ lý soạn giáo án thông minh, sinh slide bài giảng, câu hỏi trắc nghiệm và phiếu học tập chuẩn Bộ GD&ĐT.',
      icon: '🎓',
      status: 'active',
      badge: 'Đang Hoạt Động',
      badgeColor: '#10b981',
      href: '/apps/teacher-ai',
      buttonText: 'Mở Ứng Dụng',
    },
    {
      id: 'student-ai',
      name: 'Student AI',
      category: 'Tự Học & Ôn Luyện',
      description: 'Gia sư AI cá nhân hóa lộ trình học, giải đáp bài tập từng bước và sinh đề thi thử theo năng lực học sinh.',
      icon: '📚',
      status: 'coming_soon',
      badge: 'Sắp Ra Mắt',
      badgeColor: '#eab308',
      href: '#',
      buttonText: 'Xem Giới Thiệu',
    },
    {
      id: 'smarttax-ai',
      name: 'SmartTax AI',
      category: 'Tài Chính & Thuế',
      description: 'Tự động hóa rà soát hóa đơn, phát hiện rủi ro hóa đơn bất hợp pháp và lập tờ khai thuế doanh nghiệp tự động.',
      icon: '📊',
      status: 'external',
      badge: 'Hệ Sinh Thái',
      badgeColor: '#38bdf8',
      href: 'https://smarttax-ai.vercel.app/',
      buttonText: 'Truy Cập Web App',
      isExternal: true,
    },
    {
      id: 'business-ai',
      name: 'Business AI',
      category: 'Doanh Nghiệp & Tự Động Hóa',
      description: 'Tổng hợp báo cáo kinh doanh đa nguồn, tự động hóa quy trình n8n và phân tích dữ liệu hiệu suất vận hành.',
      icon: '💼',
      status: 'coming_soon',
      badge: 'Sắp Ra Mắt',
      badgeColor: '#eab308',
      href: '#',
      buttonText: 'Đăng Ký Thử Nghiệm',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
          Kho Ứng Dụng AI (AI Apps Suite)
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
          Hệ sinh thái các công cụ AI chuyên biệt phục vụ Giáo dục, Tài chính thuế và Quản trị doanh nghiệp.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        {apps.map((app) => (
          <div
            key={app.id}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  {app.icon}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: `${app.badgeColor}18`,
                    color: app.badgeColor,
                    border: `1px solid ${app.badgeColor}40`,
                  }}
                >
                  {app.badge}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                {app.category}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px 0' }}>
                {app.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                {app.description}
              </p>
            </div>

            <div>
              <a
                href={app.href}
                target={app.isExternal ? '_blank' : undefined}
                rel={app.isExternal ? 'noopener noreferrer' : undefined}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: app.status === 'active' ? '#2563eb' : '#1e293b',
                  color: app.status === 'active' ? '#ffffff' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s',
                }}
              >
                {app.buttonText} {app.isExternal ? '↗' : '→'}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
