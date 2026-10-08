import type { Metadata } from "next";
import "./globals.css";
import "./fishlog.css";
import { FishLogProvider } from "@/components/fishlog/provider";
import { JournalTheme } from "@/components/fishlog/theme";
import Shell from "@/components/fishlog/shell";
export const metadata: Metadata = {
  title: "FISH LOG · My waters, my catches.",
  description:
    "留住每一次漁獲。A personal fishing journal, one fish at a time.",
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
          <FishLogProvider>
            <Shell>{children}</Shell>
          </FishLogProvider>
        </JournalTheme>
      </body>
    </html>
  );
}
