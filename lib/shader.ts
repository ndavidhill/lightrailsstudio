/* GLSL for the rails renderer. A full-screen triangle drives a fragment shader
   that maps every pixel to a (t, u) pair: `t` runs ACROSS the rails (rails sit
   at integer values of t * lines) and `u` runs ALONG them (the gradient and the
   trail animation live on u). Each shape is just a different (t, u) mapping. */

export const VERT = `#version 300 es
precision highp float;
const vec2 V[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main() { gl_Position = vec4(V[gl_VertexID], 0.0, 1.0); }
`;

export const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2  uRes;
uniform float uTime;
uniform int   uShape;
uniform int   uMotion;
uniform float uP1, uP2, uP3, uP4, uP5, uP6;
uniform float uLines, uHeat, uWidth, uEdge, uSeam, uSeamW, uHollow;
uniform vec3  uStops[6];
uniform int   uNStops;
uniform vec3  uStopsB[6];
uniform int   uNStopsB;
uniform vec3  uBg;
uniform int   uHalves;
uniform int   uSplit;
uniform float uSeamY, uSplitDepth, uPaint;
uniform float uRunSpeed, uRunStretch, uRunSpread, uRunJitter, uHold;
uniform float uPeriod, uLife;
uniform float uAngle, uGrain, uGain, uBlur, uGlow, uBlow, uSway;

#define PI  3.14159265359
#define TAU 6.28318530718

