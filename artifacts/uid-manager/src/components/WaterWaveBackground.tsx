import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── STATE (spring-smoothed, zero allocations in loop) ───────────
const targetMouse = new THREE.Vector2(0, 0);
const currentMouse = new THREE.Vector2(0, 0);
const mouseVel = new THREE.Vector2(0, 0);
const scroll = { v: 0, spin: 0, _ty: 0 };

function springStep(dt: number) {
  const k = 12, d = 7.5;
  mouseVel.x += (targetMouse.x - currentMouse.x) * k * dt;
  mouseVel.y += (targetMouse.y - currentMouse.y) * k * dt;
  const decay = Math.exp(-d * dt);
  mouseVel.x *= decay; mouseVel.y *= decay;
  currentMouse.x += mouseVel.x * dt;
  currentMouse.y += mouseVel.y * dt;
}

// ─── BACKDROP — deep gradient + ambient glow ─────────────────────
function Backdrop() {
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => { uniforms.uTime.value += Math.min(dt, 0.05); });

  return (
    <mesh scale={[viewport.width * 2, viewport.height * 2, 1]} position={[0, 0, -8]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          void main(){
            vec2 p = vUv - 0.5;
            vec3 col = mix(vec3(0.045, 0.07, 0.16), vec3(0.012, 0.016, 0.05), length(p) * 1.8);
            // do soft drifting glows
            vec2 b1 = vec2(sin(uTime * 0.1) * 0.25, cos(uTime * 0.08) * 0.2);
            vec2 b2 = vec2(cos(uTime * 0.07 + 2.0) * 0.3, sin(uTime * 0.09) * 0.22);
            col += vec3(0.10, 0.05, 0.30) * exp(-dot(p - b1, p - b1) * 22.0) * 0.8;
            col += vec3(0.00, 0.20, 0.28) * exp(-dot(p - b2, p - b2) * 26.0) * 0.7;
            float grain = fract(sin(dot(vUv * 999.0, vec2(12.9898, 78.233))) * 43758.5453);
            col += (grain - 0.5) * 0.012;
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

// ─── ENERGY CORE — pulsing fresnel sphere + wireframe shell ──────
function EnergyCore() {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPulse: { value: 0 },
  }), []);

  useFrame((s, dt) => {
    if (!group.current || !shell.current) return;
    const cl = Math.min(dt, 0.05);
    springStep(cl);
    scroll.v *= Math.exp(-2.5 * cl);
    scroll.spin += scroll.v * 4.0;          // scroll = core spin
    const t = s.clock.elapsedTime;

    uniforms.uTime.value = t;
    uniforms.uPulse.value = Math.min(1.5, Math.abs(scroll.v) * 25.0 + mouseVel.length() * 1.5);

    // core mouse ki taraf jhukta hai + scroll spin
    group.current.rotation.y = t * 0.12 + currentMouse.x * 0.6 + scroll.spin;
    group.current.rotation.x = Math.sin(t * 0.08) * 0.1 - currentMouse.y * 0.45;
    // breathing + interaction pulse
    const sc = 1 + Math.sin(t * 0.8) * 0.03 + uniforms.uPulse.value * 0.06;
    group.current.scale.setScalar(sc);
    // wireframe shell opposite spin — mechanical depth
    shell.current.rotation.y = -t * 0.18 - scroll.spin * 0.5;
    shell.current.rotation.z = t * 0.05;
  });

  return (
    <group ref={group} position={[0, -1.2, -1.5]}>
      {/* inner glowing sphere */}
      <mesh>
        <icosahedronGeometry args={[0.85, 24]} />
        <shaderMaterial
          transparent
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPos;
            void main(){
              vNormal = normalize(normalMatrix * normal);
              vPos = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            uniform float uPulse;
            varying vec3 vNormal;
            varying vec3 vPos;
            void main(){
              vec3 viewDir = normalize(cameraPosition - vPos);
              float fres = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.6);
              vec3 cyan = vec3(0.13, 0.83, 0.93);
              vec3 violet = vec3(0.43, 0.36, 1.0);
              vec3 col = mix(vec3(0.01, 0.02, 0.06), mix(cyan, violet, 0.5 + 0.5 * sin(uTime * 0.6)), fres);
              col += cyan * fres * (0.5 + uPulse * 0.8);   // interaction = brighter rim
              float bands = 0.5 + 0.5 * sin(vPos.y * 14.0 - uTime * 2.0);
              col += violet * bands * 0.06;                 // energy bands
              gl_FragColor = vec4(col, 0.55 + fres * 0.45);
            }
          `}
        />
      </mesh>
      {/* wireframe shell */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

// ─── ORBIT RINGS — do tilted glowing rings ───────────────────────
function OrbitRings() {
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (r1.current) {
      r1.current.rotation.x = 1.2 + Math.sin(t * 0.2) * 0.1 - currentMouse.y * 0.25;
      r1.current.rotation.y = t * 0.25 + scroll.spin + currentMouse.x * 0.3;
    }
    if (r2.current) {
      r2.current.rotation.x = 2.0 + Math.cos(t * 0.15) * 0.1 + currentMouse.y * 0.2;
      r2.current.rotation.y = -t * 0.18 - scroll.spin * 0.7 - currentMouse.x * 0.25;
    }
  });

  return (
    <group position={[0, -1.2, -1.5]}>
      <mesh ref={r1}>
        <torusGeometry args={[1.7, 0.006, 8, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[2.1, 0.005, 8, 96]} />
        <meshBasicMaterial color="#6d5cff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ─── PLEXUS NETWORK — 3D particles + precomputed connections ────
function Plexus() {
  const ptsRef = useRef<THREE.Points>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const count = 220;

  const { pos, seeds, linePos } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const sd = new Float32Array(count);
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      // shell distribution around core
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.6 + Math.random() * 3.4;
      const v = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.75,
        r * Math.cos(phi) * 0.6 - 1
      );
      nodes.push(v);
      p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z;
      sd[i] = Math.random() * 100;
    }
    // connections ek hi baar compute — runtime O(1)
    const pairs: number[] = [];
    for (let i = 0; i < count; i++) {
      let added = 0;
      for (let j = i + 1; j < count && added < 2; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 1.25) {
          pairs.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
          added++;
        }
      }
    }
    return { pos: p, seeds: sd, linePos: new Float32Array(pairs) };
  }, []);

  const ptUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
  }), []);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    ptUniforms.uTime.value = t;
    ptUniforms.uMouse.value.copy(currentMouse);
    if (ptsRef.current && lineRef.current) {
      // pura network dheere ghoomta hai + mouse drag feel
      const ry = t * 0.04 + scroll.spin * 0.3 + currentMouse.x * 0.2;
      const rx = currentMouse.y * -0.12;
      ptsRef.current.rotation.y = ry; lineRef.current.rotation.y = ry;
      ptsRef.current.rotation.x = rx; lineRef.current.rotation.x = rx;
    }
  });

  return (
    <group>
      <points ref={ptsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={pos} count={count} itemSize={3} />
          <bufferAttribute attach="attributes-aSeed" array={seeds} count={count} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          transparent depthWrite={false} blending={THREE.AdditiveBlending}
          uniforms={ptUniforms}
          vertexShader={`
            attribute float aSeed;
            uniform float uTime;
            uniform vec2 uMouse;
            varying float vA;
            varying float vHot;
            void main(){
              vec3 p = position;
              p.y += sin(uTime * 0.3 + aSeed) * 0.12;
              p.x += cos(uTime * 0.25 + aSeed * 2.0) * 0.1;
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              // screen-space mein mouse ke paas wale nodes HOT ho jate hain
              vec4 clip = projectionMatrix * mv;
              vec2 ndc = clip.xy / clip.w;
              float mDist = length(ndc - uMouse);
              vHot = exp(-mDist * mDist * 6.0);
              float tw = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 1.4 + aSeed * 7.0));
              vA = tw * smoothstep(14.0, 4.0, -mv.z);
              gl_PointSize = (1.6 + vHot * 4.5) * (60.0 / -mv.z);
              gl_Position = clip;
            }
          `}
          fragmentShader={`
            varying float vA;
            varying float vHot;
            void main(){
              float d = length(gl_PointCoord - 0.5);
              if(d > 0.5) discard;
              float g = smoothstep(0.5, 0.0, d);
              vec3 cold = vec3(0.45, 0.65, 0.95);
              vec3 hot = vec3(0.2, 0.95, 1.0);
              vec3 col = mix(cold, hot, vHot);
              gl_FragColor = vec4(col, g * g * (vA * 0.5 + vHot * 0.6));
            }
          `}
        />
      </points>
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={linePos} count={linePos.length / 3} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b6ea5" transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// ─── CAMERA RIG — spring parallax + scroll dolly ─────────────────
function Rig() {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const cl = Math.min(dt, 0.05);
    const f = 1 - Math.exp(-3.5 * cl);
    camera.position.x += (currentMouse.x * 0.7 - camera.position.x) * f;
    camera.position.y += (currentMouse.y * 0.45 - camera.position.y) * f;
    // scroll pe camera halka sa zoom in/out
    const targetZ = 4 + Math.min(0.8, Math.abs(scroll.v) * 10.0);
    camera.position.z += (targetZ - camera.position.z) * f;
    camera.lookAt(0, 0, -1);
  });
  return null;
}

// ─── ROOT ─────────────────────────────────────────────────────────
export function WaterWaveBackground() {
  useEffect(() => {
    const onM = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onW = (e: WheelEvent) => { scroll.v += e.deltaY * 0.00009; };
    const onTS = (e: TouchEvent) => { scroll._ty = e.touches[0].clientY; };
    const onTM = (e: TouchEvent) => {
      scroll.v += (scroll._ty - e.touches[0].clientY) * 0.00035;
      scroll._ty = e.touches[0].clientY;
      targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onM, { passive: true });
    window.addEventListener("wheel", onW, { passive: true });
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchmove", onTM, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onM);
      window.removeEventListener("wheel", onW);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove", onTM);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#04060f] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50, near: 0.1, far: 30 }}
        dpr={1}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
      >
        <Backdrop />
        <EnergyCore />
        <OrbitRings />
        <Plexus />
        <Rig />
      </Canvas>
    </div>
  );
}
