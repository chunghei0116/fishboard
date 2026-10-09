import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

test("published GLB loads without external dependencies and preserves selectable solid parts", async () => {
  const bytes = await readFile(
    new URL("../public/models/fishing-rig.glb", import.meta.url),
  );
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const result = await new GLTFLoader().parseAsync(buffer, "");
  const parts = ["rod", "reel", "mainLine", "leaderLine", "lure"];
  for (const part of parts) {
    const group = result.scene.getObjectByName(part);
    assert.ok(group, part);
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(
      size.x > 0 && size.y > 0 && size.z > 0,
      `${part} is a volume, not a flat image`,
    );
    let meshes = 0;
    group.traverse((object) => {
      if (!object.isMesh) return;
      meshes++;
      assert.equal(
        object.userData.slot,
        part,
        "raycasting can identify each part",
      );
      const positions = object.geometry.getAttribute("position").array;
      assert.ok(
        positions.every(Number.isFinite),
        "all geometry coordinates are finite",
      );
      object.geometry.dispose();
      object.material.dispose();
    });
    assert.ok(meshes > 0);
  }
});
