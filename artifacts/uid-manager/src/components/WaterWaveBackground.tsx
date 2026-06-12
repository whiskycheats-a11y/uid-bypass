import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* Spring-smoothed input — velocity-based for ultra-soft motion */
const input = { mx: 0, my: 0, sv: 0, _ty: 0 };
const smooth = { x: 0, y: 0, vx: 0, vy: 0 };

function springStep(dt: number) {
  // critically-damped spring → soft, no overshoot jitter
  const k = 14, d = 8.5;
  smooth.vx += (input.mx - smooth.x) * k * dt; smooth.vx *= Math.exp(-d * dt);
  smooth.vy += (input.my - smooth.y) * k * dt; smooth.vy *= Math.exp(-d * dt);
  smooth.x += smooth.vx * dt;
  smooth.y += smooth.vy * dt;
}

/* ── Full-screen nebula ───────────────────────────────────────── */
function CosmicNebula() {
  const ref = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uRes: { value: new THREE.Vector2(1, 1) },
  }), []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const cl = Math.min(dt, 0.05);
    springStep(cl);
    input.sv *= Math.exp(-3.5 * cl);
    u.uTime.value += cl * (0.36 + Math.abs(input.sv) * 14);
    u.uMouse.value.set(smooth.x, smooth.y);          // no allocation
    u.uRes.value.set(viewport.width, viewport.height);
  });

  return (
    <mesh ref={ref} scale={[viewport.width, viewport.height, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={u}
        vertexShader={`
          varying vec2 vUv;
          void main(){ vUv=uv; gl_Position=vec4(position.xy*2.,0.,1.); }
        `}
        fragmentShader={`
          precision highp float;
          uniform float uTime; uniform vec2 uMouse; uniform vec2 uRes;
          varying vec2 vUv;
          vec3 mod289(vec3 x){return x-floor(x/289.)*289.;}
          vec4 mod289(vec4 x){return x-floor(x/289.)*289.;}
          vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
          float snoise(vec3 v){
            const vec2 C=vec2(1./6.,1./3.);
            vec3 i=floor(v+dot(v,C.yyy));
            vec3 x0=v-i+dot(i,C.xxx);
            vec3 g=step(x0.yzx,x0.xyz);
            vec3 l=1.-g;
            vec3 i1=min(g,l.zxy); vec3 i2=max(g,l.zxy);
            vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-.5;
            i=mod289(i);
            vec4 p=permute(permute(permute(
              i.z+vec4(0.,i1.z,i2.z,1.))
              +i.y+vec4(0.,i1.y,i2.y,1.))
              +i.x+vec4(0.,i1.x,i2.x,1.));
            float n_=1./7.; vec3 ns=n_*vec3(7.,5.,3.)-vec3(0.,2.,1.);
            vec4 j=p-49.*floor(p*ns.z*ns.z);
            vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
            vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
            vec4 h=1.-abs(x)-abs(y);
            vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
            vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.;
            vec4 sh=-step(h,vec4(0.));
            vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
            vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
            vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
            vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
            vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
            vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
            m=m*m;
            return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
          }
          // 4 octaves instead of 5 → ~20% cheaper, visually identical at fullscreen
          float fbm(vec3 p){
            float v=0.,a=.5;
            for(int i=0;i<4;i++){ v+=a*snoise(p); p*=2.1; a*=.48; }
            return v;
          }
          void main(){
            vec2 p=(vUv-.5)*2.; p.x*=uRes.x/uRes.y;
            vec2 m=uMouse*.35;
            float t=uTime;
            float n1=fbm(vec3(p*1.2+m,t*.4));
            float n2=fbm(vec3(p*.8-m*.5,t*.3+10.));
            float warp=fbm(vec3(p+n1*.45,t*.2));
            float n3=fbm(vec3(p*1.6+m*.3+warp*.2,t*.5+20.));
            float rC=smoothstep(-.2,.8,n1+warp*.3)*.35;
            float bC=smoothstep(-.3,.7,n3+warp*.4)*.55;
            vec3 cyan=vec3(0.,.9,1.), violet=vec3(.49,.16,.93), pink=vec3(.96,.28,.61);
            vec3 col=vec3(.01,0.,.08);
            col+=cyan*bC + violet*rC*.8;
            col+=pink*smoothstep(.3,.8,n1*n2)*.2;
            float dist=length(p)*.7;
            col+=vec3(.2,.1,.5)*exp(-dist*dist*1.5)*.15;
            // soft mouse spotlight — interactive glow that follows cursor
            float md=length(p-m*2.2);
            col+=mix(cyan,pink,.5+.5*sin(t*.7))*exp(-md*md*1.2)*.10;
            col*=1.-smoothstep(.3,1.4,length(p)*.8);
            float stars=smoothstep(.76,.79,snoise(vec3(vUv*50.,t*.05)));
            col+=vec3(.7,.8,1.)*stars*.3;
            gl_FragColor=vec4(col,1.);
          }
        `}
      />
    </mesh>
  );
}

/* ── Morphing sphere (detail 32, breathing, springy tilt) ─────── */
function MorphSphere() {
  const ref = useRef<THREE.Mesh>(null);
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
  }), []);

  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    u.uTime.value = t;
    u.uMouse.value.set(smooth.x, smooth.y);
    ref.current.rotation.y = t * .08 + smooth.x * .35;   // tilts toward cursor
    ref.current.rotation.x = Math.sin(t * .05) * .15 - smooth.y * .25;
    const breathe = 1 + Math.sin(t * .6) * .04 + Math.abs(input.sv) * 2.5;
    ref.current.scale.setScalar(breathe);                // scroll makes it pulse
  });

  return (
    <mesh ref={ref} position={[0, 0, -3]}>
      <icosahedronGeometry args={[1.6, 32]} />
      <shaderMaterial
        transparent
        uniforms={u}
        vertexShader={`
          uniform float uTime; uniform vec2 uMouse;
          varying vec3 vNormal; varying vec3 vPos; varying float vDisp;
          vec3 mod289(vec3 x){return x-floor(x/289.)*289.;}
          vec4 mod289(vec4 x){return x-floor(x/289.)*289.;}
          vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
          float snoise(vec3 v){
            const vec2 C=vec2(1./6.,1./3.);
            vec3 i=floor(v+dot(v,C.yyy));
            vec3 x0=v-i+dot(i,C.xxx);
            vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g;
            vec3 i1=min(g,l.zxy); vec3 i2=max(g,l.zxy);
            vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-.5;
            i=mod289(i);
            vec4 p=permute(permute(permute(
              i.z+vec4(0.,i1.z,i2.z,1.))
              +i.y+vec4(0.,i1.y,i2.y,1.))
              +i.x+vec4(0.,i1.x,i2.x,1.));
            float n_=1./7.; vec3 ns=n_*vec3(7.,5.,3.)-vec3(0.,2.,1.);
            vec4 j=p-49.*floor(p*ns.z*ns.z);
            vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
            vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
            vec4 h=1.-abs(x)-abs(y);
            vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
            vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.;
            vec4 sh=-step(h,vec4(0.));
            vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
            vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
            vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
            vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
            vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
            vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
            m=m*m;
            return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
          }
          void main(){
            vec3 pos=position;
            float n=snoise(pos*1.2+uTime*.3+vec3(uMouse,0.)*.6);
            n+=snoise(pos*2.5-uTime*.2)*.4;
            float displacement=n*.25*(1.+length(uMouse)*.4); // morphs harder near edges
            pos+=normal*displacement;
            vDisp=displacement;
            vNormal=normalize(normalMatrix*normal);
            vPos=(modelMatrix*vec4(pos,1.)).xyz;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal; varying vec3 vPos; varying float vDisp;
          void main(){
            vec3 viewDir=normalize(cameraPosition-vPos);
            float fresnel=pow(1.-max(0.,dot(vNormal,viewDir)),3.5);
            vec3 cyan=vec3(0.,.9,1.), violet=vec3(.55,.2,1.), pink=vec3(1.,.3,.6);
            float t=vDisp*3.+.5;
            vec3 iri=mix(cyan,violet,smoothstep(.2,.7,t));
            iri=mix(iri,pink,smoothstep(.6,1.,t));
            vec3 col=mix(vec3(.01,.005,.04),iri,fresnel)+iri*fresnel*.6;
            col+=cyan*smoothstep(0.,.15,vDisp)*.12;
            gl_FragColor=vec4(col,.7+fresnel*.3);
          }
        `}
      />
    </mesh>
  );
}

