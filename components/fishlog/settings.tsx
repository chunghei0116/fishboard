"use client";
import { useState } from "react";
import { useFishLog } from "./provider";
export default function Settings() {
  const { demo, user, config, login, logout, data, resetDemo } = useFishLog();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmReset, setConfirmReset] = useState(false);
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
    <div className="fl-settings">
      <div className="fl-page-heading">
        <h1>設定</h1>
      </div>
      {error && (
        <p className="fl-error" role="alert">
          {error}
        </p>
      )}
      <section className="fl-settings-section">
        <h2>{user ? user.displayName || "私人帳戶" : "私人日誌"}</h2>
        <p>
          {user
            ? user.email
            : config?.firebase
              ? "Google 登入後只會顯示你自己嘅紀錄。示範資料唔會自動匯入帳戶。"
              : "私人登入尚未開啟。目前係示範模式，新增紀錄只保存喺呢個瀏覽器。"}
        </p>
        <button
          className="fl-primary"
          onClick={() => void account()}
          disabled={busy || !config?.firebase}
        >
          {busy ? "連接中…" : user ? "登出" : "Google 登入"}
        </button>
      </section>
      <section className="fl-settings-section">
        <h2>你的紀錄</h2>
        <p>
          {data.catches.length} 筆漁獲 ·{" "}
          {new Set(data.catches.map((c) => c.speciesId)).size} 個魚種
        </p>
        <button className="fl-secondary" onClick={exportData}>
          匯出備份
        </button>
        {demo && (
          <button
            className="fl-secondary"
            onClick={() => setConfirmReset((v) => !v)}
          >
            還原示範紀錄
          </button>
        )}
        {confirmReset && (
          <div>
            <p>會移除呢個瀏覽器新增嘅示範紀錄。可先匯出備份。</p>
            <button
              className="fl-secondary"
              onClick={() => {
                resetDemo();
                setConfirmReset(false);
              }}
            >
              確認還原
            </button>
          </div>
        )}
      </section>
      <section className="fl-settings-section">
        <h2>服務狀態</h2>
        <div className="fl-status-list">
          <div>
            私人登入
            <span>{config?.firebase ? "已就緒" : "未設定"}</span>
          </div>
          <div>
            相片儲存
            <span>{config?.storageReady ? "已就緒" : "未設定"}</span>
          </div>
          <div>
            像素魚生成
            <span>{config?.generationReady ? "已就緒" : "未設定"}</span>
          </div>
        </div>
        <p>
          未設定的服務需要由網站擁有人接上。你仍可先瀏覽示範魚種與 漁獲紀錄。
        </p>
      </section>
    </div>
  );
}
