"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { rigAnchors, type RigSlot } from "@/lib/fishing-rig-model";
const slots = Object.keys(rigAnchors) as RigSlot[];
export default function LoadoutRig({ active }: { active: RigSlot | null }) {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<SVGSVGElement>(null);
  const controller = useRef<{
    highlight: (slot: RigSlot | null) => void;
    theme: (dark: boolean) => void;
  } | null>(null);
  const latest = useRef(active);
  useEffect(() => {
    latest.current = active;
  }, [active]);
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState("正在準備釣組…");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false,
      renderer: THREE.WebGLRenderer | undefined,
      rig: THREE.Object3D | undefined;
    let environment: THREE.WebGLRenderTarget | undefined;
    const target = new THREE.Vector3();
    let resize: ResizeObserver | undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
    const root = new THREE.Group();
    scene.add(root);
    const hemi = new THREE.HemisphereLight(0xe3efff, 0x526176, 2);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-4, 6, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd6e9ff, 2);
    rim.position.set(4, 1, -5);
    scene.add(rim);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 0.1,
      far: 30,
    });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.015;
    key.shadow.camera.updateProjectionMatrix();
    const backdropMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfe8f2,
      roughness: 0.95,
    });
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      backdropMaterial,
    );
    backdrop.position.z = -1.6;
    backdrop.receiveShadow = true;
    scene.add(backdrop);
    const grid = new THREE.GridHelper(30, 60, 0xb7cce3, 0xcbd9e9);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -1.59;
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.16;
    gridMaterial.depthWrite = false;
    scene.add(grid);
    let mobile = false,
      width = 1,
      height = 1;
    const original = new Map<
      THREE.MeshStandardMaterial,
      { color: THREE.Color; opacity: number; emissive: THREE.Color }
    >();
    const loadedMaterials = new Set<THREE.Material>();
    const draw = () => {
      if (disposed || !renderer) return;
      root.updateMatrixWorld(true);
      renderer.render(scene, camera);
      const ends = mobile
        ? {
            rod: [54, 17],
            reel: [54, 86],
            mainLine: [54, 34],
            leaderLine: [54, 50],
            lure: [54, 66],
          }
        : {
            rod: [25, 24],
            reel: [23, 71],
            mainLine: [76, 22],
            leaderLine: [80, 60],
            lure: [62, 88],
          };
      for (const slot of slots) {
        const point = root
          .localToWorld(new THREE.Vector3(...rigAnchors[slot]))
          .project(camera);
        const x = (point.x + 1) * 500,
          y = (1 - point.y) * 500;
        const path = overlay.current?.querySelector(`[data-lead="${slot}"]`);
        const circle = overlay.current?.querySelector(
          `[data-anchor="${slot}"]`,
        );
        let [ex, ey] = ends[slot].map((value) => value * 10);
        const card = element.parentElement?.querySelector<HTMLElement>(
          `.fl-rig-slot-${slot}`,
        );
        if (card) {
          const box = card.getBoundingClientRect(),
            stage = element.getBoundingClientRect();
          if (stage.width && stage.height) {
            const edge =
              box.left + box.width / 2 < stage.left + stage.width / 2
                ? box.right
                : box.left;
            ex = ((edge - stage.left) / stage.width) * 1000;
            ey = ((box.top + 22 - stage.top) / stage.height) * 1000;
          }
        }
        path?.setAttribute("d", `M${x} ${y} L${ex} ${ey}`);
        circle?.setAttribute("cx", String(x));
        circle?.setAttribute("cy", String(y));
      }
    };
    const reset = () => {
      if (!renderer) return;
      root.rotation.set(0, mobile ? -0.18 : -0.25, mobile ? 0 : -0.82);
      camera.position.set(0, 0, 14);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      target.set(mobile ? 0.7 : 0.35, 0, 0.1);
      camera.lookAt(target);
      draw();
    };
    const highlight = (slot: RigSlot | null) => {
      for (const [mat, base] of original) {
        mat.color.copy(base.color);
        mat.emissive.copy(base.emissive);
        mat.opacity = slot && mat.userData.slot !== slot ? 0.24 : base.opacity;
        mat.transparent = mat.opacity < 1;
        mat.depthWrite = mat.opacity === 1;
        if (slot && mat.userData.slot === slot) {
          mat.emissive.set(0x0c4986);
          mat.emissiveIntensity = 0.65;
        }
        mat.needsUpdate = true;
      }
      draw();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      setStatus("3D 預覽暫時無法顯示，仍可編輯配件。");
    };
    const contextRestored = () => {
      setStatus("");
      draw();
    };
    void (async () => {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;
        renderer.domElement.setAttribute("aria-label", "靜態 3D 釣組");
        renderer.domElement.setAttribute("role", "img");
        element.appendChild(renderer.domElement);
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        renderer.domElement.addEventListener(
          "webglcontextrestored",
          contextRestored,
        );
        renderer.domElement.style.touchAction = "auto";
        renderer.domElement.style.pointerEvents = "none";
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        environment = pmrem.fromScene(room, 0.04);
        scene.environment = environment.texture;
        room.dispose();
        pmrem.dispose();
        const result = await new GLTFLoader().loadAsync(
          "/models/fishing-rig.glb",
        );
        rig = result.scene;
        if (disposed) {
          releaseRig();
          return;
        }
        rig.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          let parent: THREE.Object3D | null = object;
          while (parent && !slots.includes(parent.name as RigSlot))
            parent = parent.parent;
          const slot = object.userData.slot || parent?.name;
          object.userData.slot = slot;
          object.castShadow =
            slot === "rod" || slot === "reel" || slot === "lure";
          object.receiveShadow = true;
          const materials = (
            Array.isArray(object.material) ? object.material : [object.material]
          ).map((material) => {
            const mat = material.clone() as THREE.MeshStandardMaterial;
            mat.userData.slot = slot;
            original.set(mat, {
              color: mat.color.clone(),
              opacity: mat.opacity,
              emissive: mat.emissive.clone(),
            });
            return mat;
          });
          const old = Array.isArray(object.material)
            ? object.material
            : [object.material];
          // Dispose the shared originals once after every mesh has cloned them.
          for (const mat of old) loadedMaterials.add(mat);
          object.material = Array.isArray(object.material)
            ? materials
            : materials[0];
        });
        for (const mat of loadedMaterials) mat.dispose();
        root.add(rig);
        resize = new ResizeObserver(() => {
          width = element.clientWidth;
          height = element.clientHeight;
          if (!width || !height || !renderer) return;
          const nextMobile = window.matchMedia("(max-width: 760px)").matches,
            first = renderer.domElement.width <= 1;
          const changed = nextMobile !== mobile;
          mobile = nextMobile;
          const viewHeight = mobile ? 9.5 : 8.8,
            aspect = width / height;
          camera.left = (-viewHeight * aspect) / 2;
          camera.right = (viewHeight * aspect) / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          if (changed || first) reset();
          else draw();
        });
        resize.observe(element);
        controller.current = {
          highlight,
          theme: (dark) => {
            backdropMaterial.color.set(dark ? 0x152333 : 0xdfe8f2);
            gridMaterial.color.set(dark ? 0x45617d : 0xb7cce3);
            hemi.intensity = dark ? 2.7 : 2;
            key.intensity = dark ? 4 : 3.2;
            draw();
          },
        };
        reset();
        highlight(latest.current);
        controller.current.theme(
          document.documentElement.dataset.theme === "dark",
        );
        setStatus("");
      } catch {
        if (!disposed) setStatus("3D 預覽暫時無法顯示，仍可編輯配件。");
      }
    })();
    function releaseRig() {
      rig?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material])
            mat.dispose();
        }
      });
    }
    return () => {
      disposed = true;
      controller.current = null;
      resize?.disconnect();
      releaseRig();
      environment?.dispose();
      backdrop.geometry.dispose();
      backdropMaterial.dispose();
      grid.geometry.dispose();
      gridMaterial.dispose();
      if (renderer) {
        renderer.domElement.removeEventListener(
          "webglcontextlost",
          contextLost,
        );
        renderer.domElement.removeEventListener(
          "webglcontextrestored",
          contextRestored,
        );
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);
  useEffect(() => controller.current?.highlight(active), [active]);
  useEffect(
    () => controller.current?.theme(resolvedTheme === "dark"),
    [resolvedTheme],
  );
  return (
    <>
      <div className="fl-rig-canvas" ref={host} />
      <svg
        ref={overlay}
        className="fl-rig-3d-leads"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {slots.map((slot) => (
          <g key={slot} className={active === slot ? "is-active" : ""}>
            <path data-lead={slot} />
            <circle data-anchor={slot} r="4" />
          </g>
        ))}
      </svg>
      {status && (
        <div className="fl-rig-status" role="status">
          <span className="fl-rig-loading-dot" />
          {status}
        </div>
      )}
    </>
  );
}
