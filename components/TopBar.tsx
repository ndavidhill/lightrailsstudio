"use client";
import { useEffect, useRef, useState } from "react";

export interface Locks { shape: boolean; colour: boolean; motion: boolean; look: boolean }

interface Props {
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void; onReset: () => void;
  onExportPng: () => void; onExportPngHiRes: () => void;
  onExportJson: () => void; onImportJson: () => void; onCopyJson: () => void;
  onCopyShare: () => void; onCopyEmbed: () => void;
  onRandom: () => void;
  locks: Locks; onLocks: (l: Locks) => void;
  onExportVideo: (format: "mp4" | "webm") => void;
}

const LOCK_LABELS: [keyof Locks, string][] = [["shape", "Shape"], ["colour", "Colour"], ["motion", "Motion"], ["look", "Look"]];

/* a menu that closes on an outside click */
function useMenu() {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!host.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return { open, setOpen, host };
}

const Icon = {
  undo: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3 3 6l3 3" /><path d="M3 6h6.5a3.5 3.5 0 0 1 0 7H7" /></svg>,
  redo: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10 3 3 3-3 3" /><path d="M13 6H6.5a3.5 3.5 0 0 0 0 7H9" /></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" /><path d="M2.5 2.5v3h3" /></svg>,
  lock: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>,
  dice: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><circle cx="5.5" cy="5.5" r=".8" fill="currentColor" /><circle cx="10.5" cy="10.5" r=".8" fill="currentColor" /><circle cx="8" cy="8" r=".8" fill="currentColor" /><circle cx="10.5" cy="5.5" r=".8" fill="currentColor" /><circle cx="5.5" cy="10.5" r=".8" fill="currentColor" /></svg>,
};

export function TopBar(p: Props) {
  const { open, setOpen, host } = useMenu();
  const lock = useMenu();
  const locked = LOCK_LABELS.filter(([k]) => p.locks[k]).length;
  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <header className="topbar">
      <span className="tb-title">Light Rails</span>
      <span className="tb-by">pattern studio</span>
      <div className="tb-group" role="group" aria-label="History">
        <button className="tb-icon" title="Undo (⌘Z)" aria-label="Undo" disabled={!p.canUndo} onClick={p.onUndo}>{Icon.undo}</button>
        <button className="tb-icon" title="Redo (⇧⌘Z)" aria-label="Redo" disabled={!p.canRedo} onClick={p.onRedo}>{Icon.redo}</button>
        <span className="tb-sep" />
        <button className="tb-icon" title="Shuffle everything that is not locked" aria-label="Shuffle" onClick={p.onRandom}>{Icon.dice}</button>
        <div className="menu-host" ref={lock.host}>
          <button className={"tb-caret" + (locked ? " on" : "")} title="Shuffle locks" aria-label="Shuffle locks" aria-haspopup="menu" aria-expanded={lock.open}
            onClick={() => lock.setOpen((o) => !o)}>{locked ? <>{Icon.lock}{locked}</> : "▾"}</button>
          {lock.open && (
            <div className="menu menu-left" role="menu" aria-label="Keep these when shuffling">
              <div className="menu-title">Keep when shuffling</div>
              {LOCK_LABELS.map(([k, label]) => (
                <label key={k} className="menu-check">
                  <input type="checkbox" checked={p.locks[k]} onChange={(e) => p.onLocks({ ...p.locks, [k]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className="tb-icon warn" title="Reset every control to defaults" aria-label="Reset to defaults" onClick={p.onReset}>{Icon.reset}</button>
      </div>
      <span className="tb-sp" />
      <div className="menu-host" ref={host}>
        <button className="btn primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Export</button>
        {open && (
          <div className="menu" role="menu">
            <button role="menuitem" onClick={run(p.onExportPng)}>PNG <small>current frame</small></button>
            <button role="menuitem" onClick={run(p.onExportPngHiRes)}>PNG hi-res… <small>4K, 8K, print</small></button>
            <button role="menuitem" onClick={run(() => p.onExportVideo("mp4"))}>MP4 video <small>loop, H.264</small></button>
            <button role="menuitem" onClick={run(() => p.onExportVideo("webm"))}>WebM video <small>loop, VP9</small></button>
            <hr />
            <button role="menuitem" onClick={run(p.onExportJson)}>JSON <small>settings file</small></button>
            <button role="menuitem" onClick={run(p.onCopyJson)}>Copy JSON <small>clipboard</small></button>
            <hr />
            <button role="menuitem" onClick={run(p.onImportJson)}>Import JSON…</button>
            <hr />
            <button role="menuitem" onClick={run(p.onCopyShare)}>Copy share link <small>opens this look</small></button>
            <button role="menuitem" onClick={run(p.onCopyEmbed)}>Copy embed code <small>live iframe</small></button>
          </div>
        )}
      </div>
    </header>
  );
}
