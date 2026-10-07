"use client";
import { useState } from "react";
import { useFishLog } from "./provider";
export default function Landing() {
  const { login, loading, config, error } = useFishLog();
  const [busy, setBusy] = useState(false),
    [loginError, setLoginError] = useState("");
  async function signIn() {
    setBusy(true);
    setLoginError("");
    try {
      await login();
    } catch (e) {
      const code = (e as { code?: string }).code;
      setLoginError(
        code === "auth/popup-closed-by-user"
          ? "登入視窗已關閉，可以再試一次。"
          : code === "auth/unauthorized-domain"
            ? "網站登入網址尚未授權。"
            : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="fl-landing">
      <figure className="fl-landing-art">
        <img
          src="/fish/landing-coast.webp"
          alt="夕陽下的海邊，浪花輕輕拍打沙灘"
          fetchPriority="high"
          decoding="async"
        />
        <figcaption>DIFFERENT WATERS. SAME OBSESSION.</figcaption>
      </figure>
      <section className="fl-login-widget" aria-label="Google 登入">
        <span className="fl-login-label">MY WATERS, MY CATCHES.</span>
        <h1>
          Every catch.
          <br />A little story<span>.</span>
        </h1>
        <p className="fl-login-slogan">每一次出海，都值得記低。</p>
        <button
          className="fl-google-login"
          disabled={busy || loading || !config?.firebase}
          onClick={() => void signIn()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
            <path
              fill="#4285F4"
              d="M22 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.6a4.8 4.8 0 0 1-2.1 3.2v2.7h3.5c2-1.8 3-4.4 3-7.8Z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.8 0 5.1-.9 7-2.4l-3.5-2.7c-.9.6-2.1.9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.6v2.8A10.5 10.5 0 0 0 12 22Z"
            />
            <path
              fill="#FBBC05"
              d="M6.2 13.5a6.3 6.3 0 0 1 0-3V7.7H2.6a10 10 0 0 0 0 8.6l3.6-2.8Z"
            />
            <path
              fill="#EA4335"
              d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 12 2a10.5 10.5 0 0 0-9.4 5.7l3.6 2.8C7 8 9.3 6.2 12 6.2Z"
            />
          </svg>
          {loading
            ? "準備登入…"
            : busy
              ? "正在連接 Google…"
              : "Continue with Google"}
        </button>
        <p className="fl-login-note">登入後，收藏你自己的魚種與釣魚紀錄。</p>
        {!loading && !config?.firebase && (
          <p className="fl-login-error" role="status">
            Google 登入設定中，請稍後再試。
          </p>
        )}
        {(loginError || error) && (
          <p className="fl-login-error" role="alert">
            {loginError || error}
          </p>
        )}
      </section>
    </main>
  );
}
