"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Dataset } from "@/data/types";
import { demoSpecies } from "@/data/species";
import { demoCatches } from "@/data/catches";
import type { Auth, User } from "firebase/auth";
import { createSessionQueue } from "@/lib/session-queue";
const enqueueSession = createSessionQueue();
const fixture: Dataset = { species: demoSpecies, catches: demoCatches };
const storageKey = "fishlog-demo-v3";
function readDemo(): Dataset {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.species) && Array.isArray(parsed.catches))
        return parsed;
    }
  } catch {
    /* Browser storage may be unavailable. */
  }
  return fixture;
}
type Config = {
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
  storageReady: boolean;
  databaseReady: boolean;
  generationReady: boolean;
};
type Context = {
  data: Dataset;
  demo: boolean;
  loading: boolean;
  error: string;
  user: User | null;
  config: Config | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  saveDemo: (data: Dataset) => void;
  resetDemo: () => void;
};
const Context = createContext<Context | null>(null);
export function FishLogProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Dataset>(fixture),
    [demo, setDemo] = useState(true),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [config, setConfig] = useState<Config | null>(null);
  const auth = useRef<Auth | null>(null),
    epoch = useRef(0);
  const refresh = useCallback(async () => {
    const current = epoch.current;
    const response = await fetch("/api/fishlog", { cache: "no-store" });
    const result = (await response.json()) as Dataset & { error?: string };
    if (!response.ok) throw Error(result.error || "未能讀取紀錄");
    if (current === epoch.current) setData(result);
  }, []);
  useEffect(() => {
    let active = true,
      unsubscribe: (() => void) | undefined;
    async function init() {
      try {
        const response = await fetch("/api/config");
        const settings: Config = await response.json();
        if (!active) return;
        setConfig(settings);
        if (!settings.firebase) {
          setData(readDemo());
          setLoading(false);
          return;
        }
        const [
          { initializeApp, getApps },
          { getAuth, onIdTokenChanged, getRedirectResult },
        ] = await Promise.all([
          import("firebase/app"),
          import("firebase/auth"),
        ]);
        auth.current = getAuth(
          getApps()[0] || initializeApp(settings.firebase),
        );
        await getRedirectResult(auth.current);
        unsubscribe = onIdTokenChanged(auth.current, async (next) => {
          const current = ++epoch.current;
          if (!active) return;
          setUser(null);
          setData({ species: [], catches: [] });
          setDemo(!next);
          setLoading(true);
          setError("");
          try {
            if (next) {
              await enqueueSession(async () => {
                if (!active || current !== epoch.current) return;
                const idToken = await next.getIdToken();
                if (!active || current !== epoch.current) return;
                const r = await fetch("/api/auth/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken }),
                });
                if (!r.ok) {
                  const result = await r.json() as { error?: string };
                  throw Error(result.error || "未能連接私人帳戶，請重新登入");
                }
              });
              if (current === epoch.current && active) {
                setUser(next);
                await refresh();
              }
            } else {
              await enqueueSession(async () => {
                if (!active || current !== epoch.current) return;
                const r = await fetch("/api/auth/session", {
                  method: "DELETE",
                });
                if (!r.ok) throw Error("未能清除私人帳戶，請重試");
              });
              if (active && current === epoch.current) setData(readDemo());
            }
          } catch (e) {
            if (active && current === epoch.current)
              setError((e as Error).message);
          } finally {
            if (active && current === epoch.current) setLoading(false);
          }
        });
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      active = false;
      ++epoch.current;
      unsubscribe?.();
    };
  }, [refresh]);
  const login = async () => {
    setError("");
    if (!auth.current) throw Error("Firebase 登入尚未設定");
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
      await import("firebase/auth");
    try {
      await signInWithPopup(auth.current, new GoogleAuthProvider());
    } catch (e) {
      if ((e as { code?: string }).code === "auth/popup-blocked")
        await signInWithRedirect(auth.current, new GoogleAuthProvider());
      else throw e;
    }
  };
  const logout = async () => {
    const current = ++epoch.current;
    setUser(null);
    setData({ species: [], catches: [] });
    await enqueueSession(async () => {
      if (current !== epoch.current) return;
      const r = await fetch("/api/auth/session", { method: "DELETE" });
      if (!r.ok) throw Error("未能登出，請重試");
    });
    if (current !== epoch.current) return;
    if (auth.current)
      await (await import("firebase/auth")).signOut(auth.current);
    if (current === epoch.current) {
      setDemo(true);
      setData(readDemo());
    }
  };
  const saveDemo = (next: Dataset) => {
    if (!demo) throw Error("私人帳戶必須經伺服器儲存");
    localStorage.setItem(storageKey, JSON.stringify(next));
    setData(next);
  };
  const resetDemo = () => {
    localStorage.removeItem(storageKey);
    setData(fixture);
  };
  return (
    <Context.Provider
      value={{
        data,
        demo,
        loading,
        error,
        user,
        config,
        login,
        logout,
        refresh,
        saveDemo,
        resetDemo,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFishLog() {
  const value = useContext(Context);
  if (!value) throw Error("FishLogProvider missing");
  return value;
}
