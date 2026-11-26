"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

out vec2 vUv;

void main() {
  vec2 pos = POSITIONS[gl_VertexID];
  vUv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;      // normalized [-1..1]
uniform float uPointerGlow; // smooth 0..1 when pointer is active
uniform vec3 uClickRipple;  // xy = normalized uv, z = age in seconds (< 0 inactive)

// Haziri.AI Monochrome Platinum Palette
const vec3 C_BLACK    = vec3(0.0353, 0.0392, 0.0431); // #090A0B
const vec3 C_CHARCOAL = vec3(0.0784, 0.0902, 0.0980); // #141719
const vec3 C_GRAPHITE = vec3(0.1333, 0.1529, 0.1647); // #22272A
const vec3 C_PLATINUM = vec3(0.7255, 0.8157, 0.8471); // #B9D0D8
const vec3 C_SILVER   = vec3(0.5686, 0.6667, 0.7059); // #91AAB4
const vec3 C_GOLD     = vec3(0.8039, 0.7490, 0.6157); // #CDBF9D
const vec3 C_WHITE    = vec3(0.9608, 0.9647, 0.9647); // #F5F6F6

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

mat2 rot2D(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

// Smooth underwater/prism Voronoi caustic web (computes crisp glowing cell ridges)
float voronoiCaustic(vec2 x, float t) {
  vec2 n = floor(x);
  vec2 f = fract(x);

  float minDist = 8.0;
  float secondDist = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      // Slow fluid cellular drift
      o = 0.5 + 0.44 * sin(t * 0.42 + 6.28318 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);

      if (d < minDist) {
        secondDist = minDist;
        minDist = d;
      } else if (d < secondDist) {
        secondDist = d;
      }
    }
  }

  // Distance to the glowing Voronoi ridge where refracted rays focus
  float edge = sqrt(secondDist) - sqrt(minDist);
  float ridge = pow(1.0 - smoothstep(0.0, 0.34, edge), 3.4);
  float nodeGlint = pow(1.0 - smoothstep(0.0, 0.14, edge), 5.0) * 0.45;
  return ridge + nodeGlint;
}

// Dual-layer liquid prism caustic field
float sampleCaustics(vec2 p, float t) {
  // Gentle optical surface wave bend
  vec2 warp = vec2(
    sin(p.y * 1.4 + t * 0.25) * 0.16 + cos(p.x * 0.9 - t * 0.18) * 0.11,
    cos(p.x * 1.3 - t * 0.22) * 0.16 + sin(p.y * 1.1 + t * 0.20) * 0.11
  );

  vec2 pA = rot2D(0.24) * (p * 1.85 + warp + vec2(t * 0.045, -t * 0.032));
  vec2 pB = rot2D(-0.38) * (p * 2.85 - warp * 0.75 + vec2(-t * 0.038, t * 0.028));

  float cA = voronoiCaustic(pA, t * 0.85);
  float cB = voronoiCaustic(pB, t * 1.05 + 4.2);

  // Multiplicative resonance highlights bright prism intersections cleanly
  return clamp(cA * 0.62 + cB * 0.42 + (cA * cB) * 0.75, 0.0, 1.35);
}