/* ── Particles (unchanged logic, delta-safe) ──────────────────── */
function OrbitalParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;
  const { pos, sz } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 6;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi) - 3;
      s[i] = Math.random() * 2 + .3;
    }
    return { pos: p, sz: s };
  }, []);
  const u = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((s) => {
    if (!ref.current) return;
    u.uTime.value = s.clock.elapsedTime;
    ref.current.rotation.y = s.clock.elapsedTime * .02 + smooth.x * .1;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pos} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sz} count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
        uniforms={u}
        vertexShader={`
          attribute float aSize; uniform float uTime; varying float vA;
          void main(){
            vec3 p=position;
            p.y+=sin(uTime*.15+p.x)*.3;
            p.x+=cos(uTime*.12+p.z)*.2;
            vec4 mv=modelViewMatrix*vec4(p,1.);
            gl_PointSize=aSize*(80./-mv.z);
            gl_Position=projectionMatrix*mv;
            vA=smoothstep(20.,4.,-mv.z)*(.2+sin(uTime+p.x*3.)*.25+.25);
          }
        `}
        fragmentShader={`
          varying float vA;
          void main(){
            float d=length(gl_PointCoord-.5);
            if(d>.5)discard;
            float g=smoothstep(.5,0.,d);
            gl_FragColor=vec4(.6,.7,1.,g*g*vA*.5);
          }
        `}
      />
    </points>
  );
}

/* ── Camera rig — soft parallax via the same spring ───────────── */
function Rig() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x += (smooth.x * .55 - camera.position.x) * .04;
    camera.position.y += (smooth.y * .35 - camera.position.y) * .04;
    camera.lookAt(0, 0, -3);
  });
  return null;
}

/* ── ROOT ─────────────────────────────────────────────────────── */
export function WaterWaveBackground() {
  useEffect(() => {
    const onM = (e: MouseEvent) => {
      input.mx = (e.clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onW = (e: WheelEvent) => { input.sv += e.deltaY * .00008; };
    const onTS = (e: TouchEvent) => { input._ty = e.touches[0].clientY; };
    const onTM = (e: TouchEvent) => {
      input.sv += (input._ty - e.touches[0].clientY) * .0003;
      input._ty = e.touches[0].clientY;
      input.mx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
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
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: "#030014" }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50, near: .1, far: 40 }}
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, depth: true }}
      >
        <CosmicNebula />
        <MorphSphere />
        <OrbitalParticles />
        <Rig />
      </Canvas>
    </div>
  );
}
