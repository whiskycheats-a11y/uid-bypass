import { useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ══════════════ SHARED PHYSICS STATE ══════════════ */
const mouse = { target: new THREE.Vector2(), current: new THREE.Vector2(), vel: new THREE.Vector2() };
const scroll = { y: 0, v: 0 };

function springStep(dt: number) {
  const k = 8, d = 5; // Softer, smoother physics for a fluid gradient
  mouse.vel.x += (mouse.target.x - mouse.current.x) * k * dt;
  mouse.vel.y += (mouse.target.y - mouse.current.y) * k * dt;
  const decay = Math.exp(-d * dt);
  mouse.vel.x *= decay;
  mouse.vel.y *= decay;
  mouse.current.x += mouse.vel.x * dt;
  mouse.current.y += mouse.vel.y * dt;
}

/* ══════════════ SMOOTH MESH GRADIENT ══════════════ */
function MeshGradientBackground() {
  const { viewport } = useThree();
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uRes: { value: new THREE.Vector2() }
  }), []);

  useFrame((_, dt) => {
    const cl = Math.min(dt, 0.05);
    springStep(cl);
    
    // Smooth scroll velocity decay
    scroll.v *= Math.exp(-4.0 * cl);
    
    // Time progresses faster if we scroll, for dynamic interactivity
    u.uTime.value += cl * (0.15 + Math.abs(scroll.v) * 0.5);
    u.uMouse.value.copy(mouse.current);
    u.uRes.value.set(viewport.width, viewport.height);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial uniforms={u} depthWrite={false} depthTest={false}
        vertexShader={`
          varying vec2 vUv; 
          void main() { 
            vUv = uv; 
            gl_Position = vec4(position.xy, 0.9999, 1.0); 
          }
        `}
        fragmentShader={`
          uniform float uTime; 
          uniform vec2 uMouse; 
          uniform vec2 uRes;
          varying vec2 vUv;
          
          // Smooth, non-periodic rotation for flowing gradients
          mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
          }
          
          void main() {
            vec2 p = (vUv - 0.5) * 2.0; 
            p.x *= uRes.x / uRes.y;
            
            // Softly follow mouse
            vec2 m = uMouse * 0.5;
            vec2 pos = p - m;
            
            float t = uTime;
            
            // Generate multiple flowing color "orbs" or waves by combining sine waves
            // This avoids sharp noise artifacts, keeping it buttery smooth.
            
            vec3 col = vec3(0.01, 0.02, 0.05); // Deep space blue/black base
            
            // Cyan Wave 1
            vec2 q1 = pos * rot(t * 0.2);
            float w1 = sin(q1.x * 1.5 + t) * cos(q1.y * 1.2 - t * 0.8);
            vec3 color1 = vec3(0.0, 0.5, 0.9); // Vibrant Cyan
            
            // Violet Wave 2
            vec2 q2 = (pos + vec2(1.0, -0.5)) * rot(-t * 0.15);
            float w2 = cos(q2.x * 2.0 - t * 1.1) * sin(q2.y * 1.8 + t * 0.5);
            vec3 color2 = vec3(0.5, 0.1, 0.9); // Electric Violet
            
            // Deep Blue Wave 3
            vec2 q3 = (pos + vec2(-0.8, 0.6)) * rot(t * 0.1);
            float w3 = sin(q3.x * 1.1 + t * 0.9) * cos(q3.y * 1.5 + t * 1.2);
            vec3 color3 = vec3(0.0, 0.2, 0.6); // Deep Royal Blue
            
            // Mix the colors fluidly based on the smooth waves
            col = mix(col, color3, smoothstep(-1.0, 1.0, w3));
            col = mix(col, color2, smoothstep(-0.5, 1.0, w2));
            col = mix(col, color1, smoothstep(0.0, 1.0, w1));
            
            // Add a very subtle "interactive glow" exactly where the mouse is
            float glow = exp(-length(pos) * 1.5);
            col += color1 * glow * 0.15;
            
            // Cinematic Vignette to keep edges dark and focus center
            float vign = 1.0 - smoothstep(0.6, 2.5, length(p));
            
            gl_FragColor = vec4(col * vign, 1.0);
          }
        `}
      />
    </mesh>
  );
}

/* ══════════════ MAIN APP ══════════════ */
export default function App() {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    
    const onM = (e: MouseEvent) => {
      mouse.target.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.target.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    
    const onT = (e: TouchEvent) => {
      const t = e.touches[0]; 
      if (!t) return;
      mouse.target.x = (t.clientX / window.innerWidth) * 2 - 1;
      mouse.target.y = -(t.clientY / window.innerHeight) * 2 + 1;
    };
    
    const onScroll = () => {
      const y = window.scrollY;
      scroll.v = Math.max(-2, Math.min(2, (y - scroll.y) * 0.012));
      scroll.y = y;
    };
    
    const onVis = () => setPaused(document.hidden);

    scroll.y = window.scrollY;
    window.addEventListener("mousemove", onM, { passive: true });
    window.addEventListener("touchmove", onT, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    
    return () => {
      window.removeEventListener("mousemove", onM);
      window.removeEventListener("touchmove", onT);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
      background: "#020008",
      opacity: visible ? 1 : 0, transition: "opacity 1.5s ease-out"
    }}>
      <Canvas frameloop={paused ? "never" : "always"}
        camera={{ position: [0, 0, 1], fov: 45, near: 0.1, far: 10 }}
        dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
      >
        <MeshGradientBackground />
      </Canvas>
    </div>
  );
}

export { App as WaterWaveBackground };