float hash(float n) { return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/* gradient lookup for pack 0 (A) or 1 (B) */
vec3 gradN(float x, int pack) {
  int n = pack == 0 ? uNStops : uNStopsB;
  float f = fract(x) * float(n);
  int i = int(floor(f));
  int j = (i + 1) % n;
  float k = smoothstep(0.0, 1.0, fract(f));
  vec3 a = pack == 0 ? uStops[i] : uStopsB[i];
  vec3 b = pack == 0 ? uStops[j] : uStopsB[j];
  return mix(a, b, k);
}

/* which pack colours this fragment: 0 = A, 1 = B, fractional in gradient mode.
   side: signed distance above (+) / below (-) the seam; idx: rail index */
float packMix(float side, float idx) {
  if (uHalves == 0 || uSplit == 3) return 0.0;
  float below = side < 0.0 ? 1.0 : 0.0;
  if (uSplit == 0) return below;
  float d = uSplitDepth * 0.6 + 0.005;
  if (uSplit == 2) return 1.0 - smoothstep(-d, d, side);
  // interleave: inside the band the packs alternate rail by rail so both
  // colours bind at the contact point
  if (abs(side) < d) return mod(idx, 2.0);
  return below;
}

/* ---- The Bind ------------------------------------------------------------
   Two strand families at ±angle in an UNWARPED space; the fragment's warped
   position is mapped back by inverting the compression cubic
   g(t) = t (a + (1 - a) t²), whose slope is 1 at the flanks and a at the seam,
   so the lattice keeps its angle at the edge and only its scale changes. */
vec3 bind(vec2 p, out float wmul) {
  float seamP = 1.0 - 2.0 * uSeamY;
  float ang   = radians(mix(12.0, 68.0, uP1));
  float comp  = clamp(uP2 + 0.035 * sin(uTime * TAU / 7.5), 0.0, 1.0); // breathe
  float taper = uP3;
  float tun   = uP4 * 0.45;
  float conv  = uP5 * 0.8;
  float shear = (uP6 - 0.5) * 0.5;

  float y   = p.y - seamP;
  float sgn = y < 0.0 ? -1.0 : 1.0;
  float ay  = abs(y);
  float mask = smoothstep(tun, tun + 0.004, ay);            // the tunnel cuts strands

  float G = max(0.0, (ay - tun) / (1.0 - tun));            // 0 at the channel, 1 at the edge
  float a = 1.0 - comp * 0.9;
  float tEdge = 0.62;
  float gEdge = tEdge * (a + (1.0 - a) * tEdge * tEdge);
  float target = G * gEdge;
  float t = target;
  for (int i = 0; i < 4; i++) {                             // Newton: g(t) = target
    float gt = t * (a + (1.0 - a) * t * t);
    float dg = a + 3.0 * (1.0 - a) * t * t;
    t -= (gt - target) / dg;
  }
  float k = (a + 3.0 * (1.0 - a) * t * t) / (a + 3.0 * (1.0 - a) * tEdge * tEdge); // local scale vs edge
  float yIn = t / gEdge;

  float Gc = min(G, 1.0);
  float xs = p.x - shear * sgn * (1.0 - 0.4 * Gc);          // undo the heave
  float x  = xs / (1.0 - conv * pow(1.0 - Gc, 1.7));         // undo the converge
  vec2 q = vec2(x, sgn * yIn);

  // strand width follows compression by taper: 1 = self-similar braid,
  // 0 = constant width (merges into a solid band at the seam)
  float wFloor = 1.0 - taper;
  wmul = (wFloor + (1.0 - wFloor) * k) / max(k, 0.02);
  float w = min(uWidth * wmul, 1.0);

  vec2 nA = vec2(-sin(ang), cos(ang));
  vec2 nB = vec2( sin(ang), cos(ang));
  float phase = sgn < 0.0 ? 0.5 : 0.0;                      // pack B half a pitch out
  float tA = dot(q, nA) * 0.5 + 0.5 + phase / uLines;
  float tB = dot(q, nB) * 0.5 + 0.5;
  float sA = tA * uLines, sB = tB * uLines;
  float dA = abs(fract(sA) - 0.5) * 2.0;
  float dB = abs(fract(sB) - 0.5) * 2.0;
  bool inA = dA < w, inB = dB < w;
  float par = mod(floor(sA) + floor(sB), 2.0);              // A on top at even crossings
  float useA;
  if (inA && inB)      useA = par < 0.5 ? 1.0 : 0.0;
  else if (inA)        useA = 1.0;
  else if (inB)        useA = 0.0;
  else                 useA = dA < dB ? 1.0 : 0.0;
  // u encodes the family so a two-stop gradient gives over / under colours
  return useA > 0.5 ? vec3(tA, 0.0, mask) : vec3(tB, 0.5, mask);
}

/* fan helper: rails converge on focus f, measured as angle around it */
vec3 fan(vec2 p, vec2 f, float spread) {
  vec2 d = p - f;
  float ang = atan(d.x, d.y);
  return vec3(ang / spread + 0.5, length(d) / 2.6, 1.0);
}

/* returns (t, u, mask); t2 is a second rail family (grid) or -1; wmul scales
   the rail width per fragment (only The Bind uses it) */
vec3 shape(vec2 p, out float t2, out float wmul) {
  t2 = -1.0;
  wmul = 1.0;
  float a = uP1, b = uP2, c = uP3;
  float r = length(p);
  float th = atan(p.x, p.y);
  float tm = uTime;

  if (uShape == 24) return bind(p, wmul);

  if (uShape == 0) {            // perspective fan
    p.x += p.y * (c - 0.5) * 0.8;
    return fan(p, vec2(0.0, -1.1 - a * 2.5), 0.35 + b * 1.4);
  }
  if (uShape == 1) {            // parallel bars
    float t = p.x * 0.5 + 0.5 + p.y * (a - 0.5) * 0.8 + sin(p.y * 6.0 + tm * 0.4) * b * 0.08;
    return vec3(t, p.y * 0.5 + 0.5, 1.0);
  }
  if (uShape == 2) {            // rays from focus
    vec2 f = vec2((a - 0.5) * 1.6, (b - 0.5) * 1.6);
    vec2 d = p - f;
    float ang = atan(d.x, d.y) + c * 0.08 * sin(length(d) * 6.0 - tm * 0.8);
    return vec3(ang / TAU + 0.5, length(d) / 1.6, 1.0);
  }
  if (uShape == 3) {            // concentric rings
    vec2 f = vec2((a - 0.5) * 1.6, (b - 0.5) * 1.6);
    vec2 d = p - f;
    float ang = atan(d.x, d.y);
    float rr = length(d) + c * 0.06 * sin(ang * 5.0 + tm * 0.6);
    return vec3(rr * 0.65, ang / TAU + 0.5, 1.0);
  }
  if (uShape == 4) {            // sine-warped fan
    p.x += sin(p.y * (1.0 + a * 5.0) + tm * c * 0.6) * b * 0.45;
    return fan(p, vec2(0.0, -1.6), 1.1);
  }
  if (uShape == 5) {            // twisted fan
    p = rot(p.y * (a - 0.5) * 3.0) * p;
    p.x += p.y * (b - 0.5) * 2.0;
    return fan(p, vec2(0.0, -1.6), 1.1);
  }
  if (uShape == 6) {            // tunnel
    vec2 off = vec2((a - 0.5) * 1.2, (b - 0.5) * 1.2);
    float depth = clamp(1.0 - r, 0.0, 1.0);
    vec2 d = p - off * depth;
    float rr = length(d) + c * 0.02 * sin(tm);
    return vec3(rr * 0.7 - tm * 0.02 * c, atan(d.x, d.y) / TAU + 0.5, 1.0);
  }
  if (uShape == 7) {            // spiral
    float arms = 1.0 + floor(b * 4.0);
    float t = r * (0.5 + a * 1.5) - th / TAU * arms + tm * c * 0.08;
    return vec3(t, r / 1.6, 1.0);
  }
  if (uShape == 8) {            // cube 3D
    float spin = (a - 0.5) * 2.0 + tm * c * 0.15;
    vec2 q = rot(spin) * p;
    float ang = atan(q.y, q.x) + PI * 0.5;         // 0 at the bottom
    float sec = mod(floor(ang / (TAU / 3.0)), 3.0);
    float dir = sec * TAU / 3.0 + PI / 2.0 + (b - 0.5) * 1.2;
    vec2 dv = vec2(cos(dir), sin(dir));
    vec2 pv = vec2(-dv.y, dv.x);
    float hex = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y));
    float mask = 1.0 - smoothstep(0.86, 0.88, hex);
    return vec3(dot(q, dv) * 0.5 + 0.5, dot(q, pv) * 0.5 + 0.5, mask);
  }
  if (uShape == 9) {            // beams mirrored
    p.x = abs(p.x);
    return fan(p, vec2(-0.2 - a * 1.2, -1.3), 0.4 + b * 1.2);
  }
  if (uShape == 10) {           // horizon
    float h = 0.05 + a * 0.5;
    float y = h - p.y;
    // fade toward the horizon so rails do not alias into noise at infinity
    float mask = smoothstep(0.0, 0.08, y);
    float z = 1.0 / (max(y, 0.001) + 0.03);
    float t = p.x * z * 0.06 * (0.4 + b * 1.6) + 0.5;
    float u = log(z + 1.0) / 4.5 + tm * c * 0.08;
    return vec3(t, u, mask);
  }
  if (uShape == 11) {           // petal burst
    float n = 3.0 + floor(a * 9.0);
    float rr = r / (0.55 + 0.45 * b * cos(th * n + tm * c * 0.5) + (1.0 - b) * 0.45);
    return vec3(rr * 0.75, th / TAU + 0.5, 1.0);
  }
  if (uShape == 12) {           // flower
    float ang = th + r * (a - 0.5) * 6.0;
    float n = 3.0 + floor(b * 9.0);
    float t = r * (1.0 + 0.35 * cos(ang * n)) * 0.85 - c * 0.3;
    return vec3(t, fract(ang / TAU), 1.0);
  }
  if (uShape == 13) {           // wavefront
    float lobes = 2.0 + floor(b * 8.0);
    float t = r * 0.85 + 0.12 * a * sin(th * lobes + tm * c * 0.8);
    return vec3(t, th / TAU + 0.5, 1.0);
  }
  if (uShape == 14) {           // lens stack
    float t = abs(p.x) * (0.6 + a * 1.4) + p.y * p.y * (0.4 + b * 2.0);
    return vec3(t * 0.8, p.y * 0.5 + 0.5, 1.0);
  }
  if (uShape == 15) {           // square tunnel
    vec2 q = rot(b * PI * 0.25) * p;
    float n = 2.0 + (1.0 - a) * 8.0;
    float t = pow(pow(abs(q.x), n) + pow(abs(q.y), n), 1.0 / n);
    return vec3(t * 0.8, atan(q.x, q.y) / TAU + 0.5, 1.0);
  }
  if (uShape == 16) {           // stepped blocks
    float cols = 3.0 + floor(a * 9.0);
    float col = floor((p.x + 2.0) * cols * 0.5);
    float t = p.y * 0.5 + 0.5 + b * col / cols * 0.6 + tm * c * 0.05;
    return vec3(t, p.x * 0.25 + 0.5 + hash(col) * 0.2, 1.0);
  }
  if (uShape == 17) {           // ribbon wave
    float y0 = sin(p.x * (0.8 + a * 3.0) + tm * c * 0.5) * 0.35;
    float w = 0.28 + 0.2 * cos(p.x * (1.0 + b * 3.0) * 0.8 - tm * c * 0.3);
    float yy = (p.y - y0) / w;
    float mask = 1.0 - smoothstep(0.98, 1.0, abs(yy));
    return vec3(yy * 0.5 + 0.5, p.x * 0.25 + 0.5, mask);
  }
  if (uShape == 18) {           // grid burst
    float k = 1.0 / (1.0 + a * 2.5);
    float asp = 0.6 + b * 0.8;
    float tx = sign(p.x) * pow(abs(p.x) * 0.5, k) * 0.5 + 0.5;
    float ty = sign(p.y) * pow(abs(p.y) * 0.5 * asp, k) * 0.5 + 0.5;
    t2 = ty;
    return vec3(tx, r / 1.5, 1.0);
  }
  if (uShape == 19) {           // torus stack
    float rad = 0.25 + (0.2 + a * 0.8) * p.y * p.y;
    float xn = p.x / rad;
    float mask = 1.0 - smoothstep(0.98, 1.02, abs(xn));
    float bulge = 1.0 - sqrt(max(0.0, 1.0 - xn * xn));
    float t = p.y * (0.8 + b * 1.6) * 0.6 + bulge * 0.35 + 0.5;
    return vec3(t, xn * 0.5 + 0.5, mask);
  }
  if (uShape == 20) {           // chevrons
    float t = abs(p.x) * (0.3 + a * 1.4) + p.y * 0.5 + 0.5 - tm * b * 0.08;
    return vec3(t * 0.8, p.x * 0.5 + 0.5, 1.0);
  }
  if (uShape == 21) {           // diamond lattice
    vec2 q = rot(b * PI * 0.25) * p * (0.6 + (1.0 - a) * 2.4) * 0.5;
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float t = (abs(f.x) + abs(f.y)) * 0.8;
    return vec3(t, hash2(cell), 1.0);
  }
  if (uShape == 22) {           // vortex
    float ang = th + r * r * (a - 0.5) * 8.0 + tm * (b - 0.5) * 0.6;
    return vec3(ang / TAU + 0.5, r / 1.5, 1.0);
  }
  if (uShape == 23) {           // ellipse foci
    vec2 q = rot(b * PI) * p;
    float s = 0.2 + a * 0.8;
    float l1 = length(q - vec2(-s, 0.0));
    float l2 = length(q + vec2(-s, 0.0));
    return vec3((l1 + l2) * 0.35, (l1 - l2) * 0.35 + 0.5, 1.0);
  }
  return vec3(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, 1.0);
}

