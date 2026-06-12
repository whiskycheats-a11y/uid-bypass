import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LiquidMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const targetMouse = useRef({ x: 0, y: 0 });
  const scrollVelocity = useRef(0);
  const timeOffset = useRef(0);
  const lastTouchY = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDark: { value: new THREE.Color("#050505") },
      uColorPurple: { value: new THREE.Color("#4c1d95") },
      uColorCyan: { value: new THREE.Color("#0891b2") },
    }),
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleWheel = (e: WheelEvent) => {
      // Much slower, subtler scroll momentum
      scrollVelocity.current += e.deltaY * 0.0001;
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = lastTouchY.current - e.touches[0].clientY;
      scrollVelocity.current += deltaY * 0.0005;
      lastTouchY.current = e.touches[0].clientY;
      
      targetMouse.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      targetMouse.current.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      
      timeOffset.current += scrollVelocity.current;
      scrollVelocity.current = THREE.MathUtils.lerp(scrollVelocity.current, 0, 0.05);
      
      // Slower base time
      material.uniforms.uTime.value = state.clock.elapsedTime * 0.15 + timeOffset.current;
      
      // Smooth subtle parallax
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -Math.PI * 0.35 - targetMouse.current.y * 0.05, 0.02);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetMouse.current.x * 0.05, 0.02);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -1.5, -4]} rotation={[-Math.PI * 0.35, 0, 0]}>
      <planeGeometry args={[35, 35, 256, 256]} />
      <shaderMaterial
        transparent
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying float vElevation;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

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

          float getElevation(vec2 pos) {
              float e = snoise(vec2(pos.x * 0.1, pos.y * 0.1 + uTime * 0.5)) * 1.5;
              e += snoise(vec2(pos.x * 0.25 - uTime * 0.3, pos.y * 0.25)) * 0.5;
              return e;
          }

          void main() {
            vUv = uv;
            vec3 pos = position;
            
            float elevation = getElevation(pos.xy);
            pos.z += elevation;
            vElevation = elevation;

            // Calculate normals dynamically for lighting
            float delta = 0.1;
            vec3 p1 = vec3(position.x + delta, position.y, getElevation(position.xy + vec2(delta, 0.0)));
            vec3 p2 = vec3(position.x, position.y + delta, getElevation(position.xy + vec2(0.0, delta)));
            vec3 p0 = vec3(position.x, position.y, elevation);
            
            vec3 computedNormal = normalize(cross(p1 - p0, p2 - p0));
            vNormal = normalMatrix * computedNormal;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColorDark;
          uniform vec3 uColorPurple;
          uniform vec3 uColorCyan;
          
          varying vec2 vUv;
          varying float vElevation;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);

            // Base gradient
            float mixPurple = smoothstep(-1.0, 1.0, vElevation);
            float mixCyan = smoothstep(0.5, 2.0, vElevation);
            
            vec3 color = mix(uColorDark, uColorPurple, mixPurple * 0.5);
            color = mix(color, uColorCyan, mixCyan * 0.6);

            // Studio Lighting (Specular & Diffuse)
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            vec3 lightColor = vec3(1.0, 1.0, 1.0);

            // Diffuse
            float diff = max(0.0, dot(normal, lightDir));
            color += lightColor * diff * 0.15;

            // Specular Gloss
            vec3 halfVector = normalize(lightDir + viewDir);
            float spec = pow(max(0.0, dot(normal, halfVector)), 80.0);
            color += lightColor * spec * 0.6;

            // Edge Fresnel
            float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);
            color += uColorCyan * fresnel * 0.4;

            // Smooth edges
            float edgeAlpha = 1.0 - smoothstep(0.3, 0.5, distance(vUv, vec2(0.5)));

            gl_FragColor = vec4(color, edgeAlpha);
          }
        `}
      />
    </mesh>
  );
};

export function WaterWaveBackground() {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#030014] overflow-hidden">
      <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
        <fog attach="fog" args={["#030014", 3, 12]} />
        <LiquidMesh />
      </Canvas>
      {/* Cinematic Film Grain Texture */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      {/* Gradient Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030014_100%)] pointer-events-none opacity-80" />
    </div>
  );
}
