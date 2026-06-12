import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════
   ✦  ABYSS — Awwwards-Level 3D Immersive Background
   ─────────────────────────────────────────────────────────────────
   Architecture (clean, no clutter):
     1. Dual-layer terrain: dark solid surface + neon wireframe overlay
     2. Cinematic volumetric horizon glow (shader)
     3. Refined depth-of-field starfield
     4. Interactive camera rig with smooth damping
     5. Post-FX: vignette + grain + chromatic overlay
   ═══════════════════════════════════════════════════════════════════ */

// ── Shared reactive state ────────────────────────────────────────
const input = {
  mx: 0, my: 0,           // normalized mouse
  scrollVel: 0,           // scroll momentum
  scrollOff: 0,           // accumulated offset
  _touchY: 0,
};

// ── GLSL Simplex Noise ───────────────────────────────────────────
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x/289.)*289.;}
vec2 mod289(vec2 x){return x-floor(x/289.)*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m;m=m*m;
  vec3 x_=2.*fract(p*C.www)-1.;vec3 h=abs(x_)-.5;
  vec3 ox=floor(x_+.5);vec3 a0=x_-ox;
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}
float terrain(vec2 p,float t){
  return snoise(p*0.12+t*0.4)*1.6
        +snoise(p*0.28-t*0.3)*0.55
        +snoise(p*0.55+t*0.2)*0.18;
}
`;

// ── Terrain vertex shader (shared by both layers) ────────────────
const TERRAIN_VERT = `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;
varying float vElev;
varying float vFog;
${NOISE}
void main(){
  vUv=uv;
  vec3 pos=position;
  vec2 nc=pos.xy*1.0+uMouse*0.12;
  float elev=terrain(nc,uTime);
  pos.z+=elev;
  vElev=elev;
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  vFog=smoothstep(5.,20.,-mv.z);
  gl_Position=projectionMatrix*mv;
}
`;

// ═════════════════════════════════════════════════════════════════
//  Layer 1: Dark Solid Surface (base depth)
// ═════════════════════════════════════════════════════════════════
function TerrainSolid() {
  const ref = useRef<THREE.Mesh>(null);
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
  }), []);

  useFrame(() => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    input.scrollOff += input.scrollVel;
    input.scrollVel *= 0.93;
    m.uniforms.uTime.value += 0.008 + input.scrollVel * 0.5;
    m.uniforms.uMouse.value.lerp(new THREE.Vector2(input.mx, input.my), 0.03);
  });

  return (
    <mesh ref={ref} position={[0, -3, -6]} rotation={[-Math.PI * 0.44, 0, 0]}>
      <planeGeometry args={[44, 30, 160, 160]} />
      <shaderMaterial
        transparent
        uniforms={u}
        vertexShader={TERRAIN_VERT}
        fragmentShader={`
          varying float vElev;
          varying float vFog;
          varying vec2 vUv;
          void main(){
            // Very dark base with subtle elevation tint
            vec3 base=vec3(0.012,0.008,0.035);
            vec3 deep=vec3(0.02,0.015,0.06);
            float t=smoothstep(-1.,2.,vElev);
            vec3 col=mix(base,deep,t);

            // Subtle top specular highlight
            float spec=pow(max(0.,t),6.)*0.15;
            col+=vec3(0.05,0.03,0.12)*spec;

            // Edge + fog fade
            float edge=smoothstep(0.,0.06,vUv.x)*smoothstep(1.,0.94,vUv.x)
                       *smoothstep(0.,0.12,vUv.y)*smoothstep(1.,0.88,vUv.y);
            gl_FragColor=vec4(col,(1.-vFog)*edge*0.95);
          }
        `}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Layer 2: Neon Wireframe Overlay (the glowing grid)
// ═════════════════════════════════════════════════════════════════
function TerrainWire() {
  const ref = useRef<THREE.Mesh>(null);
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uC1: { value: new THREE.Color("#00e5ff") },
    uC2: { value: new THREE.Color("#6d28d9") },
    uC3: { value: new THREE.Color("#f472b6") },
  }), []);

  useFrame(() => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    m.uniforms.uTime.value += 0.008 + input.scrollVel * 0.5;
    m.uniforms.uMouse.value.lerp(new THREE.Vector2(input.mx, input.my), 0.03);
  });

  return (
    <mesh ref={ref} position={[0, -3, -6]} rotation={[-Math.PI * 0.44, 0, 0]}>
      <planeGeometry args={[44, 30, 128, 128]} />
      <shaderMaterial
        wireframe
        transparent
        depthWrite={false}
        uniforms={u}
        vertexShader={TERRAIN_VERT}
        fragmentShader={`
          uniform vec3 uC1;
          uniform vec3 uC2;
          uniform vec3 uC3;
          varying float vElev;
          varying float vFog;
          varying vec2 vUv;
          void main(){
            float t=smoothstep(-1.5,2.5,vElev);
            vec3 col=mix(uC1,uC2,t);
            col=mix(col,uC3,smoothstep(1.5,2.8,vElev));

            // Glow: peaks brighter
            float glow=0.3+smoothstep(0.,2.,vElev)*0.7;
            col*=glow;

            // Edge + distance fade
            float edge=smoothstep(0.,0.07,vUv.x)*smoothstep(1.,0.93,vUv.x)
                       *smoothstep(0.,0.14,vUv.y)*smoothstep(1.,0.86,vUv.y);
            float alpha=(1.-vFog)*edge*0.75;

            gl_FragColor=vec4(col,alpha);
          }
        `}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Horizon Glow — cinematic light at the base of terrain
// ═════════════════════════════════════════════════════════════════
function HorizonGlow() {
  const ref = useRef<THREE.Mesh>(null);
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uC1: { value: new THREE.Color("#00e5ff") },
    uC2: { value: new THREE.Color("#7c3aed") },
  }), []);
  useFrame((s) => {
    if (!ref.current) return;
    (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = s.clock.elapsedTime;
  });
  return (
    <mesh ref={ref} position={[0, -2.2, -14]} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[60, 8, 1, 1]} />
      <shaderMaterial
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
        uniforms={u}
        vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uC1,uC2;
          varying vec2 vUv;
          void main(){
            float band=smoothstep(0.06,0.,abs(vUv.y-0.42+sin(vUv.x*2.+uTime*0.15)*0.015));
            float band2=smoothstep(0.03,0.,abs(vUv.y-0.38+cos(vUv.x*3.-uTime*0.1)*0.01));
            vec3 col=uC1*band*0.4+uC2*band2*0.25;
            float fx=smoothstep(0.,0.25,vUv.x)*smoothstep(1.,0.75,vUv.x);
            // Soft overall atmospheric glow
            float atmo=exp(-pow((vUv.y-0.4)*4.,2.))*0.08;
            col+=mix(uC1,uC2,vUv.x)*atmo;
            float a=(band+band2+atmo)*fx;
            gl_FragColor=vec4(col,a);
          }
        `}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Starfield — refined, depth-layered, subtle twinkle
