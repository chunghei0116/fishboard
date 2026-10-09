"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { rigAnchors, type RigSlot } from "@/lib/fishing-rig-model";
const slots = Object.keys(rigAnchors) as RigSlot[];
export default function LoadoutRig({
  active,
  selected,
  onSelect,
}: {
  active: RigSlot | null;
  selected: RigSlot | null;
  onSelect: (slot: RigSlot) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<SVGSVGElement>(null);
  const controller = useRef<{
    highlight: (slot: RigSlot | null) => void;
    focus: (slot: RigSlot | null) => void;
    view: (action: "reset" | "in" | "out") => void;
    theme: (dark: boolean) => void;
  } | null>(null);
  const latest = useRef({ active, selected, onSelect });
  useEffect(() => {
    latest.current = { active, selected, onSelect };
  }, [active, selected, onSelect]);
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState("正在準備釣組…");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false,
      renderer: THREE.WebGLRenderer | undefined,
      rig: THREE.Object3D | undefined;
    let controls: OrbitControls | undefined,
      environment: THREE.WebGLRenderTarget | undefined;
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
    let mobile = false,
      width = 1,
      height = 1;
    const raycaster = new THREE.Raycaster();
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
        const [ex, ey] = ends[slot];
        path?.setAttribute("d", `M${x} ${y} L${ex * 10} ${ey * 10}`);
        circle?.setAttribute("cx", String(x));
        circle?.setAttribute("cy", String(y));
      }
    };
    const reset = () => {
      if (!controls) return;
      root.rotation.set(0, mobile ? -0.18 : -0.25, mobile ? 0 : -0.82);
      camera.position.set(0, 0, 14);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.target.set(mobile ? 0.7 : 0.35, 0, 0.1);
      controls.update();
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
    const focus = (slot: RigSlot | null) => {
      if (!controls) return;
      if (!slot || slot === "rod") {
        reset();
        return;
      }
      root.updateMatrixWorld(true);
      const target = root.localToWorld(new THREE.Vector3(...rigAnchors[slot]));
      controls.target.copy(target);
      camera.position.copy(target).add(new THREE.Vector3(0, 0, 14));
      camera.zoom =
        slot === "reel"
          ? 5
          : slot === "lure"
            ? 7
            : slot === "leaderLine"
              ? 2.4
              : 1.7;
      camera.updateProjectionMatrix();
      controls.update();
      draw();
    };
    const pointerStart = { x: 0, y: 0 };
    const down = (event: PointerEvent) => {
      pointerStart.x = event.clientX;
      pointerStart.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (
        !renderer ||
        !rig ||
        Math.hypot(
          event.clientX - pointerStart.x,
          event.clientY - pointerStart.y,
        ) > 6
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster
        .intersectObject(rig, true)
        .find((hit) => hit.object.userData.slot);
      if (hit) latest.current.onSelect(hit.object.userData.slot as RigSlot);
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
        renderer.domElement.setAttribute(
          "aria-label",
          "可旋轉及縮放的 3D 釣組",
        );
        renderer.domElement.setAttribute("role", "img");
        element.appendChild(renderer.domElement);
        renderer.domElement.addEventListener("pointerdown", down);
        renderer.domElement.addEventListener("pointerup", up);
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        renderer.domElement.addEventListener(
          "webglcontextrestored",
          contextRestored,
        );
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = false;
        controls.minZoom = 0.8;
        controls.maxZoom = 12;
        controls.addEventListener("change", draw);
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
          if (changed || first) focus(latest.current.selected);
          else draw();
        });
        resize.observe(element);
        controller.current = {
          highlight,
          focus,
          view: (action) => {
            if (action === "reset") reset();
            else {
              camera.zoom = THREE.MathUtils.clamp(
                camera.zoom * (action === "in" ? 1.5 : 1 / 1.5),
                0.8,
                12,
              );
              camera.updateProjectionMatrix();
              draw();
            }
          },
          theme: (dark) => {
            hemi.intensity = dark ? 2.7 : 2;
            key.intensity = dark ? 4 : 3.2;
            draw();
          },
        };
        reset();
        focus(latest.current.selected);
        highlight(latest.current.active);
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
      controls?.dispose();
      releaseRig();
      environment?.dispose();
      if (renderer) {
        renderer.domElement.removeEventListener("pointerdown", down);
        renderer.domElement.removeEventListener("pointerup", up);
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
  useEffect(() => controller.current?.focus(selected), [selected]);
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
      <div className="fl-rig-view-controls" role="group" aria-label="3D 視角">
        <button
          type="button"
          onClick={() => controller.current?.view("in")}
          aria-label="放大釣組"
        >
          <ZoomIn size={17} />
        </button>
        <button
          type="button"
          onClick={() => controller.current?.view("out")}
          aria-label="縮小釣組"
        >
          <ZoomOut size={17} />
        </button>
        <button
          type="button"
          onClick={() => controller.current?.view("reset")}
          aria-label="重設釣組視角"
        >
          <RotateCcw size={17} />
        </button>
      </div>
    </>
  );
}
