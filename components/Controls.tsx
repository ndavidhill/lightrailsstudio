"use client";
import { ReactNode } from "react";

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section">
      <div className="section-head">
        <span>{title}</span>
        {action}
      </div>
      {children}
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
  fmt?: (v: number) => string;
}

export function Slider({ label, value, min, max, step, onChange, onCommit, fmt }: SliderProps) {
  const shown = fmt ? fmt(value) : step >= 1 ? String(Math.round(value)) : value.toFixed(step < 0.01 ? 3 : 2);
  return (
    <div className="row">
      <label title={label}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
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
