"use client";
import { ReactNode, useEffect, useState } from "react";

const LS_COLLAPSED = "lightrails.collapsed";

function readCollapsed(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_COLLAPSED) ?? "[]"); } catch { return []; }
}

/* a panel section; clicking the title folds it away, remembered per title */
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const [closed, setClosed] = useState(false);
  useEffect(() => { setClosed(readCollapsed().includes(title)); }, [title]);
  const toggle = () => {
    const next = !closed;
    setClosed(next);
    try {
      const rest = readCollapsed().filter((t) => t !== title);
      localStorage.setItem(LS_COLLAPSED, JSON.stringify(next ? [...rest, title] : rest));
    } catch { /* storage blocked */ }
  };
  return (
    <div className={"section" + (closed ? " folded" : "")}>
      <div className="section-head">
        <button type="button" className="fold" aria-expanded={!closed} onClick={toggle}>
          <span className="caret" aria-hidden>▾</span>{title}
        </button>
        {action && !closed && <span className="section-action">{action}</span>}
      </div>
      {!closed && children}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: () => void;
  onReset?: () => void;
  fmt?: (v: number) => string;
}

export function Slider({ label, value, min, max, step, onChange, onCommit, onReset, fmt }: SliderProps) {
  const shown = fmt ? fmt(value) : step >= 1 ? String(Math.round(value)) : value.toFixed(step < 0.01 ? 3 : 2);
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="row" onDoubleClick={onReset} title={onReset ? "Double-click to reset" : undefined}>
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ "--pct": `${Math.min(100, Math.max(0, pct))}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) onCommit();
        }}
        onBlur={onCommit}
      />
      <span className="val">{shown}</span>
    </div>
  );
}

/* tucks less-used controls away behind a quiet toggle */
export function More({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && children}
      <button type="button" className="more" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Less" : "More"}
      </button>
    </>
  );
}

export function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string; title?: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="row wide">
      <label>{label}</label>
      <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} title={o.title}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="sw" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}
