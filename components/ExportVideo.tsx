"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Config } from "@/lib/config";
import { LoopMode, VideoFormat, VideoSupport, estimateBytes, recordFallback, renderVideo, videoSupport } from "@/lib/video";

const SIZES = [
  { id: "1080p", label: "1080p · 1920 × 1080", w: 1920, h: 1080 },
  { id: "1440p", label: "1440p · 2560 × 1440", w: 2560, h: 1440 },
  { id: "4k", label: "4K · 3840 × 2160", w: 3840, h: 2160 },
  { id: "square", label: "Square · 1080 × 1080", w: 1080, h: 1080 },
  { id: "story", label: "Vertical · 1080 × 1920", w: 1080, h: 1920 },
  { id: "stage", label: "Stage size", w: 0, h: 0 },
];

interface Props {
  open: boolean;
  initialFormat: VideoFormat;
  config: Config;
  stageCanvas: () => HTMLCanvasElement | null;
  onClose: () => void;
  onDone: (blob: Blob, ext: string) => void;
  onError: (msg: string) => void;
}

function fmtBytes(b: number) { return b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : Math.round(b / 1e6) + " MB"; }

export function ExportVideo(p: Props) {
  const [format, setFormat] = useState<VideoFormat>(p.initialFormat);
  const [size, setSize] = useState("1080p");
  const [fps, setFps] = useState(60);
  const [seconds, setSeconds] = useState(p.config.period);
  const [repeats, setRepeats] = useState(1);
  const [loop, setLoop] = useState<LoopMode>("crossfade");
  const [quality, setQuality] = useState<"good" | "high">("good");
  const [support, setSupport] = useState<VideoSupport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { if (p.open) { setFormat(p.initialFormat); setProgress(0); } }, [p.open, p.initialFormat]);
  useEffect(() => { if (p.open) videoSupport().then(setSupport); }, [p.open]);
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) p.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, busy, p]);

  const dims = useMemo(() => {
    const s = SIZES.find((x) => x.id === size)!;
    if (s.w) return { w: s.w, h: s.h };
    const c = p.stageCanvas();
    return c ? { w: c.width & ~1, h: c.height & ~1 } : { w: 1920, h: 1080 };
  }, [size, p, p.open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p.open) return null;

  const period = p.config.period;
  const runPeriod = p.config.runSpeed > 0 ? 4 / p.config.runSpeed : 0;
  const morphCycle = p.config.morphSeconds * 2;
  const est = estimateBytes({ width: dims.w, height: dims.h, fps, seconds, repeats, quality });
  const noWebcodecs = support && !support.webcodecs;
  const formatOk = !support || (format === "mp4" ? support.mp4 : support.webm);

  const start = async () => {
    setBusy(true); setProgress(0);
    const ac = new AbortController(); abort.current = ac;
    try {
      let blob: Blob, ext = format;
      if (noWebcodecs) {
        const c = p.stageCanvas();
        if (!c) throw new Error("Stage not ready");
        blob = await recordFallback(c, seconds * repeats, setProgress, ac.signal);
        ext = "webm";
      } else {
        blob = await renderVideo({ format, width: dims.w, height: dims.h, fps, seconds, repeats, loop, quality, config: p.config }, setProgress, ac.signal);
      }
      p.onDone(blob, ext);
    } catch (e) {
      if ((e as Error).name !== "AbortError") p.onError((e as Error).message);
    } finally {
      setBusy(false); abort.current = null;
    }
  };

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) p.onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ev-title">
        <div className="modal-head">
          <b id="ev-title">Export video</b>
          <button className="x" aria-label="Close" onClick={p.onClose} disabled={busy}>×</button>
        </div>

        <div className="seg" role="radiogroup" aria-label="Format">
          {(["mp4", "webm"] as VideoFormat[]).map((f) => (
            <button key={f} role="radio" aria-checked={format === f} className={format === f ? "on" : ""} disabled={busy}
              onClick={() => setFormat(f)}>{f.toUpperCase()}<small>{f === "mp4" ? "H.264" : "VP9"}</small></button>
          ))}
        </div>
        {support && !formatOk && <div className="warn">This browser cannot encode {format.toUpperCase()}. Try the other format.</div>}
        {noWebcodecs && <div className="warn">This browser lacks WebCodecs. The live stage will be recorded in real time as WebM, straight cut, at stage size.</div>}

        <div className="field">
          <label htmlFor="ev-size">Resolution</label>
          <select id="ev-size" value={size} onChange={(e) => setSize(e.target.value)} disabled={busy || !!noWebcodecs}>
            {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="field two">
          <div>
            <label htmlFor="ev-fps">Frame rate</label>
            <select id="ev-fps" value={fps} onChange={(e) => setFps(+e.target.value)} disabled={busy || !!noWebcodecs}>
              <option value={24}>24 fps</option><option value={30}>30 fps</option><option value={60}>60 fps</option>
            </select>
          </div>
          <div>
            <label htmlFor="ev-q">Quality</label>
            <select id="ev-q" value={quality} onChange={(e) => setQuality(e.target.value as "good" | "high")} disabled={busy || !!noWebcodecs}>
              <option value="good">Good</option><option value="high">High bitrate</option>
            </select>
          </div>
        </div>

        <div className="modal-sub">Loop</div>
        <div className="field two">
          <div>
            <label htmlFor="ev-sec">Loop length (s)</label>
            <input id="ev-sec" type="number" min={0.5} max={60} step={0.1} value={seconds} disabled={busy}
              onChange={(e) => setSeconds(Math.min(60, Math.max(0.5, parseFloat(e.target.value) || 0.5)))} />
          </div>
          <div>
            <label htmlFor="ev-rep">Repeats</label>
            <select id="ev-rep" value={repeats} onChange={(e) => setRepeats(+e.target.value)} disabled={busy}>
              {[1, 2, 3, 4, 8].map((n) => <option key={n} value={n}>{n}×</option>)}
            </select>
          </div>
        </div>
        <div className="snap">
          <span>snap to</span>
          <button disabled={busy} onClick={() => setSeconds(+period.toFixed(2))}>period {period.toFixed(2)}s</button>
          <button disabled={busy} onClick={() => setSeconds(+(period * 2).toFixed(2))}>2× period</button>
          {runPeriod > 0 && runPeriod <= 60 && <button disabled={busy} onClick={() => setSeconds(+runPeriod.toFixed(2))}>gradient run {runPeriod.toFixed(2)}s</button>}
          {p.config.morph && p.config.morphTo && morphCycle <= 60 && <button disabled={busy} onClick={() => setSeconds(+morphCycle.toFixed(2))}>morph A→B→A {morphCycle.toFixed(2)}s</button>}
        </div>
        <div className="seg" role="radiogroup" aria-label="Loop mode">
          <button role="radio" aria-checked={loop === "crossfade"} className={loop === "crossfade" ? "on" : ""} disabled={busy || !!noWebcodecs} onClick={() => setLoop("crossfade")}>
            Seamless<small>crossfade into itself</small>
          </button>
          <button role="radio" aria-checked={loop === "cut"} className={loop === "cut" ? "on" : ""} disabled={busy || !!noWebcodecs} onClick={() => setLoop("cut")}>
            Straight cut<small>exact if length = period</small>
          </button>
        </div>
        <div className="hint">
          {loop === "crossfade"
            ? "Any length loops without a visible join: the last frame is blended back into the first."
            : "Trails and pulses repeat every period; the gradient run repeats every 4 ÷ run speed seconds. Use a common multiple for a perfect cut."}
        </div>

        <div className="modal-foot">
          <span className="est">{dims.w} × {dims.h} · {fps} fps · {(seconds * repeats).toFixed(1)}s · ≈ {fmtBytes(est)}</span>
          {busy ? (
            <button className="btn" onClick={() => abort.current?.abort()}>Cancel</button>
          ) : (
            <button className="btn primary" onClick={start} disabled={!formatOk && !noWebcodecs}>Render {format.toUpperCase()}</button>
          )}
        </div>
        {busy && (
          <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
