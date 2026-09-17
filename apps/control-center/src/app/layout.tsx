import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'HUY TECHNOLOGY AI CENTER — Control Center',
  description: 'Orchestration Dashboard & AI Infrastructure Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0d14', color: '#f3f4f6' }}>
        {children}
      </body>
    </html>
  );
}
