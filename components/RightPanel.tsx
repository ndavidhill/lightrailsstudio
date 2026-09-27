"use client";
import { useEffect, useState } from "react";
import {
  Config, DEFAULTS, FadeSide, MOTIONS, MOTION_PRESETS, MirrorMode, Motion, SHAPES, Split, TEMPLATES, THEMES,
  applyTemplate, morphTarget,
} from "@/lib/config";
import { More, Section, SelectRow, Slider, Switch } from "./Controls";

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  set: (patch: Partial<Config>) => void;      // live, uncommitted
  commit: () => void;                          // record an undo step
  apply: (patch: Partial<Config>) => void;    // set + commit
  onTheme: (i: number) => void;
}

const TABS = ["Shape", "Colour", "Motion", "Look"] as const;
type Tab = (typeof TABS)[number];
const LS_TAB = "lightrails.tab";

type NumKey = { [K in keyof Config]: Config[K] extends number ? K : never }[keyof Config];
const PARAM_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

/* one row of colour stops with add / remove */
function StopRow({ stops, label, set, apply }: {
  stops: string[]; label: string;
  set: (stops: string[]) => void; apply: (stops: string[]) => void;
}) {
  const change = (i: number, v: string, done: boolean) => {
    const next = stops.slice(); next[i] = v;
    done ? apply(next) : set(next);
  };
  return (
    <div className="stops">
      {stops.map((s, i) => (
        <span className="stop" key={i}>
          <input type="color" value={s} aria-label={`${label} stop ${i + 1}`}
            onInput={(e) => change(i, (e.target as HTMLInputElement).value, false)}
            onChange={(e) => change(i, e.target.value, true)} />
          {stops.length > 2 && (
            <button className="rm" title="remove stop" aria-label={`remove ${label} stop ${i + 1}`}
              onClick={() => apply(stops.filter((_, j) => j !== i))}>×</button>
          )}
        </span>
      ))}
      {stops.length < 6 && (
        <button className="add-stop" title="add a colour stop" aria-label={`add ${label} stop`}
          onClick={() => apply([...stops, stops[0]])}>+</button>
      )}
    </div>
  );
}

