"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A tan thali — the Meal of the Day, modelled.
 *
 * The coffee cup this replaced only ever represented one section of the menu.
 * A thali is the kitchen's actual signature: "two seasonal sabzis, four fulka
 * roti, dal and rice".
 *
 * Built entirely from primitives (one lathe for the plate, one for the katori,
 * reused three times) so there is no model file to download. The whole
 * assembly is tilted ~45° toward the camera because that is the angle food
 * photography uses — a plate seen edge-on from eye level reads as a disc, and
 * you cannot see what is in the bowls.
 */

/** Where the dal katori ends up, so the steam can be placed over it. */
export const DAL_POSITION = new THREE.Vector3(-0.62, 0.22, -0.5);
/** Tilt applied to the whole assembly, in radians. */
export const THALI_TILT = 0.82;

export function Thali({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);

  // ── Plate: a wide, shallow dish with a rolled rim ────────────────────
  const plateGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const add = (r: number, y: number) => pts.push(new THREE.Vector2(r, y));

    add(0.0, 0.0);
    add(1.28, 0.0);
    add(1.42, 0.05);
    add(1.56, 0.15);
    add(1.62, 0.23);
    add(1.64, 0.26); // rim crown
    add(1.6, 0.27);
    add(1.5, 0.19); // fold back down the inside
    add(1.36, 0.08);
    add(1.2, 0.035);
    add(0.0, 0.03);

    return new THREE.LatheGeometry(pts, 128);
  }, []);

  // ── Katori: a small bowl, reused for dal, sabzi and raita ────────────
  const katoriGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const add = (r: number, y: number) => pts.push(new THREE.Vector2(r, y));

    add(0.0, 0.0);
    add(0.2, 0.0);
    add(0.26, 0.04);
    add(0.31, 0.12);
    add(0.34, 0.22);
    add(0.35, 0.26);
    add(0.33, 0.265);
    add(0.315, 0.22);
    add(0.285, 0.12);
    add(0.23, 0.045);
    add(0.0, 0.035);

    return new THREE.LatheGeometry(pts, 56);
  }, []);

  // ── Rice: a low scoop, not a ball.
  //    An earlier version used detail 2 with heavy vertex noise; the visible
  //    facets read as a golf ball rather than as grains. Higher subdivision
  //    plus much subtler displacement keeps the hand-scooped irregularity
  //    without the geometric artefact.
  const riceGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.34, 4);
    g.scale(1, 0.42, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const n = 1 + (Math.random() - 0.5) * 0.025;
      pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n, pos.getZ(i) * n);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const rotiGeo = useMemo(() => new THREE.CylinderGeometry(0.44, 0.45, 0.022, 40), []);

  // Contents sit just below each katori rim.
  const fillGeo = useMemo(() => new THREE.CircleGeometry(0.3, 48), []);

  useFrame((state) => {
    if (reduced || !group.current) return;
    const t = state.clock.elapsedTime;
    // A slow settle, not a turntable spin.
    group.current.rotation.y = Math.sin(t * 0.14) * 0.16;
    group.current.position.y = Math.sin(t * 0.45) * 0.01;
  });

  // Slightly brushed rather than mirror-polished. At metalness 1 / roughness
  // 0.26 the plate's inner wall mirrored the dark environment and read as a
  // hole punched through the middle of the composition.
  const tan = (extra?: Partial<THREE.MeshStandardMaterialParameters>) => (
    <meshStandardMaterial
      color="#caa863"
      roughness={0.36}
      metalness={0.82}
      envMapIntensity={1.5}
      side={THREE.DoubleSide}
      {...extra}
    />
  );

  return (
    <group ref={group} rotation={[THALI_TILT, 0, 0]}>
      {/* Plate */}
      <mesh geometry={plateGeo} castShadow receiveShadow>
        {tan()}
      </mesh>

      {/* Katori 1 — dal */}
      <group position={DAL_POSITION}>
        <mesh geometry={katoriGeo} castShadow receiveShadow>
          {tan({ color: "#bfa05c", envMapIntensity: 1.6 })}
        </mesh>
        <mesh geometry={fillGeo} position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#d9a53c" roughness={0.38} metalness={0.1} />
        </mesh>
      </group>

      {/* Katori 2 — seasonal sabzi */}
      <group position={[0.06, 0.22, -0.74]}>
        <mesh geometry={katoriGeo} castShadow receiveShadow>
          {tan({ color: "#bfa05c", envMapIntensity: 1.6 })}
        </mesh>
        <mesh geometry={fillGeo} position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#57753c" roughness={0.72} metalness={0.02} />
        </mesh>
      </group>

      {/* Katori 3 — raita */}
      <group position={[0.74, 0.22, -0.44]}>
        <mesh geometry={katoriGeo} castShadow receiveShadow>
          {tan({ color: "#bfa05c", envMapIntensity: 1.6 })}
        </mesh>
        <mesh geometry={fillGeo} position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#efe9dc" roughness={0.55} metalness={0.02} />
        </mesh>
      </group>

      {/* Rice */}
      <mesh geometry={riceGeo} position={[-0.52, 0.04, 0.42]} castShadow receiveShadow>
        <meshStandardMaterial color="#f3eddf" roughness={0.88} metalness={0} />
      </mesh>

      {/* Four fulka roti, stacked with a little human imprecision */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          geometry={rotiGeo}
          position={[0.58 + i * 0.006, 0.045 + i * 0.021, 0.5 - i * 0.004]}
          rotation={[0, i * 0.5, i % 2 ? 0.012 : -0.009]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={i === 3 ? "#e6cfa4" : "#dec49a"}
            roughness={0.92}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Lemon wedge — the one spot of pure colour on the plate */}
      <mesh position={[0.02, 0.06, 0.86]} rotation={[0, 0.4, Math.PI / 2]} castShadow>
        <sphereGeometry args={[0.11, 20, 12, 0, Math.PI, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8c33f" roughness={0.42} metalness={0.04} />
      </mesh>
    </group>
  );
}
