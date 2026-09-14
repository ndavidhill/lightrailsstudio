/* Light Rails — configuration model, shape catalogue, themes, templates, scenes.
   Everything the renderer and the panels agree on lives here. */

export type Motion = 0 | 1 | 2; // 0 pulse, 1 solid, 2 trails
export type Split = 0 | 1 | 2 | 3; // 0 seam, 1 interleave, 2 gradient, 3 mono

export const BIND = 24; // shape index of The Bind

export interface Config {
  shape: number;
  motion: Motion;
  // shape parameters (0..1), relabelled per shape
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
  // lines
  lines: number;
  heat: number;
  width: number;
  edge: number;
  seam: number;
  seamWidth: number;
  hollow: number;
  // colour
  stops: string[];
  bg: string;
  // colour halves: pack A (stops) above the seam, pack B (stopsB) below
  halves: boolean;
  stopsB: string[];
  split: Split;
  seamY: number;       // seam position, fraction from the top (0.18..0.82)
  splitDepth: number;  // interleave band / gradient blend width (0..1)
  // gradient run
  runSpeed: number;
  runStretch: number;
  runSpread: number;
  runJitter: number;
  trailHold: number;
  // timing
  period: number;
  life: number;
  // look
  angle: number;
  grain: number;
  gain: number;
  blur: number;
  glow: number;
  blow: number;
  sway: number;
  paint: number;       // 0 = additive light on dark, 1 = opaque paint on ground
}

export interface ShapeDef {
  name: string;
  hint: string;
  params: string[]; // labels for p1..p6 ("" = unused)
  defaults?: Partial<Config>;
}

export const SHAPES: ShapeDef[] = [
  { name: "Perspective fan", hint: "rails converging on a point below the frame", params: ["focus depth", "spread", "lean"] },
  { name: "Parallel bars", hint: "straight rails, optional skew and wave", params: ["skew", "wave", ""] },
  { name: "Rays from focus", hint: "rails radiating from a movable point", params: ["centre x", "centre y", "wobble"] },
  { name: "Concentric rings", hint: "rings with a wobbling rim", params: ["centre x", "centre y", "wobble"] },
  { name: "Sine-warped fan", hint: "fan bent by a travelling sine", params: ["frequency", "depth", "drift"] },
  { name: "Twisted fan", hint: "fan rotated by height", params: ["twist", "shear", ""] },
  { name: "Tunnel", hint: "rings that drift off-centre with depth", params: ["offset x", "offset y", "drift"] },
  { name: "Spiral", hint: "arms wound around the centre", params: ["tightness", "arms", "spin"] },
  { name: "Cube 3D", hint: "three faces of an isometric cube", params: ["rotate", "face lean", "spin"] },
  { name: "Beams (mirrored)", hint: "a fan mirrored across the centre line", params: ["focus offset", "spread", ""] },
  { name: "Horizon", hint: "a ground plane running to a horizon", params: ["horizon", "spread", "scroll"] },
  { name: "Petal burst", hint: "petal-shaped rings", params: ["petals", "depth", "spin"] },
  { name: "Flower", hint: "swirled petals; count, swirl and centre", params: ["swirl", "petals", "centre"] },
  { name: "Wavefront", hint: "expanding rippled shells", params: ["ripple", "lobes", "drift"] },
  { name: "Lens stack", hint: "stacked vesicas", params: ["pinch", "curve", ""] },
  { name: "Square tunnel", hint: "nested squircles, mirrored four ways", params: ["roundness", "rotate", ""] },
  { name: "Stepped blocks", hint: "staircase stripes", params: ["columns", "rise", "scroll"] },
  { name: "Ribbon wave", hint: "a twisting striated band", params: ["frequency", "twist", "drift"] },
  { name: "Grid burst", hint: "a line grid bunched at the centre", params: ["bunch", "aspect", ""] },
  { name: "Torus stack", hint: "an hourglass column of rings", params: ["waist", "pitch", ""] },
  { name: "Chevrons", hint: "nested arrowheads", params: ["point", "scroll", ""] },
  { name: "Diamond lattice", hint: "tiled diamond cells", params: ["cell size", "rotate", ""] },
  { name: "Vortex", hint: "rays twisted by radius", params: ["twist", "spin", ""] },
  { name: "Ellipse foci", hint: "rings drawn around two foci", params: ["separation", "rotate", ""] },
  {
    name: "The Bind",
    hint: "two strand packs compressing toward a seam; a top-down scrum",
    params: ["strand angle", "compression", "taper", "tunnel", "converge", "shear"],
    // spec defaults: 45°, compression 0.86, taper 0.85, no tunnel, no converge, shear centred
    defaults: { p1: 0.589, p2: 0.86, p3: 0.85, p4: 0, p5: 0, p6: 0.5 },
  },
];

