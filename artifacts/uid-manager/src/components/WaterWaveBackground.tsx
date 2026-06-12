import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── STATE ────────────────────────────────────────────────────────
const targetMouse = new THREE.Vector2(0, 0);
const currentMouse = new THREE.Vector2(0, 0);

// ─── ULTRA-FAST AURORA SHADER ─────────────────────────────────────
function AuroraBackground() {
  const ref = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uColor1: { value: new THREE.Color("#030014") }, // Deep space black/blue
    uColor2: { value: new THREE.Color("#004e92") }, // Ocean blue
    uColor3: { value: new THREE.Color("#8a2387") }, // Magenta/Violet
    uColor4: { value: new THREE.Color("#00E5FF") }, // Bright Cyan
  }), []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    currentMouse.lerp(targetMouse, 0.05);
    const m = ref.current.material as THREE.ShaderMaterial;
    m.uniforms.uTime.value += dt * 0.15;
    m.uniforms.uMouse.value.copy(currentMouse);
  });

  return (
    <mesh ref={ref} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform vec3 uColor4;
          varying vec2 vUv;

          // Fast 2D noise
          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
          float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ; m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            vec2 uv = vUv;
            // Parallax shift
            uv += uMouse * 0.05;
            
            // Generate flowing fluid waves
            float t = uTime;
            float n1 = snoise(uv * 1.5 + vec2(t * 0.5, t * 0.3));
            float n2 = snoise(uv * 2.5 - vec2(t * 0.4, t * 0.6));
            
            float mix1 = smoothstep(-1.0, 1.0, n1);
            float mix2 = smoothstep(-1.0, 1.0, n2);
            
            // Mix colors
            vec3 color = mix(uColor1, uColor2, mix1);
            color = mix(color, uColor3, mix2 * 0.6);
            
            // Add cyan/pink highlights
            float highlight = smoothstep(0.4, 1.0, snoise(uv * 3.0 + t));
            color += uColor4 * highlight * 0.4;
            
            // Darken edges (vignette)
            float vig = 1.0 - smoothstep(0.3, 1.5, length(vUv - 0.5));
            color *= vig * 1.2;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

// ─── LIGHTWEIGHT PARTICLES ────────────────────────────────────────
function Sparkles() {
  const ref = useRef<THREE.Points>(null);
  const count = 150;
  
  const { pos, sizes } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 5 - 2;
      s[i] = Math.random() * 2.0;
    }
    return { pos: p, sizes: s };
  }, []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.03;
    ref.current.rotation.x += dt * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pos} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float aSize;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (100.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if(d > 0.5) discard;
            gl_FragColor = vec4(0.0, 0.9, 1.0, (0.5 - d) * 1.0);
          }
        `}
      />
    </points>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────
export function WaterWaveBackground() {
  useEffect(() => {
    const onM = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onM, { passive: true });
    return () => window.removeEventListener("mousemove", onM);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#030014] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={1} // Hardcoded to 1 to guarantee 60+ fps on all devices
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      >
        <AuroraBackground />
        <Sparkles />
      </Canvas>
    </div>
  );
}
