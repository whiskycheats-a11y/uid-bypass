import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const AuroraMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color("#06b6d4") }, // Cyan
      uColor2: { value: new THREE.Color("#4f46e5") }, // Indigo/Blue
      uColor3: { value: new THREE.Color("#ffffff") }, // White core
    }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime * 0.5;
      
      // Very slow floating motion for the whole plane
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <planeGeometry args={[25, 15, 32, 32]} />
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
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec2 vUv;

          // Simplex 2D noise
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m; m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            vec2 uv = vUv;
            vec2 centeredUv = uv - 0.5;
            vec3 finalColor = vec3(0.0);

            // Create multiple overlapping glowing ribbons
            for(float i = 0.0; i < 7.0; i++) {
                float t = uTime * 0.15 + i * 0.7;
                
                // Curve the space using noise and sine waves
                float noiseVal = snoise(vec2(centeredUv.x * 1.2 + t, i * 0.5)) * 0.35;
                float lineY = noiseVal + sin(centeredUv.x * 2.5 + t) * 0.15;
                
                // Distance to the line
                float dist = abs(centeredUv.y - lineY);
                
                // Base soft glow
                float glow = 0.003 / (dist + 0.001);
                // Intense bright core
                float core = 0.0006 / (dist + 0.0001);
                
                // Mix cyan and blue
                vec3 ribbonColor = mix(uColor1, uColor2, i / 6.0);
                
                finalColor += ribbonColor * glow * 1.2;
                finalColor += uColor3 * core * 1.5;
            }

            // Fade edges to black smoothly
            float alpha = 1.0 - smoothstep(0.1, 0.5, distance(uv, vec2(0.5)));

            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
      />
    </mesh>
  );
};

export function WaterWaveBackground() {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#030014] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <fog attach="fog" args={["#030014", 2, 10]} />
        <AuroraMesh />
      </Canvas>
      {/* Overlay to ensure the background is slightly dark so text stays readable */}
      <div className="absolute inset-0 bg-[#030014]/40 pointer-events-none" />
    </div>
  );
}
