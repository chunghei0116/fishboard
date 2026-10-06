"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Plus, ArrowUpRight } from "lucide-react";
import { useFishLog } from "./provider";
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { demo, user, error, loading } = useFishLog();
  return (
    <div className="fl-shell">
      <header className="fl-header">
        <Link href="/" className="fl-brand" aria-label="Fish Log 首頁">
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
            <b>
              FISH LOG
              <i />
            </b>
            <small>MY WATERS, MY CATCHES.</small>
          </span>
        </Link>
        <nav aria-label="主要導覽">
          {[
            ["/", "HOME"],
            ["/collection", "COLLECTION"],
            ["/map", "MAP"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/settings"
            aria-label="Settings"
            aria-current={path === "/settings" ? "page" : undefined}
          >
            <Settings size={19} />
          </Link>
        </nav>
      </header>
      <div className="fl-mode">
        <span>
          <i />
          {loading
            ? "LOADING YOUR WATERS"
            : demo
              ? "DEMO JOURNAL · LOCAL BROWSER"
              : `PRIVATE JOURNAL · ${user?.displayName || "MY CATCHES"}`}
        </span>
        <Link href="/add">
          <Plus size={13} /> ADD CATCH
        </Link>
      </div>
      {error && (
        <p className="fl-error" role="alert">
          {error} <Link href="/settings">登入設定</Link>
        </p>
      )}
      {children}
      <footer className="fl-footer">
        <span>DIFFERENT WATERS. SAME OBSESSION.</span>
        <span>
          ONE FISH, ONE STORY. <ArrowUpRight size={12} />
        </span>
      </footer>
    </div>
  );
}
