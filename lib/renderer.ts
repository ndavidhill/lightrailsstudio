import { Config, hexToRgb } from "./config";
import { FRAG, VERT } from "./shader";

/* Thin WebGL2 wrapper: one program, one full-screen triangle, uniforms pushed
   from a Config each frame. The React side owns a ref to the live config so
   slider drags never re-render the tree per frame. */
export class Renderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private start = performance.now();
  private paused = false;
  getConfig: () => Config;

  constructor(public canvas: HTMLCanvasElement, getConfig: () => Config) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error("WebGL2 is not available in this browser");
    this.gl = gl;
    this.getConfig = getConfig;
    this.prog = this.link(VERT, FRAG);
    gl.useProgram(this.prog);
    const names = [
      "uRes", "uTime", "uShape", "uMotion", "uP1", "uP2", "uP3",
      "uLines", "uHeat", "uWidth", "uEdge", "uSeam", "uSeamW", "uHollow",
      "uStops", "uNStops", "uBg",
      "uRunSpeed", "uRunStretch", "uRunSpread", "uRunJitter", "uHold",
      "uPeriod", "uLife",
      "uAngle", "uGrain", "uGain", "uBlur", "uGlow", "uBlow", "uSway",
    ];
    for (const n of names) this.loc[n] = gl.getUniformLocation(this.prog, n);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
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

  private link(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("Program link failed: " + gl.getProgramInfoLog(p));
    }
    return p;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /* draw one frame at time `t` (seconds) */
  draw(t: number) {
    const gl = this.gl;
    const c = this.getConfig();
    const L = this.loc;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(L.uTime, t);
    gl.uniform1i(L.uShape, c.shape);
    gl.uniform1i(L.uMotion, c.motion);
    gl.uniform1f(L.uP1, c.p1); gl.uniform1f(L.uP2, c.p2); gl.uniform1f(L.uP3, c.p3);
    gl.uniform1f(L.uLines, c.lines);
    gl.uniform1f(L.uHeat, c.heat);
    gl.uniform1f(L.uWidth, c.width);
    gl.uniform1f(L.uEdge, c.edge);
    gl.uniform1f(L.uSeam, c.seam);
    gl.uniform1f(L.uSeamW, c.seamWidth);
    gl.uniform1f(L.uHollow, c.hollow);
    const stops = new Float32Array(18);
    const n = Math.min(6, Math.max(2, c.stops.length));
    for (let i = 0; i < n; i++) {
      const [r, g, b] = hexToRgb(c.stops[i]);
      stops[i * 3] = r; stops[i * 3 + 1] = g; stops[i * 3 + 2] = b;
    }
    gl.uniform3fv(L.uStops, stops);
    gl.uniform1i(L.uNStops, n);
    gl.uniform3fv(L.uBg, new Float32Array(hexToRgb(c.bg)));
    gl.uniform1f(L.uRunSpeed, c.runSpeed);
    gl.uniform1f(L.uRunStretch, c.runStretch);
    gl.uniform1f(L.uRunSpread, c.runSpread);
    gl.uniform1f(L.uRunJitter, c.runJitter);
    gl.uniform1f(L.uHold, c.trailHold);
    gl.uniform1f(L.uPeriod, c.period);
    gl.uniform1f(L.uLife, c.life);
    gl.uniform1f(L.uAngle, c.angle);
    gl.uniform1f(L.uGrain, c.grain);
    gl.uniform1f(L.uGain, c.gain);
    gl.uniform1f(L.uBlur, c.blur);
    gl.uniform1f(L.uGlow, c.glow);
    gl.uniform1f(L.uBlow, c.blow);
    gl.uniform1f(L.uSway, c.sway);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  now(): number { return (performance.now() - this.start) / 1000; }

  loop = () => {
    if (!this.paused) this.draw(this.now());
    this.raf = requestAnimationFrame(this.loop);
  };

  play() { this.paused = false; if (!this.raf) this.raf = requestAnimationFrame(this.loop); }
  pause() { this.paused = true; }

  /* render the current frame and hand it back as a PNG blob */
  snapshot(): Promise<Blob> {
    this.draw(this.now());
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
}