// ═════════════════════════════════════════════════════════════════
function Stars() {
  const ref = useRef<THREE.Points>(null);
  const count = 400;

  const { pos, sizes } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 60;
      p[i * 3 + 1] = Math.random() * 20 - 2;      // mostly above terrain
      p[i * 3 + 2] = -Math.random() * 35 - 3;      // spread deep
      s[i] = Math.random() * 1.8 + 0.4;
    }
    return { pos: p, sizes: s };
  }, []);

  const u = useMemo(() => ({
    uTime: { value: 0 },
    uCol: { value: new THREE.Color("#c4b5fd") },
  }), []);

  useFrame((s) => {
    if (!ref.current) return;
    (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pos} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
        uniforms={u}
        vertexShader={`
          attribute float aSize;
          uniform float uTime;
          varying float vA;
          void main(){
            vec3 p=position;
            p.y+=sin(uTime*0.12+p.x*0.4)*0.25;
            vec4 mv=modelViewMatrix*vec4(p,1.);
            gl_PointSize=aSize*(100./-mv.z);
            gl_Position=projectionMatrix*mv;
            // twinkle
            float tw=sin(uTime*1.2+p.x*3.+p.z*2.)*.5+.5;
            vA=smoothstep(30.,6.,-mv.z)*(0.25+tw*0.35);
          }
        `}
        fragmentShader={`
          uniform vec3 uCol;
          varying float vA;
          void main(){
            float d=length(gl_PointCoord-.5);
            if(d>.5)discard;
            float g=smoothstep(.5,0.,d);
            gl_FragColor=vec4(uCol,g*g*vA);
          }
        `}
      />
    </points>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Camera Rig — smooth cinematic movement
// ═════════════════════════════════════════════════════════════════
function Rig() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, input.mx * 0.7, 0.015);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.8 + input.my * 0.35, 0.015);
    camera.lookAt(0, -1.5, -8);
  });
  return null;
}

// ═════════════════════════════════════════════════════════════════
//  ROOT EXPORT
// ═════════════════════════════════════════════════════════════════
export function WaterWaveBackground() {
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      input.mx = (e.clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onWheel = (e: WheelEvent) => {
      input.scrollVel += e.deltaY * 0.00008;
    };
    const onTS = (e: TouchEvent) => { input._touchY = e.touches[0].clientY; };
    const onTM = (e: TouchEvent) => {
      const dy = input._touchY - e.touches[0].clientY;
      input.scrollVel += dy * 0.0003;
      input._touchY = e.touches[0].clientY;
      input.mx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchmove", onTM, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove", onTM);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: "#030014" }}>
      <Canvas
        camera={{ position: [0, 1.8, 5], fov: 52, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ background: "#030014" }}
      >
        <fog attach="fog" args={["#030014", 6, 24]} />
        <Rig />
        <TerrainSolid />
        <TerrainWire />
        <HorizonGlow />
        <Stars />
      </Canvas>

      {/* ── Atmospheric neon bloom at horizon ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 120% 25% at 50% 58%, rgba(0,229,255,0.07) 0%, transparent 65%),
            radial-gradient(ellipse 80% 20% at 35% 55%, rgba(124,58,237,0.05) 0%, transparent 55%),
            radial-gradient(ellipse 70% 18% at 68% 56%, rgba(244,114,182,0.035) 0%, transparent 50%)
          `,
        }}
      />

      {/* ── Cinematic vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 72% 62% at 50% 48%, transparent 0%, #030014 100%)",
          opacity: 0.6,
        }}
      />

      {/* ── Film grain ── */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* ── Top gradient (sky fade) ── */}
      <div
        className="absolute top-0 left-0 right-0 h-[40vh] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #030014 0%, transparent 100%)",
          opacity: 0.3,
        }}
      />
    </div>
  );
}
