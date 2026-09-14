"use client";
import { useState } from "react";
import { Config, TEMPLATES, THEMES, Template } from "@/lib/config";
import { Section } from "./Controls";

export interface Preset { name: string; cfg: Config }

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  onTheme: (i: number) => void;
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
  const themeOn = THEMES.findIndex((t) => t.stops.join() === p.config.stops.join() && t.bg === p.config.bg);
  const save = () => {
    const n = name.trim() || `preset ${p.presets.length + 1}`;
    p.onSavePreset(n);
    setName("");
  };
  return (
    <aside className={"pane pane-left" + (p.open ? "" : " closed")} aria-label="Colour and templates" aria-hidden={!p.open}>
      <div className="pane-bar"><b>Colour</b><span className="sp" /><button className="x" title="hide panel (H)" aria-label="Hide colour panel" onClick={p.onClose}>×</button></div>

      <Section title="Theme presets">
        <div className="orbs">
          {THEMES.map((t, i) => (
            <button key={t.name} className={"orb" + (i === themeOn ? " on" : "")} title={t.name} aria-label={t.name}
              style={{ background: t.stopsB ? `linear-gradient(180deg, ${t.stops[0]} 0 50%, ${t.stopsB[0]} 50% 100%)` : swatch(t.stops) }}
              onClick={() => p.onTheme(i)} />
          ))}
        </div>
      </Section>

      <Section title="Templates">
        <div className="chips">
          {TEMPLATES.map((t) => {
            const on = p.config.shape === t.cfg.shape && (!t.cfg.stops || t.cfg.stops.join() === p.config.stops.join());
            return (
              <button key={t.name} className={"chip" + (on ? " on" : "")} title={t.title} onClick={() => p.onTemplate(t)}>
                <span className="swatch" style={{ background: swatch(t.cfg.stops ?? THEMES[0].stops) }} />
                <span className="name">{t.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="My presets">
        <div className="save-row">
          <input type="text" placeholder="name this look" value={name} aria-label="Preset name"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <button className="btn" onClick={save}>Save</button>
        </div>
        {p.presets.length === 0 && <div className="hint">Saved looks live in this browser.</div>}
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