/* lit envelope for one rail at position u along it */
float envelope(float u, float idx) {
  float off = idx * uRunSpread * 0.05 + hash(idx * 7.0) * uRunJitter * 0.5;
  float q = fract(uTime / uPeriod + off);
  if (uMotion == 1) return 1.0;
  if (uMotion == 0) {
    // pulse: quick rise, hold, fall
    return smoothstep(0.0, 0.12, q) * (1.0 - smoothstep(uLife * 0.7, 1.0, q));
  }
  // trails: run in, hold, run out
  float H = uHold * 0.6;
  float A = (1.0 - H) * 0.5;
  float head, tail;
  if (q < A)           { head = q / A;  tail = -0.2; }
  else if (q < A + H)  { head = 1.2;    tail = -0.2; }
  else                 { head = 1.2;    tail = (q - A - H) / (1.0 - A - H); }
  float soft = 0.03 + uLife * 0.3;
  return smoothstep(tail, tail + soft, u) * (1.0 - smoothstep(head, head + soft, u));
}

/* halo, core, seam and glow profile for one rail family */
void rail(float t, float u, float w, float side,
          out float halo, out float core, out float glow, out float seam, out float env, out vec3 col) {
  float s = t * uLines;
  float idx = floor(s);
  float d = abs(fract(s) - 0.5) * 2.0;           // 0 at rail centre, 1 in the gap
  halo = pow(max(0.0, 1.0 - d / w), uEdge);
  halo *= mix(1.0, smoothstep(0.0, w * 0.6, d), uHollow);
  core = exp(-(d * d) / (w * w * 0.06));
  glow = exp(-(d * d) / (uBlur * uBlur * 1.6));
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW * 1.6, d);
  env = envelope(u, idx);
  float phase = uTime * uRunSpeed * 0.25 + idx * uRunSpread * 0.05 + hash(idx) * uRunJitter;
  float x = u * uRunStretch * 2.0 - phase;
  float pm = packMix(side, idx);
  col = pm <= 0.0 ? gradN(x, 0) : pm >= 1.0 ? gradN(x, 1) : mix(gradN(x, 0), gradN(x, 1), pm);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y * 2.0;
  p += vec2(sin(uTime * 0.7), cos(uTime * 0.5)) * uSway;
  float side = p.y - (1.0 - 2.0 * uSeamY);       // halves stay horizontal under rotation
  // the interleave / gradient band starts at the tunnel edge, not the seam
  float tunnelP = uShape == 24 ? uP4 * 0.45 : 0.0;
  side = sign(side) * max(abs(side) - tunnelP, 0.0);
  p = rot(radians(uAngle)) * p;

  float t2, wmul;
  vec3 su = shape(p, t2, wmul);
  float mask = su.z;
  float w = min(uWidth * wmul, 1.0);

  float halo, core, glow, seam, env; vec3 col;
  rail(su.x, su.y, w, side, halo, core, glow, seam, env, col);

  if (t2 >= 0.0) {
    float h2, c2, g2, s2, e2; vec3 col2;
    rail(t2, su.y, uWidth, side, h2, c2, g2, s2, e2, col2);
    // union of both families, weighted by their envelopes
    float w1 = halo * env, w2 = h2 * e2;
    col = (w1 + w2) > 0.0 ? (col * w1 + col2 * w2) / (w1 + w2) : col;
    halo = max(halo * env, h2 * e2); core = max(core * env, c2 * e2);
    glow = max(glow * env, g2 * e2); seam = max(seam * env, s2 * e2); env = 1.0;
  }

  vec3 railCol = col * uGain;
  float e = env * mask;
  vec3 hot = mix(railCol, vec3(1.0), uBlow);

  // additive: light on a dark ground
  vec3 add = uBg;
  add += railCol * halo * e;
  add += railCol * glow * uGlow * 0.55 * e;
  add += hot * core * uHeat * 1.6 * e;
  add -= (add - uBg) * seam * uSeam * core * e;
  add = mix(add, 1.0 - exp(-add * 1.4), 0.35);   // gentle shoulder for blown-out cores

  // paint: opaque colour on any ground (the ink print look)
  float cov = clamp(halo * e, 0.0, 1.0);
  vec3 ink = mix(uBg, railCol, cov);
  ink = mix(ink, railCol, clamp(glow * uGlow * 0.35 * e, 0.0, 1.0) * (1.0 - cov));
  ink = mix(ink, hot, clamp(core * uHeat * e, 0.0, 1.0));
  ink -= (ink - uBg) * seam * uSeam * core * e;

  vec3 c = mix(add, ink, uPaint);
  c += (hash2(frag + fract(uTime) * 100.0) - 0.5) * uGrain;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;