// Cinematic refracted glass light beams sweeping gently across obsidian
float sampleGlassBeams(vec2 p, float t, vec2 ptr) {
  vec2 rp = rot2D(-0.54 + ptr.x * 0.05) * p;

  float driftA = sin(t * 0.16) * 0.16 + ptr.x * 0.18;
  float driftB = cos(t * 0.13 + 1.4) * 0.18 - ptr.x * 0.12;
  float driftC = sin(t * 0.11 + 3.1) * 0.14 + ptr.y * 0.10;

  // Soft wide volumetric shaft + sharper refracted prism core
  float b1 =
    exp(-pow((rp.x + 0.52 - driftA) / 0.26, 2.0)) * 0.65 +
    exp(-pow((rp.x + 0.49 - driftA) / 0.075, 2.0)) * 0.48;

  float b2 =
    exp(-pow((rp.x - 0.18 - driftB) / 0.32, 2.0)) * 0.58 +
    exp(-pow((rp.x - 0.22 - driftB) / 0.085, 2.0)) * 0.42;

  float b3 =
    exp(-pow((rp.x - 0.84 - driftC) / 0.22, 2.0)) * 0.46 +
    exp(-pow((rp.x - 0.82 - driftC) / 0.065, 2.0)) * 0.34;

  // Directional skylight attenuation from upper-right to lower-left
  float verticalSoft = smoothstep(-1.35, 0.95, rp.y * 0.62 + 0.32);

  // Fine shimmering refraction striations inside the beam
  float striation = 0.84 + 0.16 * sin(rp.x * 16.0 + t * 0.45 + sin(rp.y * 2.5 - t * 0.3) * 1.4);

  return clamp((b1 + b2 + b3) * verticalSoft * striation, 0.0, 1.4);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;

  float t = uTime;
  vec2 ptrPos = vec2(uPointer.x * aspect, uPointer.y);

  // Subtle glass lens bending around the cursor (Apple Glass optical refraction)
  vec2 toPtr = p - ptrPos;
  float ptrDist = length(toPtr);
  vec2 lensWarp = vec2(0.0);
  if (uPointerGlow > 0.002 && ptrDist > 0.0001) {
    float lensField = exp(-ptrDist * ptrDist * 2.8) * uPointerGlow;
    lensWarp = (toPtr / ptrDist) * lensField * 0.11;
  }

  // Click refracted crystal wave
  vec2 rippleWarp = vec2(0.0);
  float rippleGlow = 0.0;
  if (uClickRipple.z >= 0.0 && uClickRipple.z < 3.0) {
    vec2 clickPos = (uClickRipple.xy - 0.5) * vec2(aspect, 1.0) * 2.0;
    vec2 dc = p - clickPos;
    float cDist = length(dc);
    float ringR = uClickRipple.z * 0.95;
    float band = exp(-pow((cDist - ringR) / 0.11, 2.0));
    float env = 1.0 - smoothstep(0.0, 3.0, uClickRipple.z);
    if (cDist > 0.0001) {
      rippleWarp = (dc / cDist) * sin((cDist - ringR) * 24.0) * band * env * 0.065;
    }
    rippleGlow = band * env * 0.34;
  }

  vec2 refractedP = p - lensWarp + rippleWarp;

  // Monochrome optical prism dispersion (Silver Blue / Platinum / Faint Pale Gold)
  vec2 dispAxis = normalize(vec2(0.82, 0.57)) * (0.022 + length(lensWarp) * 0.25);

  float causticS = sampleCaustics(refractedP + dispAxis * 1.15, t);
  float causticP = sampleCaustics(refractedP, t);
  float causticG = sampleCaustics(refractedP - dispAxis * 1.15, t);

  float beamS = sampleGlassBeams(refractedP + dispAxis * 0.9, t, uPointer);
  float beamP = sampleGlassBeams(refractedP, t, uPointer);
  float beamG = sampleGlassBeams(refractedP - dispAxis * 0.9, t, uPointer);

  // Smooth obsidian glass base (deep Absolute Black -> subtle Charcoal sheen)
  vec3 col = mix(C_BLACK, C_CHARCOAL, smoothstep(1.25, -0.85, uv.y) * 0.50);

  // Soft diagonal refracted glass light beams (tuned -20% for deeper obsidian contrast)
  vec3 beamCol =
      C_SILVER   * (beamS * 0.100)
    + C_PLATINUM * (beamP * 0.116)
    + C_GOLD     * (pow(beamG, 1.4) * 0.054);

  // Underwater / prism crystalline caustic webs (brighten naturally inside the light beams)
  vec3 causticCol =
      C_SILVER   * (causticS * 0.112)
    + C_PLATINUM * (causticP * 0.152)
    + C_GOLD     * (pow(causticG, 1.65) * 0.070)
    + C_WHITE    * (pow(causticP, 2.6) * 0.080);

  col += beamCol;
  col += causticCol * (0.36 + beamP * 0.85);

  // Subtle focused optical shimmer around cursor lens
  float ptrShimmer = exp(-ptrDist * ptrDist * 2.6) * uPointerGlow;
  col += mix(C_PLATINUM, C_GOLD, 0.24) * (ptrShimmer * (0.044 + causticP * 0.080));

  // Click crystal refraction bloom
  col += mix(C_PLATINUM, C_GOLD, 0.30) * (rippleGlow * (0.224 + causticP * 0.384));

  // Balanced dark obsidian vignette to preserve crisp contrast on cards & tables
  float vig = smoothstep(1.68, 0.34, length(p * vec2(0.66, 0.82)));
  col = mix(C_BLACK, col, 0.40 + 0.60 * vig);

  // Ultra-fine optical grain (eliminates 8-bit dark banding)
  float grain = (hash12(gl_FragCoord.xy + fract(t * 0.31) * 256.0) - 0.5) * 0.014;
  col = clamp(col + grain, 0.0, 1.0);

  fragColor = vec4(col, 1.0);
}
`;

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Graceful HTML5 2D fallback rendering soft angled refracted glass light beams
 * across dark obsidian when WebGL2 is unavailable.
 */
function render2DFallback(
  canvas: HTMLCanvasElement,
  timeSec: number,
  ptrX: number,
  ptrY: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const targetW = Math.floor(width * dpr);
  const targetH = Math.floor(height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#111518");
  base.addColorStop(0.55, "#090A0B");
  base.addColorStop(1, "#060708");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const shafts = [
    { x: 0.28 + Math.sin(timeSec * 0.16) * 0.05 + ptrX * 0.05, w: width * 0.24, c: "rgba(185, 208, 216, 0.104)" },
    { x: 0.58 + Math.cos(timeSec * 0.13) * 0.06 - ptrX * 0.04, w: width * 0.2, c: "rgba(145, 170, 180, 0.096)" },
    { x: 0.8 + Math.sin(timeSec * 0.11) * 0.04 + ptrY * 0.03, w: width * 0.14, c: "rgba(205, 191, 157, 0.060)" },
  ];

  for (const s of shafts) {
    ctx.save();
    ctx.translate(s.x * width, height * 0.42);
    ctx.rotate(-0.54);
    const grad = ctx.createLinearGradient(-s.w, 0, s.w, 0);
    grad.addColorStop(0, "rgba(9, 10, 11, 0)");
    grad.addColorStop(0.5, s.c);
    grad.addColorStop(1, "rgba(9, 10, 11, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(-s.w, -height, s.w * 2, height * 2.2);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Shader Caustics / Refracted Glass Light Beams (WebGL2 GLSL Fragment Shader).
 * Projects slow underwater / prism-like Voronoi light caustics and cinematic
 * refracted light beams across smooth dark obsidian glass in Silver Blue,
 * Platinum, and faint Pale Gold. Auto-pauses when hidden or reduced motion.
 */
export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let rafId: number | null = null;
    let lastTimestamp = performance.now();
    let elapsed = 5.4;
    let usingFallback = false;

    const pointer = {
      targetX: 0,
      targetY: 0,
      x: 0,
      y: 0,
      targetGlow: 0,
      glow: 0,
    };

    const clickRipple = {
      x: 0.5,
      y: 0.5,
      age: -1,
    };

    let gl: WebGL2RenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let uResolution: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uPointer: WebGLUniformLocation | null = null;
    let uPointerGlow: WebGLUniformLocation | null = null;
    let uClickRipple: WebGLUniformLocation | null = null;

    try {
      gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch {
      gl = null;
    }

    if (gl) {
      program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
      if (program) {
        vao = gl.createVertexArray();
        uResolution = gl.getUniformLocation(program, "uResolution");
        uTime = gl.getUniformLocation(program, "uTime");
        uPointer = gl.getUniformLocation(program, "uPointer");
        uPointerGlow = gl.getUniformLocation(program, "uPointerGlow");
        uClickRipple = gl.getUniformLocation(program, "uClickRipple");
      } else {
        gl = null;
      }
    }

    if (!gl || !program) {
      usingFallback = true;
    }

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (gl && !usingFallback) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    const draw = (timeSec: number, dt: number) => {
      const damp = 1 - Math.exp(-4.0 * dt);
      pointer.x += (pointer.targetX - pointer.x) * damp;
      pointer.y += (pointer.targetY - pointer.y) * damp;
      pointer.glow += (pointer.targetGlow - pointer.glow) * damp;

      if (clickRipple.age >= 0) {
        clickRipple.age += dt;
        if (clickRipple.age > 3.05) {
          clickRipple.age = -1;
        }
      }

      if (usingFallback || !gl || !program) {
        render2DFallback(canvas, timeSec, pointer.x, pointer.y);
        return;
      }

      gl.useProgram(program);
      if (vao) {
        gl.bindVertexArray(vao);
      }
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, timeSec);
      if (uPointer) gl.uniform2f(uPointer, pointer.x, pointer.y);
      if (uPointerGlow) gl.uniform1f(uPointerGlow, pointer.glow);
      if (uClickRipple) {
        gl.uniform3f(uClickRipple, clickRipple.x, clickRipple.y, clickRipple.age);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimestamp) / 1000));
      lastTimestamp = now;
      elapsed += dt;
      draw(elapsed, dt);
      rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (reducedMotion || document.hidden || rafId !== null) {
        return;
      }
      lastTimestamp = performance.now();
      rafId = window.requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      pointer.targetX = Math.max(-1, Math.min(1, (event.clientX / w) * 2 - 1));
      pointer.targetY = Math.max(-1, Math.min(1, 1 - (event.clientY / h) * 2));
      pointer.targetGlow = 1;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (reducedMotion) return;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      clickRipple.x = event.clientX / w;
      clickRipple.y = 1 - event.clientY / h;
      clickRipple.age = 0;
    };

    const handlePointerLeave = () => {
      pointer.targetGlow = 0;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    const handleResize = () => {
      resize();
      if (reducedMotion) {
        draw(elapsed, 0.016);
      }
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      usingFallback = true;
      gl = null;
      program = null;
      vao = null;
      draw(elapsed, 0.016);
    };

    resize();
    draw(elapsed, 0.016);

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    window.addEventListener("resize", handleResize, { passive: true });
    if (!reducedMotion) {
      startLoop();
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerdown", handlePointerDown, { passive: true });
      document.addEventListener("pointerleave", handlePointerLeave);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      stopLoop();
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (gl) {
        if (vao) gl.deleteVertexArray(vao);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="fluid-canvas-bg"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
