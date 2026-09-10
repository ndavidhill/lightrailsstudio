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

- 24 shapes (fans, rings, tunnels, spirals, cube, horizon, petals, ribbons, lattices…), each with its own parameters
- Three motion modes: trails, solid, pulse
- Line controls: count, core heat, stroke width, outer edge, centre seam, hollow
- Gradient colours with 2–6 stops and background, ten theme presets, twelve templates
- Gradient run, timing and look controls (angle, grain, gain, blur, glow, blow-out, sway)
- Undo / redo / reset, shuffle
- Export PNG, export/import/copy JSON settings
- Saved presets (browser local storage)
- Seven mockup scenes (hero, poster, stat board, brand spread, device, article strip) and a showreel

Keyboard: `H` hides both panels, `⌘Z` / `⇧⌘Z` undo and redo, `Space` plays the showreel.
