"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Config, DEFAULTS, MOTION_PRESETS, SCENES, SHAPES, TEMPLATES, THEMES, Template,
  applyTemplate, cloneConfig, coerceConfig, isLight,
} from "@/lib/config";
import { configFromHash, embedCode, shareUrl } from "@/lib/share";
import { Renderer } from "@/lib/renderer";
import { useHistory } from "@/lib/useHistory";
import { Stage } from "./Stage";
import { Locks, TopBar } from "./TopBar";
import { ExportPng } from "./ExportPng";
import { LeftPanel, Preset } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { SceneBar } from "./SceneBar";
import { SceneOverlay } from "./SceneOverlay";
import { Toast, useToast } from "./Toast";
import { ExportVideo } from "./ExportVideo";
import { VideoFormat } from "@/lib/video";

const LS_CFG = "lightrails.config";
const LS_PRESETS = "lightrails.presets";
const LS_PANELS = "lightrails.panels";
const LS_LOCKS = "lightrails.locks";
const NO_LOCKS: Locks = { shape: false, colour: false, motion: false, look: false };

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Studio() {
  const { config, set, commit, apply, undo, redo, canUndo, canRedo } = useHistory(DEFAULTS);
  const cfgRef = useRef<Config>(config);
  cfgRef.current = config;
  const rendererRef = useRef<Renderer | null>(null);
  const { toast, show } = useToast();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [scene, setScene] = useState("pattern");
  const [uiOn, setUiOn] = useState(true);
  const [reel, setReel] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [presets, setPresets] = useState<Preset[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<VideoFormat | null>(null);
  const [pngOpen, setPngOpen] = useState(false);
  const [locks, setLocks] = useState<Locks>(NO_LOCKS);

  /* ---- persistence ---- */
  useEffect(() => {
    try {
      // a shared link wins over the look saved in this browser; the hash is
      // then cleared so a reload keeps later edits
      const shared = configFromHash(window.location.hash);
      if (shared) {
        set(shared);
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        const raw = localStorage.getItem(LS_CFG);
        const c = raw ? coerceConfig(JSON.parse(raw)) : null;
        if (c) set(c);
      }
      const lk = localStorage.getItem(LS_LOCKS);
      if (lk) setLocks({ ...NO_LOCKS, ...JSON.parse(lk) });
      const pr = localStorage.getItem(LS_PRESETS);
      if (pr) setPresets(JSON.parse(pr));
      const pa = localStorage.getItem(LS_PANELS);
      if (pa) { const o = JSON.parse(pa); setLeftOpen(!!o.l); setRightOpen(!!o.r); }
    } catch { /* fresh start */ }
  }, [set]);
  useEffect(() => {
    const id = window.setTimeout(() => { try { localStorage.setItem(LS_CFG, JSON.stringify(config)); } catch {} }, 250);
    return () => window.clearTimeout(id);
  }, [config]);
  useEffect(() => { try { localStorage.setItem(LS_PANELS, JSON.stringify({ l: leftOpen, r: rightOpen })); } catch {} }, [leftOpen, rightOpen]);
  const saveLocks = (next: Locks) => {
    setLocks(next);
    try { localStorage.setItem(LS_LOCKS, JSON.stringify(next)); } catch {}
  };
  const savePresets = (next: Preset[]) => {
    setPresets(next);
    try { localStorage.setItem(LS_PRESETS, JSON.stringify(next)); } catch {}
  };

  /* ---- config helpers ---- */
  const patch = useCallback((p: Partial<Config>) => set((c) => ({ ...c, ...p })), [set]);
  const commitNow = useCallback(() => commit(cfgRef.current), [commit]);
  const applyPatch = useCallback((p: Partial<Config>) => apply({ ...cfgRef.current, ...p }), [apply]);
  const useTemplate = useCallback((t: Template) => apply(applyTemplate(cfgRef.current, t.cfg)), [apply]);
  const useTheme = (i: number) => {
    const th = THEMES[i];
    applyPatch({ stops: th.stops.slice(), bg: th.bg, ...(th.stopsB ? { stopsB: th.stopsB.slice() } : {}) });
  };
  const reset = () => { apply(cloneConfig(DEFAULTS)); show({ kind: "ok", title: "Reset to defaults" }); };
  const shuffle = () => {
    const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    let patch: Partial<Config> = {};
    if (!locks.shape) patch = {
      ...patch,
      shape: Math.floor(Math.random() * SHAPES.length),
      p1: Math.random(), p2: Math.random(), p3: Math.random(),
      p4: Math.random(), p5: Math.random(), p6: Math.random(),
      lines: 6 + Math.round(Math.random() * 18),
    };
    if (!locks.colour) {
      const th = pick(THEMES);
      patch = { ...patch, stops: th.stops.slice(), bg: th.bg, ...(th.stopsB ? { stopsB: th.stopsB.slice() } : {}) };
    }
    if (!locks.motion) patch = { ...patch, ...pick(MOTION_PRESETS).cfg };
    if (!locks.look) patch = {
      ...patch,
      angle: Math.random() < 0.5 ? 0 : Math.round((Math.random() - 0.5) * 90),
      mirror: Math.random() < 0.3,
      fold: Math.random() < 0.35 ? Math.round(Math.random() * 80) / 100 : 0,
    };
    if (!Object.keys(patch).length) return show({ kind: "err", title: "Everything is locked", sub: "Unlock a group to shuffle it" });
    applyPatch(patch);
  };

  /* ---- export ---- */
  const exportPng = async () => {
    const r = rendererRef.current;
    if (!r) return show({ kind: "err", title: "Renderer not ready" });
    show({ kind: "busy", title: "Rendering PNG…" });
    try {
      const blob = await r.snapshot();
      download(blob, `light-rails-${stamp()}.png`);
      show({ kind: "ok", title: "PNG saved", sub: `${r.canvas.width} × ${r.canvas.height}` });
    } catch (e) { show({ kind: "err", title: "Export failed", sub: (e as Error).message }); }
  };
  const exportJson = () => {
    download(new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }), `light-rails-${stamp()}.json`);
    show({ kind: "ok", title: "JSON saved" });
  };
  const copyJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(config, null, 2)); show({ kind: "ok", title: "Settings copied" }); }
    catch { show({ kind: "err", title: "Clipboard blocked" }); }
  };
  const importJson = () => fileRef.current?.click();
  const copyText = async (text: string, title: string, sub?: string) => {
    try { await navigator.clipboard.writeText(text); show({ kind: "ok", title, sub }); }
    catch { show({ kind: "err", title: "Clipboard blocked" }); }
  };
  const copyShare = () => copyText(shareUrl(config, window.location.pathname), "Share link copied", "Opens this exact look");
  const copyEmbed = () => copyText(embedCode(config), "Embed code copied", "Needs the studio to be deployed to load elsewhere");
  const onVideoDone = (blob: Blob, ext: string) => {
    download(blob, `light-rails-${stamp()}.${ext}`);
    setVideo(null);
    show({ kind: "ok", title: `${ext.toUpperCase()} saved`, sub: `${(blob.size / 1e6).toFixed(1)} MB` });
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const c = coerceConfig(JSON.parse(await f.text()));
      if (!c) throw new Error("not a settings file");
      apply(c); show({ kind: "ok", title: "Settings loaded", sub: f.name });
    } catch (e) { show({ kind: "err", title: "Import failed", sub: (e as Error).message }); }
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ---- showreel: cycle mockups, each with a fresh template ---- */
  const reelBase = useRef<Config | null>(null);
  useEffect(() => {
    if (!reel) return;
    reelBase.current = cloneConfig(cfgRef.current);
    const order = SCENES.filter((s) => s.id !== "pattern");
    let i = 0, timer = 0;
    const step = () => {
      const s = order[i % order.length];
      const t = TEMPLATES[i % TEMPLATES.length];
      setScene(s.id); setUiOn(true); setSceneKey((k) => k + 1);
      set(applyTemplate(cfgRef.current, t.cfg));
      i++;
      timer = window.setTimeout(step, s.hold);
    };
    step();
    return () => {
      window.clearTimeout(timer);
      if (reelBase.current) set(reelBase.current);
    };
  }, [reel, set]);

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.key.toLowerCase() === "h") {
        const both = leftOpen || rightOpen;
        setLeftOpen(!both); setRightOpen(!both);
      }
      else if (e.key === " ") { e.preventDefault(); setReel((r) => !r); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, leftOpen, rightOpen]);

  return (
    <div className="studio" data-left={leftOpen ? "open" : "closed"} data-right={rightOpen ? "open" : "closed"}>
      <TopBar
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} onReset={reset} onRandom={shuffle}
        onExportPng={exportPng} onExportPngHiRes={() => setPngOpen(true)}
        onExportJson={exportJson} onImportJson={importJson} onCopyJson={copyJson}
        onCopyShare={copyShare} onCopyEmbed={copyEmbed}
        locks={locks} onLocks={saveLocks}
        onExportVideo={(f) => setVideo(f)}
      />
      <ExportVideo
        open={video !== null} initialFormat={video ?? "mp4"} config={config}
        stageCanvas={() => rendererRef.current?.canvas ?? null}
        onClose={() => setVideo(null)} onDone={onVideoDone}
        onError={(m) => show({ kind: "err", title: "Video export failed", sub: m })}
      />
      <ExportPng
        open={pngOpen} config={config} stage={() => rendererRef.current}
        onClose={() => setPngOpen(false)}
        onDone={(blob, w, h) => {
          download(blob, `light-rails-${w}x${h}-${stamp()}.png`);
          setPngOpen(false);
          show({ kind: "ok", title: "PNG saved", sub: `${w} × ${h}` });
        }}
        onError={(m) => show({ kind: "err", title: "PNG export failed", sub: m })}
      />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      <Stage configRef={cfgRef} rendererRef={rendererRef}>
        {uiOn && <SceneOverlay scene={scene} keyId={sceneKey} seamY={config.seamY} light={isLight(config.bg)} />}
      </Stage>

      <LeftPanel
        open={leftOpen} onClose={() => setLeftOpen(false)} config={config}
        onTheme={useTheme} onTemplate={useTemplate}
        presets={presets}
        onSavePreset={(name) => savePresets([...presets, { name, cfg: cloneConfig(config) }])}
        onLoadPreset={(p) => { const c = coerceConfig(p.cfg); if (c) apply(c); }}
        onDeletePreset={(i) => savePresets(presets.filter((_, j) => j !== i))}
      />
      <RightPanel open={rightOpen} onClose={() => setRightOpen(false)} config={config} set={patch} commit={commitNow} apply={applyPatch} />
      {!leftOpen && <button className="reveal reveal-left" title="show panel (H)" onClick={() => setLeftOpen(true)}>Colour</button>}
      {!rightOpen && <button className="reveal reveal-right" title="show panel (H)" onClick={() => setRightOpen(true)}>Rails</button>}

      <SceneBar scene={scene} onScene={(id) => { setScene(id); setSceneKey((k) => k + 1); }} uiOn={uiOn} onUi={setUiOn} reel={reel} onReel={() => setReel((r) => !r)} />
      <Toast toast={toast} />
    </div>
  );
}
