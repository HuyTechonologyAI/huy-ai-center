import type { Metadata } from 'next';
import React from 'react';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'HUY TECHNOLOGY AI CENTER — Control Center',
  description: 'Trung tâm Điều phối AI & Quản trị Tác vụ Đa Nền tảng',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#090d16', color: '#f1f5f9' }}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
