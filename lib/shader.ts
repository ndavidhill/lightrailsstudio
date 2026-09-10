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
uniform float uP1, uP2, uP3;
uniform float uLines, uHeat, uWidth, uEdge, uSeam, uSeamW, uHollow;
uniform vec3  uStops[6];
uniform int   uNStops;
uniform vec3  uBg;
uniform float uRunSpeed, uRunStretch, uRunSpread, uRunJitter, uHold;
uniform float uPeriod, uLife;
uniform float uAngle, uGrain, uGain, uBlur, uGlow, uBlow, uSway;

#define PI  3.14159265359
#define TAU 6.28318530718

float hash(float n) { return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 grad(float x) {
  float f = fract(x) * float(uNStops);
  int i = int(floor(f));
  float k = smoothstep(0.0, 1.0, fract(f));
  vec3 a = uStops[i];
  vec3 b = uStops[(i + 1) % uNStops];
  return mix(a, b, k);
}

/* fan helper: rails converge on focus f, measured as angle around it */
vec3 fan(vec2 p, vec2 f, float spread) {
  vec2 d = p - f;
  float ang = atan(d.x, d.y);
  return vec3(ang / spread + 0.5, length(d) / 2.6, 1.0);
}

/* returns (t, u, mask); t2 is a second rail family (grid) or -1 */
vec3 shape(vec2 p, out float t2) {
  t2 = -1.0;
  float a = uP1, b = uP2, c = uP3;
  float r = length(p);
  float th = atan(p.x, p.y);
  float tm = uTime;

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
void rail(float t, float u, out float halo, out float core, out float glow, out float seam, out float env, out vec3 col) {
  float s = t * uLines;
  float idx = floor(s);
  float d = abs(fract(s) - 0.5) * 2.0;           // 0 at rail centre, 1 in the gap
  float w = uWidth;
  halo = pow(max(0.0, 1.0 - d / w), uEdge);
  halo *= mix(1.0, smoothstep(0.0, w * 0.6, d), uHollow);
  core = exp(-(d * d) / (w * w * 0.06));
  glow = exp(-(d * d) / (uBlur * uBlur * 1.6));
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW * 1.6, d);
  env = envelope(u, idx);
  float phase = uTime * uRunSpeed * 0.25 + idx * uRunSpread * 0.05 + hash(idx) * uRunJitter;
  col = grad(u * uRunStretch * 2.0 - phase);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y * 2.0;
  p += vec2(sin(uTime * 0.7), cos(uTime * 0.5)) * uSway;
  p = rot(radians(uAngle)) * p;

  float t2;
  vec3 su = shape(p, t2);
  float mask = su.z;

  float halo, core, glow, seam, env; vec3 col;
  rail(su.x, su.y, halo, core, glow, seam, env, col);

  if (t2 >= 0.0) {
    float h2, c2, g2, s2, e2; vec3 col2;
    rail(t2, su.y, h2, c2, g2, s2, e2, col2);
    // union of both families, weighted by their envelopes
    float w1 = halo * env, w2 = h2 * e2;
    col = (w1 + w2) > 0.0 ? (col * w1 + col2 * w2) / (w1 + w2) : col;
    halo = max(halo * env, h2 * e2); core = max(core * env, c2 * e2);
    glow = max(glow * env, g2 * e2); seam = max(seam * env, s2 * e2); env = 1.0;
  }

  vec3 railCol = col * uGain;
  vec3 c = uBg;
  float e = env * mask;
  c += railCol * halo * e;
  c += railCol * glow * uGlow * 0.55 * e;
  vec3 hot = mix(railCol, vec3(1.0), uBlow);
  c += hot * core * uHeat * 1.6 * e;
  c -= (c - uBg) * seam * uSeam * core * e;

  // gentle shoulder so blown-out cores roll off instead of clipping flat
  c = mix(c, 1.0 - exp(-c * 1.4), 0.35);
  c += (hash2(frag + fract(uTime) * 100.0) - 0.5) * uGrain;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;
