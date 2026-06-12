import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════
   ✦  NEBULA FLOW — Full-Screen Cosmic Aurora Shader
   ─────────────────────────────────────────────────────────────────
   Completely different approach: NO terrain, NO wireframe.
   A full-screen fragment shader that creates a living, breathing
   cosmic nebula/aurora that fills every pixel of the screen.
   + Mouse-reactive morphing
   + Scroll-reactive flow speed
   + Central morphing sphere with Fresnel glow
   + Floating particles
   ═══════════════════════════════════════════════════════════════════ */

const input = { mx: 0, my: 0, sv: 0, so: 0, _ty: 0 };

// ═════════════════════════════════════════════════════════════════
//  Full-Screen Cosmic Nebula Shader
// ═════════════════════════════════════════════════════════════════
function CosmicNebula() {
  const ref = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uRes: { value: new THREE.Vector2(1, 1) },
  }), []);

  useFrame(() => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    input.so += input.sv;
    input.sv *= 0.94;
    m.uniforms.uTime.value += 0.006 + Math.abs(input.sv) * 0.3;
    m.uniforms.uMouse.value.lerp(new THREE.Vector2(input.mx, input.my), 0.02);
    m.uniforms.uRes.value.set(viewport.width, viewport.height);
  });

  return (
    <mesh ref={ref} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={u}
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
          uniform vec2 uRes;
          varying vec2 vUv;

          // Simplex noise
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

          // Fractal Brownian Motion
          float fbm(vec3 p){
            float v=0.;float a=.5;
            for(int i=0;i<5;i++){
              v+=a*snoise(p);
              p*=2.1;a*=.48;
            }
            return v;
          }

          void main(){
            vec2 uv=vUv;
            vec2 p=(uv-0.5)*2.;
            p.x*=uRes.x/uRes.y;

            // Mouse influence
            vec2 m=uMouse*0.3;

            // Flowing nebula clouds
            float t=uTime;
            vec3 coord1=vec3(p*1.2+m,t*0.4);
            vec3 coord2=vec3(p*0.8-m*0.5,t*0.3+10.);
            vec3 coord3=vec3(p*1.6+m*0.3,t*0.5+20.);

            float n1=fbm(coord1);
            float n2=fbm(coord2);
            float n3=fbm(coord3);

            // Warped coordinates for organic flow
            float warp=fbm(vec3(p+n1*0.4,t*0.2));

            // Color channels — each driven by different noise layer
            float r_channel=smoothstep(-0.2,0.8,n1+warp*0.3)*0.35;
            float g_channel=smoothstep(-0.1,0.9,n2+warp*0.2)*0.15;
            float b_channel=smoothstep(-0.3,0.7,n3+warp*0.4)*0.55;

            // Neon color palette
            vec3 cyan=vec3(0.0,0.9,1.0);
            vec3 violet=vec3(0.49,0.16,0.93);
            vec3 pink=vec3(0.96,0.28,0.61);
            vec3 deep=vec3(0.01,0.0,0.08);

            vec3 col=deep;
            col+=cyan*b_channel;
            col+=violet*(r_channel*0.8);
            col+=pink*(smoothstep(0.3,0.8,n1*n2)*0.2);

            // Central radial glow
            float dist=length(p)*0.7;
            float centralGlow=exp(-dist*dist*1.5)*0.15;
            col+=vec3(0.2,0.1,0.5)*centralGlow;

            // Vignette darkening
            float vig=1.-smoothstep(0.3,1.4,length(p)*0.8);
            col*=vig;

            // Subtle bright spots (stars in nebula)
            float stars=smoothstep(0.75,0.78,snoise(vec3(uv*50.,t*0.05)));
            col+=vec3(0.7,0.8,1.0)*stars*0.3;

            gl_FragColor=vec4(col,1.);
          }
        `}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Morphing Sphere — iridescent blob in center
// ═════════════════════════════════════════════════════════════════
function MorphSphere() {
  const ref = useRef<THREE.Mesh>(null);
  const u = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
  }), []);

  useFrame((s) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.ShaderMaterial;
    m.uniforms.uTime.value = s.clock.elapsedTime;
    m.uniforms.uMouse.value.lerp(new THREE.Vector2(input.mx, input.my), 0.03);
    ref.current.rotation.y = s.clock.elapsedTime * 0.08;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.05) * 0.15;
  });

  return (
    <mesh ref={ref} position={[0, 0, -3]}>
      <icosahedronGeometry args={[1.6, 48]} />
      <shaderMaterial
        transparent
        uniforms={u}
        vertexShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          varying vec3 vNormal;
          varying vec3 vPos;
          varying float vDisp;

          // 3D noise
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
            vec3 i1=min(g,l.zxy);
            vec3 i2=max(g,l.zxy);
            vec3 x1=x0-i1+C.xxx;
            vec3 x2=x0-i2+C.yyy;
            vec3 x3=x0-0.5;
            i=mod289(i);
            vec4 p=permute(permute(permute(
              i.z+vec4(0.,i1.z,i2.z,1.))
              +i.y+vec4(0.,i1.y,i2.y,1.))
              +i.x+vec4(0.,i1.x,i2.x,1.));
            float n_=1./7.;vec3 ns=n_*vec3(7.,5.,3.)-vec3(0.,2.,1.);
            vec4 j=p-49.*floor(p*ns.z*ns.z);
            vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
            vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
            vec4 h=1.-abs(x)-abs(y);
            vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
            vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
            vec4 sh=-step(h,vec4(0.));
            vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
            vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
            vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
            vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
            vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
            vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
            m=m*m;
            return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
          }

          void main(){
            vec3 pos=position;
            float n=snoise(pos*1.2+uTime*0.3+vec3(uMouse,0.)*0.5);
            n+=snoise(pos*2.5-uTime*0.2)*0.4;
            float displacement=n*0.25;
            pos+=normal*displacement;
            vDisp=displacement;
            vNormal=normalize(normalMatrix*normal);
            vPos=pos;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vPos;
          varying float vDisp;

          void main(){
            vec3 viewDir=normalize(cameraPosition-vPos);
            float fresnel=pow(1.-max(0.,dot(vNormal,viewDir)),3.5);

            // Iridescent color based on normal + displacement
            vec3 cyan=vec3(0.,0.9,1.);
            vec3 violet=vec3(0.55,0.2,1.);
            vec3 pink=vec3(1.,0.3,0.6);

            float t=vDisp*3.+0.5;
            vec3 iriColor=mix(cyan,violet,smoothstep(0.2,0.7,t));
            iriColor=mix(iriColor,pink,smoothstep(0.6,1.,t));

            // Dark core, bright edges (Fresnel)
            vec3 col=mix(vec3(0.01,0.005,0.04),iriColor,fresnel);
            col+=iriColor*fresnel*0.6;

            // Subtle inner glow on peaks
            col+=cyan*smoothstep(0.,0.15,vDisp)*0.12;

            float alpha=0.7+fresnel*0.3;
            gl_FragColor=vec4(col,alpha);
          }
        `}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Floating Particles around the sphere
