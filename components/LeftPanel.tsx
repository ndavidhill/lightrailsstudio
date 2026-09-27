"use client";
import { useState } from "react";
import { Config, TEMPLATES, THEMES, Template } from "@/lib/config";
import { Section } from "./Controls";

export interface Preset { name: string; cfg: Config }

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  onTemplate: (t: Template) => void;
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (p: Preset) => void;
  onDeletePreset: (i: number) => void;
}

function swatch(stops: string[]) {
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

export function LeftPanel(p: Props) {
  const [name, setName] = useState("");
  const save = () => {
    const n = name.trim() || `preset ${p.presets.length + 1}`;
    p.onSavePreset(n);
    setName("");
  };
  return (
    <aside className={"pane pane-left" + (p.open ? "" : " closed")} aria-label="Library" aria-hidden={!p.open}>
      <div className="pane-bar"><b>Library</b><span className="sp" /><button className="x" title="Hide panel (H)" aria-label="Hide library" onClick={p.onClose}>×</button></div>

      <Section title="Templates">
        <div className="chips">
          {TEMPLATES.map((t) => {
            const on = p.config.shape === t.cfg.shape && (!t.cfg.stops || t.cfg.stops.join() === p.config.stops.join());
            return (
              <button key={t.name} className={"chip" + (on ? " on" : "")} title={t.title} onClick={() => p.onTemplate(t)}>
                <span className="swatch" style={{ background: swatch(t.cfg.stops ?? THEMES[0].stops), boxShadow: `inset 0 0 0 1px rgba(0,0,0,.06), inset 0 -10px 0 ${t.cfg.bg ?? THEMES[0].bg}` }} />
                <span className="name">{t.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="My presets">
        <div className="save-row">
          <input type="text" placeholder="Name this look" value={name} aria-label="Preset name"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <button className="btn" onClick={save}>Save</button>
        </div>
        {p.presets.length === 0 && <div className="hint">Saved in this browser.</div>}
        {p.presets.map((pr, i) => (
          <div className="preset-row" key={pr.name + i}>
            <button className="name" onClick={() => p.onLoadPreset(pr)}>{pr.name}</button>
            <button className="rm" title="Delete preset" aria-label={`Delete ${pr.name}`} onClick={() => p.onDeletePreset(i)}>×</button>
          </div>
        ))}
      </Section>
    </aside>
  );
}
