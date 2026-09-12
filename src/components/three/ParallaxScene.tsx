"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useTexture } from "@react-three/drei";
import * as THREE from "three";

/**
 * Three-layer scroll parallax.
 *
 *   Layer 01  far     — slate ground + gold bokeh field, ambient pulse
 *   Layer 02  mid     — the keyed food cutouts, cursor tilt + scroll drift
 *   Layer 03  near    — coffee beans and mint leaves at 1.8x scroll speed,
 *                       with per-sprite depth-of-field blur
 *
 * Two honest deviations from a "true 3D" build:
 *
 *   · Layer 02 is textured planes, not GLTF meshes. We have keyed
 *     photographs, not models. Planes are also the right call here — a
 *     photograph rotated hard on Y collapses to a line, so the tilt is
 *     kept small and reads as billboard parallax rather than orbiting a
 *     solid object.
 *
 *   · Depth of field is a 5-tap blur inside the sprite shader, driven by a
 *     per-instance depth attribute, rather than a full EffectComposer
 *     BokehPass. A post-processing pass renders the scene to an offscreen
 *     target and costs far more than this section is worth on a mid-range
 *     phone; sampling five texels gives the same read for a few percent of
 *     the cost.
 */

const PARTICLE_TEXTURES = Array.from(
  { length: 14 },
  (_, i) => `/menu/particle/p${String(i).padStart(2, "0")}.webp`,
);

const SLATE = "#1e242b";

/** Shared scroll state, written once per frame instead of per listener call. */
function useScrollRef() {
  const ref = useRef({ progress: 0, velocity: 0 });
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      ref.current.velocity = y - last;
      last = y;
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      ref.current.progress = y / max;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return ref;
}

// ── Layer 01: gold bokeh ───────────────────────────────────────────────

const bokehVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute float aSize;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.07 + aSeed * 21.0) * 0.9;
    p.y += cos(uTime * 0.05 + aSeed * 13.0) * 0.7;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uPixelRatio * (26.0 / -mv.z), 2.0, 90.0);

    // Ambient pulse: a slow sine, offset per point so the field breathes
    // unevenly rather than blinking in unison.
    float pulse = 0.55 + 0.45 * sin(uTime * 0.5 + aSeed * 6.2831);
    vAlpha = pulse * smoothstep(-34.0, -6.0, mv.z);
  }
`;

const bokehFrag = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    // Soft disc with a brighter core — a plain falloff reads as fog, the
    // core is what makes it read as an out-of-focus highlight.
    float disc = smoothstep(0.5, 0.12, d);
    float core = smoothstep(0.3, 0.0, d) * 0.5;
    float a = (disc * 0.3 + core) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

function BokehField({ count = 90, reduced }: { count?: number; reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = -6 - Math.random() * 16;
      seeds[i] = Math.random();
      sizes[i] = 0.7 + Math.random() * 2.4;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1.5 },
      uColor: { value: new THREE.Color("#c9ab81") },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (mat.current && !reduced) mat.current.uniforms.uTime.value += delta;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        args={[
          {
            uniforms,
            vertexShader: bokehVert,
            fragmentShader: bokehFrag,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}

// ── Layer 02: the food cutouts ─────────────────────────────────────────

function FloatingAsset({
  url,
  position,
  width,
  scrollRef,
  pointer,
  reduced,
  drift,
  /**
   * Continuous in-plane spin, rad/s. Only right for a plate photographed
   * from above — spinning a side-on bowl in its own plane looks like a
   * cartwheel. Leave at 0 for those and let the tilt carry it.
   */
  spin = 0,
  /** Extra spin and lift while the pointer is over the asset. */
  hoverSpin = 3,
}: {
  url: string;
  position: [number, number, number];
  width: number;
  scrollRef: React.RefObject<{ progress: number; velocity: number }>;
  pointer: React.RefObject<{ x: number; y: number }>;
  reduced: boolean;
  drift: number;
  spin?: number;
  hoverSpin?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);
  const spinAngle = useRef(0);
  const tex = useTexture(url);

  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }, [tex]);

  const aspect = (tex.image?.width ?? 1) / (tex.image?.height ?? 1);
  const height = width / aspect;

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.pow(0.0022, delta); // critically damped lerp

    // Bounded cursor tilt. Clamped hard — an unbounded follow makes the
    // plane flip edge-on and vanish at the screen margins.
    const wantRY = reduced ? 0 : THREE.MathUtils.clamp((pointer.current?.x ?? 0) * 0.26, -0.3, 0.3);
    const wantRX = reduced ? 0 : THREE.MathUtils.clamp((pointer.current?.y ?? 0) * 0.18, -0.22, 0.22);
    mesh.current.rotation.y += (wantRY - mesh.current.rotation.y) * k;
    mesh.current.rotation.x += (wantRX - mesh.current.rotation.x) * k;

    // In-plane spin. Accelerates while hovered and keeps its angle when the
    // pointer leaves, so the plate slows down rather than snapping back.
    if (spin !== 0 && !reduced) {
      spinAngle.current += delta * spin * (hovered.current ? hoverSpin : 1);
      mesh.current.rotation.z = spinAngle.current;
    }

    // Scroll drift, an idle bob, and a lift on hover.
    const p = scrollRef.current?.progress ?? 0;
    const lift = hovered.current && !reduced ? 0.22 : 0;
    const wantY = position[1] + (reduced ? 0 : p * drift + Math.sin(t * 0.6 + drift) * 0.06) + lift;
    mesh.current.position.y += (wantY - mesh.current.position.y) * k;

    const wantScale = hovered.current && !reduced ? 1.06 : 1;
    mesh.current.scale.x += (wantScale - mesh.current.scale.x) * k;
    mesh.current.scale.y = mesh.current.scale.x;
  });

  return (
    <mesh
      ref={mesh}
      position={position}
      onPointerOver={() => (hovered.current = true)}
      onPointerOut={() => (hovered.current = false)}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// ── Layer 03: foreground particles with depth-of-field ─────────────────

const spriteVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Five-tap cross blur. `uBlur` is the sprite's distance from the focal
 * plane, so near and far sprites soften while the mid-depth ones stay sharp.
 */
const spriteFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBlur;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 c;
    if (uBlur < 0.002) {
      c = texture2D(uMap, vUv);
    } else {
      float b = uBlur;
      c  = texture2D(uMap, vUv) * 0.36;
      c += texture2D(uMap, vUv + vec2( b, 0.0)) * 0.16;
      c += texture2D(uMap, vUv + vec2(-b, 0.0)) * 0.16;
      c += texture2D(uMap, vUv + vec2(0.0,  b)) * 0.16;
      c += texture2D(uMap, vUv + vec2(0.0, -b)) * 0.16;
    }
    c.a *= uOpacity;
    if (c.a < 0.004) discard;
    gl_FragColor = c;
  }
`;

