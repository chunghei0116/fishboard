import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "釣魚日和 · 我的魚類圖鑑",
  description: "將每一次釣魚回憶，收藏成像素襟章。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body className="antialiased">{children}</body>
    </html>
  );
}
