"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Warm dust motes drifting through the key light — the detail that makes a
 * rendered scene feel photographed rather than modelled.
 *
 * One Points object, one draw call, animated in the vertex shader.
 */

const COUNT = 140;
const SPREAD = 7;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute float aSize;
  varying float vAlpha;

  void main() {
    vec3 p = position;

    // Each mote drifts on its own slow lissajous path.
    p.x += sin(uTime * 0.11 + aSeed * 17.0) * 0.5;
    p.y += sin(uTime * 0.07 + aSeed * 31.0) * 0.4
         + mod(uTime * 0.035 + aSeed, 1.0) * 1.2 - 0.6;
    p.z += cos(uTime * 0.09 + aSeed * 23.0) * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Perspective-correct point size, clamped so near motes do not blot out
    // the scene on high-DPI screens.
    gl_PointSize = clamp(aSize * uPixelRatio * (9.0 / -mv.z), 1.0, 9.0);

    // Fade with depth so the far field stays quiet.
    vAlpha = smoothstep(-14.0, -3.0, mv.z) * (0.3 + 0.7 * sin(uTime * 0.5 + aSeed * 40.0) * 0.5 + 0.35);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float mask = smoothstep(0.5, 0.06, d);
    float a = mask * vAlpha * 0.5;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export function Motes({ reduced, dpr }: { reduced: boolean; dpr: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 1] = (Math.random() - 0.35) * SPREAD * 0.7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD * 0.8;
      seeds[i] = Math.random();
      sizes[i] = 0.6 + Math.random() * 1.8;
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uColor: { value: new THREE.Color("#f0dca4") },
    }),
    [dpr],
  );

  useFrame((_, delta) => {
    if (!mat.current || reduced) return;
    mat.current.uniforms.uTime.value += delta;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        args={[
          {
            uniforms,
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}
