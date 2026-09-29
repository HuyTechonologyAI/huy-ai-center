import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AdminCenter — Quản Trị Toàn Bộ Hệ Thống AI Agency | HUY AI CENTER",
  description: "Cổng quản trị SuperAdmin điều hành 59 AI Agency, phân bổ Quota, giám sát cụm máy chủ Dell M4800 Node-01 và chuỗi phê duyệt Root of Trust.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#070B14]">{children}</div>;
}
