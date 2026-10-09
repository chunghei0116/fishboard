"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type Task = { message: string; priority: number };
const LoadingContext = createContext<
  ((id: string, task: Task | null) => void) | null
>(null);
export function useLoading(active: boolean, message: string, priority = 1) {
  const register = useContext(LoadingContext);
  const id = useId();
  useEffect(() => {
    if (!register || !active) return;
    register(id, { message, priority });
    return () => register(id, null);
  }, [active, message, priority, id, register]);
}
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Map<string, Task>>(() => new Map());
  const register = useCallback((id: string, task: Task | null) => {
    setTasks((previous) => {
      const next = new Map(previous);
      if (task) next.set(id, task);
      else next.delete(id);
      return next;
    });
  }, []);
  const current = useMemo(
    () => [...tasks.values()].sort((a, b) => b.priority - a.priority)[0],
    [tasks],
  );
  return (
    <LoadingContext.Provider value={register}>
      {children}
      <LoadingDialog message={current?.message} />
    </LoadingContext.Provider>
  );
}
export function LoadingDialog({ message }: { message?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (message && !element?.open) {
      element?.showModal();
      status.current?.focus({ preventScroll: true });
    } else if (!message && element?.open) element.close();
  }, [message]);
  useEffect(() => {
    const element = dialog.current;
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="fl-loading-dialog"
      aria-label="處理中"
      onCancel={(event) => event.preventDefault()}
    >
      <div
        className="fl-save-popup"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        ref={status}
      >
        <div className="fl-saving-water" aria-hidden="true">
          <i />
          <i />
          <i />
          <svg
            className="fl-saving-fish"
            viewBox="0 0 120 64"
            shapeRendering="crispEdges"
          >
            <path
              d="M24 24H36V16H52V12H76V16H92V24H104V40H92V48H76V52H52V48H36V40H24L8 52V12Z"
              fill="#278de5"
            />
            <path d="M40 36H92V44H76V48H52V44H40Z" fill="#badcef" />
            <path d="M52 12V4H76V12M52 52V60H76V52" fill="#d9e9f0" />
            <path d="M72 28H84V40H72Z" fill="#1673bc" />
            <rect x="88" y="24" width="8" height="8" fill="#191919" />
            <rect x="88" y="24" width="3" height="3" fill="#fff" />
          </svg>
        </div>
        <h3>{message || "處理中…"}</h3>
        <p>魚仔游一陣，請稍候。</p>
      </div>
    </dialog>
  );
}
