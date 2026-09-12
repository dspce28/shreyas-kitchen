"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { CoffeeCup } from "./CoffeeCup";
import { Steam } from "./Steam";
import { Motes } from "./Motes";

/**
 * The hero scene.
 *
 * Budget rules that keep this smooth on a mid-range Android:
 *   · DPR is capped at 1.6 and drops to 1 if the frame rate sags
 *     (PerformanceMonitor), so we never render 3× pixels on a phone.
 *   · One shadow-casting light, 1024² map. Contact shadows are a cheap
 *     ground-plane approximation rather than a second shadow camera.
 *   · The environment is built from Lightformers, not a downloaded HDRI —
 *     nothing to fetch, and the brass rim still gets real reflections.
 *   · The canvas stops rendering entirely when scrolled out of view.
 */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Parallax: the camera leans toward the pointer, and lifts as you scroll. */
function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const onPointer = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      scroll.current = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  useFrame((_, delta) => {
    if (reduced) return;
    // Critically damped follow — snappy but never jittery.
    const k = 1 - Math.pow(0.0015, delta);
    const wantX = target.current.x * 0.55;
    const wantY = 0.35 - target.current.y * 0.32 + scroll.current * 1.1;
    camera.position.x += (wantX - camera.position.x) * k;
    camera.position.y += (wantY - camera.position.y) * k;
    camera.lookAt(0, 0.1 - scroll.current * 0.25, 0);
  });

  return null;
}

/** Pauses rendering when the hero is off-screen or the tab is hidden. */
function RenderGate({ active }: { active: boolean }) {
  const { invalidate, setFrameloop } = useThree();
  useEffect(() => {
    setFrameloop(active ? "always" : "never");
    if (active) invalidate();
  }, [active, invalidate, setFrameloop]);
  return null;
}

/**
 * Places the cup in the frame.
 *
 * On a wide screen it sits to the right of centre and low, leaving the left
 * two-thirds clear for the headline. On a phone the layout stacks, so it
 * centres and drops below the type instead. Scale falls with width so it
 * never grows into the copy.
 */
function Composition({ children }: { children: React.ReactNode }) {
  const { viewport, size } = useThree();
  const wide = size.width >= 768;

  // The cup model spans roughly y −0.55 … +0.45 in local units, so these
  // numbers are chosen to land it in the empty band below the copy: the
  // lower-right corner on desktop, the bottom strip on a phone. Getting this
  // wrong pushes the saucer off-frame entirely, which reads as a bug.
  const scale = wide ? Math.min(1, Math.max(0.62, viewport.width / 9)) : 0.7;

  return (
    <group
      position={wide ? [1.35, -0.95, 0] : [0, -0.72, 0]}
      scale={scale}
      rotation={[0, wide ? -0.32 : -0.12, 0]}
    >
      {children}
    </group>
  );
}

function Scene({ reduced, dpr }: { reduced: boolean; dpr: number }) {
  return (
    <>
      {/* Key light: warm, high and to the right, the only shadow caster. */}
      <directionalLight
        position={[3.4, 5.2, 2.6]}
        intensity={2.6}
        color="#fff1d4"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0012}
      />
      {/* Cool fill from the left so the shadow side is not dead black. */}
      <directionalLight position={[-4, 2, -1.5]} intensity={0.5} color="#9db8c9" />
      {/* Brass bounce from below, the colour of the rim. */}
      <pointLight position={[0, -1.2, 1.8]} intensity={2.2} color="#d8b866" distance={7} decay={2} />
      <ambientLight intensity={0.16} color="#2a2620" />

      <Composition>
        <CoffeeCup reduced={reduced} />
        <Steam reduced={reduced} />
        <ContactShadows
          position={[0, -0.63, 0]}
          opacity={0.62}
          scale={7}
          blur={2.6}
          far={2.2}
          resolution={512}
          color="#000000"
        />
      </Composition>

      {/* Motes stay in world space so they drift across the whole frame. */}
      <Motes reduced={reduced} dpr={dpr} />

      {/* Studio softboxes, built in-scene. No HDRI download. */}
      <Environment resolution={128} frames={1}>
        <Lightformer
          intensity={3.2}
          color="#fff4e0"
          position={[0, 3.5, -2]}
          scale={[8, 3, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          intensity={1.6}
          color="#d8b866"
          position={[3.5, 0.5, 1.5]}
          scale={[3, 4, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          intensity={1.1}
          color="#8ba87a"
          position={[-3.5, 0, 1]}
          scale={[3, 4, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          intensity={0.7}
          color="#ffffff"
          position={[0, -2.5, 2]}
          scale={[5, 2, 1]}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  );
}

export default function HeroScene({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [dpr, setDpr] = useState(1.4);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);

  // Only render while the hero is actually on screen.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden && Boolean(el.offsetParent));
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
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        camera={{ position: [0, 0.35, 5.8], fov: 32, near: 0.1, far: 40 }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr((d) => Math.min(1.6, d + 0.2))}
        />
        <RenderGate active={visible} />
        <CameraRig reduced={reduced} />
        <Suspense fallback={null}>
          <Scene reduced={reduced} dpr={dpr} />
        </Suspense>
      </Canvas>
    </div>
  );
}
