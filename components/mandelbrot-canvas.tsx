'use client'

import { useEffect, useRef } from 'react'

interface Props {
  isDay: boolean
}

// Zoom target: seahorse valley
const TARGET_X = -0.7435669
const TARGET_Y = 0.1314023

const VERT_SRC = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
  precision highp float;
  uniform vec2  u_res;
  uniform float u_zoom;
  uniform vec2  u_center;
  uniform vec3  u_colA;   // inner color (glow)
  uniform vec3  u_colB;   // outer orbit color 1
  uniform vec3  u_colC;   // outer orbit color 2
  uniform float u_alpha;

  void main() {
    vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
    vec2 c = uv / u_zoom + u_center;

    vec2  z  = vec2(0.0);
    float it = 0.0;
    const float MAX = 180.0;

    for (float i = 0.0; i < 180.0; i++) {
      if (dot(z, z) > 4.0) break;
      z  = vec2(z.x*z.x - z.y*z.y + c.x, 2.0*z.x*z.y + c.y);
      it = i;
    }

    if (it >= MAX - 1.0) {
      // interior
      gl_FragColor = vec4(u_colA, u_alpha);
      return;
    }

    // smooth iteration count
    float smooth_it = it + 1.0 - log2(log2(dot(z,z)));
    float t = fract(smooth_it / 32.0);
    vec3 col = mix(u_colB, u_colC, t);

    // dim near boundary
    float brightness = pow(clamp(it / 40.0, 0.0, 1.0), 0.5);
    gl_FragColor = vec4(col * brightness, u_alpha * brightness * 0.9);
  }
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

export function MandelbrotCanvas({ isDay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef({ isDay })

  // keep stateRef in sync without re-running the WebGL init
  stateRef.current.isDay = isDay

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
    if (!gl) return

    // Build program
    const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vert)
    gl.attachShader(prog, frag)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    // Full-screen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Uniform locations
    const uRes    = gl.getUniformLocation(prog, 'u_res')
    const uZoom   = gl.getUniformLocation(prog, 'u_zoom')
    const uCenter = gl.getUniformLocation(prog, 'u_center')
    const uColA   = gl.getUniformLocation(prog, 'u_colA')
    const uColB   = gl.getUniformLocation(prog, 'u_colB')
    const uColC   = gl.getUniformLocation(prog, 'u_colC')
    const uAlpha  = gl.getUniformLocation(prog, 'u_alpha')

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let zoom   = 0.8
    let raf    = 0
    let width  = 0
    let height = 0

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      width  = Math.max(1, Math.round(rect.width  * devicePixelRatio))
      height = Math.max(1, Math.round(rect.height * devicePixelRatio))
      canvas!.width  = width
      canvas!.height = height
      gl!.viewport(0, 0, width, height)
    }

    function render() {
      zoom *= 1.0025  // slow zoom in

      // reset periodically so it never gets too deep
      if (zoom > 6000) zoom = 0.8

      const { isDay } = stateRef.current

      // Day palette: soft indigo/lavender on near-white
      // Night palette: deep purple/cyan on near-black
      const [colA, colB, colC] =
        isDay
          ? [[0.87, 0.85, 0.95], [0.55, 0.35, 0.90], [0.30, 0.60, 0.95]] as const
          : [[0.04, 0.02, 0.10], [0.48, 0.10, 0.90], [0.05, 0.80, 0.90]] as const

      const alpha = isDay ? 0.18 : 0.28

      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)

      gl!.uniform2f(uRes,    width, height)
      gl!.uniform1f(uZoom,   zoom)
      gl!.uniform2f(uCenter, TARGET_X, TARGET_Y)
      gl!.uniform3fv(uColA,  colA)
      gl!.uniform3fv(uColB,  colB)
      gl!.uniform3fv(uColC,  colC)
      gl!.uniform1f(uAlpha,  alpha)

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)

      raf = requestAnimationFrame(render)
    }

    // Initial resize — read parent if canvas rect is still 0
    resize()
    if (width === 0 || height === 0) {
      const parent = canvas.parentElement
      if (parent) {
        const r = parent.getBoundingClientRect()
        width  = Math.max(1, Math.round(r.width  * devicePixelRatio))
        height = Math.max(1, Math.round(r.height * devicePixelRatio))
        canvas.width  = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    render()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, []) // intentionally run once; isDay is read from stateRef on every frame

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
}
