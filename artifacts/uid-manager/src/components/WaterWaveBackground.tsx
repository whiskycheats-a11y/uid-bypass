import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════
   ✦  NEON CYBER TERRAIN — Premium 3D Animated WebGL Background
   ─────────────────────────────────────────────────────────────────
   • Glowing wireframe terrain driven by 3-octave simplex noise
   • Smooth mouse parallax + scroll-reactive wave speed
   • Neon gradient color: cyan → violet → pink
   • Floating particle starfield for depth
   • Fog + vignette + film grain overlays
   • Optimized: 128×128 grid, single draw call
   ═══════════════════════════════════════════════════════════════════ */

// ─── Shared state for mouse & scroll across components ───
const pointer = { x: 0, y: 0 };
const scroll = { velocity: 0, offset: 0 };

// ─── GLSL Simplex Noise (shared) ───
const SIMPLEX_NOISE_GLSL = `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
  vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1;i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
    vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
    vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m=m*m;m=m*m;
    vec3 x_=2.*fract(p*C.www)-1.;
    vec3 h=abs(x_)-.5;
    vec3 ox=floor(x_+.5);
    vec3 a0=x_-ox;
    m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
    vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.*dot(m,g);
  }
`;

// ─── Wireframe Terrain Mesh ──────────────────────────────────────
function CyberTerrain() {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uNeonA: { value: new THREE.Color("#00e5ff") },  // cyan
      uNeonB: { value: new THREE.Color("#7c3aed") },  // violet
      uNeonC: { value: new THREE.Color("#ec4899") },  // pink
    }),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;

    // Accumulate scroll momentum
    scroll.offset += scroll.velocity;
    scroll.velocity *= 0.94;

    mat.uniforms.uTime.value = state.clock.elapsedTime * 0.18 + scroll.offset;

    // Smooth mouse lerp
    mat.uniforms.uMouse.value.x = THREE.MathUtils.lerp(
      mat.uniforms.uMouse.value.x, pointer.x, 0.03
    );
    mat.uniforms.uMouse.value.y = THREE.MathUtils.lerp(
      mat.uniforms.uMouse.value.y, pointer.y, 0.03
    );

    // Subtle mesh parallax rotation
    meshRef.current.rotation.z = THREE.MathUtils.lerp(
      meshRef.current.rotation.z, pointer.x * 0.03, 0.02
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -2.8, -6]}
      rotation={[-Math.PI * 0.42, 0, 0]}
    >
      <planeGeometry args={[40, 28, 128, 128]} />
      <shaderMaterial
        wireframe
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          varying vec2 vUv;
          varying float vElevation;
          varying float vDist;
          ${SIMPLEX_NOISE_GLSL}

          void main() {
            vUv = uv;
            vec3 pos = position;

            // 3-octave noise terrain
            vec2 nCoord = pos.xy * 0.12 + uMouse * 0.15;
            float n1 = snoise(nCoord + uTime * 0.45) * 1.8;
            float n2 = snoise(nCoord * 2.2 - uTime * 0.35) * 0.6;
            float n3 = snoise(nCoord * 4.5 + uTime * 0.25) * 0.15;
            float elevation = n1 + n2 + n3;

            pos.z += elevation;
            vElevation = elevation;

            vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
            vDist = -mvPos.z;
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          uniform vec3 uNeonA;
          uniform vec3 uNeonB;
          uniform vec3 uNeonC;
          varying vec2 vUv;
          varying float vElevation;
          varying float vDist;

          void main() {
            // Neon gradient based on elevation
            float t = smoothstep(-1.5, 2.5, vElevation);
            vec3 col = mix(uNeonA, uNeonB, t);
            col = mix(col, uNeonC, smoothstep(1.5, 2.8, vElevation));

            // Glow intensity — peaks glow brighter
            float glow = 0.35 + smoothstep(0.0, 2.0, vElevation) * 0.65;
            col *= glow;

            // Distance fade
            float fogFade = smoothstep(4.0, 18.0, vDist);
            float alpha = (1.0 - fogFade) * 0.85;

            // Edge fade
            float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            edgeFade *= smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
            alpha *= edgeFade;

            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}

// ─── Floating Particle Starfield ─────────────────────────────────
function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 600;

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
      sz[i] = Math.random() * 2.0 + 0.3;
    }
    return { positions: pos, sizes: sz };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const starUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#a5b4fc") },
    }),
    []
  );

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={starUniforms}
        vertexShader={`
          attribute float aSize;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            pos.y += sin(uTime * 0.15 + position.x * 0.5) * 0.3;
            pos.x += cos(uTime * 0.1 + position.z * 0.3) * 0.2;
            vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = aSize * (120.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
            vAlpha = smoothstep(25.0, 5.0, -mvPos.z) * (0.3 + 0.7 * sin(uTime * 0.8 + position.x * 2.0) * 0.5 + 0.5);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float glow = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, glow * vAlpha * 0.6);
          }
        `}
      />
    </points>
  );
}

// ─── Ambient Horizontal Light Beams ──────────────────────────────
function LightBeams() {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#00e5ff") },
      uColorB: { value: new THREE.Color("#7c3aed") },
    }),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value =
      state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} position={[0, 1.5, -12]}>
      <planeGeometry args={[50, 20, 1, 1]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec2 vUv;
          void main() {
            // Soft horizontal light streaks
            float beam1 = smoothstep(0.03, 0.0, abs(vUv.y - 0.35 + sin(vUv.x * 3.0 + uTime * 0.3) * 0.02));
            float beam2 = smoothstep(0.02, 0.0, abs(vUv.y - 0.55 + cos(vUv.x * 2.5 - uTime * 0.2) * 0.015));
            float beam3 = smoothstep(0.015, 0.0, abs(vUv.y - 0.7 + sin(vUv.x * 4.0 + uTime * 0.4) * 0.01));

            vec3 col = uColorA * beam1 * 0.3 + uColorB * beam2 * 0.2 + mix(uColorA, uColorB, 0.5) * beam3 * 0.15;

            // Fade edges
            float fadeX = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
            float fadeY = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

            gl_FragColor = vec4(col, (beam1 + beam2 + beam3) * fadeX * fadeY * 0.5);
          }
        `}
      />
    </mesh>
  );
}

// ─── Scene Camera Controller ─────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.8, 0.02);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.5 + pointer.y * 0.4, 0.02);
    camera.lookAt(0, -1, -6);
  });
  return null;
}

// ─── Root Export ──────────────────────────────────────────────────
export function WaterWaveBackground() {
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onWheel = (e: WheelEvent) => {
      scroll.velocity += e.deltaY * 0.00012;
    };
    const onTouchStart = (e: TouchEvent) => {
      (scroll as any)._lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dy = (scroll as any)._lastY - e.touches[0].clientY;
      scroll.velocity += dy * 0.0004;
      (scroll as any)._lastY = e.touches[0].clientY;
      pointer.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: "#030014" }}>
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ background: "#030014" }}
      >
        <fog attach="fog" args={["#030014", 5, 22]} />
        <CameraRig />
        <CyberTerrain />
        <Starfield />
        <LightBeams />
      </Canvas>

      {/* ── Neon glow overlay at horizon ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 30% at 50% 55%, rgba(0,229,255,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 80% 25% at 30% 50%, rgba(124,58,237,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 60% 20% at 70% 55%, rgba(236,72,153,0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* ── Film grain ── */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* ── Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 0%, #030014 100%)",
          opacity: 0.55,
        }}
      />
    </div>
  );
}
