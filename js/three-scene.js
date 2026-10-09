/**
 * Silva - Parque de Aventuras
 * Three.js Interactive Low-Poly 3D World
 */

(function () {
  'use strict';

  // State
  let scene, camera, renderer;
  let container;
  let worldGroup;
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let targetRotation = { x: 0.35, y: -0.6 };
  let currentRotation = { x: 0.35, y: -0.6 };
  let cameraTarget = new THREE.Vector3(0, 0.5, 0);
  let currentLookAt = new THREE.Vector3(0, 0.5, 0);
  let cameraDistance = 14;
  let targetCameraDistance = 14;
  let autoRotate = true;
  let ziplineTrolley;
  let ziplineProgress = 0;
  let deerHead;
  let fireflyParticles;
  let sunLight, hemiLight, campLight;
  let currentTheme = 'day'; // 'day', 'sunset', 'night'
  
  // Interactive Hotspots coordinates in world space
  const HOTSPOTS = [
    {
      id: 'tirolina',
      title: 'Tirolina Superman 600m',
      desc: 'Desciende a más de 75 km/h sobre el valle y las copas de los árboles con arnés doble homologado.',
      difficulty: 'Media - Alta',
      height: '35 metros',
      position: new THREE.Vector3(-2.8, 2.6, 1.2),
      cameraTarget: new THREE.Vector3(-2.5, 2.2, 1.0),
      camDistance: 8.5
    },
    {
      id: 'puente',
      title: 'Puente Tibetano Suspendido',
      desc: 'Paso de equilibrio de 45 metros sobre el cañón con línea de vida continua y vistas panorámicas.',
      difficulty: 'Familiar',
      height: '18 metros',
      position: new THREE.Vector3(1.4, 1.3, -1.2),
      cameraTarget: new THREE.Vector3(1.2, 1.0, -1.0),
      camDistance: 8
    },
    {
      id: 'ciervo',
      title: 'Santuario de Ciervos & Fauna',
      desc: 'Espacio de avistamiento y conservación ecológica donde habitan ciervos protegidos en semilibertad.',
      difficulty: 'Para todos los públicos',
      height: 'Nivel del suelo',
      position: new THREE.Vector3(2.5, 0.4, 1.8),
      cameraTarget: new THREE.Vector3(2.4, 0.5, 1.5),
      camDistance: 7.5
    },
    {
      id: 'campamento',
      title: 'Campamento Base & Merendero',
      desc: 'Punto de partida con zona de descanso, fogata segura, alquiler de equipos y briefings de seguridad.',
      difficulty: 'Punto de Encuentro',
      height: 'Nivel del suelo',
      position: new THREE.Vector3(-0.6, 0.35, 2.4),
      cameraTarget: new THREE.Vector3(-0.5, 0.4, 2.0),
      camDistance: 7.5
    }
  ];

  function init() {
    container = document.getElementById('three-canvas-container');
    if (!container) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = null; // Transparent to blend with modern card backdrop

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
    camera.position.set(0, 7, cameraDistance);
    camera.lookAt(cameraTarget);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    setupLighting();

    // 5. Build 3D World (Procedural Low-Poly Nature & Adventure Park)
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    buildTerrain();
    buildRiver();
    buildTrees();
    buildBushesAndRocks();
    buildZiplineTower();
    buildSuspensionBridge();
    buildStylizedDeer();
    buildCampfireAndTent();
    buildFloatingFireflies();

    // 6. Setup Events & Interactions
    setupControls();
    window.addEventListener('resize', onWindowResize);

    // 7. Update UI Hotspot Badges
    setupHotspotTriggers();

    // 8. Start Loop
    animate();
  }

  // --- LIGHTING ---
  function setupLighting() {
    hemiLight = new THREE.HemisphereLight(0xdcfce7, 0x064e3b, 0.9);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sunLight.position.set(12, 18, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    const d = 8;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Subtle soft fill light
    const fillLight = new THREE.DirectionalLight(0xa7f3d0, 0.4);
    fillLight.position.set(-10, 8, -10);
    scene.add(fillLight);

    // Campfire point light
    campLight = new THREE.PointLight(0xf59e0b, 1.2, 5, 2);
    campLight.position.set(-0.6, 0.6, 2.4);
    scene.add(campLight);
  }

  // --- PROCEDURAL 3D ASSETS ---
  function buildTerrain() {
    // Multi-layered floating island base
    // Main top green meadow
    const topGeo = new THREE.CylinderGeometry(5.4, 5.8, 0.7, 16);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Vibrant nature green
      flatShading: true,
      roughness: 0.8
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.receiveShadow = true;
    topMesh.castShadow = true;
    worldGroup.add(topMesh);

    // Sub-layer cliff / stone
    const cliffGeo = new THREE.CylinderGeometry(5.8, 4.2, 1.5, 14);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate rock
      flatShading: true,
      roughness: 0.9
    });
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.y = -0.9;
    cliffMesh.receiveShadow = true;
    cliffMesh.castShadow = true;
    worldGroup.add(cliffMesh);

    // Bottom root floating point
    const botGeo = new THREE.ConeGeometry(4.2, 2.2, 10);
    const botMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      flatShading: true,
      roughness: 0.95
    });
    const botMesh = new THREE.Mesh(botGeo, botMat);
    botMesh.rotation.x = Math.PI;
    botMesh.position.y = -2.7;
    botMesh.castShadow = true;
    worldGroup.add(botMesh);

    // Upper hills/mounds for elevation
    const hillMat1 = new THREE.MeshStandardMaterial({ color: 0x16a34a, flatShading: true });
    const hillMat2 = new THREE.MeshStandardMaterial({ color: 0x4ade80, flatShading: true });

    const hill1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.8, 8), hillMat1);
    hill1.position.set(-2.8, 0.9, -1.2);
    hill1.castShadow = true;
    hill1.receiveShadow = true;
    worldGroup.add(hill1);

    const hill2 = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.4, 7), hillMat2);
    hill2.position.set(2.6, 0.7, -1.6);
    hill2.castShadow = true;
    hill2.receiveShadow = true;
    worldGroup.add(hill2);

    const hill3 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 0.8, 8), hillMat1);
    hill3.position.set(-2.8, 0.6, 1.2);
    hill3.castShadow = true;
    hill3.receiveShadow = true;
    worldGroup.add(hill3);
  }

  function buildRiver() {
    // Stylized curving river cut through the island
    const riverGeo = new THREE.BoxGeometry(1.1, 0.08, 9.8);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.y = 0.45;
    river.position.set(0.2, 0.36, -0.2);
    river.receiveShadow = true;
    worldGroup.add(river);

    // River stepping stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true });
    [
      { x: -0.6, z: 0.6, r: 0.22 },
      { x: 0.1, z: 0.1, r: 0.28 },
      { x: 0.8, z: -0.5, r: 0.24 }
    ].forEach(st => {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(st.r, 0), stoneMat);
      stone.position.set(st.x, 0.45, st.z);
      stone.scale.set(1.2, 0.6, 1);
      stone.castShadow = true;
      worldGroup.add(stone);
    });
  }

  function createPineTree(x, z, scale = 1, tint = 0x15803d) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0.35, z);
    treeGroup.scale.set(scale, scale, scale);

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6), trunkMat);
    trunk.position.y = 0.45;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage cones (3 tiers)
    const foliageMat = new THREE.MeshStandardMaterial({ color: tint, flatShading: true });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 7), foliageMat);
    cone1.position.y = 1.1;
    cone1.castShadow = true;
    treeGroup.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.85, 7), foliageMat);
    cone2.position.y = 1.6;
    cone2.castShadow = true;
    treeGroup.add(cone2);

    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 7), foliageMat);
    cone3.position.y = 2.05;
    cone3.castShadow = true;
    treeGroup.add(cone3);

    worldGroup.add(treeGroup);
    return treeGroup;
  }

  function createBroadleafTree(x, z, scale = 1, foliageColor = 0x10b981) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0.35, z);
    treeGroup.scale.set(scale, scale, scale);

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.2, 6), trunkMat);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Cloud-like low-poly foliage (Dodecahedrons cluster)
    const folMat = new THREE.MeshStandardMaterial({ color: foliageColor, flatShading: true });
    const head1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), folMat);
    head1.position.set(0, 1.6, 0);
    head1.castShadow = true;
    treeGroup.add(head1);

    const head2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), folMat);
    head2.position.set(0.4, 1.45, 0.2);
    head2.castShadow = true;
    treeGroup.add(head2);

    const head3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), folMat);
    head3.position.set(-0.35, 1.5, -0.2);
    head3.castShadow = true;
    treeGroup.add(head3);

    worldGroup.add(treeGroup);
    return treeGroup;
  }

  function buildTrees() {
    // Cluster of pine and broadleaf trees around the island
    const treeCoords = [
      // Left high ridge
      { type: 'pine', x: -3.8, z: -1.2, s: 1.25, c: 0x166534 },
      { type: 'pine', x: -3.2, z: -2.3, s: 1.1, c: 0x15803d },
      { type: 'pine', x: -2.2, z: -2.6, s: 1.4, c: 0x14532d },
      { type: 'pine', x: -1.6, z: -3.2, s: 0.95, c: 0x166534 },
      
      // Broadleaf trees (lush forest greens, mint, and soft warm accent matching illustration)
      { type: 'broad', x: -1.8, z: 0.2, s: 1.05, c: 0x059669 },
      { type: 'broad', x: -3.6, z: 1.6, s: 0.9, c: 0x34d399 },
      { type: 'broad', x: 2.2, z: -2.8, s: 1.3, c: 0x047857 },
      { type: 'broad', x: 3.4, z: -1.6, s: 1.1, c: 0x10b981 },
      { type: 'broad', x: 3.6, z: 0.4, s: 0.85, c: 0x6ee7b7 }, // mint accent
      { type: 'pine', x: 1.6, z: -3.4, s: 1.15, c: 0x15803d },
      { type: 'pine', x: 2.8, z: 2.4, s: 0.9, c: 0x166534 },
      { type: 'broad', x: -1.4, z: 3.2, s: 0.8, c: 0x10b981 }
    ];

    treeCoords.forEach(t => {
      if (t.type === 'pine') {
        createPineTree(t.x, t.z, t.s, t.c);
      } else {
        createBroadleafTree(t.x, t.z, t.s, t.c);
      }
    });
  }

  function buildBushesAndRocks() {
    // Rocks & pastel foliage bushes (matching reference illustration touches)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
    const coralBushMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, flatShading: true }); // Coral/pink flowers
    const yellowBushMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true }); // Golden flowers

    // Rocks scattered
    const rockLocations = [
      { x: -2.5, y: 0.45, z: 2.8, s: 0.4 },
      { x: 3.2, y: 0.4, z: -0.6, s: 0.55 },
      { x: -0.2, y: 0.4, z: -3.4, s: 0.5 },
      { x: 1.8, y: 0.4, z: 2.8, s: 0.35 }
    ];
    rockLocations.forEach(r => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r.s, 0), rockMat);
      rock.position.set(r.x, r.y, r.z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      worldGroup.add(rock);
    });

    // Coral & Yellow flora bushes
    const flora = [
      { x: -1.2, z: 1.2, m: coralBushMat, s: 0.28 },
      { x: -2.2, z: 2.2, m: coralBushMat, s: 0.32 },
      { x: 2.8, z: 1.2, m: coralBushMat, s: 0.3 },
      { x: 0.8, z: 1.8, m: yellowBushMat, s: 0.25 },
      { x: -3.0, z: -0.5, m: yellowBushMat, s: 0.26 }
    ];
    flora.forEach(f => {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(f.s, 1), f.m);
      bush.position.set(f.x, 0.42, f.z);
      bush.castShadow = true;
      worldGroup.add(bush);
    });
  }

  // --- ADVENTURE ATTRACTIONS ---

  // 1. Zipline Tower & Cable with Trolley
  let ziplineStart = new THREE.Vector3(-2.8, 2.5, 1.2);
  let ziplineEnd = new THREE.Vector3(2.4, 1.2, -2.4);

  function buildZiplineTower() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, flatShading: true });

    // Tower 1 (High start station)
    const tower1 = new THREE.Group();
    tower1.position.copy(ziplineStart);
    tower1.position.y = 0.35; // base level

    // 4 Stilts
    for (let dx of [-0.25, 0.25]) {
      for (let dz of [-0.25, 0.25]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), woodMat);
        pole.position.set(dx, 1.1, dz);
        pole.castShadow = true;
        tower1.add(pole);
      }
    }
    // Wooden platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.85), woodMat);
    platform.position.y = 2.15;
    platform.castShadow = true;
    tower1.add(platform);

    // Platform railings
    const railing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), new THREE.MeshBasicMaterial({ wireframe: true, color: 0x78350f }));
    railing.position.y = 2.3;
    tower1.add(railing);

    // Conical roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.5, 6), roofMat);
    roof.position.y = 2.8;
    roof.castShadow = true;
    tower1.add(roof);

    worldGroup.add(tower1);

    // Tower 2 (Arrival platform on tree)
    const tower2 = new THREE.Group();
    tower2.position.set(ziplineEnd.x, 0.35, ziplineEnd.z);
    const platform2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 8), woodMat);
    platform2.position.y = 0.9;
    platform2.castShadow = true;
    tower2.add(platform2);
    worldGroup.add(tower2);

    // Zipline Cable
    const cablePoints = [
      new THREE.Vector3(ziplineStart.x, ziplineStart.y + 0.1, ziplineStart.z),
      new THREE.Vector3(ziplineEnd.x, 0.35 + 0.95, ziplineEnd.z)
    ];
    const cableGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(cablePoints[0], cablePoints[1]),
      20,
      0.015,
      6,
      false
    );
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const cableMesh = new THREE.Mesh(cableGeo, cableMat);
    worldGroup.add(cableMesh);

    // Zipline trolley + little adventurer figure
    ziplineTrolley = new THREE.Group();
    const trolleyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    ziplineTrolley.add(trolleyMesh);

    // Mini human adventurer
    const adventurerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const adventurerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6), adventurerMat);
    adventurerBody.position.y = -0.16;
    ziplineTrolley.add(adventurerBody);

    const helmetMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    helmetMesh.position.y = -0.02;
    ziplineTrolley.add(helmetMesh);

    ziplineTrolley.position.copy(cablePoints[0]);
    worldGroup.add(ziplineTrolley);
  }

  // 2. Suspension Bridge (Puente Tibetano)
  function buildSuspensionBridge() {
    const bridgeGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, flatShading: true });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });

    // Planks spanning across the river gorge
    const p1 = new THREE.Vector3(0.5, 0.85, -1.8);
    const p2 = new THREE.Vector3(2.0, 0.7, -0.6);
    const numPlanks = 10;

    for (let i = 0; i <= numPlanks; i++) {
      const t = i / numPlanks;
      const x = THREE.MathUtils.lerp(p1.x, p2.x, t);
      const z = THREE.MathUtils.lerp(p1.z, p2.z, t);
      // Gentle sag in middle
      const sag = Math.sin(t * Math.PI) * 0.15;
      const y = THREE.MathUtils.lerp(p1.y, p2.y, t) - sag;

      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.12), woodMat);
      plank.position.set(x, y, z);
      plank.rotation.y = -0.65;
      plank.castShadow = true;
      bridgeGroup.add(plank);
    }

    worldGroup.add(bridgeGroup);
  }

  // 3. Stylized Low-Poly Deer (Inspired by the reference illustration)
  function buildStylizedDeer() {
    const deerGroup = new THREE.Group();
    deerGroup.position.set(2.4, 0.38, 1.8);
    deerGroup.rotation.y = -1.2;

    // Body with warm blush coral tone like the reference image
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af, // Soft pink-coral
      flatShading: true,
      roughness: 0.6
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.7), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    deerGroup.add(body);

    // 4 Slender legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, flatShading: true });
    const legGeo = new THREE.BoxGeometry(0.07, 0.5, 0.07);
    const legOffsets = [
      { x: -0.16, z: 0.25 },
      { x: 0.16, z: 0.25 },
      { x: -0.16, z: -0.25 },
      { x: 0.16, z: -0.25 }
    ];
    legOffsets.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos.x, 0.25, pos.z);
      leg.castShadow = true;
      deerGroup.add(leg);
    });

    // Neck & Head
    deerHead = new THREE.Group();
    deerHead.position.set(0, 0.72, 0.32);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.2), bodyMat);
    neck.position.set(0, 0.1, 0.05);
    neck.rotation.x = -0.3;
    neck.castShadow = true;
    deerHead.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), bodyMat);
    head.position.set(0, 0.25, 0.18);
    head.castShadow = true;
    deerHead.add(head);

    // Golden Antlers / Horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, flatShading: true });
    const hornGeo = new THREE.ConeGeometry(0.04, 0.24, 5);
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.08, 0.42, 0.12);
    hornL.rotation.z = -0.2;
    deerHead.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.08, 0.42, 0.12);
    hornR.rotation.z = 0.2;
    deerHead.add(hornR);

    deerGroup.add(deerHead);
    worldGroup.add(deerGroup);
  }

  // 4. Basecamp: Tipi Tent & Campfire
  function buildCampfireAndTent() {
    const campGroup = new THREE.Group();
    campGroup.position.set(-0.6, 0.35, 2.4);

    // Tipi / Camping Tent
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, flatShading: true });
    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 4), tentMat);
    tent.position.set(-0.5, 0.45, -0.3);
    tent.rotation.y = 0.6;
    tent.castShadow = true;
    campGroup.add(tent);

    // Campfire ring of stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), stoneMat);
      stone.position.set(Math.cos(angle) * 0.24, 0.04, Math.sin(angle) * 0.24);
      campGroup.add(stone);
    }

    // Fire logs
    const logMat = new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true });
    const log1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.35), logMat);
    log1.rotation.y = 0.7;
    campGroup.add(log1);
    const log2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.35), logMat);
    log2.rotation.y = -0.7;
    campGroup.add(log2);

    // Low-poly glowing fire flame
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 5), fireMat);
    fire.position.y = 0.15;
    campGroup.add(fire);

    worldGroup.add(campGroup);
  }

  // 5. Floating Nature Spores / Fireflies
  function buildFloatingFireflies() {
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = Math.random() * 4.5 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 11;
      scales[i] = Math.random() * 0.8 + 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle Material with glowing point appearance
    const material = new THREE.PointsMaterial({
      color: 0x6ee7b7, // Mint green glow
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    fireflyParticles = new THREE.Points(geometry, material);
    worldGroup.add(fireflyParticles);
  }

  // --- INTERACTION CONTROLS ---
  function setupControls() {
    // Mouse / Touch Drag to Rotate
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      autoRotate = false;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) {
        // Subtle mouse parallax tilt when just hovering
        const rect = container.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const normX = (e.clientX - rect.left) / rect.width - 0.5;
          const normY = (e.clientY - rect.top) / rect.height - 0.5;
          targetRotation.x = 0.35 + normY * 0.25;
          targetRotation.y += normX * 0.005;
        }
        return;
      }

      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x += deltaY * 0.006;
      // Clamp vertical tilt
      targetRotation.x = Math.max(0.1, Math.min(1.1, targetRotation.x));

      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    // Touch events for mobile
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMousePos.x;
      const deltaY = e.touches[0].clientY - prevMousePos.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x += deltaY * 0.006;
      targetRotation.x = Math.max(0.1, Math.min(1.1, targetRotation.x));

      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetCameraDistance += e.deltaY * 0.01;
      targetCameraDistance = Math.max(7, Math.min(22, targetCameraDistance));
    }, { passive: false });
  }

  function setupHotspotTriggers() {
    // Buttons in UI to focus on attractions
    const buttons = document.querySelectorAll('[data-hotspot]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const hotspotId = btn.getAttribute('data-hotspot');
        focusHotspot(hotspotId);
      });
    });

    // Day/Night switcher buttons
    const themeBtns = document.querySelectorAll('[data-3d-theme]');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-3d-theme');
        setTheme(theme);
        themeBtns.forEach(b => b.classList.remove('bg-emerald-600', 'text-white'));
        btn.classList.add('bg-emerald-600', 'text-white');
      });
    });

    // Reset view button
    const resetBtn = document.getElementById('btn-reset-3d');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        cameraTarget.set(0, 0.5, 0);
        targetCameraDistance = 14;
        targetRotation.x = 0.35;
        targetRotation.y = -0.6;
        autoRotate = true;
        hideHotspotModal();
      });
    }

    // Auto-rotate toggle
    const autoRotateBtn = document.getElementById('btn-toggle-rotate');
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener('click', () => {
        autoRotate = !autoRotate;
        autoRotateBtn.classList.toggle('text-emerald-400');
      });
    }
  }

  function focusHotspot(id) {
    const spot = HOTSPOTS.find(h => h.id === id);
    if (!spot) return;

    autoRotate = false;
    cameraTarget.copy(spot.cameraTarget);
    targetCameraDistance = spot.camDistance;

    // Display rich popup modal/card
    showHotspotInfo(spot);
  }

  function showHotspotInfo(spot) {
    const card = document.getElementById('hotspot-details-card');
    if (!card) return;

    document.getElementById('hotspot-title').textContent = spot.title;
    document.getElementById('hotspot-desc').textContent = spot.desc;
    document.getElementById('hotspot-difficulty').textContent = spot.difficulty;
    document.getElementById('hotspot-height').textContent = spot.height;
    
    // Set booking selector
    const bookLink = document.getElementById('hotspot-book-btn');
    if (bookLink) {
      bookLink.onclick = () => {
        const select = document.getElementById('booking-experience');
        if (select) {
          select.value = spot.id;
          select.dispatchEvent(new Event('change'));
        }
        document.getElementById('reserva-section').scrollIntoView({ behavior: 'smooth' });
      };
    }

    card.classList.remove('hidden', 'opacity-0', 'translate-y-4');
    card.classList.add('opacity-100', 'translate-y-0');
  }

  function hideHotspotModal() {
    const card = document.getElementById('hotspot-details-card');
    if (!card) return;
    card.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => card.classList.add('hidden'), 250);
  }

  function setTheme(theme) {
    currentTheme = theme;
    if (theme === 'day') {
      hemiLight.color.setHex(0xdcfce7);
      hemiLight.groundColor.setHex(0x064e3b);
      hemiLight.intensity = 0.9;
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 1.4;
      campLight.intensity = 1.2;
      if (fireflyParticles) fireflyParticles.material.color.setHex(0x6ee7b7);
    } else if (theme === 'sunset') {
      hemiLight.color.setHex(0xfecdd3); // warm rose
      hemiLight.groundColor.setHex(0x312e81);
      hemiLight.intensity = 0.7;
      sunLight.color.setHex(0xf97316); // fiery orange
      sunLight.intensity = 1.6;
      campLight.intensity = 2.0;
      if (fireflyParticles) fireflyParticles.material.color.setHex(0xfde047);
    } else if (theme === 'night') {
      hemiLight.color.setHex(0x1e3a8a);
      hemiLight.groundColor.setHex(0x020617);
      hemiLight.intensity = 0.35;
      sunLight.color.setHex(0x93c5fd); // moonlight
      sunLight.intensity = 0.45;
      campLight.intensity = 3.2; // bright campfire glow
      if (fireflyParticles) fireflyParticles.material.color.setHex(0x34d399);
    }
  }

  function onWindowResize() {
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // --- ANIMATION LOOP ---
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Auto rotation
    if (autoRotate) {
      targetRotation.y += delta * 0.12;
    }

    // Smooth rotation interpolation (LERP)
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;
    cameraDistance += (targetCameraDistance - cameraDistance) * 0.08;

    // Smooth camera lookAt interpolation
    currentLookAt.lerp(cameraTarget, 0.08);

    // Orbit camera placement around lookAt point
    const cosY = Math.cos(currentRotation.y);
    const sinY = Math.sin(currentRotation.y);
    const cosX = Math.cos(currentRotation.x);
    const sinX = Math.sin(currentRotation.x);

    camera.position.x = currentLookAt.x + cameraDistance * sinY * cosX;
    camera.position.y = currentLookAt.y + cameraDistance * sinX;
    camera.position.z = currentLookAt.z + cameraDistance * cosY * cosX;
    camera.lookAt(currentLookAt);

    // 1. Animate Zipline Trolley
    if (ziplineTrolley) {
      ziplineProgress += delta * 0.28;
      if (ziplineProgress > 1) ziplineProgress = 0;

      const pStart = new THREE.Vector3(ziplineStart.x, ziplineStart.y + 0.1, ziplineStart.z);
      const pEnd = new THREE.Vector3(ziplineEnd.x, 0.35 + 0.95, ziplineEnd.z);
      ziplineTrolley.position.lerpVectors(pStart, pEnd, ziplineProgress);

      // Subtle swinging motion
      ziplineTrolley.rotation.z = Math.sin(elapsedTime * 6) * 0.12;
    }

    // 2. Animate Stylized Deer Head (peacefully grazing)
    if (deerHead) {
      deerHead.rotation.x = Math.sin(elapsedTime * 1.5) * 0.15 - 0.1;
      deerHead.rotation.y = Math.cos(elapsedTime * 0.8) * 0.12;
    }

    // 3. Animate Floating Fireflies
    if (fireflyParticles) {
      const positions = fireflyParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(elapsedTime * 1.5 + positions[i]) * 0.003;
      }
      fireflyParticles.geometry.attributes.position.needsUpdate = true;
      fireflyParticles.rotation.y = elapsedTime * 0.03;
    }

    // 4. Campfire flicker light
    if (campLight) {
      campLight.intensity += (Math.random() - 0.5) * 0.15;
    }

    renderer.render(scene, camera);
  }

  // Public API
  window.AdventureScene = {
    init,
    focusHotspot,
    setTheme,
    hideHotspotModal
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
