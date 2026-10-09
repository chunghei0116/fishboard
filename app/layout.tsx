import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./fishlog.css";
import { FishLogProvider } from "@/components/fishlog/provider";
import { JournalTheme } from "@/components/fishlog/theme";
import { LoadingProvider } from "@/components/fishlog/loading-dialog";
import Shell from "@/components/fishlog/shell";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "釣魚日誌 · 我的水域，我的漁獲。",
  description: "留住每一次漁獲，收藏每一個水邊故事。",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK" suppressHydrationWarning>
      <body>
        <JournalTheme>
          <LoadingProvider>
            <FishLogProvider>
              <Shell>{children}</Shell>
            </FishLogProvider>
          </LoadingProvider>
        </JournalTheme>
      </body>
    </html>
  );
}
