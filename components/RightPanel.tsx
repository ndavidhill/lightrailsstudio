"use client";
import { Config, Motion, SHAPES } from "@/lib/config";
import { Section, SelectRow, Slider } from "./Controls";

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  set: (patch: Partial<Config>) => void;      // live, uncommitted
  commit: () => void;                          // record an undo step
  apply: (patch: Partial<Config>) => void;    // set + commit
}

type NumKey = { [K in keyof Config]: Config[K] extends number ? K : never }[keyof Config];

export function RightPanel({ open, onClose, config: c, set, commit, apply }: Props) {
  const S = (label: string, key: NumKey, min: number, max: number, step: number, fmt?: (v: number) => string) => (
    <Slider key={key} label={label} value={c[key]} min={min} max={max} step={step} fmt={fmt}
      onChange={(v) => set({ [key]: v } as Partial<Config>)} onCommit={commit} />
  );
  const shape = SHAPES[c.shape];
  const params = (["p1", "p2", "p3"] as const).filter((_, i) => shape.params[i]);

  const setStop = (i: number, v: string, done: boolean) => {
    const stops = c.stops.slice(); stops[i] = v;
    done ? apply({ stops }) : set({ stops });
  };

  return (
    <aside className={"pane pane-right" + (open ? "" : " closed")} aria-label="Rail controls" aria-hidden={!open}>
      <div className="pane-bar"><b>Rails</b><span className="sp" /><button className="x" title="hide panel (H)" aria-label="Hide rails panel" onClick={onClose}>×</button></div>

      <Section title="Shape">
        <SelectRow label="shape" value={String(c.shape)} onChange={(v) => apply({ shape: +v, ...(SHAPES[+v].defaults ?? {}) })}
          options={SHAPES.map((s, i) => ({ value: String(i), label: s.name, title: s.hint }))} />
        <div className="hint">{shape.hint}</div>
        <SelectRow label="motion" value={String(c.motion)} onChange={(v) => apply({ motion: +v as Motion })}
          options={[
            { value: "2", label: "Trails — run in, hold, run out" },
            { value: "1", label: "Solid — always lit, colours loop" },
            { value: "0", label: "Pulse — all rails breathe together" },
          ]} />
        {params.map((k, i) => S(shape.params[(["p1", "p2", "p3"] as const).indexOf(k)], k, 0, 1, 0.01))}
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
      </Section>

      <Section title="Gradient colours">
        <div className="stops">
          {c.stops.map((s, i) => (
            <span className="stop" key={i}>
              <input type="color" value={s} aria-label={`colour stop ${i + 1}`}
                onInput={(e) => setStop(i, (e.target as HTMLInputElement).value, false)}
                onChange={(e) => setStop(i, e.target.value, true)} />
              {c.stops.length > 2 && (
                <button className="rm" title="remove stop" aria-label={`remove stop ${i + 1}`}
                  onClick={() => apply({ stops: c.stops.filter((_, j) => j !== i) })}>×</button>
              )}
            </span>
          ))}
          {c.stops.length < 6 && (
            <button className="add-stop" title="add a colour stop" aria-label="add colour stop"
              onClick={() => apply({ stops: [...c.stops, c.stops[0]] })}>+</button>
          )}
        </div>
        <div className="bg-row">
          <span className="stop">
            <input type="color" value={c.bg} aria-label="background colour"
              onInput={(e) => set({ bg: (e.target as HTMLInputElement).value })}
              onChange={(e) => apply({ bg: e.target.value })} />
          </span>
          <span>background</span>
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
        {S("angle°", "angle", -180, 180, 1)}
        {S("grain", "grain", 0, 0.25, 0.005)}
        {S("gain", "gain", 0.1, 3, 0.01)}
        {S("blur", "blur", 0.02, 0.6, 0.005)}
        {S("glow", "glow", 0, 1.5, 0.01)}
        {S("blow-out", "blow", 0, 1, 0.01)}
        {S("sway", "sway", 0, 0.08, 0.001)}
      </Section>
    </aside>
  );
}
