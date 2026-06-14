import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, randoms } = useMemo(() => {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Create a wide galaxy/disk of particles
      const r = 5 + Math.random() * 45;
      const theta = Math.random() * 2 * Math.PI;
      
      positions[i * 3 + 0] = r * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4; // Height variance
      positions[i * 3 + 2] = r * Math.sin(theta);
      
      randoms[i] = Math.random();
    }
    return { positions, randoms };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color("#00d4ff") }, // Cyan
    uColor2: { value: new THREE.Color("#7c3aed") }  // Violet
  }), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    // Advance time and slowly rotate the entire field
    uniforms.uTime.value = state.clock.elapsedTime * 0.4;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
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
            
            // Add wave motion based on distance and time (CPU free, done on GPU)
            float dist = length(pos.xz);
            pos.y += sin(dist * 0.4 - uTime * 2.0) * 2.5 * aRandom;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            // Size attenuation
            gl_PointSize = (3.0 * aRandom + 2.0) * (30.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          varying float vRandom;
          void main() {
            // Circular particle with soft edge
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            float alpha = smoothstep(0.5, 0.1, dist) * (0.4 + 0.6 * vRandom);
            
            vec3 color = mix(uColor1, uColor2, vRandom);
            gl_FragColor = vec4(color, alpha * 0.7);
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
        camera={{ position: [0, 8, 25], fov: 50 }}
        // STRICTLY limit pixel ratio to 1. This is the secret to 0 lag on any PC.
        dpr={[1, 1]} 
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false, depth: false }}
      >
        <fog attach="fog" args={["#030014", 15, 45]} />
        <ParticleField />
      </Canvas>
    </div>
  );
}