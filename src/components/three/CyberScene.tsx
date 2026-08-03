import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Line, Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const NEON = "#4cc4ff";
const VIOLET = "#a07dff";
const CYAN = "#5ff0e0";

function HoloGlobe() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.16;
  });

  const rings = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const lat = (i / 6) * Math.PI - Math.PI / 2;
      list.push([Math.cos(lat) * 1.62, lat, Math.sin(lat) * 1.62]);
    }
    return list;
  }, []);

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.62, 3]} />
        <meshBasicMaterial color={NEON} wireframe transparent opacity={0.24} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.55, 48, 48]} />
        <meshPhongMaterial
          color="#0b1b30"
          emissive={NEON}
          emissiveIntensity={0.14}
          transparent
          opacity={0.55}
          shininess={90}
        />
      </mesh>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, Math.sin(ring[1]) * 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.max(0.12, ring[0]), 0.004, 8, 96]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function NeuralBrain({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.4;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  const nodes = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 46; i++) {
      const phi = Math.acos(-1 + (2 * i) / 46);
      const theta = Math.sqrt(46 * Math.PI) * phi;
      pts.push(
        new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi),
          Math.sin(theta) * Math.sin(phi) * 0.82,
          Math.cos(phi),
        ).multiplyScalar(0.55),
      );
    }
    return pts;
  }, []);

  const edges = useMemo(() => {
    const list: [THREE.Vector3, THREE.Vector3][] = [];
    nodes.forEach((a, i) => {
      nodes.slice(i + 1).forEach((b) => {
        if (a.distanceTo(b) < 0.34) list.push([a, b]);
      });
    });
    return list.slice(0, 90);
  }, [nodes]);

  return (
    <group ref={group} position={position}>
      {edges.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={VIOLET} lineWidth={0.7} transparent opacity={0.45} />
      ))}
      {nodes.map((n, i) => (
        <mesh key={i} position={n}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color={i % 4 === 0 ? CYAN : NEON} />
        </mesh>
      ))}
    </group>
  );
}

function Shield({ position }: { position: [number, number, number] }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.6);
    s.lineTo(0.45, 0.34);
    s.lineTo(0.45, -0.18);
    s.quadraticCurveTo(0.45, -0.5, 0, -0.66);
    s.quadraticCurveTo(-0.45, -0.5, -0.45, -0.18);
    s.lineTo(-0.45, 0.34);
    s.closePath();
    return s;
  }, []);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.2}>
      <mesh position={position}>
        <extrudeGeometry args={[shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }]} />
        <meshStandardMaterial
          color="#123a5c"
          emissive={NEON}
          emissiveIntensity={0.5}
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>
    </Float>
  );
}

function BinaryField() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
    const pos = ref.current.geometry.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - delta * (0.12 + (i % 5) * 0.03);
      if (y < -5) y = 5;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    ref.current.material.opacity = 0.5 + Math.sin(state.clock.elapsedTime) * 0.08;
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial transparent color={NEON} size={0.028} sizeAttenuation depthWrite={false} />
    </Points>
  );
}

function CityGrid() {
  const towers = useMemo(
    () =>
      Array.from({ length: 54 }, () => ({
        x: (Math.random() - 0.5) * 18,
        z: -Math.random() * 12 - 2,
        h: 0.3 + Math.random() * 2.4,
      })),
    [],
  );
  return (
    <group position={[0, -3.4, 0]}>
      <gridHelper args={[40, 40, NEON, "#1a3350"]} />
      {towers.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2, t.z]}>
          <boxGeometry args={[0.24, t.h, 0.24]} />
          <meshBasicMaterial color={NEON} wireframe transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function DataFlow() {
  const lines = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = new THREE.Vector3(-6 + Math.random() * 2, -2 + Math.random() * 4, -3 + i * 0.2);
        const b = new THREE.Vector3(6 - Math.random() * 2, -2 + Math.random() * 4, -3 + i * 0.2);
        const mid = new THREE.Vector3().lerpVectors(a, b, 0.5).add(new THREE.Vector3(0, Math.random() * 2 - 1, 0));
        return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40);
      }),
    [],
  );
  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color={i % 2 ? CYAN : VIOLET} lineWidth={0.6} transparent opacity={0.18} />
      ))}
    </>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();
  useFrame((_, delta) => {
    camera.position.x += (pointer.x * 1.2 - camera.position.x) * Math.min(1, delta * 2);
    camera.position.y += (0.4 + pointer.y * 0.7 - camera.position.y) * Math.min(1, delta * 2);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function CyberScene() {
  return (
    <Canvas
      dpr={[1, 1.7]}
      camera={{ position: [0, 0.4, 6.2], fov: 52 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#0a1424"]} />
      <fog attach="fog" args={["#0a1424", 8, 20]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 5]} intensity={60} color={NEON} />
      <pointLight position={[-5, -2, 3]} intensity={35} color={VIOLET} />
      <CameraRig />
      <CityGrid />
      <BinaryField />
      <DataFlow />
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.7}>
        <HoloGlobe />
      </Float>
      <Float speed={1.8} rotationIntensity={0.4} floatIntensity={1}>
        <NeuralBrain position={[3.1, 1.1, -0.6]} />
      </Float>
      <Shield position={[-3.2, 0.6, -0.4]} />
    </Canvas>
  );
}
