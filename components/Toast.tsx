"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = { kind: "busy" | "ok" | "err"; title: string; sub?: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number>(0);
  const show = useCallback((t: NonNullable<ToastState>, ms = 2200) => {
    window.clearTimeout(timer.current);
    setToast(t);
    if (t.kind !== "busy") timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className={"toast" + (toast ? " show " + toast.kind : "")} role="status" aria-live="polite">
      {toast && (
        <>
          <div className="tt"><span className="ring" />{toast.title}</div>
          {toast.sub && <div className="sub">{toast.sub}</div>}
        </>
      )}
    </div>
  );
}
