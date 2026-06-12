import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════
   ✦  OPTICAL RIBBONS — Abstract Flowing Light Streaks
   ─────────────────────────────────────────────────────────────────
   Inspired by high-end UI Engine style hero backgrounds.
   Features:
   - Deep dark indigo/blue background
   - Glowing, swooping abstract light ribbons (additive blending)
   - Smooth mouse parallax
   - 120fps optimized GLSL shader
   ═══════════════════════════════════════════════════════════════════ */

const input = { mx: 0, my: 0 };

function GlowingRibbons() {
  const ref = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      // Colors based on uiengine.store
      uColor1: { value: new THREE.Color("#2563eb") }, // bright blue
      uColor2: { value: new THREE.Color("#60a5fa") }, // light blue/cyan
      uColor3: { value: new THREE.Color("#0f172a") }, // deep dark blue
    }),
    []
  );

  useFrame((state) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uMouse.value.lerp(new THREE.Vector2(input.mx, input.my), 0.05);
    m.uniforms.uResolution.value.set(viewport.width, viewport.height);
  });

  return (
    <mesh ref={ref} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
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
          uniform vec2 uResolution;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec2 vUv;

          // Smooth noise function for ribbon distortion
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
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

          // Draw a glowing ribbon line
          float drawRibbon(vec2 uv, float offset, float speed, float thickness, float amplitude) {
            // Distort uv slightly with noise
            float n = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uv.y * 2.0)) * 0.1;
            
            // Core sine wave motion
            float y = sin(uv.x * 3.0 + uTime * speed + offset) * amplitude;
            
            // Add secondary harmonic
            y += sin(uv.x * 5.0 - uTime * speed * 1.5 + offset * 2.0) * (amplitude * 0.3);
            
            // Distance from uv.y to the wave
            float dist = abs(uv.y - y + n);
            
            // Glow equation: inverse distance
            float glow = thickness / (dist + 0.001);
            return glow;
          }

          void main() {
            // Normalize UV to -1 to 1, adjusting for aspect ratio
            vec2 uv = vUv * 2.0 - 1.0;
            uv.x *= uResolution.x / uResolution.y;

            // Apply mouse parallax shift
            uv += uMouse * 0.1;

            // Background color (deep dark blue)
            // Radial gradient background
            float bgDist = length(uv * vec2(0.5, 1.0));
            vec3 bg = mix(vec3(0.06, 0.1, 0.2), uColor3, smoothstep(0.0, 1.5, bgDist));

            // Accumulate ribbon glows
            float r1 = drawRibbon(uv, 0.0, 0.4, 0.015, 0.5);
            float r2 = drawRibbon(uv, 2.0, 0.3, 0.008, 0.7);
            float r3 = drawRibbon(uv, 4.0, 0.5, 0.012, 0.4);
            float r4 = drawRibbon(uv, 1.5, -0.35, 0.005, 0.8);

            // Mix glowing colors
            vec3 ribbons = vec3(0.0);
            ribbons += uColor1 * r1;
            ribbons += uColor2 * r2;
            ribbons += mix(uColor1, vec3(1.0), 0.5) * r3; // some white-ish highlights
            ribbons += uColor1 * r4 * 0.5;

            // Soften ribbons and add to background
            vec3 finalColor = bg + ribbons * 0.6;

            // Vignette
            float vig = 1.0 - smoothstep(0.5, 2.0, length(uv));
            finalColor *= vig;

            // Tiny subtle stars/dust
            float dust = smoothstep(0.8, 1.0, snoise(uv * 20.0 + uTime * 0.05));
            finalColor += vec3(0.5, 0.8, 1.0) * dust * 0.1;

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export function WaterWaveBackground() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      input.mx = (e.clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const handleTouchMove = (e: TouchEvent) => {
      input.mx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: "#0f172a" }}>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <GlowingRibbons />
      </Canvas>
    </div>
  );
}
