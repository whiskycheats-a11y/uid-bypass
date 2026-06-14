import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Ultra-attractive, smooth Liquid Silk Wave (0 particles, just fluid geometry)
function LiquidSilkWave() {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color("#00d4ff") }, // Vibrant Cyan
    uColor2: { value: new THREE.Color("#7c3aed") }, // Deep Violet
    uColor3: { value: new THREE.Color("#ff006e") }  // Neon Pink
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 3, 0, 0]} position={[0, -2, -8]}>
      {/* 
        A single high-res plane is incredibly cheap to render on modern GPUs.
        It avoids the "dots" look entirely, looking like a solid sheet of glowing fluid.
      */}
      <planeGeometry args={[25, 25, 128, 128]} />
      <shaderMaterial
        wireframe={false} // Solid fluid
        transparent={true}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          varying vec3 vPos;
          varying vec2 vUv;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Ultra-smooth liquid distortion combining diagonal sine waves
            float wave1 = sin(pos.x * 0.5 + uTime) * 1.5;
            float wave2 = sin(pos.y * 0.4 - uTime * 0.8) * 1.5;
            float wave3 = sin((pos.x + pos.y) * 0.3 + uTime * 1.2) * 1.0;
            
            // Create a flowing peak in the center
            float dist = length(pos.xy);
            float centerBulge = exp(-dist * 0.05) * 4.0;
            
            pos.z += (wave1 + wave2 + wave3) * exp(-dist * 0.1) + centerBulge;
            vPos = pos;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec3 vPos;
          varying vec2 vUv;
          
          void main() {
            // Iridescent coloring based on height and UV coordinates
            float h = (vPos.z + 2.0) / 6.0; 
            
            // Mix colors to create a beautiful gradient
            vec3 color = mix(uColor2, uColor1, smoothstep(0.0, 0.5, h));
            color = mix(color, uColor3, smoothstep(0.5, 1.0, h));
            
            // Create a soft glowing grid pattern overlaid on the fluid
            float grid = sin(vUv.x * 100.0) * sin(vUv.y * 100.0);
            grid = smoothstep(0.8, 1.0, grid) * 0.15;
            
            // Fade out edges smoothly so it blends into the deep background
            float dist = length(vPos.xy);
            float alpha = 1.0 - smoothstep(5.0, 15.0, dist);
            
            gl_FragColor = vec4(color + vec3(grid), alpha * 0.6);
          }
        `}
      />
    </mesh>
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
        camera={{ position: [0, 0, 10], fov: 60 }}
        // STRICTLY limit pixel ratio to 1. This prevents lag on ANY machine.
        dpr={[1, 1]} 
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false, depth: false }}
      >
        <fog attach="fog" args={["#030014", 5, 20]} />
        <LiquidSilkWave />
      </Canvas>
      {/* Elegant vignette overlay to deepen the colors and focus the center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#030014_100%)] opacity-90" />
    </div>
  );
}