export const DEFAULTS: Config = {
  shape: 0,
  motion: 2,
  p1: 0.35, p2: 0.5, p3: 0.5, p4: 0.5, p5: 0.5, p6: 0.5,
  lines: 12,
  heat: 0.7,
  width: 0.42,
  edge: 1.0,
  seam: 0.25,
  seamWidth: 0.06,
  hollow: 0,
  stops: ["#ff4a00", "#8a63ff", "#214aff"],
  bg: "#05060a",
  halves: false,
  stopsB: ["#ff2d55", "#ffb3c1", "#c8102e"],
  split: 0,
  seamY: 0.5,
  splitDepth: 0.25,
  runSpeed: 1.0,
  runStretch: 0.5,
  runSpread: 1.2,
  runJitter: 1.0,
  trailHold: 0.35,
  period: 4.0,
  life: 0.45,
  angle: 0,
  grain: 0.04,
  gain: 1.0,
  blur: 0.22,
  glow: 0.6,
  blow: 0.5,
  sway: 0.008,
  paint: 0,
};

export interface Theme { name: string; stops: string[]; bg: string; stopsB?: string[] }

export const THEMES: Theme[] = [
  { name: "Ember", stops: ["#ff4a00", "#8a63ff", "#214aff"], bg: "#05060a" },
  { name: "Lagoon", stops: ["#00d4c8", "#3aa0ff", "#6a5cff", "#ff3a6a"], bg: "#03060d" },
  { name: "Sherbet", stops: ["#ffd24a", "#ff7a3d", "#c86bff", "#4a9bff"], bg: "#0a0612" },
  { name: "Mint", stops: ["#a9efad", "#96a0e0", "#eef6c8"], bg: "#061008" },
  { name: "Signal", stops: ["#ffffff", "#ff2020", "#2f78ff", "#0f8a34"], bg: "#000000" },
  { name: "Peach", stops: ["#ffb199", "#ff0844", "#ffd166"], bg: "#120507" },
  { name: "Ice", stops: ["#dff6ff", "#7cc7ff", "#3a5bff"], bg: "#020714" },
  { name: "Acid", stops: ["#c8ff3a", "#00ffa3", "#00c2ff"], bg: "#040a06" },
  { name: "Rose gold", stops: ["#ffd9c4", "#ff8fa3", "#b56cff"], bg: "#0b0509" },
  { name: "Mono", stops: ["#ffffff", "#9aa0ad", "#ffffff"], bg: "#070708" },
  { name: "Home / away", stops: ["#2540ef", "#aef6ff"], stopsB: ["#c8102e", "#ffd9df"], bg: "#ffffff" },
];

export interface Template { name: string; title: string; cfg: Partial<Config> }

/* shared base for the flat-colour Bind presets from the spec */
const BIND_FLAT: Partial<Config> = {
  shape: BIND, motion: 1,
  p1: 0.589, p2: 0.86, p3: 0.85, p4: 0, p5: 0, p6: 0.5,
  lines: 10, width: 0.24, heat: 0, edge: 0.2, seam: 0, hollow: 0,
  stops: ["#2540ef", "#aef6ff"], stopsB: ["#c8102e", "#ffd9df"], bg: "#ffffff",
  halves: true, split: 0, seamY: 0.5, splitDepth: 0.25,
  runSpeed: 0, runStretch: 0.5, angle: 0, grain: 0, gain: 1, blur: 0.02, glow: 0, blow: 0, sway: 0, paint: 1,
};

