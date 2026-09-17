'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Bảng Điều Khiển', href: '/', icon: '📊' },
    { label: 'Kho Ứng Dụng AI', href: '/apps', icon: '🤖' },
    { label: 'Dự Án Giáo Dục', href: '/projects', icon: '📁' },
    { label: 'Tài Liệu & Tệp', href: '/files', icon: '📄' },
    { label: 'Lịch Sử Tác Vụ', href: '/history', icon: '⏱️' },
    { label: 'Ví Tín Dụng AI', href: '/credits', icon: '💳' },
    { label: 'Tài Khoản', href: '/account', icon: '👤' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="sidebar-container"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
              HUY TECHNOLOGY
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              AI CENTER
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Đóng thanh điều hướng"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
              }}
              className="md-hidden"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }} aria-label="Điều hướng chính">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: isActive ? '#38bdf8' : '#cbd5e1',
                      backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '14px',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Node Hardware Status Widget */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', backgroundColor: '#090d16' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
            Node Nội Bộ (On-Premises)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#eab308',
                boxShadow: '0 0 8px rgba(234, 179, 8, 0.5)',
              }}
            />
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>Dell M4800</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Trạng thái: <strong>Standby / Decoupled</strong> (Hàng đợi đệm an toàn)
          </p>
        </div>
      </aside>
    </>
  );
}
