"use client";
import { useEffect, useState } from "react";
import { Config } from "@/lib/config";
import { Renderer } from "@/lib/renderer";

const SIZES = [
  { id: "stage", label: "Stage size", w: 0, h: 0 },
  { id: "4k", label: "4K · 3840 × 2160", w: 3840, h: 2160 },
  { id: "8k", label: "8K · 7680 × 4320", w: 7680, h: 4320 },
  { id: "a3l", label: "A3 landscape · 300 dpi · 4961 × 3508", w: 4961, h: 3508 },
  { id: "a3p", label: "A3 portrait · 300 dpi · 3508 × 4961", w: 3508, h: 4961 },
  { id: "square", label: "Square · 4096 × 4096", w: 4096, h: 4096 },
  { id: "story", label: "Vertical · 2160 × 3840", w: 2160, h: 3840 },
];

interface Props {
  open: boolean;
  config: Config;
  stage: () => Renderer | null;
  onClose: () => void;
  onDone: (blob: Blob, w: number, h: number) => void;
  onError: (msg: string) => void;
}

/* Renders the current frame off-screen at an exact size, the same way the
   video export does, so print and 8K output are not limited to the stage. */
export function ExportPng(p: Props) {
  const [size, setSize] = useState("4k");
  const [busy, setBusy] = useState(false);
  const [max, setMax] = useState(0);

  useEffect(() => { if (p.open) setMax(p.stage()?.maxSize() ?? 0); }, [p.open, p]);
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) p.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, busy, p]);

  if (!p.open) return null;

  const s = SIZES.find((x) => x.id === size)!;
  const stage = p.stage();
  const want = s.w ? { w: s.w, h: s.h } : { w: stage?.canvas.width ?? 1920, h: stage?.canvas.height ?? 1080 };
  const scale = max ? Math.min(1, max / Math.max(want.w, want.h)) : 1;
  const dims = { w: Math.round(want.w * scale), h: Math.round(want.h * scale) };

  const start = async () => {
    setBusy(true);
    // yield so the busy state paints before the GPU work blocks the thread
    await new Promise((r) => setTimeout(r, 30));
    let r: Renderer | null = null;
    try {
      const t = p.stage()?.now() ?? 0;
      r = new Renderer(document.createElement("canvas"), () => p.config);
      r.setFixedSize(dims.w, dims.h);
      const blob = await r.snapshot(t);
      p.onDone(blob, dims.w, dims.h);
    } catch (e) {
      p.onError((e as Error).message);
    } finally {
      r?.destroy();
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) p.onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ep-title">
        <div className="modal-head">
          <b id="ep-title">Export PNG</b>
          <button className="x" aria-label="Close" onClick={p.onClose} disabled={busy}>×</button>
        </div>
        <div className="field">
          <label htmlFor="ep-size">Size</label>
          <select id="ep-size" value={size} onChange={(e) => setSize(e.target.value)} disabled={busy}>
            {SIZES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        {scale < 1 && (
          <div className="warn">This GPU renders at most {max}px on a side, so this exports at {dims.w} × {dims.h}.</div>
        )}
        <div className="hint">Captures the frame on stage now, at full quality. The pointer effect is left out.</div>
        <div className="modal-foot">
          <span className="est">{dims.w} × {dims.h} · PNG</span>
          <button className="btn primary" onClick={start} disabled={busy}>{busy ? "Rendering…" : "Render PNG"}</button>
        </div>
      </div>
    </div>
  );
}
