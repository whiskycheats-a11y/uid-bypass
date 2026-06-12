import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── STATE & PHYSICS ──────────────────────────────────────────────
// Pre-allocated objects for zero-allocation frame loops
const targetMouse = new THREE.Vector2(0, 0);
const currentMouse = new THREE.Vector2(0, 0);
const mouseVelocity = new THREE.Vector2(0, 0);

const scrollState = {
  targetVelocity: 0,
  velocity: 0,
  offset: 0,
  _touchY: 0,
  pulse: 0,
};

// Critically damped spring function
const springLerp = (x: number, v: number, xt: number, dt: number, w: number = 10) => {
  const f = 1.0 + 2.0 * dt * w;
  const hoo = dt * dt * w * w;
  const hhoo = dt * hoo;
  const detInv = 1.0 / (f + hoo);
  const detX = x * f + dt * v + hoo * xt;
  const detV = v + dt * w * w * (xt - x);
  return {
    x: detX * detInv,
    v: detV * detInv,
  };
};

const NOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x/289.)*289.;}
vec4 mod289(vec4 x){return x-floor(x/289.)*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g,l.zxy);
  vec3 i2=max(g,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
    +i.y+vec4(0.,i1.y,i2.y,1.))
    +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=1./7.;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float v=0.;float a=.5;
  for(int i=0;i<4;i++){
    v+=a*snoise(p);
    p*=2.;a*=.5;
  }
  return v;
}
`;

// ─── COSMIC NEBULA SHADER ─────────────────────────────────────────
function CosmicNebula() {
  const ref = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uRes: { value: new THREE.Vector2(1, 1) },
    uColor1: { value: new THREE.Color("#00E5FF") }, // cyan
    uColor2: { value: new THREE.Color("#7D29ED") }, // violet
    uColor3: { value: new THREE.Color("#F5489C") }, // pink
    uBg: { value: new THREE.Color("#030014") },
  }), []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    
    // Physics update
    const sx = springLerp(currentMouse.x, mouseVelocity.x, targetMouse.x, dt, 8);
    const sy = springLerp(currentMouse.y, mouseVelocity.y, targetMouse.y, dt, 8);
    currentMouse.set(sx.x, sy.x);
    mouseVelocity.set(sx.v, sy.v);

    // Scroll decay
    scrollState.velocity += (scrollState.targetVelocity - scrollState.velocity) * dt * 5.0;
    scrollState.offset += scrollState.velocity * dt;
    scrollState.targetVelocity *= Math.exp(-dt * 4.0);

    m.uniforms.uTime.value += dt * (0.05 + Math.abs(scrollState.velocity) * 0.2);
    m.uniforms.uMouse.value.copy(currentMouse);
    m.uniforms.uRes.value.set(viewport.width, viewport.height);
  });

  return (
    <mesh ref={ref} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          void main(){vUv=uv;gl_Position=vec4(position.xy*2.,0.,1.);}
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          uniform vec2 uRes;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform vec3 uBg;
          varying vec2 vUv;
          ${NOISE_GLSL}
          void main(){
            vec2 p=(vUv-0.5)*2.;
            p.x*=uRes.x/uRes.y;
            vec2 m=uMouse*0.4;
            
            float t=uTime;
            vec3 p1=vec3(p*1.5+m,t*0.4);
            vec3 p2=vec3(p*1.2-m*0.5,t*0.3+15.);
            vec3 p3=vec3(p*2.0+m*0.3,t*0.5+30.);
            
            float n1=fbm(p1);
            float n2=fbm(p2);
            float n3=fbm(p3);
            float warp=fbm(vec3(p+n1*0.5,t*0.2));
            
            float r=smoothstep(0.,1.,n1+warp*0.4)*0.4;
            float g=smoothstep(-0.2,0.8,n2+warp*0.3)*0.2;
            float b=smoothstep(-0.4,0.6,n3+warp*0.5)*0.6;
            
            vec3 col=uBg;
            col+=uColor1*b;
            col+=uColor2*r;
            col+=uColor3*(smoothstep(0.4,0.9,n1*n2)*0.3);
            
            // Mouse glow
            float mouseDist=length(p-m);
            col+=mix(uColor1,uColor3,sin(t)*.5+.5)*exp(-mouseDist*mouseDist*3.)*0.15;
            
            float vig=1.-smoothstep(0.4,1.5,length(p));
            col*=vig;
            
            gl_FragColor=vec4(col,1.);
          }
        `}
      />
    </mesh>
  );
}