export function RightPanel({ open, onClose, config: c, set, commit, apply, onTheme }: Props) {
  const [tab, setTab] = useState<Tab>("Shape");
  useEffect(() => {
    try { const t = localStorage.getItem(LS_TAB) as Tab | null; if (t && TABS.includes(t)) setTab(t); } catch {}
  }, []);
  const pick = (t: Tab) => { setTab(t); try { localStorage.setItem(LS_TAB, t); } catch {} };

  const shape = SHAPES[c.shape];
  // double-click a slider to reset it; shape parameters reset to the shape's own defaults
  const S = (label: string, key: NumKey, min: number, max: number, step: number, fmt?: (v: number) => string) => (
    <Slider key={key} label={label} value={c[key]} min={min} max={max} step={step} fmt={fmt}
      onChange={(v) => set({ [key]: v } as Partial<Config>)} onCommit={commit}
      onReset={() => apply({ [key]: (shape.defaults?.[key] as number | undefined) ?? DEFAULTS[key] } as Partial<Config>)} />
  );
  const morphB = c.morphTo ? { ...c, ...c.morphTo } as Config : null;
  const params = PARAM_KEYS.map((k, i) => [k, shape.params[i] ?? ""] as const).filter(([, label]) => label);
  const themeOn = THEMES.findIndex((t) => t.stops.join() === c.stops.join() && t.bg === c.bg);

  return (
    <aside className={"pane pane-right" + (open ? "" : " closed")} aria-label="Controls" aria-hidden={!open}>
      <div className="pane-bar">
        <div className="tabs" role="tablist" aria-label="Control groups">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => pick(t)}>{t}</button>
          ))}
        </div>
        <button className="x" title="Hide panel (H)" aria-label="Hide controls" onClick={onClose}>×</button>
      </div>

      {tab === "Shape" && (
        <>
          <Section title="Shape">
            <SelectRow label="shape" value={String(c.shape)} onChange={(v) => apply({ shape: +v, ...(SHAPES[+v].defaults ?? {}) })}
              options={SHAPES.map((s, i) => ({ value: String(i), label: s.name, title: s.hint }))} />
            <div className="hint">{shape.hint}</div>
            {params.map(([k, label]) => S(label, k, 0, 1, 0.01))}
          </Section>
          <Section title="Lines">
            {S("count", "lines", 1, 30, 0.05, (v) => v.toFixed(1))}
            {S("width", "width", 0.12, 1, 0.01)}
            {S("fold", "fold", 0, 1, 0.01)}
            <More>
              {S("core heat", "heat", 0, 1, 0.01)}
              {S("outer edge", "edge", 0.2, 2, 0.01)}
              {S("hollow", "hollow", 0, 1, 0.01)}
              {S("centre seam", "seam", 0, 1, 0.01)}
              {S("seam width", "seamWidth", 0.005, 0.3, 0.001)}
            </More>
          </Section>
          <Section title="Mirror" action={<Switch on={c.mirror} label="Mirror: reflect the pattern across the seam" onChange={(v) => apply({ mirror: v })} />}>
            {c.mirror ? (
              <>
                <SelectRow label="reflect" value={String(c.mirrorMode)} onChange={(v) => apply({ mirrorMode: +v as MirrorMode })}
                  options={[
                    { value: "0", label: "Top onto bottom" },
                    { value: "1", label: "Bottom onto top" },
                    { value: "2", label: "Four-way" },
                  ]} />
                {S("seam", "seamY", 0.18, 0.82, 0.005)}
                {S("crease", "crease", 0, 1, 0.01)}
                {c.crease > 0 && S("crease width", "creaseWidth", 0.001, 0.03, 0.0005)}
              </>
            ) : <div className="hint">Reflect the pattern across the seam.</div>}
          </Section>
        </>
      )}

      {tab === "Colour" && (
        <>
          <Section title="Theme">
            <div className="orbs">
              {THEMES.map((t, i) => (
                <button key={t.name} className={"orb" + (i === themeOn ? " on" : "")} title={t.name} aria-label={t.name}
                  style={{ background: t.stopsB ? `linear-gradient(180deg, ${t.stops[0]} 0 50%, ${t.stopsB[0]} 50% 100%)` : `linear-gradient(135deg, ${t.stops.join(", ")})` }}
                  onClick={() => onTheme(i)} />
              ))}
            </div>
          </Section>
          <Section title="Gradient">
            {c.halves && <div className="pack-label">Above the seam</div>}
            <StopRow stops={c.stops} label="pack A" set={(stops) => set({ stops })} apply={(stops) => apply({ stops })} />
            <div className="bg-row">
              <span className="stop">
                <input type="color" value={c.bg} aria-label="background colour"
                  onInput={(e) => set({ bg: (e.target as HTMLInputElement).value })}
                  onChange={(e) => apply({ bg: e.target.value })} />
              </span>
              <span>Background</span>
            </div>
          </Section>
          <Section title="Halves" action={<Switch on={c.halves} label="Colour halves: one gradient above the seam, another below" onChange={(v) => apply({ halves: v })} />}>
            {c.halves ? (
              <>
                <div className="pack-label">Below the seam</div>
                <StopRow stops={c.stopsB} label="pack B" set={(stopsB) => set({ stopsB })} apply={(stopsB) => apply({ stopsB })} />
                <SelectRow label="split" value={String(c.split)} onChange={(v) => apply({ split: +v as Split })}
                  options={[
                    { value: "0", label: "Hard seam" },
                    { value: "1", label: "Interleave" },
                    { value: "2", label: "Gradient" },
                    { value: "3", label: "Mono" },
                  ]} />
                {c.split === 1 || c.split === 2 ? S(c.split === 1 ? "bind depth" : "blend", "splitDepth", 0, 1, 0.01) : null}
                {S("seam", "seamY", 0.18, 0.82, 0.005)}
              </>
            ) : <div className="hint">A second gradient below the seam.</div>}
          </Section>
          <Section title="Run">
            {S("speed", "runSpeed", 0, 4, 0.01)}
            {S("stretch", "runStretch", 0.05, 3, 0.01)}
            <More>
              {S("spread", "runSpread", 0, 4, 0.01)}
              {S("jitter", "runJitter", 0, 2, 0.01)}
            </More>
          </Section>
        </>
      )}

      {tab === "Motion" && (
        <>
          <Section title="Motion">
            <div className="mini-chips" role="group" aria-label="Motion presets">
              {MOTION_PRESETS.map((m) => (
                <button key={m.name} className={"mini-chip" + (m.cfg.motion === c.motion ? " on" : "")}
                  title={`${m.name}: sets motion and timing`} onClick={() => apply(m.cfg)}>{m.name}</button>
              ))}
            </div>
            <SelectRow label="mode" value={String(c.motion)} onChange={(v) => apply({ motion: +v as Motion })}
              options={MOTIONS.map((m) => ({ value: String(m.value), label: m.label.split(" — ")[0], title: m.label }))} />
            {S("period", "period", 0.4, 12, 0.01, (v) => v.toFixed(1) + "s")}
            {S("lifetime", "life", 0.05, 1, 0.005)}
            {c.motion === 2 && S("hold", "trailHold", 0, 1, 0.01)}
          </Section>
          <Section title="Morph" action={<Switch on={c.morph} label="Morph between this look (A) and look B" onChange={(v) => apply({ morph: v, ...(v && !c.morphTo ? { morphTo: morphTarget(c) } : {}) })} />}>
            <div className="morph-b">
              <span className="swatch-inline" style={{ background: morphB ? `linear-gradient(90deg, ${morphB.stops.join(", ")})` : "var(--field)" }} />
              <span>{morphB ? <>B · {SHAPES[morphB.shape].name}</> : "No B yet"}</span>
            </div>
            <div className="btn-row">
              <button className="btn" onClick={() => apply({ morphTo: morphTarget(c) })} title="Store the current look as B">Set B</button>
              {morphB && (
                <button className="btn" title="Swap A and B"
                  onClick={() => apply({ ...morphB, morph: c.morph, morphSeconds: c.morphSeconds, morphHold: c.morphHold, morphTo: morphTarget(c) })}>Swap</button>
              )}
              <select className="btn-select" aria-label="B from" value="" onChange={(e) => e.target.value && apply({ morphTo: morphTarget(applyTemplate(c, TEMPLATES[+e.target.value].cfg)) })}>
                <option value="">From template…</option>
                {TEMPLATES.map((t, i) => <option key={t.name} value={String(i)} title={t.title}>{t.name}</option>)}
              </select>
            </div>
            {c.morph && (
              <>
                {S("duration", "morphSeconds", 0.5, 20, 0.1, (v) => v.toFixed(1) + "s")}
                {S("hold", "morphHold", 0, 0.9, 0.01)}
              </>
            )}
          </Section>
          <Section title="Pointer">
            {S("strength", "pointer", 0, 1, 0.01)}
            {c.pointer > 0 && S("radius", "pointerRadius", 0.1, 1.2, 0.01)}
          </Section>
        </>
      )}

      {tab === "Look" && (
        <>
          <Section title="Light">
            {S("paint", "paint", 0, 1, 0.01)}
            {S("glow", "glow", 0, 1.5, 0.01)}
            {S("bloom", "bloom", 0, 2, 0.01)}
            {c.bloom > 0 && S("bloom size", "bloomRadius", 0.3, 3, 0.01)}
            <More>
              {S("gain", "gain", 0.1, 3, 0.01)}
              {S("blow-out", "blow", 0, 1, 0.01)}
              {S("blur", "blur", 0.02, 0.6, 0.005)}
              {c.bloom > 0 && S("threshold", "bloomThreshold", 0, 1, 0.01)}
              {S("grain", "grain", 0, 0.25, 0.005)}
            </More>
          </Section>
          <Section title="Camera">
            {S("angle", "angle", -180, 180, 1, (v) => Math.round(v) + "°")}
            {S("tilt", "tilt", -70, 70, 1, (v) => Math.round(v) + "°")}
            {c.tilt !== 0 && S("depth", "depth", 0, 1, 0.01)}
            {S("sway", "sway", 0, 0.08, 0.001)}
          </Section>
          <Section title="Frame">
            {S("slices", "slices", 0, 16, 1)}
            {c.slices >= 1 && S("slice shift", "sliceShift", 0, 1, 0.01)}
            {S("edge fade", "fade", 0, 1, 0.01)}
            {c.fade > 0 && (
              <SelectRow label="from" value={String(c.fadeSide)} onChange={(v) => apply({ fadeSide: +v as FadeSide })}
                options={[
                  { value: "0", label: "Left" },
                  { value: "1", label: "Right" },
                  { value: "2", label: "Both sides" },
                  { value: "3", label: "Vignette" },
                ]} />
            )}
          </Section>
        </>
      )}
    </aside>
  );
}
