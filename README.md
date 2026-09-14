# Light Rails

A generative pattern studio: rails of light rendered in WebGL, tuned with a
parameter panel, wired into mockups and played as a showreel.

This is an original implementation inspired by the concept at
light-stroke-rail.vercel.app. No code or artwork from that site is used.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Features

- 25 shapes (fans, rings, tunnels, spirals, cube, horizon, petals, ribbons, lattices…), each with up to six parameters
- **The Bind**: two strand packs compressing toward a seam with a cubic warp (angle kept at the flanks, flattened at the seam), taper, an open tunnel that cuts strands, converge, shear, over/under parity at crossings and a slow breathe on compression (7.5 s period, useful for video loop snapping). Presets: versus, neutral field, broadcast bar, try moment, apparel, neon bind
- **Colour halves** for any shape: pack A above the seam, pack B below, joined by seam, interleave, gradient or mono splits, with seam position and band depth
- **Paint** slider in Look: 0 is additive light on a dark ground, 1 is opaque colour on any ground (the flat print look)
- Three motion modes: trails, solid, pulse
- Line controls: count, core heat, stroke width, outer edge, centre seam, hollow
- Gradient colours with 2–6 stops and background, ten theme presets, twelve templates
- Gradient run, timing and look controls (angle, grain, gain, blur, glow, blow-out, sway)
- Undo / redo / reset, shuffle
- Export PNG, export/import/copy JSON settings
- Export looping video as MP4 (H.264) or WebM (VP9): resolution presets up to 4K, 24/30/60 fps, loop length with snap-to-period, repeats, and a seamless crossfade or straight-cut loop. Rendered offline with WebCodecs, frame-accurate; browsers without WebCodecs fall back to a realtime WebM recording
- Saved presets (browser local storage)
- Eight mockup scenes (hero, poster, stat board, brand spread, device, article strip, versus with the competition knot on the seam) and a showreel

Keyboard: `H` hides both panels, `⌘Z` / `⇧⌘Z` undo and redo, `Space` plays the showreel.
