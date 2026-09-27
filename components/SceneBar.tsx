"use client";
import { SCENES } from "@/lib/config";

interface Props {
  scene: string; onScene: (id: string) => void;
  uiOn: boolean; onUi: (v: boolean) => void;
  reel: boolean; onReel: () => void;
}

/* the mockup controls, as a glass pill floating on the stage */
export function SceneBar(p: Props) {
  return (
    <div className="scenebar">
      <div className="sb-card">
        <select aria-label="Mockup" value={p.scene} onChange={(e) => p.onScene(e.target.value)} disabled={p.reel}>
          {SCENES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {p.scene !== "pattern" && (
          <button className={"sb-btn" + (p.uiOn ? " on" : "")} role="switch" aria-checked={p.uiOn}
            title="Show or hide the mockup overlay" onClick={() => p.onUi(!p.uiOn)}>
            {p.uiOn ? "Hide overlay" : "Show overlay"}
          </button>
        )}
        <span className="sb-sep" />
        <button className={"sb-btn" + (p.reel ? "" : " play")} onClick={p.onReel} title="Cycle every mockup with a fresh template (Space)">
          {p.reel ? <><span className="dot" aria-hidden />Stop</> : "Showreel"}
        </button>
      </div>
    </div>
  );
}
