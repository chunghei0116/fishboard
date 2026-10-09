"use client";
import { useLoading } from "./loading-dialog";
import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Download, LogOut, Moon, Sun, Waves } from "lucide-react";
import { useFishLog } from "./provider";
import Gear from "./gear";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function Settings() {
  const { user, config, login, logout, data } = useFishLog();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useLoading(busy, user ? "登出中…" : "登入中…", 2);
  const speciesCount = new Set(data.catches.map((c) => c.speciesId)).size;
  async function account() {
    setBusy(true);
    setError("");
    try {
      if (user) await logout();
      else await login();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `fish-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="fl-settings fl-angler-profile">
      <section className="fl-fishing-license" aria-labelledby="license-title">
        <header className="fl-license-header">
          <h1 id="license-title">釣魚證</h1>
          <span>
            <Waves size={16} aria-hidden="true" />
            釣魚日誌
          </span>
        </header>
        <div className="fl-license-body">
          <div className="fl-license-portrait">
            <Image
              src="/images/angler-avatar.png"
              alt="戴著藍色帽子的可愛卡通男性釣手"
              width={360}
              height={360}
              priority
            />
          </div>
          <div className="fl-license-holder">
            <span className="fl-license-label">釣手</span>
            <h2>{user?.displayName || "釣魚日誌會員"}</h2>
            <div className="fl-license-stats">
              <div>
                <strong>{speciesCount}</strong>
                <span>已記錄魚種</span>
              </div>
              <div>
                <strong>{data.catches.length}</strong>
                <span>總釣數</span>
              </div>
            </div>
          </div>
        </div>
        <footer className="fl-license-footer">
          <span>我的水域，我的漁獲。</span>
          <span>個人紀錄證</span>
        </footer>
      </section>

      <section
        id="loadout"
        className="fl-profile-loadout"
        aria-label="裝備配置"
      >
        <Gear embedded />
      </section>

      <section
        className="fl-profile-preferences"
        aria-labelledby="preferences-title"
      >
        <h2 id="preferences-title">設定</h2>
        <div className="fl-preference-row fl-preference-theme">
          <span>外觀主題</span>
          <div className="fl-theme-options" role="group" aria-label="外觀主題">
            <button
              type="button"
              aria-pressed={mounted && resolvedTheme === "light"}
              onClick={() => setTheme("light")}
            >
              <Sun size={16} aria-hidden="true" />
              淺色
            </button>
            <button
              type="button"
              aria-pressed={mounted && resolvedTheme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon size={16} aria-hidden="true" />
              深色
            </button>
          </div>
        </div>
        <div className="fl-preference-row">
          <span>紀錄備份</span>
          <button
            type="button"
            className="fl-preference-action"
            onClick={exportData}
          >
            <Download size={16} aria-hidden="true" />
            匯出備份
          </button>
        </div>
        <div className="fl-preference-row fl-preference-account">
          <div>
            <span>帳戶</span>
            <small>{user?.email || "私人日誌"}</small>
          </div>
          <button
            type="button"
            className="fl-preference-action"
            onClick={() => void account()}
            disabled={busy || !config?.firebase}
          >
            <LogOut size={16} aria-hidden="true" />
            {busy ? "連接中…" : user ? "登出" : "Google 登入"}
          </button>
        </div>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
