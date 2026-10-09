import * as THREE from "three";
export type RigSlot = "rod" | "reel" | "mainLine" | "leaderLine" | "lure";
export const rigAnchors: Record<RigSlot, [number, number, number]> = {
  rod: [0, 0.4, 0],
  reel: [0, -2.85, 0.8],
  mainLine: [1.24, 2.65, 0.42],
  leaderLine: [1.7, -0.1, 0.42],
  lure: [1.7, -1.5, 0.42],
};
/** Modelled in real assembly order: rod, suspended spinning reel, guides, line, leader, lure. */
export function createFishingRig() {
  const root = new THREE.Group();
  root.name = "Spinning fishing setup";
  root.userData.reference =
    "Spinning rod guides and reel seat; fixed spool, rotor, bail and crank";
  const parts = Object.fromEntries(
    Object.keys(rigAnchors).map((slot) => {
      const group = new THREE.Group();
      group.name = slot;
      root.add(group);
      return [slot, group];
    }),
  ) as Record<RigSlot, THREE.Group>;
  const material = (color: number, metalness = 0, roughness = 0.4) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const carbon = material(0x202b36, 0.45, 0.32),
    rubber = material(0x172029, 0.04, 0.85);
  const metal = material(0xc3d0dd, 0.88, 0.23),
    blue = material(0x318bd1, 0.7, 0.28);
  const braid = material(0x3b9fa6, 0.15, 0.5),
    clear = material(0xb4c8dc, 0.25, 0.25);
  function mesh(
    slot: RigSlot,
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    position: [number, number, number],
    scale?: [number, number, number],
  ) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    if (scale) object.scale.set(...scale);
    object.userData.slot = slot;
    parts[slot].add(object);
    return object;
  }
  function cylinder(
    slot: RigSlot,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    y: number,
    mat: THREE.Material,
    x = 0,
    z = 0,
  ) {
    return mesh(
      slot,
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32),
      mat,
      [x, y, z],
    );
  }
  function tube(
    slot: RigSlot,
    points: [number, number, number][],
    radius: number,
    mat: THREE.Material,
    smooth = true,
  ) {
    const vectors = points.map((p) => new THREE.Vector3(...p));
    const path = smooth
      ? new THREE.CatmullRomCurve3(vectors)
      : new THREE.CurvePath<THREE.Vector3>();
    if (path instanceof THREE.CurvePath)
      for (let i = 1; i < vectors.length; i++)
        path.add(new THREE.LineCurve3(vectors[i - 1], vectors[i]));
    return mesh(
      slot,
      new THREE.TubeGeometry(
        path,
        Math.max(16, points.length * 6),
        radius,
        8,
        false,
      ),
      mat,
      [0, 0, 0],
    );
  }
  // Tapered carbon blank, split EVA grips, threaded reel seat and butt cap.
  cylinder("rod", 0.009, 0.075, 7.8, 0.1, carbon);
  cylinder("rod", 0.105, 0.115, 0.84, -3.55, rubber);
  cylinder("rod", 0.095, 0.105, 0.34, -2.37, rubber);
  cylinder("rod", 0.079, 0.085, 0.65, -2.88, carbon);
  cylinder("rod", 0.115, 0.115, 0.075, -3.97, metal);
  for (const y of [-3.1, -2.7, -2.56, -2.52, -2.48])
    cylinder("rod", 0.088, 0.088, 0.025, y, metal);
  for (const y of [-1.87, -1.82]) cylinder("rod", 0.066, 0.066, 0.025, y, blue);
  for (let y = -3.9; y < -3.2; y += 0.055)
    cylinder("rod", 0.116, 0.116, 0.012, y, rubber);
  // Guide rings are perpendicular to the blank; the line passes through their centres.
  const guides = [
    [-0.9, 0.17],
    [0.4, 0.135],
    [1.5, 0.105],
    [2.4, 0.08],
    [3.1, 0.055],
    [3.65, 0.04],
    [4, 0.025],
  ];
  const guidePoints: [number, number, number][] = [];
  for (const [y, radius] of guides) {
    const z = radius + 0.16;
    const ring = mesh(
      "rod",
      new THREE.TorusGeometry(radius, 0.014, 8, 32),
      metal,
      [0, y, z],
    );
    ring.rotation.x = Math.PI / 2;
    const insert = mesh(
      "rod",
      new THREE.TorusGeometry(radius - 0.012, 0.011, 8, 32),
      carbon,
      [0, y, z],
    );
    insert.rotation.x = Math.PI / 2;
    tube(
      "rod",
      [
        [0, y - 0.1, 0],
        [-radius, y - 0.06, z],
        [0, y, z],
        [radius, y - 0.06, z],
        [0, y - 0.1, 0],
      ],
      0.012,
      metal,
      false,
    );
    cylinder("rod", 0.052, 0.052, 0.1, y - 0.15, carbon);
    guidePoints.push([0, y, z]);
  }
  // A fixed-spool spinning reel hangs beneath the reel seat. The spool axis follows the blank.
  mesh(
    "reel",
    new THREE.BoxGeometry(0.12, 0.48, 0.08),
    metal,
    [0, -2.88, 0.075],
  );
  tube(
    "reel",
    [
      [0, -2.72, 0.09],
      [0, -2.9, 0.4],
      [0, -3.15, 0.66],
    ],
    0.065,
    metal,
  );
  mesh(
    "reel",
    new THREE.SphereGeometry(1, 32, 24),
    carbon,
    [0, -3.18, 0.78],
    [0.23, 0.32, 0.2],
  );
  mesh(
    "reel",
    new THREE.SphereGeometry(1, 24, 16),
    metal,
    [0.05, -3.28, 0.79],
    [0.22, 0.2, 0.17],
  );
  cylinder("reel", 0.13, 0.19, 0.16, -2.96, carbon, 0, 0.8);
  cylinder("reel", 0.16, 0.16, 0.085, -2.85, metal, 0, 0.8);
  cylinder("reel", 0.035, 0.035, 0.62, -2.68, metal, 0, 0.8);
  const spoolProfile = [
    [0.08, -0.22],
    [0.23, -0.22],
    [0.24, -0.185],
    [0.185, -0.15],
    [0.185, 0.1],
    [0.24, 0.13],
    [0.24, 0.175],
    [0.19, 0.19],
    [0.065, 0.19],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(
    "reel",
    new THREE.LatheGeometry(spoolProfile, 64),
    metal,
    [0, -2.51, 0.8],
  );
  cylinder("reel", 0.11, 0.13, 0.065, -2.285, carbon, 0, 0.8);
  cylinder("reel", 0.045, 0.045, 0.07, -2.265, blue, 0, 0.8);
  for (let y = -2.66; y < -2.405; y += 0.022) {
    const loop = mesh(
      "mainLine",
      new THREE.TorusGeometry(0.193, 0.011, 6, 48),
      braid,
      [0, y, 0.8],
    );
    loop.rotation.x = Math.PI / 2;
  }
  // Rotor arms and curved bail wire around the front of the spool.
  for (const side of [-1, 1])
    tube(
      "reel",
      [
        [side * 0.12, -2.88, 0.8],
        [side * 0.285, -2.74, 0.8],
        [side * 0.28, -2.47, 0.8],
      ],
      0.034,
      carbon,
    );
  const bail: [number, number, number][] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (Math.PI * i) / 32;
    bail.push([
      0.28 * Math.cos(a),
      -2.47 + 0.28 * Math.sin(a),
      0.8 + 0.22 * Math.sin(a),
    ]);
  }
  tube("reel", bail, 0.014, metal);
  const roller = cylinder("reel", 0.042, 0.042, 0.06, -2.47, metal, 0.28, 0.8);
  roller.rotation.z = Math.PI / 2;
  // Offset crank and a rubber paddle knob, mounted on the body side.
  tube(
    "reel",
    [
      [0.2, -3.2, 0.79],
      [0.38, -3.2, 0.79],
      [0.46, -2.93, 0.94],
    ],
    0.027,
    metal,
    false,
  );
  const knob = mesh(
    "reel",
    new THREE.SphereGeometry(1, 24, 16),
    rubber,
    [0.46, -2.92, 0.94],
    [0.085, 0.14, 0.065],
  );
  knob.rotation.z = -0.25;
  const sidePlate = mesh(
    "reel",
    new THREE.CylinderGeometry(0.1, 0.1, 0.025, 32),
    metal,
    [0.23, -3.18, 0.78],
  );
  sidePlate.rotation.z = Math.PI / 2;
  // Main braid through every guide, then down to a visible leader knot.
  tube("mainLine", [[0.28, -2.47, 0.8], ...guidePoints], 0.009, braid, false);
  tube(
    "mainLine",
    [
      [0, 4, 0.185],
      [0.6, 3.75, 0.35],
      [1.45, 2.5, 0.42],
      [1.7, 0.5, 0.42],
    ],
    0.009,
    braid,
  );
  tube(
    "leaderLine",
    [
      [1.7, 0.5, 0.42],
      [1.7, -0.3, 0.42],
      [1.7, -1.2, 0.42],
    ],
    0.01,
    clear,
  );
  for (let y = 0.44; y < 0.53; y += 0.015) {
    const knot = mesh(
      "leaderLine",
      new THREE.TorusGeometry(0.018, 0.008, 6, 16),
      braid,
      [1.7, y, 0.42],
    );
    knot.rotation.x = Math.PI / 2;
  }
  // Minnow lure: shaped body, diving lip, two split rings and two treble hooks.
  const lureBody = mesh(
    "lure",
    new THREE.SphereGeometry(1, 40, 24),
    metal,
    [1.7, -1.52, 0.42],
    [0.11, 0.31, 0.065],
  );
  lureBody.rotation.z = 0.12;
  const back = mesh(
    "lure",
    new THREE.SphereGeometry(1, 32, 20),
    blue,
    [1.66, -1.52, 0.43],
    [0.065, 0.29, 0.065],
  );
  back.rotation.z = 0.12;
  for (const z of [0.485, 0.355])
    mesh("lure", new THREE.SphereGeometry(0.021, 12, 12), rubber, [
      1.72,
      -1.3,
      z,
    ]);
  const lip = mesh(
    "lure",
    new THREE.BoxGeometry(0.1, 0.14, 0.015),
    clear,
    [1.77, -1.25, 0.42],
  );
  lip.rotation.z = -0.45;
  for (const y of [-1.2, -1.6, -1.84]) {
    mesh("lure", new THREE.TorusGeometry(0.026, 0.006, 6, 20), metal, [
      1.7,
      y,
      0.42,
    ]);
  }
  function treble(y: number) {
    tube(
      "lure",
      [
        [1.7, y, 0.42],
        [1.7, y - 0.13, 0.42],
      ],
      0.007,
      metal,
      false,
    );
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3,
        dx = Math.cos(angle),
        dz = Math.sin(angle);
      tube(
        "lure",
        [
          [1.7, y - 0.1, 0.42],
          [1.7 + 0.06 * dx, y - 0.2, 0.42 + 0.06 * dz],
          [1.7 + 0.1 * dx, y - 0.17, 0.42 + 0.1 * dz],
          [1.7 + 0.07 * dx, y - 0.11, 0.42 + 0.07 * dz],
        ],
        0.007,
        metal,
      );
      tube(
        "lure",
        [
          [1.7 + 0.07 * dx, y - 0.11, 0.42 + 0.07 * dz],
          [1.7 + 0.09 * dx, y - 0.14, 0.42 + 0.09 * dz],
        ],
        0.004,
        metal,
        false,
      );
    }
  }
  treble(-1.64);
  treble(-1.86);
  return root;
}
