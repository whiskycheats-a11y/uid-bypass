import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Sleek, glowing 3D wireframe ocean
function DataOcean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color("#00d4ff") }, // Cyan
    uColor2: { value: new THREE.Color("#ff006e") }, // Pink
    uColor3: { value: new THREE.Color("#7c3aed") }  // Violet
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -8, -20]}>
      <planeGeometry args={[120, 120, 100, 100]} />
      <shaderMaterial
        wireframe={true}
        transparent={true}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          varying vec3 vPos;
          
          void main() {
            vec3 pos = position;
            // Fluid, undulating ocean effect using cheap sine waves (0 lag)
            float wave1 = sin(pos.x * 0.1 + uTime) * 3.0;
            float wave2 = sin(pos.y * 0.15 - uTime * 0.8) * 3.0;
            float wave3 = sin((pos.x + pos.y) * 0.05 + uTime * 1.2) * 4.0;
            
            pos.z += wave1 + wave2 + wave3;
            vPos = pos;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec3 vPos;
          
          void main() {
            // Height-based coloring for a premium 3D look
            float h = vPos.z / 10.0; 
            
            vec3 color = mix(uColor3, uColor1, smoothstep(-1.0, 0.0, h));
            color = mix(color, uColor2, smoothstep(0.0, 1.0, h));
            
            // Fade out edges smoothly into the background
            float dist = length(vPos.xy);
            float alpha = 1.0 - smoothstep(20.0, 55.0, dist);
            
            gl_FragColor = vec4(color, alpha * 0.4);
          }
        `}
      />
    </mesh>
  );
}

// Subtle data sparks rising from the ocean
function DataSparks() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, randoms } = useMemo(() => {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 15;
      randoms[i] = Math.random();
    }
    return { positions, randoms };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    uniforms.uTime.value = state.clock.elapsedTime * 0.3;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={randoms.length} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        depthWrite={false}
        transparent={true}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          attribute float aRandom;
          varying float vRandom;
          void main() {
            vRandom = aRandom;
            vec3 pos = position;
            
            // Slowly drift upwards and sway
            pos.y += mod(uTime * 10.0 * aRandom, 40.0) - 20.0;
            pos.x += sin(uTime * 2.0 + aRandom * 10.0) * 2.0;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (4.0 * aRandom + 1.0) * (25.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vRandom;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.1, dist) * (0.3 + 0.7 * vRandom);
            gl_FragColor = vec4(0.0, 0.83, 1.0, alpha * 0.5); // Cyan glow
          }
        `}
      />
    </points>
  );
}

export function WaterWaveBackground() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ 
        opacity: visible ? 1 : 0, 
        zIndex: -50,
        backgroundColor: "#030014"
      }}
    >
      <Canvas 
        camera={{ position: [0, 2, 10], fov: 60 }}
        dpr={[1, 1.5]} // Extremely optimized pixel ratio to prevent any lag
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false, depth: false }}
      >
        <fog attach="fog" args={["#030014", 10, 40]} />
        <DataOcean />
        <DataSparks />
      </Canvas>
      {/* Fallback elegant vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#030014_100%)] opacity-80" />
    </div>
  );
}