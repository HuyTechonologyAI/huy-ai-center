'use client';

import React from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleSidebar}
          aria-label="Mở thanh điều hướng"
          style={{
            background: 'transparent',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            padding: '6px 10px',
            fontSize: '18px',
            cursor: 'pointer',
          }}
          className="md-toggle"
        >
          ☰
        </button>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
          Trung Tâm Điều Phối AI
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Credits Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: 600,
          }}
          title="Số dư tín dụng AI khả dụng"
        >
          <span>⚡</span>
          <span>5,000 Credits</span>
        </div>

        {/* User Account Avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            H
          </div>
          <div className="sm-hidden" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>Huy Technology</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Quản trị viên</div>
          </div>
        </div>
      </div>
    </header>
  );
}