interface Fleck {
  tex: number;
  x: number;
  y: number;
  z: number;
  size: number;
  spin: number;
  blur: number;
  opacity: number;
  seed: number;
}

function ParticleField({
  scrollRef,
  reduced,
  count = 26,
}: {
  scrollRef: React.RefObject<{ progress: number; velocity: number }>;
  reduced: boolean;
  count?: number;
}) {
  const textures = useTexture(PARTICLE_TEXTURES);
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
    }
  }, [textures]);

  const flecks = useMemo<Fleck[]>(() => {
    const out: Fleck[] = [];
    for (let i = 0; i < count; i++) {
      // z is the parallax depth: nearer flecks are bigger, blurrier and
      // travel further per unit of scroll.
      const z = 1.2 + Math.random() * 3.2;
      const focal = 2.4;
      out.push({
        tex: i % textures.length,
        x: (Math.random() - 0.5) * 17,
        y: (Math.random() - 0.5) * 11,
        z,
        size: 0.22 + z * 0.13,
        spin: (Math.random() - 0.5) * 0.5,
        blur: Math.min(0.02, Math.abs(z - focal) * 0.006),
        opacity: 0.6 + Math.random() * 0.4,
        seed: Math.random(),
      });
    }
    return out;
  }, [count, textures.length]);

  useFrame((state, delta) => {
    if (!group.current || reduced) return;
    const t = state.clock.elapsedTime;
    const p = scrollRef.current?.progress ?? 0;

    group.current.children.forEach((child, i) => {
      const f = flecks[i];
      if (!f) return;
      // 1.8x the page's own scroll rate, scaled by depth so the nearest
      // flecks visibly outrun the midground.
      child.position.y = f.y + p * 18 * 1.8 * (f.z / 4.4);
      child.position.x = f.x + Math.sin(t * 0.25 + f.seed * 11) * 0.28;
      child.rotation.z = f.seed * 6.28 + t * f.spin * 0.35;
    });
    void delta;
  });

  return (
    <group ref={group}>
      {flecks.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} scale={f.size}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            args={[
              {
                uniforms: {
                  uMap: { value: textures[f.tex] },
                  uBlur: { value: f.blur },
                  uOpacity: { value: f.opacity },
                },
                vertexShader: spriteVert,
                fragmentShader: spriteFrag,
                transparent: true,
                depthWrite: false,
              },
            ]}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────

function Scene({
  scrollRef,
  reduced,
  dpr,
}: {
  scrollRef: React.RefObject<{ progress: number; velocity: number }>;
  reduced: boolean;
  dpr: number;
}) {
  const pointer = useRef({ x: 0, y: 0 });
  const { size } = useThree();
  const wide = size.width >= 768;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <>
      <color attach="background" args={[SLATE]} />
      {/* Fog hides the far edge of the bokeh field rather than letting it
          end on a hard line. */}
      <fog attach="fog" args={[SLATE, 12, 30]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 6]} intensity={1.1} color="#fff2dc" />

      <BokehField reduced={reduced} count={dpr < 1.3 ? 55 : 90} />

      {/* The thali used to sit top-left here. It was cropped by the frame
          edge, crowded the headline, and repeated the plate that now carries
          the Meal of the Day band immediately below — so this section keeps
          a single asset and lets the type hold the middle. */}
      <FloatingAsset
        url="/menu/cutout/quinoa-bowl.webp"
        position={wide ? [3.8, -1.7, -0.8] : [1.5, -2.6, -1]}
        width={wide ? 3.4 : 2.8}
        scrollRef={scrollRef}
        pointer={pointer}
        reduced={reduced}
        drift={-2.3}
      />

      <ParticleField scrollRef={scrollRef} reduced={reduced} count={dpr < 1.3 ? 16 : 26} />
    </>
  );
}

export default function ParallaxScene({ className = "" }: { className?: string }) {
  const scrollRef = useScrollRef();
  const [dpr, setDpr] = useState(1.5);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Stop rendering when the band is off-screen or the tab is hidden.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "140px",
    });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={host} className={className} aria-hidden="true">
      <Canvas
        dpr={dpr}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 9], fov: 42, near: 0.1, far: 40 }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr((d) => Math.min(1.6, d + 0.2))}
        />
        <Suspense fallback={null}>
          <Scene scrollRef={scrollRef} reduced={reduced} dpr={dpr} />
        </Suspense>
      </Canvas>
    </div>
  );
}
