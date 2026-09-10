"use client";
import { SCENES } from "@/lib/config";
import { Switch } from "./Controls";

interface Props {
  scene: string; onScene: (id: string) => void;
  uiOn: boolean; onUi: (v: boolean) => void;
  reel: boolean; onReel: () => void;
}

export function SceneBar(p: Props) {
  return (
    <div className="scenebar">
      <div className="sb-card">
        <label htmlFor="scene">Mockup</label>
        <select id="scene" value={p.scene} onChange={(e) => p.onScene(e.target.value)} disabled={p.reel}>
          {SCENES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label htmlFor="ui">UI</label>
        <Switch on={p.uiOn} onChange={p.onUi} label="Show or hide the mockup overlay" />
        <span className="sb-sep" />
        <div className="sb-reel">
          {p.reel && <span className="dot" aria-hidden />}
          <button className={"btn" + (p.reel ? "" : " primary")} onClick={p.onReel} title="Cycle every mockup with a fresh template (Space)">
            {p.reel ? "Stop showreel" : "Play showreel"}
          </button>
        </div>
      </div>
    </div>
  );
}
