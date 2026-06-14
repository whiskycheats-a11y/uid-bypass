import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  MeshTransmissionMaterial,
  Float,
} from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function GlassOrb() {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!orbRef.current) return;

    orbRef.current.rotation.y =
      state.clock.elapsedTime * 0.15;

    orbRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={1}
      floatIntensity={2}
    >
      <mesh ref={orbRef}>
        <sphereGeometry args={[2.2, 64, 64]} />

        <MeshTransmissionMaterial
          thickness={1.5}
          roughness={0}
          transmission={1}
          ior={1.5}
          chromaticAberration={0.08}
          backside
          samples={3}
          resolution={128}
        />
      </mesh>
    </Float>
  );
}

function AuroraGlow() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    meshRef.current.rotation.z =
      state.clock.elapsedTime * 0.03;
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, -6]}
    >
      <planeGeometry args={[35, 20]} />

      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          time: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position,1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;

          void main(){

            vec2 uv = vUv - 0.5;

            float r =
              length(uv);

            vec3 c1 =
              vec3(0.0,0.85,1.0);

            vec3 c2 =
              vec3(0.55,0.2,1.0);

            vec3 c3 =
              vec3(1.0,0.0,0.6);

            vec3 color =
              mix(c1,c2,uv.y+0.5);

            color =
              mix(color,c3,uv.x+0.5);

            float alpha =
              smoothstep(0.7,0.0,r);

            gl_FragColor =
              vec4(color,alpha*0.55);
          }
        `}
      />
    </mesh>
  );
}

function FloatingLights() {
  return (
    <>
      <pointLight
        position={[5, 2, 3]}
        intensity={25}
        color="#00d4ff"
      />

      <pointLight
        position={[-5, 2, 2]}
        intensity={20}
        color="#8b5cf6"
      />

      <pointLight
        position={[0, -2, 4]}
        intensity={15}
        color="#ff006e"
      />
    </>
  );
}

export function WaterWaveBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -50,
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 45,
        }}
        dpr={[1, 1]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color
          attach="background"
          args={["#02030d"]}
        />

        <fog
          attach="fog"
          args={["#02030d", 10, 30]}
        />

        <ambientLight intensity={0.4} />

        <FloatingLights />

        <AuroraGlow />

        <GlassOrb />

        <Environment preset="city" />
      </Canvas>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(2,3,13,.35) 60%, rgba(2,3,13,.95) 100%)",
        }}
      />
    </div>
  );
}