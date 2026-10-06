'use client';

import { useEffect, useRef } from 'react';
import type { WebGLRenderer } from 'three';

export default function WaterBackground({ paused }: { paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  useEffect(() => { pause.current = paused; }, [paused]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    async function initialize() {
      const THREE = await import('three');
      if (cancelled) return;
      let renderer: WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' }); }
      catch { return; } // The static water colour remains available without WebGL.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: { time: { value: 0 }, aspect: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: `varying vec2 vUv; uniform float time; uniform float aspect;
          void main(){
            vec2 p=vUv*vec2(aspect,1.)*5.;
            vec2 drift=vec2(sin(p.y*1.8+time*.18),cos(p.x*1.5-time*.14))*.4;
            float a=sin((p.x+drift.x)*3.+time*.12);
            float b=sin((p.y+drift.y)*3.5-time*.1);
            float light=pow(max(0.,1.-abs(a+b)*.7),9.);
            vec3 water=mix(vec3(.84,.93,.90),vec3(.72,.87,.84),vUv.y*.45);
            gl_FragColor=vec4(water+light*vec3(.06,.055,.045),1.);
          }`,
      });
      scene.add(new THREE.Mesh(geometry, material));
      const container = host.current!;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      container.appendChild(renderer.domElement);
      let dirty = true;
      function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.aspect.value = window.innerWidth/window.innerHeight; dirty = true;
      }
      resize(); window.addEventListener('resize', resize);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0, last = 0;
      function animate(now: number) {
        frame = requestAnimationFrame(animate);
        const delta = last ? Math.min((now-last)/1000,.05) : 0; last = now;
        if (document.hidden || renderer.getContext().isContextLost()) return;
        if (!pause.current && !reduced.matches) { material.uniforms.time.value += delta; dirty = true; }
        if (dirty) { renderer.render(scene,camera); dirty = false; }
      }
      frame = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(frame); window.removeEventListener('resize',resize);
        geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    }
    void initialize().then(cleanup => { if (cancelled) cleanup?.(); else dispose = cleanup; }).catch(() => {});
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div className="shared-water" ref={host} aria-hidden="true"/>;
}
