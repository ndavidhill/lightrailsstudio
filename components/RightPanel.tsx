"use client";
import {
  Config, FadeSide, MOTIONS, MOTION_PRESETS, MirrorMode, Motion, SHAPES, Split, TEMPLATES,
  applyTemplate, morphTarget,
} from "@/lib/config";
import { Section, SelectRow, Slider, Switch } from "./Controls";

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  set: (patch: Partial<Config>) => void;      // live, uncommitted
  commit: () => void;                          // record an undo step
  apply: (patch: Partial<Config>) => void;    // set + commit
}

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

export function RightPanel({ open, onClose, config: c, set, commit, apply }: Props) {
  const S = (label: string, key: NumKey, min: number, max: number, step: number, fmt?: (v: number) => string) => (
    <Slider key={key} label={label} value={c[key]} min={min} max={max} step={step} fmt={fmt}
      onChange={(v) => set({ [key]: v } as Partial<Config>)} onCommit={commit} />
  );
  const shape = SHAPES[c.shape];
  const morphB = c.morphTo ? { ...c, ...c.morphTo } as Config : null;
  const params = PARAM_KEYS.map((k, i) => [k, shape.params[i] ?? ""] as const).filter(([, label]) => label);

  return (
    <aside className={"pane pane-right" + (open ? "" : " closed")} aria-label="Rail controls" aria-hidden={!open}>
      <div className="pane-bar"><b>Rails</b><span className="sp" /><button className="x" title="hide panel (H)" aria-label="Hide rails panel" onClick={onClose}>×</button></div>

      <Section title="Shape">
        <SelectRow label="shape" value={String(c.shape)} onChange={(v) => apply({ shape: +v, ...(SHAPES[+v].defaults ?? {}) })}
          options={SHAPES.map((s, i) => ({ value: String(i), label: s.name, title: s.hint }))} />
        <div className="hint">{shape.hint}</div>
        <SelectRow label="motion" value={String(c.motion)} onChange={(v) => apply({ motion: +v as Motion })}
          options={MOTIONS.map((m) => ({ value: String(m.value), label: m.label }))} />
        <div className="mini-chips" role="group" aria-label="Motion presets">
          {MOTION_PRESETS.map((m) => (
            <button key={m.name} className={"mini-chip" + (m.cfg.motion === c.motion ? " on" : "")}
              title={`${m.name}: sets motion and timing`} onClick={() => apply(m.cfg)}>{m.name}</button>
          ))}
        </div>
        {params.map(([k, label]) => S(label, k, 0, 1, 0.01))}
        {params.length === 0 && <div className="hint">This shape has no extra parameters.</div>}
      </Section>

      <Section title="Lines">
        {S("count", "lines", 1, 30, 0.05, (v) => v.toFixed(1))}
        {S("core heat", "heat", 0, 1, 0.01)}
        {S("stroke width", "width", 0.12, 1, 0.01)}
        {S("outer edge", "edge", 0.2, 2, 0.01)}
        {S("centre seam", "seam", 0, 1, 0.01)}
        {S("seam width", "seamWidth", 0.005, 0.3, 0.001)}
        {S("hollow", "hollow", 0, 1, 0.01)}
        {S("fold", "fold", 0, 1, 0.01)}
      </Section>

      <Section title="Gradient colours"
        action={
          <span className="head-toggles">
            <label className="halves-toggle">mirror <Switch on={c.mirror} label="Mirror: reflect the pattern across the seam" onChange={(v) => apply({ mirror: v })} /></label>
            <label className="halves-toggle">halves <Switch on={c.halves} label="Colour halves: pack A above the seam, pack B below" onChange={(v) => apply({ halves: v })} /></label>
          </span>
        }>
        {c.mirror && (
          <SelectRow label="reflect" value={String(c.mirrorMode)} onChange={(v) => apply({ mirrorMode: +v as MirrorMode })}
            options={[
              { value: "0", label: "Top onto bottom" },
              { value: "1", label: "Bottom onto top" },
              { value: "2", label: "Four-way — seam and centre line" },
            ]} />
        )}
        {c.halves && <div className="pack-label">pack A · above the seam</div>}
        <StopRow stops={c.stops} label="pack A" set={(stops) => set({ stops })} apply={(stops) => apply({ stops })} />
        {c.halves && (
          <>
            <div className="pack-label">pack B · below the seam</div>
            <StopRow stops={c.stopsB} label="pack B" set={(stopsB) => set({ stopsB })} apply={(stopsB) => apply({ stopsB })} />
            <SelectRow label="split" value={String(c.split)} onChange={(v) => apply({ split: +v as Split })}
              options={[
                { value: "0", label: "Seam — hard split at the seam" },
                { value: "1", label: "Interleave — packs bind across the seam" },
                { value: "2", label: "Gradient — cross-fade over the zone" },
                { value: "3", label: "Mono — pack A everywhere" },
              ]} />
            {c.split === 1 || c.split === 2 ? S(c.split === 1 ? "bind depth" : "blend width", "splitDepth", 0, 1, 0.01) : null}
          </>
        )}
        {(c.halves || c.mirror) && (
          <>
            {S("seam position", "seamY", 0.18, 0.82, 0.005)}
            {S("seam crease", "crease", 0, 1, 0.01)}
            {c.crease > 0 && S("crease width", "creaseWidth", 0.001, 0.03, 0.0005)}
          </>
        )}
        <div className="bg-row">
          <span className="stop">
            <input type="color" value={c.bg} aria-label="background colour"
              onInput={(e) => set({ bg: (e.target as HTMLInputElement).value })}
              onChange={(e) => apply({ bg: e.target.value })} />
          </span>
          <span>{c.halves ? "ground" : "background"}</span>
        </div>
      </Section>

      <Section title="Gradient run">
        {S("run speed", "runSpeed", 0, 4, 0.01)}
        {S("run stretch", "runStretch", 0.05, 3, 0.01)}
        {S("run spread", "runSpread", 0, 4, 0.01)}
        {S("run jitter", "runJitter", 0, 2, 0.01)}
        {S("trail hold", "trailHold", 0, 1, 0.01)}
      </Section>

      <Section title="Timing">
        {S("period (s)", "period", 0.4, 12, 0.01)}
        {S("lifetime", "life", 0.05, 1, 0.005)}
      </Section>

      <Section title="Look">
        {S("paint", "paint", 0, 1, 0.01)}
        {S("angle°", "angle", -180, 180, 1)}
        {S("tilt°", "tilt", -70, 70, 1)}
        {c.tilt !== 0 && S("depth", "depth", 0, 1, 0.01)}
        {S("grain", "grain", 0, 0.25, 0.005)}
        {S("gain", "gain", 0.1, 3, 0.01)}
        {S("blur", "blur", 0.02, 0.6, 0.005)}
        {S("glow", "glow", 0, 1.5, 0.01)}
        {S("bloom", "bloom", 0, 2, 0.01)}
        {c.bloom > 0 && (
          <>
            {S("bloom radius", "bloomRadius", 0.3, 3, 0.01)}
            {S("bloom threshold", "bloomThreshold", 0, 1, 0.01)}
          </>
        )}
        {S("blow-out", "blow", 0, 1, 0.01)}
        {S("sway", "sway", 0, 0.08, 0.001)}
        {S("slices", "slices", 0, 16, 1)}
        {c.slices >= 1 && S("slice shift", "sliceShift", 0, 1, 0.01)}
        {S("edge fade", "fade", 0, 1, 0.01)}
        {c.fade > 0 && (
          <SelectRow label="fade from" value={String(c.fadeSide)} onChange={(v) => apply({ fadeSide: +v as FadeSide })}
            options={[
              { value: "0", label: "Left" },
              { value: "1", label: "Right" },
              { value: "2", label: "Both sides" },
              { value: "3", label: "Vignette" },
            ]} />
        )}
      </Section>

      <Section title="Pointer">
        {S("strength", "pointer", 0, 1, 0.01)}
        {c.pointer > 0 && S("radius", "pointerRadius", 0.1, 1.2, 0.01)}
        <div className="hint">Rails bend away from the cursor on the live stage and in embeds. Exports ignore it.</div>
      </Section>

      <Section title="Morph"
        action={<label className="halves-toggle">loop A ⇄ B <Switch on={c.morph} label="Morph between this look (A) and look B" onChange={(v) => apply({ morph: v, ...(v && !c.morphTo ? { morphTo: morphTarget(c) } : {}) })} /></label>}>
        <div className="hint">
          {morphB
            ? <>A is the current look. B: <b>{SHAPES[morphB.shape].name}</b> <span className="swatch-inline" style={{ background: `linear-gradient(90deg, ${morphB.stops.join(", ")})` }} /></>
            : "Capture the current look as B, then change the controls to make A."}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => apply({ morphTo: morphTarget(c) })} title="Store the current look as B">Set B from current</button>
          {morphB && (
            <button className="btn" title="Swap A and B"
              onClick={() => apply({ ...morphB, morph: c.morph, morphSeconds: c.morphSeconds, morphHold: c.morphHold, morphTo: morphTarget(c) })}>Swap A ⇄ B</button>
          )}
        </div>
        <SelectRow label="B from" value="" onChange={(v) => v && apply({ morphTo: morphTarget(applyTemplate(c, TEMPLATES[+v].cfg)) })}
          options={[{ value: "", label: "Template…" }, ...TEMPLATES.map((t, i) => ({ value: String(i), label: t.name, title: t.title }))]} />
        {S("seconds A→B", "morphSeconds", 0.5, 20, 0.1, (v) => v.toFixed(1))}
        {S("hold", "morphHold", 0, 0.9, 0.01)}
      </Section>
    </aside>
  );
}
