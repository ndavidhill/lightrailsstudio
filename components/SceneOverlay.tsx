"use client";

/* Mockup overlays: HTML placed over the live pattern so the same artwork can
   be previewed as a hero, a poster, a device screen and so on. Pointer events
   pass through; the pattern stays interactive underneath. */
interface Props { scene: string; keyId: number; seamY: number; light: boolean }

export function SceneOverlay({ scene, keyId, seamY, light }: Props) {
  if (scene === "pattern") return null;
  return (
    <div className={"overlay fade" + (light ? " on-light" : "")} key={keyId} aria-hidden>
      {scene === "hero" && (
        <div className="ov-hero">
          <h1>Draw with light.<br />Brand with it.</h1>
          <p>A generative pattern becomes a hero, a poster, a device screen. Tune the rails on the right, then wire the look into every surface.</p>
          <span className="ov-pill">Start a project</span>
        </div>
      )}
      {scene === "poster" && (
        <div className="ov-poster">
          <div className="cap">
            <b>Maximise<br />the signal</b>
            <small>Light Rails · Edition 01<br />Generative series · 2026</small>
          </div>
        </div>
      )}
      {scene === "stat" && (
        <div className="ov-stats">
          <div className="glass"><b>24</b><span>shapes on the rails</span></div>
          <div className="glass"><b>60 fps</b><span>rendered live in WebGL</span></div>
          <div className="glass"><b>∞</b><span>looks from one gradient</span></div>
        </div>
      )}
      {scene === "brand" && (
        <div className="ov-brand">
          <div className="mark"><i />Coda</div>
          <div className="tag">Build it your way, then let it grow.</div>
          <div className="grid">
            <span className="glass">Design</span>
            <span className="glass">Motion</span>
            <span className="glass">Print</span>
            <span className="glass">Web</span>
          </div>
        </div>
      )}
      {scene === "device" && (
        <div className="ov-device">
          <div className="notch" />
          <div className="ui">
            <b>Ready<br />to grow?</b>
            <span>Your studio, one tap away.</span>
            <span className="ov-pill">Continue</span>
          </div>
        </div>
      )}
      {scene === "versus" && (
        // the tunnel is the only content slot: knot on the seam, sides either way.
        // The knot is always competition navy, never a club colour.
        <div className="ov-versus" style={{ top: `${seamY * 100}%` }}>
          <span className="team home">Home</span>
          <span className="knot">VS</span>
          <span className="team away">Away</span>
        </div>
      )}
      {scene === "article" && (
        <div className="ov-article">
          <div>
            <div className="kicker">Feature · 6 min read</div>
            <h2>How light became a brand system</h2>
          </div>
          <span className="ov-pill">Read the story</span>
        </div>
      )}
    </div>
  );
}
