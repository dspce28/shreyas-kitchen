"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Rising steam.
 *
 * Real volumetrics are far too expensive for a hero that must stay smooth on
 * a mid-range phone. This is a few dozen camera-facing quads driven entirely
 * on the GPU: each one carries a random seed, curls upward through a cheap
 * noise field, fades in and out over its lifetime, and loops. No per-frame
 * JavaScript, no particle allocations.
 */

const COUNT = 34;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uRise;
  attribute float aSeed;
  attribute float aScale;
  varying float vAlpha;
  varying vec2 vUv;

  // Cheap hash — good enough for offsets nobody will study frame by frame.
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vUv = uv;

    float life = fract(uTime * uSpeed * (0.55 + hash(aSeed) * 0.5) + aSeed);
    float rise = life * uRise;

    // Curl: two offset sines so the column wanders rather than snaking.
    float drift = sin(uTime * 0.6 + aSeed * 9.0 + rise * 2.2) * 0.16 * life
                + sin(uTime * 0.31 + aSeed * 21.0) * 0.06;
    float driftZ = cos(uTime * 0.48 + aSeed * 13.0 + rise * 1.7) * 0.13 * life;

    // Steam widens and thins as it climbs.
    float scale = aScale * (0.35 + life * 1.9);

    vec3 pos = position * scale;
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xyz += vec3(drift, rise, driftZ);
    // Billboard: add the scaled offset in view space so the quad always
    // faces the camera without a lookAt on the CPU.
    mv.xy += pos.xy;

    // Fade in over the first 15% of life, out over the last 55%.
    vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.45, 1.0, life));

    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    // Soft radial falloff — a hard-edged quad would read as a sheet of paper.
    vec2 c = vUv - 0.5;
    float d = length(c);
    float mask = smoothstep(0.5, 0.03, d);
    mask *= mask;

    float a = mask * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export function Steam({
  reduced,
  opacity = 0.2,
  rise = 2.6,
}: {
  reduced: boolean;
  /** Peak alpha per quad. Small numbers only — steam is nearly invisible. */
  opacity?: number;
  /** How far a wisp climbs before it loops, in local units. */
  rise?: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(0.34, 0.34);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute("position", base.attributes.position);
    geo.setAttribute("uv", base.attributes.uv);
    geo.instanceCount = COUNT;

    const seeds = new Float32Array(COUNT);
    const scales = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      seeds[i] = Math.random();
      scales[i] = 0.7 + Math.random() * 0.9;
    }
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
    // `base` is intentionally not disposed: its buffers are now shared with
    // `geo`, and disposing would free them out from under it.
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 0.16 },
      uRise: { value: rise },
      uColor: { value: new THREE.Color("#efe6d4") },
      uOpacity: { value: opacity },
    }),
    [opacity, rise],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    // Reduced motion still shows steam, frozen — removing it entirely makes
    // the cup look cold.
    mat.current.uniforms.uTime.value += reduced ? 0 : delta;
  });

  return (
    <mesh geometry={geometry} position={[0, 0.36, 0]} frustumCulled={false} renderOrder={2}>
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
    </mesh>
  );
}
