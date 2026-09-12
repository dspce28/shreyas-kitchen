"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A porcelain cup, built procedurally rather than loaded as a model — it is
 * ~3 kB of geometry instead of a multi-megabyte GLB, and the brass rim can be
 * recoloured from the design tokens.
 *
 * The silhouette is a lathe: a profile drawn in 2D and revolved. Getting the
 * profile right is most of the work — the subtle outward flare near the lip
 * is what stops it reading as a paper cup.
 */
export function CoffeeCup({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const liquid = useRef<THREE.Mesh>(null);

  const profile = useMemo(() => {
    // (radius, height) pairs from the foot up to the lip.
    const pts: THREE.Vector2[] = [];
    const add = (r: number, y: number) => pts.push(new THREE.Vector2(r, y));

    add(0.0, 0.0);
    add(0.52, 0.0);
    add(0.54, 0.015);
    add(0.5, 0.05); // undercut above the foot — catches a highlight
    add(0.52, 0.1);
    add(0.6, 0.28);
    add(0.68, 0.52);
    add(0.74, 0.78);
    add(0.78, 0.96); // lip flare
    add(0.785, 1.0);
    // Fold back down the inside wall so the cup has real thickness.
    add(0.755, 1.0);
    add(0.75, 0.96);
    add(0.7, 0.72);
    add(0.62, 0.44);
    add(0.55, 0.2);
    add(0.5, 0.09);
    add(0.0, 0.075);

    return pts;
  }, []);

  const cupGeo = useMemo(
    () => new THREE.LatheGeometry(profile, 96),
    [profile],
  );

  // The handle follows a partial torus, squashed slightly so it reads as
  // hand-thrown rather than machined.
  const handleGeo = useMemo(() => {
    const g = new THREE.TorusGeometry(0.3, 0.055, 20, 72, Math.PI * 1.25);
    g.scale(1, 1.15, 0.72);
    return g;
  }, []);

  const saucerGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const add = (r: number, y: number) => pts.push(new THREE.Vector2(r, y));
    add(0.0, 0.0);
    add(1.25, 0.0);
    add(1.3, 0.02);
    add(1.32, 0.06);
    add(1.26, 0.07);
    add(1.2, 0.045);
    add(0.62, 0.03);
    add(0.58, 0.055);
    add(0.0, 0.05);
    return new THREE.LatheGeometry(pts, 96);
  }, []);

  useFrame((state) => {
    if (reduced || !group.current) return;
    const t = state.clock.elapsedTime;
    // A slow drift, not a spin — a rotating product shot looks like a
    // turntable demo; this looks like the cup is simply sitting there.
    group.current.rotation.y = Math.sin(t * 0.16) * 0.22 - 0.35;
    group.current.position.y = Math.sin(t * 0.5) * 0.012;

    if (liquid.current) {
      const m = liquid.current.material as THREE.MeshStandardMaterial;
      // The coffee surface catches light as the cup drifts.
      m.roughness = 0.12 + Math.sin(t * 0.4) * 0.03;
    }
  });

  return (
    <group ref={group} position={[0, -0.55, 0]}>
      {/* Saucer */}
      <mesh geometry={saucerGeo} position={[0, -0.07, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color="#f2ece0"
          roughness={0.28}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cup body */}
      <mesh geometry={cupGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#faf6ee"
          roughness={0.22}
          metalness={0.03}
          envMapIntensity={1.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Brass rim — a hair above the lip so it never z-fights the lathe */}
      <mesh position={[0, 1.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.752, 0.788, 96]} />
        <meshStandardMaterial
          color="#d8b866"
          roughness={0.18}
          metalness={1}
          envMapIntensity={2.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Handle */}
      <mesh
        geometry={handleGeo}
        position={[0.72, 0.62, 0]}
        rotation={[0, 0, -Math.PI * 0.62]}
        castShadow
      >
        <meshStandardMaterial color="#faf6ee" roughness={0.24} metalness={0.03} />
      </mesh>

      {/* Coffee */}
      <mesh ref={liquid} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.735, 96]} />
        <meshStandardMaterial
          color="#2b1409"
          roughness={0.14}
          metalness={0.42}
          envMapIntensity={1.6}
        />
      </mesh>

      {/* Crema ring — the lighter edge where coffee meets porcelain */}
      <mesh position={[0, 0.902, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 0.735, 96]} />
        <meshStandardMaterial color="#6b3d1c" roughness={0.5} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}
