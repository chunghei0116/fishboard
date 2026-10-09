"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, House, Grid2X2, MapPin } from "lucide-react";
import { useFishLog } from "./provider";
import { ThemeSwitch } from "./theme";
import Landing from "./landing";
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { error, user } = useFishLog();
  return (
    <div className={`fl-shell${user ? "" : " fl-shell-guest"}`}>
      <header className="fl-header">
        <div className="fl-brand-group">
          <Link href="/" className="fl-brand" aria-label="釣魚日誌首頁">
            <svg
              width="42"
              height="49"
              viewBox="0 0 42 49"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 41 8 24 27 6 34 4 34 37M9 24l5 3M13 19l5 3M18 14l4 4M34 37c0 7-8 7-8 2"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="square"
              />
            </svg>
            <span>
              <b>釣魚日誌</b>
              <small>我的水域，我的漁獲。</small>
            </span>
          </Link>
          <ThemeSwitch />
        </div>
      </header>
      {user ? (
        <>
          <nav className="fl-bottom-nav" aria-label="主要導覽">
            {[
              { href: "/", label: "首頁", Icon: House },
              { href: "/collection", label: "圖鑑", Icon: Grid2X2 },
              { href: "/map", label: "地圖", Icon: MapPin },
              { href: "/settings", label: "設定", Icon: Settings },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={path === href ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          {error && (
            <p className="fl-error" role="alert">
              {error} <Link href="/settings">登入設定</Link>
            </p>
          )}
          {children}
        </>
      ) : (
        <Landing />
      )}
    </div>
  );
}
