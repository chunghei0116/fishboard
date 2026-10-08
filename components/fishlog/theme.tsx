"use client";
import { ThemeProvider, useTheme } from "next-themes";
export function JournalTheme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      storageKey="fishlog-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="fl-theme-toggle"
      role="switch"
      aria-checked={dark}
      aria-label="深色模式"
      title={dark ? "切換淺色模式" : "切換深色模式"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span className="fl-theme-light" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