// ─── MORPHING SPHERE ──────────────────────────────────────────────
function MorphBlob() {
  const ref = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uScroll: { value: 0 },
    uColor1: { value: new THREE.Color("#00E5FF") },
    uColor2: { value: new THREE.Color("#7D29ED") },
    uColor3: { value: new THREE.Color("#F5489C") },
  }), []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    scrollState.pulse += (Math.abs(scrollState.velocity) - scrollState.pulse) * dt * 5.0;
    
    m.uniforms.uTime.value += dt * 0.3;
    m.uniforms.uMouse.value.copy(currentMouse);
    m.uniforms.uScroll.value = scrollState.pulse;
    
    ref.current.rotation.y += dt * 0.1;
    ref.current.rotation.x += dt * 0.05;
    
    // Tilt toward mouse
    ref.current.rotation.z = currentMouse.x * 0.2;
    ref.current.position.x = currentMouse.x * 0.5;
    ref.current.position.y = currentMouse.y * 0.5;
  });

  return (
    <mesh ref={ref} position={[0, 0, -2]}>
      <icosahedronGeometry args={[1.2, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        vertexShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          uniform float uScroll;
          varying vec3 vNorm;
          varying vec3 vPos;
          varying float vDisp;
          ${NOISE_GLSL}
          void main(){
            vec3 pos=position;
            float edge=length(uMouse)*0.5;
            float n=snoise(pos*1.5+uTime+vec3(uMouse,0.));
            n+=snoise(pos*3.-uTime*1.2)*0.3;
            
            float pulse=uScroll*0.5;
            float disp=n*(0.2+edge*0.1+pulse);
            pos+=normal*disp;
            
            vDisp=disp;
            vNorm=normalize(normalMatrix*normal);
            vPos=pos;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec3 vNorm;
          varying vec3 vPos;
          varying float vDisp;
          void main(){
            vec3 viewDir=normalize(cameraPosition-vPos);
            float fresnel=pow(1.-max(0.,dot(vNorm,viewDir)),3.0);
            
            float t=vDisp*4.+0.5;
            vec3 base=mix(uColor1,uColor2,smoothstep(0.2,0.6,t));
            base=mix(base,uColor3,smoothstep(0.5,1.0,t));
            
            vec3 col=mix(vec3(0.01,0.005,0.03),base,fresnel);
            col+=base*fresnel*0.8;
            col+=uColor1*smoothstep(0.0,0.2,vDisp)*0.15;
            
            gl_FragColor=vec4(col,0.85+fresnel*0.15);
          }
        `}
      />
    </mesh>
  );
}

// ─── PARTICLES ────────────────────────────────────────────────────
function GlowingParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;
  
  const { pos, sizes } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 4.0;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi) - 2;
      s[i] = Math.random() * 2.0 + 0.5;
    }
    return { pos: p, sizes: s };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#00E5FF") },
  }), []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.05;
    ref.current.rotation.x += dt * 0.02;
    (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value += dt;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pos} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float aSize;
          uniform float uTime;
          varying float vAlpha;
          void main(){
            vec3 p=position;
            p.y+=sin(uTime*0.5+p.x)*0.2;
            vec4 mv=modelViewMatrix*vec4(p,1.);
            gl_PointSize=aSize*(100./-mv.z);
            gl_Position=projectionMatrix*mv;
            vAlpha=smoothstep(15.,3.,-mv.z)*(0.3+sin(uTime*2.+p.x)*0.2+0.5);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vAlpha;
          void main(){
            float d=length(gl_PointCoord-.5);
            if(d>.5)discard;
            float g=smoothstep(.5,0.,d);
            gl_FragColor=vec4(uColor,g*g*vAlpha);
          }
        `}
      />
    </points>
  );
}

// ─── CAMERA CONTROLLER ────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = currentMouse.x * 0.3;
    camera.position.y = currentMouse.y * 0.2;
    camera.lookAt(0, 0, -2);
  });
  return null;
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────
export function WaterWaveBackground() {
  useEffect(() => {
    const onM = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onW = (e: WheelEvent) => {
      scrollState.targetVelocity += e.deltaY * 0.002;
    };
    const onTS = (e: TouchEvent) => {
      scrollState._touchY = e.touches[0].clientY;
      targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };
    const onTM = (e: TouchEvent) => {
      const dy = scrollState._touchY - e.touches[0].clientY;
      scrollState.targetVelocity += dy * 0.005;
      scrollState._touchY = e.touches[0].clientY;
      targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", onM, { passive: true });
    window.addEventListener("wheel", onW, { passive: true });
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchmove", onTM, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onM);
      window.removeEventListener("wheel", onW);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove", onTM);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#030014] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 20 }}
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, stencil: false, depth: false, powerPreference: "high-performance" }}
      >
        <CosmicNebula />
        <MorphBlob />
        <GlowingParticles />
        <CameraRig />
      </Canvas>
    </div>
  );
}
