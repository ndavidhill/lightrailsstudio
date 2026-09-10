"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void; onReset: () => void;
  onExportPng: () => void; onExportJson: () => void; onImportJson: () => void; onCopyJson: () => void;
  onRandom: () => void;
}

const Icon = {
  undo: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3 3 6l3 3" /><path d="M3 6h6.5a3.5 3.5 0 0 1 0 7H7" /></svg>,
  redo: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10 3 3 3-3 3" /><path d="M13 6H6.5a3.5 3.5 0 0 0 0 7H9" /></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" /><path d="M2.5 2.5v3h3" /></svg>,
  dice: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><circle cx="5.5" cy="5.5" r=".8" fill="currentColor" /><circle cx="10.5" cy="10.5" r=".8" fill="currentColor" /><circle cx="8" cy="8" r=".8" fill="currentColor" /><circle cx="10.5" cy="5.5" r=".8" fill="currentColor" /><circle cx="5.5" cy="10.5" r=".8" fill="currentColor" /></svg>,
};

export function TopBar(p: Props) {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!host.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <header className="topbar">
      <span className="tb-title">Light Rails</span>
      <span className="tb-by">pattern studio</span>
      <div className="tb-group" role="group" aria-label="History">
        <button className="tb-icon" title="Undo (⌘Z)" aria-label="Undo" disabled={!p.canUndo} onClick={p.onUndo}>{Icon.undo}</button>
        <button className="tb-icon" title="Redo (⇧⌘Z)" aria-label="Redo" disabled={!p.canRedo} onClick={p.onRedo}>{Icon.redo}</button>
        <span className="tb-sep" />
        <button className="tb-icon" title="Shuffle shape and theme" aria-label="Shuffle" onClick={p.onRandom}>{Icon.dice}</button>
        <button className="tb-icon warn" title="Reset every control to defaults" aria-label="Reset to defaults" onClick={p.onReset}>{Icon.reset}</button>
      </div>
      <span className="tb-sp" />
      <div className="menu-host" ref={host}>
        <button className="btn primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Export</button>
        {open && (
          <div className="menu" role="menu">
            <button role="menuitem" onClick={run(p.onExportPng)}>PNG <small>current frame</small></button>
            <button role="menuitem" onClick={run(p.onExportJson)}>JSON <small>settings file</small></button>
            <button role="menuitem" onClick={run(p.onCopyJson)}>Copy JSON <small>clipboard</small></button>
            <hr />
            <button role="menuitem" onClick={run(p.onImportJson)}>Import JSON…</button>
          </div>
        )}
      </div>
    </header>
  );
}
