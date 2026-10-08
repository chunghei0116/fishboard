"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useFishLog } from "./provider";
export default function DeleteCatch({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const { data, demo, saveDemo, refresh } = useFishLog();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (demo)
        saveDemo({ ...data, catches: data.catches.filter((c) => c.id !== id) });
      else {
        const response = await fetch(
          `/api/fishlog/catches/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw Error(result.error || "未能刪除紀錄，請重試。");
        await refresh();
      }
      setOpen(false);
      router.replace("/#catch-log");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="fl-delete-catch"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={14} /> 刪除紀錄
      </button>
      <dialog
        ref={dialog}
        className="fl-confirm-dialog"
        onCancel={(event) => {
          if (pending.current) event.preventDefault();
          else setOpen(false);
        }}
        onClose={() => setOpen(false)}
      >
        <span className="fl-confirm-icon">
          <Trash2 size={23} />
        </span>
        <h2>刪除這次漁獲？</h2>
        <p>
          {name} 的這筆紀錄及原相會永久刪除，釣獲次數及水箱會按剩餘紀錄更新。
        </p>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
        <div className="fl-confirm-actions">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            取消
          </button>
          <button
            type="button"
            className="fl-danger"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? "刪除中…" : "永久刪除"}
          </button>
        </div>
      </dialog>
    </>
  );
}