export const TEMPLATES: Template[] = [
  { name: "measured fan", title: "Perspective fan, the studio default", cfg: { shape: 0, motion: 2 } },
  { name: "sunburst", title: "Warm rays glowing from the centre", cfg: { shape: 2, motion: 1, p1: 0.5, p2: 0.5, p3: 0.2, lines: 18, stops: ["#ffd24a", "#ff7a3d", "#c86bff"], bg: "#120806", glow: 1.0, blur: 0.3 } },
  { name: "neon rings", title: "Wobbling rings, lagoon colours", cfg: { shape: 3, motion: 1, p1: 0.5, p2: 0.5, p3: 0.6, lines: 14, stops: ["#00d4c8", "#3aa0ff", "#ff3a6a"], bg: "#03060d", heat: 0.9 } },
  { name: "silk ribbon", title: "A twisting striated band", cfg: { shape: 17, motion: 1, p1: 0.4, p2: 0.6, p3: 0.5, lines: 16, width: 0.5, stops: ["#ffb199", "#ff0844", "#ffd166"], bg: "#120507" } },
  { name: "pinwheel", title: "Swirl flower in blue and orange", cfg: { shape: 12, motion: 1, p1: 0.75, p2: 0.4, p3: 0.5, lines: 10, stops: ["#ff7a3d", "#4a9bff", "#ffd24a"], bg: "#06070f" } },
  { name: "stair field", title: "Staircase stripe blocks", cfg: { shape: 16, motion: 2, p1: 0.5, p2: 0.6, p3: 0.3, lines: 14, angle: 0, stops: ["#ffffff", "#ff2020", "#2f78ff"], bg: "#000000" } },
  { name: "horizon", title: "Ground plane racing to a horizon", cfg: { shape: 10, motion: 1, p1: 0.45, p2: 0.5, p3: 0.5, lines: 16, stops: ["#dff6ff", "#7cc7ff", "#3a5bff"], bg: "#020714" } },
  { name: "cube", title: "Isometric cube, rotating slowly", cfg: { shape: 8, motion: 1, p1: 0.2, p2: 0.5, p3: 0.4, lines: 9, stops: ["#c8ff3a", "#00ffa3", "#00c2ff"], bg: "#040a06" } },
  { name: "vortex", title: "Rays twisted by radius", cfg: { shape: 22, motion: 2, p1: 0.6, p2: 0.4, lines: 20, stops: ["#ffd9c4", "#ff8fa3", "#b56cff"], bg: "#0b0509" } },
  { name: "tunnel", title: "Rings drifting off centre", cfg: { shape: 6, motion: 2, p1: 0.7, p2: 0.4, p3: 0.5, lines: 12, stops: ["#a9efad", "#96a0e0", "#eef6c8"], bg: "#061008" } },
  { name: "lattice", title: "Tiled diamond cells", cfg: { shape: 21, motion: 0, p1: 0.4, p2: 0.0, lines: 6, stops: ["#ffffff", "#9aa0ad", "#ffffff"], bg: "#070708", period: 2.5 } },
  { name: "foci", title: "Rings around two foci", cfg: { shape: 23, motion: 1, p1: 0.5, p2: 0.15, lines: 16, stops: ["#00d4c8", "#6a5cff", "#ff3a6a"], bg: "#03060d" } },
  { name: "versus", title: "The Bind: two packs locked at the seam (interleave)", cfg: { ...BIND_FLAT, p4: 0.41, halves: true, split: 1, splitDepth: 0.25 } },
  { name: "neutral field", title: "The Bind: competition-neutral mono weave", cfg: { ...BIND_FLAT, halves: false } },
  { name: "broadcast bar", title: "The Bind at 19°: wide flat lattice with a channel", cfg: { ...BIND_FLAT, p1: 0.125, p3: 0.55, p4: 0.24, lines: 11, halves: true, split: 0 } },
  { name: "try moment", title: "The Bind: loosened, converging, colours cross-fading", cfg: { ...BIND_FLAT, p2: 0.6, p5: 0.475, halves: true, split: 2, splitDepth: 0.5 } },
  { name: "apparel", title: "The Bind: fine self-similar braid for textures", cfg: { ...BIND_FLAT, lines: 16, width: 0.22, p3: 1.0, halves: false } },
  { name: "neon bind", title: "The Bind with the rails light treatment", cfg: { shape: BIND, motion: 1, p1: 0.589, p2: 0.86, p3: 0.85, p4: 0.3, p5: 0, p6: 0.5, lines: 10, width: 0.3, halves: true, split: 1, splitDepth: 0.25, stops: ["#3aa0ff", "#dff6ff"], stopsB: ["#ff3a6a", "#ffd9df"], bg: "#05060a", paint: 0, runSpeed: 0 } },
];

export interface Scene { id: string; name: string; hold: number }

export const SCENES: Scene[] = [
  { id: "pattern", name: "Pattern only", hold: 4000 },
  { id: "hero", name: "Hero", hold: 5800 },
  { id: "poster", name: "Poster", hold: 5600 },
  { id: "stat", name: "Stat board", hold: 5200 },
  { id: "brand", name: "Brand spread", hold: 7200 },
  { id: "device", name: "Device", hold: 6400 },
  { id: "article", name: "Article strip", hold: 5400 },
  { id: "versus", name: "Versus", hold: 6000 },
];

/* ---- helpers ------------------------------------------------------------ */

export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function applyTemplate(base: Config, t: Partial<Config>): Config {
  const shapeDefaults = t.shape != null ? SHAPES[t.shape]?.defaults ?? {} : {};
  return { ...base, ...shapeDefaults, ...t, stops: (t.stops ?? base.stops).slice(), stopsB: (t.stopsB ?? base.stopsB).slice() };
}

export function cloneConfig(c: Config): Config {
  return { ...c, stops: c.stops.slice(), stopsB: c.stopsB.slice() };
}

export function sameConfig(a: Config, b: Config): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* Accept a loosely-typed object (from JSON) and coerce it into a Config. */
export function coerceConfig(raw: unknown): Config | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Config = cloneConfig(DEFAULTS);
  for (const k of Object.keys(DEFAULTS) as (keyof Config)[]) {
    const v = r[k];
    if (v == null) continue;
    if (k === "stops" || k === "stopsB") {
      if (Array.isArray(v) && v.every((s) => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s)) && v.length >= 2 && v.length <= 6) {
        out[k] = v.slice();
      }
    } else if (k === "halves") {
      out.halves = !!v;
    } else if (k === "bg") {
      if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) out.bg = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      (out as unknown as Record<string, number>)[k] = v;
    }
  }
  out.shape = Math.max(0, Math.min(SHAPES.length - 1, Math.round(out.shape)));
  out.motion = ([0, 1, 2].includes(out.motion) ? out.motion : 2) as Motion;
  out.split = ([0, 1, 2, 3].includes(out.split) ? out.split : 0) as Split;
  return out;
}
