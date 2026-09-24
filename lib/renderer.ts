import { Config, canBlend, hexToRgb, lerpConfig, morphAmount } from "./config";
import { COMPOSITE_FRAG, DOWN_FRAG, FRAG, UP_FRAG, VERT } from "./shader";

/* WebGL2 renderer. The pattern shader draws into an off-screen float texture
   (two of them when a morph crossfades between shapes); a dual-Kawase chain
   builds bloom from it and a composite pass writes the dithered frame. The
   React side owns a ref to the live config so slider drags never re-render
   the tree per frame. */

interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }
type Prog = { p: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> };

const BLOOM_LEVELS = 5;

export class Renderer {
  private gl: WebGL2RenderingContext;
  private pattern: Prog;
  private down: Prog;
  private up: Prog;
  private comp: Prog;
  private float: boolean;
  private sceneA: Target | null = null;
  private sceneB: Target | null = null;
  private mips: Target[] = [];
  private raf = 0;
  private start = performance.now();
  private paused = false;
  private fixed: { w: number; h: number } | null = null;
  private ptr = { x: 0, y: 0, amt: 0 };
  private ptrTarget: { x: number; y: number } | null = null;
  getConfig: () => Config;

  constructor(public canvas: HTMLCanvasElement, getConfig: () => Config) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error("WebGL2 is not available in this browser");
    this.gl = gl;
    this.getConfig = getConfig;
    // half-float targets keep smooth gradients smooth until the final dither
    this.float = !!gl.getExtension("EXT_color_buffer_float");
    this.pattern = this.link(FRAG);
    this.down = this.link(DOWN_FRAG);
    this.up = this.link(UP_FRAG);
    this.comp = this.link(COMPOSITE_FRAG);
    gl.bindVertexArray(gl.createVertexArray());
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("Shader compile failed: " + log);
    }
    return sh;
  }

  private link(fs: string): Prog {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("Program link failed: " + gl.getProgramInfoLog(p));
    }
    return { p, loc: new Map() };
  }

  private u(prog: Prog, name: string): WebGLUniformLocation | null {
    let l = prog.loc.get(name);
    if (l === undefined) { l = this.gl.getUniformLocation(prog.p, name); prog.loc.set(name, l); }
    return l;
  }

  /* ---- render targets ---- */

  private makeTarget(w: number, h: number): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (this.float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) {
      gl.deleteFramebuffer(fb); gl.deleteTexture(tex);
      if (this.float) { this.float = false; return this.makeTarget(w, h); }
      throw new Error("Could not create a render target");
    }
    return { fb, tex, w, h };
  }

  private freeTarget(t: Target | null) {
    if (!t) return;
    this.gl.deleteFramebuffer(t.fb);
    this.gl.deleteTexture(t.tex);
  }

  private sized(t: Target | null, w: number, h: number): Target {
    if (t && t.w === w && t.h === h) return t;
    this.freeTarget(t);
    return this.makeTarget(w, h);
  }

  /* ---- sizing ---- */

  /* pin the drawing buffer to an exact size (offline rendering); the canvas
     need not be in the document */
  setFixedSize(w: number, h: number) {
    this.fixed = { w, h };
    this.canvas.width = w;
    this.canvas.height = h;
  }

  /* the largest frame this GPU can render in one piece */
  maxSize(): number {
    const gl = this.gl;
    const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    return Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), dims[0], dims[1]);
  }

  resize() {
    if (this.fixed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /* ---- pointer (live stage only; offline renderers never set it) ---- */

  /* x, y as fractions of the canvas, y down; null when the pointer leaves */
  setPointer(x: number | null, y?: number) {
    this.ptrTarget = x == null || y == null ? null : { x, y };
  }

  private easePointer() {
    const W = this.canvas.width, H = this.canvas.height;
    const p = this.ptr, t = this.ptrTarget;
    if (t) {
      const tx = (t.x - 0.5) * (W / H) * 2, ty = (0.5 - t.y) * 2;
      if (p.amt < 0.01) { p.x = tx; p.y = ty; }
      p.x += (tx - p.x) * 0.18; p.y += (ty - p.y) * 0.18;
    }
    p.amt += ((t ? 1 : 0) - p.amt) * 0.08;
  }

  /* ---- passes ---- */

  private drawPattern(c: Config, t: number, into: Target) {
    const gl = this.gl;
    const P = this.pattern;
    const f = (n: string, v: number) => gl.uniform1f(this.u(P, n), v);
    const i = (n: string, v: number) => gl.uniform1i(this.u(P, n), v);
    gl.useProgram(P.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.fb);
    gl.viewport(0, 0, into.w, into.h);
    gl.uniform2f(this.u(P, "uRes"), into.w, into.h);
    f("uTime", t);
    i("uShape", c.shape);
    i("uMotion", c.motion);
    f("uP1", c.p1); f("uP2", c.p2); f("uP3", c.p3);
    f("uP4", c.p4); f("uP5", c.p5); f("uP6", c.p6);
    f("uLines", c.lines);
    f("uHeat", c.heat);
    f("uWidth", c.width);
    f("uEdge", c.edge);
    f("uSeam", c.seam);
    f("uSeamW", c.seamWidth);
    f("uHollow", c.hollow);
    f("uFold", c.fold);
    const pack = (hexes: string[]) => {
      const arr = new Float32Array(18);
      const n = Math.min(6, Math.max(2, hexes.length));
      for (let k = 0; k < n; k++) {
        const [r, g, b] = hexToRgb(hexes[k]);
        arr[k * 3] = r; arr[k * 3 + 1] = g; arr[k * 3 + 2] = b;
      }
      return { arr, n };
    };
    const A = pack(c.stops), B = pack(c.stopsB);
    gl.uniform3fv(this.u(P, "uStops"), A.arr); i("uNStops", A.n);
    gl.uniform3fv(this.u(P, "uStopsB"), B.arr); i("uNStopsB", B.n);
    i("uHalves", c.halves ? 1 : 0);
    i("uSplit", c.split);
    f("uSeamY", c.seamY);
    f("uSplitDepth", c.splitDepth);
    i("uMirror", c.mirror ? 1 : 0);
    i("uMirrorMode", c.mirrorMode);
    f("uPaint", c.paint);
    gl.uniform3fv(this.u(P, "uBg"), new Float32Array(hexToRgb(c.bg)));
    f("uRunSpeed", c.runSpeed);
    f("uRunStretch", c.runStretch);
    f("uRunSpread", c.runSpread);
    f("uRunJitter", c.runJitter);
    f("uHold", c.trailHold);
    f("uPeriod", c.period);
    f("uLife", c.life);
    f("uAngle", c.angle);
    f("uGrain", c.grain);
    f("uGain", c.gain);
    f("uBlur", c.blur);
    f("uGlow", c.glow);
    f("uBlow", c.blow);
    f("uSway", c.sway);
    f("uSlices", Math.round(c.slices));
    f("uSliceShift", c.sliceShift);
    f("uFade", c.fade);
    i("uFadeSide", c.fadeSide);
    f("uTilt", c.tilt);
    f("uDepth", c.depth);
    f("uCrease", c.crease);
    f("uCreaseW", c.creaseWidth);
    gl.uniform2f(this.u(P, "uPointer"), this.ptr.x, this.ptr.y);
    f("uPointerAmt", c.pointer * this.ptr.amt);
    f("uPointerR", c.pointerRadius);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private bind(unit: number, tex: WebGLTexture | null) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }

  /* bloom from scene A (crossfaded to B by mix) into mips[0] */
  private drawBloom(look: Config, mix: number) {
    const gl = this.gl;
    const A = this.sceneA!;
    for (let l = 0; l < BLOOM_LEVELS; l++) {
      this.mips[l] = this.sized(this.mips[l] ?? null, Math.max(1, A.w >> (l + 1)), Math.max(1, A.h >> (l + 1)));
    }
    const radius = look.bloomRadius;
    const D = this.down;
    gl.useProgram(D.p);
    gl.uniform1i(this.u(D, "uSrc"), 0);
    gl.uniform1i(this.u(D, "uSrcB"), 1);
    gl.uniform1f(this.u(D, "uRadius"), radius);
    gl.uniform1f(this.u(D, "uThreshold"), look.bloomThreshold);
    gl.uniform3fv(this.u(D, "uBg"), new Float32Array(hexToRgb(look.bg)));
    for (let l = 0; l < BLOOM_LEVELS; l++) {
      const src = l === 0 ? A : this.mips[l - 1], dst = this.mips[l];
      this.bind(0, src.tex);
      this.bind(1, l === 0 && mix > 0 ? this.sceneB!.tex : src.tex);
      gl.uniform1i(this.u(D, "uPrefilter"), l === 0 ? 1 : 0);
      gl.uniform1f(this.u(D, "uMix"), l === 0 ? mix : 0);
      gl.uniform2f(this.u(D, "uTexel"), 1 / src.w, 1 / src.h);
      gl.uniform2f(this.u(D, "uRes"), dst.w, dst.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const U = this.up;
    gl.useProgram(U.p);
    gl.uniform1i(this.u(U, "uSrc"), 0);
    gl.uniform1f(this.u(U, "uRadius"), radius);
    this.bind(1, null);
    for (let l = BLOOM_LEVELS - 1; l > 0; l--) {
      const src = this.mips[l], dst = this.mips[l - 1];
      this.bind(0, src.tex);
      gl.uniform2f(this.u(U, "uTexel"), 1 / src.w, 1 / src.h);
      gl.uniform2f(this.u(U, "uRes"), dst.w, dst.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  /* draw one frame at time `t` (seconds) */
  draw(t: number) {
    const gl = this.gl;
    const c = this.getConfig();
    this.resize();
    this.easePointer();
    const W = this.canvas.width, H = this.canvas.height;
    this.sceneA = this.sized(this.sceneA, W, H);

    // morph: blend the settings when the looks are compatible, otherwise
    // render both and crossfade in the composite
    let mix = 0;
    let look = c;
    const B = c.morph && c.morphTo ? ({ ...c, ...c.morphTo, morph: false, morphTo: null } as Config) : null;
    if (B) {
      const k = morphAmount(c, t);
      if (canBlend(c, B)) look = lerpConfig(c, B, k);
      else if (k >= 1) look = B;
      else if (k > 0) {
        this.sceneB = this.sized(this.sceneB, W, H);
        this.drawPattern(B, t, this.sceneB);
        mix = k;
      }
    }
    this.drawPattern(look, t, this.sceneA);

    const bloom = mix > 0 ? look.bloom + (B!.bloom - look.bloom) * mix : look.bloom;
    const post = mix > 0.5 ? B! : look;
    if (bloom > 0) this.drawBloom(post, mix);

    const C = this.comp;
    gl.useProgram(C.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    this.bind(0, this.sceneA.tex);
    this.bind(1, mix > 0 ? this.sceneB!.tex : this.sceneA.tex);
    this.bind(2, bloom > 0 ? this.mips[0].tex : this.sceneA.tex);
    gl.uniform1i(this.u(C, "uA"), 0);
    gl.uniform1i(this.u(C, "uB"), 1);
    gl.uniform1i(this.u(C, "uBloomTex"), 2);
    gl.uniform1f(this.u(C, "uMix"), mix);
    gl.uniform1f(this.u(C, "uBloom"), bloom);
    gl.uniform1i(this.u(C, "uHasBloom"), bloom > 0 ? 1 : 0);
    gl.uniform1f(this.u(C, "uTime"), t);
    gl.uniform2f(this.u(C, "uRes"), W, H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  now(): number { return (performance.now() - this.start) / 1000; }

  loop = () => {
    if (!this.paused) this.draw(this.now());
    this.raf = requestAnimationFrame(this.loop);
  };

  play() { this.paused = false; if (!this.raf) this.raf = requestAnimationFrame(this.loop); }
  pause() { this.paused = true; }

  /* render a frame (the current one by default) and hand it back as a PNG blob */
  snapshot(t = this.now()): Promise<Blob> {
    this.draw(t);
    return new Promise((res, rej) => {
      this.canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png");
    });
  }

  dispose() {
    // Do not lose the context here: React StrictMode mounts twice and the
    // second Renderer would inherit a dead context from the same canvas.
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.paused = true;
  }

  /* free every GPU resource and the context itself; for throwaway offline
     renderers whose canvas is never reused */
  destroy() {
    this.dispose();
    const gl = this.gl;
    for (const t of [this.sceneA, this.sceneB, ...this.mips]) this.freeTarget(t);
    this.sceneA = this.sceneB = null;
    this.mips = [];
    for (const P of [this.pattern, this.down, this.up, this.comp]) gl.deleteProgram(P.p);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
