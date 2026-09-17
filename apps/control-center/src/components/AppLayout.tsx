'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#090d16' }}>
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
        className="main-layout-content"
      >
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{ flex: 1, padding: '24px 20px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        @media (min-width: 768px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
          .main-layout-content {
            margin-left: 260px !important;
          }
          .md-hidden {
            display: none !important;
          }
          .md-toggle {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .sm-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