// ═════════════════════════════════════════════════════════════════
function OrbitalParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;
  const { pos, sz } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribute in a shell around center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 6;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi) - 3;
      s[i] = Math.random() * 2 + 0.3;
    }
    return { pos: p, sz: s };
  }, []);

  const u = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((s) => {
    if (!ref.current) return;
    (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = s.clock.elapsedTime;
    ref.current.rotation.y = s.clock.elapsedTime * 0.02;
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
          attribute float aSize;
          uniform float uTime;
          varying float vA;
          void main(){
            vec3 p=position;
            p.y+=sin(uTime*0.15+p.x)*0.3;
            p.x+=cos(uTime*0.12+p.z)*0.2;
            vec4 mv=modelViewMatrix*vec4(p,1.);
            gl_PointSize=aSize*(80./-mv.z);
            gl_Position=projectionMatrix*mv;
            vA=smoothstep(20.,4.,-mv.z)*(0.2+sin(uTime+p.x*3.)*0.25+0.25);
          }
        `}
        fragmentShader={`
          varying float vA;
          void main(){
            float d=length(gl_PointCoord-.5);
            if(d>.5)discard;
            float g=smoothstep(.5,.0,d);
            gl_FragColor=vec4(0.6,0.7,1.,g*g*vA*0.5);
          }
        `}
      />
    </points>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Camera
// ═════════════════════════════════════════════════════════════════
function Rig() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, input.mx * 0.5, 0.012);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, input.my * 0.3, 0.012);
    camera.lookAt(0, 0, -3);
  });
  return null;
}

// ═════════════════════════════════════════════════════════════════
//  ROOT
// ═════════════════════════════════════════════════════════════════
export function WaterWaveBackground() {
  useEffect(() => {
    const onM = (e: MouseEvent) => {
      input.mx = (e.clientX / window.innerWidth) * 2 - 1;
      input.my = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onW = (e: WheelEvent) => { input.sv += e.deltaY * 0.00008; };
    const onTS = (e: TouchEvent) => { input._ty = e.touches[0].clientY; };
    const onTM = (e: TouchEvent) => {
      input.sv += (input._ty - e.touches[0].clientY) * 0.0003;
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
        camera={{ position: [0, 0, 4], fov: 50, near: 0.1, far: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <CosmicNebula />
        <MorphSphere />
        <OrbitalParticles />
        <Rig />
      </Canvas>
    </div>
  );
}
