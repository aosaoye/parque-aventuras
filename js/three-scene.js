/**
 * Silva - Parque de Aventuras
 * Cinematic Three.js Interactive 3D World with Mouse & Scroll Parallax
 */

(function () {
  'use strict';

  // State
  let scene, camera, renderer;
  let container;
  let worldGroup;
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let baseRotation = { x: 0.32, y: -0.55 };
  let currentRotation = { x: 0.32, y: -0.55 };
  let targetRotation = { x: 0.32, y: -0.55 };
  
  // Parallax offsets
  let mouseParallax = { x: 0, y: 0 };
  let scrollOffset = 0;
  
  let cameraTarget = new THREE.Vector3(0.5, 0.6, 0);
  let currentLookAt = new THREE.Vector3(0.5, 0.6, 0);
  let cameraDistance = 13.5;
  let targetCameraDistance = 13.5;
  let autoRotate = true;

  // Dynamic objects
  let ziplineTrolley;
  let ziplineProgress = 0;
  let deerHead, deerGroup;
  let fireflyParticles;
  let sunLight, hemiLight, campLight, ambientLight;
  let currentTheme = 'day';

  // Raycasting for interactive 3D clickable objects
  let raycaster, mouse;
  let interactiveMeshes = [];

  // Hotspots definitions
  const HOTSPOTS = [
    {
      id: 'tirolina',
      title: 'Tirolina Superman 600m',
      desc: 'Vuela rasante a más de 80 km/h sobre el dosel vegetal con arnés continuo homologado.',
      difficulty: 'Media - Alta',
      height: '35 metros',
      target: new THREE.Vector3(-2.6, 2.3, 1.0),
      camDist: 8.0,
      rotY: -0.8,
      rotX: 0.28
    },
    {
      id: 'puente',
      title: 'Puente Tibetano Panorámico',
      desc: 'Paso colgante de tablas sobre el cañón con vistas 360° del valle y línea continua.',
      difficulty: 'Familiar',
      height: '18 metros',
      target: new THREE.Vector3(1.2, 0.9, -1.0),
      camDist: 7.8,
      rotY: -0.3,
      rotX: 0.25
    },
    {
      id: 'ciervo',
      title: 'Santuario de Ciervos & Fauna',
      desc: 'Espacio de reserva natural donde habitan ciervos protegidos en semilibertad.',
      difficulty: 'Todas las edades',
      height: 'Nivel del suelo',
      target: new THREE.Vector3(2.4, 0.5, 1.6),
      camDist: 7.0,
      rotY: -1.1,
      rotX: 0.22
    },
    {
      id: 'campamento',
      title: 'Campamento Base & Fuego',
      desc: 'Punto de reunión, equipamiento técnico, bebidas ecológicas y briefing de seguridad.',
      difficulty: 'Punto de Encuentro',
      height: 'Nivel del suelo',
      target: new THREE.Vector3(-0.6, 0.45, 2.2),
      camDist: 7.2,
      rotY: -0.2,
      rotX: 0.22
    }
  ];

  function init() {
    container = document.getElementById('three-canvas-container');
    if (!container) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04170f, 0.025); // Subtle deep forest mist

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
    camera.position.set(2, 6, cameraDistance);
    camera.lookAt(cameraTarget);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 5. Lighting
    setupLighting();

    // 6. Build 3D World
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

    // 7. Events
    setupControls();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', onScrollParallax, { passive: true });

    // 8. Hotspots and UI bindings
    setupHotspotTriggers();

    // 9. Start Loop
    animate();
  }

  // --- LIGHTING ---
  function setupLighting() {
    ambientLight = new THREE.AmbientLight(0x064e3b, 0.7);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xdcfce7, 0x04170f, 1.0);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    sunLight.position.set(14, 20, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 45;
    const d = 9;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Soft cyan fill light
    const fillLight = new THREE.DirectionalLight(0x6ee7b7, 0.45);
    fillLight.position.set(-12, 8, -10);
    scene.add(fillLight);

    // Campfire point light
    campLight = new THREE.PointLight(0xf59e0b, 1.5, 6, 2);
    campLight.position.set(-0.6, 0.65, 2.4);
    scene.add(campLight);
  }

  // --- 3D ENVIRONMENT ---
  function buildTerrain() {
    // Upper meadow
    const topGeo = new THREE.CylinderGeometry(5.8, 6.2, 0.8, 18);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      flatShading: true,
      roughness: 0.75
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.receiveShadow = true;
    topMesh.castShadow = true;
    worldGroup.add(topMesh);

    // Cliff rock layer
    const cliffGeo = new THREE.CylinderGeometry(6.2, 4.4, 1.6, 16);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      flatShading: true,
      roughness: 0.95
    });
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.y = -1.0;
    cliffMesh.receiveShadow = true;
    cliffMesh.castShadow = true;
    worldGroup.add(cliffMesh);

    // Floating bedrock cone
    const botGeo = new THREE.ConeGeometry(4.4, 2.5, 12);
    const botMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      flatShading: true,
      roughness: 0.98
    });
    const botMesh = new THREE.Mesh(botGeo, botMat);
    botMesh.rotation.x = Math.PI;
    botMesh.position.y = -3.0;
    botMesh.castShadow = true;
    worldGroup.add(botMesh);

    // Green mounds & hill contours
    const hillMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, flatShading: true });
    const hillMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, flatShading: true });

    const hill1 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.0, 9), hillMat1);
    hill1.position.set(-3.0, 1.0, -1.3);
    hill1.castShadow = true;
    hill1.receiveShadow = true;
    worldGroup.add(hill1);

    const hill2 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.5, 8), hillMat2);
    hill2.position.set(2.8, 0.8, -1.8);
    hill2.castShadow = true;
    hill2.receiveShadow = true;
    worldGroup.add(hill2);

    const platformMound = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 0.9, 9), hillMat1);
    platformMound.position.set(-2.8, 0.7, 1.3);
    platformMound.castShadow = true;
    platformMound.receiveShadow = true;
    worldGroup.add(platformMound);
  }

  function buildRiver() {
    const riverGeo = new THREE.BoxGeometry(1.2, 0.1, 10.4);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.y = 0.42;
    river.position.set(0.2, 0.42, -0.2);
    river.receiveShadow = true;
    worldGroup.add(river);

    // Stepping stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
    [
      { x: -0.6, z: 0.6, r: 0.24 },
      { x: 0.1, z: 0.1, r: 0.29 },
      { x: 0.8, z: -0.5, r: 0.25 }
    ].forEach(st => {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(st.r, 0), stoneMat);
      stone.position.set(st.x, 0.48, st.z);
      stone.scale.set(1.2, 0.6, 1);
      stone.castShadow = true;
      worldGroup.add(stone);
    });
  }

  function createPineTree(x, z, scale = 1, tint = 0x14532d) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0.4, z);
    treeGroup.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.0, 6), trunkMat);
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: tint, flatShading: true });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.1, 7), foliageMat);
    c1.position.y = 1.2;
    c1.castShadow = true;
    treeGroup.add(c1);

    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.9, 7), foliageMat);
    c2.position.y = 1.75;
    c2.castShadow = true;
    treeGroup.add(c2);

    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.75, 7), foliageMat);
    c3.position.y = 2.25;
    c3.castShadow = true;
    treeGroup.add(c3);

    worldGroup.add(treeGroup);
    return treeGroup;
  }

  function createBroadleafTree(x, z, scale = 1, foliageColor = 0x10b981) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0.4, z);
    treeGroup.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.3, 6), trunkMat);
    trunk.position.y = 0.65;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const folMat = new THREE.MeshStandardMaterial({ color: foliageColor, flatShading: true });
    const head1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), folMat);
    head1.position.set(0, 1.75, 0);
    head1.castShadow = true;
    treeGroup.add(head1);

    const head2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), folMat);
    head2.position.set(0.42, 1.55, 0.22);
    head2.castShadow = true;
    treeGroup.add(head2);

    const head3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), folMat);
    head3.position.set(-0.38, 1.6, -0.22);
    head3.castShadow = true;
    treeGroup.add(head3);

    worldGroup.add(treeGroup);
    return treeGroup;
  }

  function buildTrees() {
    const trees = [
      { type: 'pine', x: -4.0, z: -1.3, s: 1.3, c: 0x14532d },
      { type: 'pine', x: -3.3, z: -2.4, s: 1.15, c: 0x166534 },
      { type: 'pine', x: -2.3, z: -2.7, s: 1.45, c: 0x0f3b21 },
      { type: 'pine', x: -1.7, z: -3.3, s: 1.0, c: 0x14532d },
      { type: 'broad', x: -1.9, z: 0.2, s: 1.1, c: 0x059669 },
      { type: 'broad', x: -3.7, z: 1.7, s: 0.95, c: 0x34d399 },
      { type: 'broad', x: 2.3, z: -2.9, s: 1.35, c: 0x047857 },
      { type: 'broad', x: 3.5, z: -1.7, s: 1.15, c: 0x10b981 },
      { type: 'broad', x: 3.8, z: 0.5, s: 0.9, c: 0x6ee7b7 },
      { type: 'pine', x: 1.7, z: -3.5, s: 1.2, c: 0x15803d },
      { type: 'pine', x: 3.0, z: 2.5, s: 0.95, c: 0x166534 },
      { type: 'broad', x: -1.5, z: 3.3, s: 0.85, c: 0x10b981 }
    ];

    trees.forEach(t => {
      if (t.type === 'pine') {
        createPineTree(t.x, t.z, t.s, t.c);
      } else {
        createBroadleafTree(t.x, t.z, t.s, t.c);
      }
    });
  }

  function buildBushesAndRocks() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true });
    const coralBushMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, flatShading: true });
    const goldBushMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, flatShading: true });

    [
      { x: -2.6, y: 0.5, z: 2.9, s: 0.42 },
      { x: 3.3, y: 0.45, z: -0.6, s: 0.58 },
      { x: -0.2, y: 0.45, z: -3.5, s: 0.52 },
      { x: 1.9, y: 0.45, z: 2.9, s: 0.38 }
    ].forEach(r => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r.s, 0), rockMat);
      rock.position.set(r.x, r.y, r.z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      worldGroup.add(rock);
    });

    [
      { x: -1.2, z: 1.2, m: coralBushMat, s: 0.3 },
      { x: -2.3, z: 2.3, m: coralBushMat, s: 0.34 },
      { x: 2.9, z: 1.3, m: coralBushMat, s: 0.32 },
      { x: 0.8, z: 1.9, m: goldBushMat, s: 0.28 },
      { x: -3.1, z: -0.5, m: goldBushMat, s: 0.28 }
    ].forEach(f => {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(f.s, 1), f.m);
      bush.position.set(f.x, 0.45, f.z);
      bush.castShadow = true;
      worldGroup.add(bush);
    });
  }

  // --- ATTRACTIONS ---
  let ziplineStart = new THREE.Vector3(-2.8, 2.6, 1.2);
  let ziplineEnd = new THREE.Vector3(2.5, 1.3, -2.4);

  function buildZiplineTower() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, flatShading: true });

    const tower1 = new THREE.Group();
    tower1.position.set(ziplineStart.x, 0.4, ziplineStart.z);

    for (let dx of [-0.26, 0.26]) {
      for (let dz of [-0.26, 0.26]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), woodMat);
        pole.position.set(dx, 1.15, dz);
        pole.castShadow = true;
        tower1.add(pole);
      }
    }

    const platform = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), woodMat);
    platform.position.y = 2.25;
    platform.castShadow = true;
    tower1.add(platform);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.55, 6), roofMat);
    roof.position.y = 2.9;
    roof.castShadow = true;
    tower1.add(roof);

    worldGroup.add(tower1);

    // Arrival tree platform
    const tower2 = new THREE.Group();
    tower2.position.set(ziplineEnd.x, 0.4, ziplineEnd.z);
    const platform2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 8), woodMat);
    platform2.position.y = 0.95;
    platform2.castShadow = true;
    tower2.add(platform2);
    worldGroup.add(tower2);

    // Cable
    const cablePoints = [
      new THREE.Vector3(ziplineStart.x, ziplineStart.y + 0.1, ziplineStart.z),
      new THREE.Vector3(ziplineEnd.x, 0.4 + 1.0, ziplineEnd.z)
    ];
    const cableGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(cablePoints[0], cablePoints[1]),
      20,
      0.016,
      6,
      false
    );
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
    const cableMesh = new THREE.Mesh(cableGeo, cableMat);
    worldGroup.add(cableMesh);

    // Trolley & Adventurer
    ziplineTrolley = new THREE.Group();
    ziplineTrolley.userData = { id: 'tirolina' };
    const trolleyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    ziplineTrolley.add(trolleyMesh);

    const adventurerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.24, 6), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
    adventurerBody.position.y = -0.17;
    ziplineTrolley.add(adventurerBody);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    helmet.position.y = -0.02;
    ziplineTrolley.add(helmet);

    ziplineTrolley.position.copy(cablePoints[0]);
    worldGroup.add(ziplineTrolley);
    interactiveMeshes.push(trolleyMesh);
  }

  function buildSuspensionBridge() {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.userData = { id: 'puente' };
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, flatShading: true });

    const p1 = new THREE.Vector3(0.5, 0.9, -1.8);
    const p2 = new THREE.Vector3(2.1, 0.75, -0.6);
    const numPlanks = 10;

    for (let i = 0; i <= numPlanks; i++) {
      const t = i / numPlanks;
      const x = THREE.MathUtils.lerp(p1.x, p2.x, t);
      const z = THREE.MathUtils.lerp(p1.z, p2.z, t);
      const sag = Math.sin(t * Math.PI) * 0.16;
      const y = THREE.MathUtils.lerp(p1.y, p2.y, t) - sag;

      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.13), woodMat);
      plank.position.set(x, y, z);
      plank.rotation.y = -0.65;
      plank.castShadow = true;
      bridgeGroup.add(plank);
      interactiveMeshes.push(plank);
    }

    worldGroup.add(bridgeGroup);
  }

  function buildStylizedDeer() {
    deerGroup = new THREE.Group();
    deerGroup.userData = { id: 'ciervo' };
    deerGroup.position.set(2.4, 0.42, 1.8);
    deerGroup.rotation.y = -1.2;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af, // Soft coral-pink inspired by reference image
      flatShading: true,
      roughness: 0.6
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.74), bodyMat);
    body.position.y = 0.58;
    body.castShadow = true;
    deerGroup.add(body);
    interactiveMeshes.push(body);

    const legMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, flatShading: true });
    const legGeo = new THREE.BoxGeometry(0.075, 0.52, 0.075);
    [
      { x: -0.17, z: 0.26 },
      { x: 0.17, z: 0.26 },
      { x: -0.17, z: -0.26 },
      { x: 0.17, z: -0.26 }
    ].forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos.x, 0.26, pos.z);
      leg.castShadow = true;
      deerGroup.add(leg);
    });

    deerHead = new THREE.Group();
    deerHead.position.set(0, 0.75, 0.34);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.34, 0.22), bodyMat);
    neck.position.set(0, 0.1, 0.05);
    neck.rotation.x = -0.3;
    neck.castShadow = true;
    deerHead.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.32), bodyMat);
    head.position.set(0, 0.26, 0.19);
    head.castShadow = true;
    deerHead.add(head);

    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, flatShading: true });
    const hornGeo = new THREE.ConeGeometry(0.045, 0.26, 5);
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.09, 0.44, 0.13);
    hornL.rotation.z = -0.22;
    deerHead.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.09, 0.44, 0.13);
    hornR.rotation.z = 0.22;
    deerHead.add(hornR);

    deerGroup.add(deerHead);
    worldGroup.add(deerGroup);
  }

  function buildCampfireAndTent() {
    const campGroup = new THREE.Group();
    campGroup.userData = { id: 'campamento' };
    campGroup.position.set(-0.6, 0.4, 2.4);

    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });
    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.95, 4), tentMat);
    tent.position.set(-0.55, 0.48, -0.32);
    tent.rotation.y = 0.6;
    tent.castShadow = true;
    campGroup.add(tent);
    interactiveMeshes.push(tent);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), stoneMat);
      stone.position.set(Math.cos(angle) * 0.26, 0.04, Math.sin(angle) * 0.26);
      campGroup.add(stone);
    }

    const logMat = new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true });
    const log1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.38), logMat);
    log1.rotation.y = 0.7;
    campGroup.add(log1);
    const log2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.38), logMat);
    log2.rotation.y = -0.7;
    campGroup.add(log2);

    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 5), fireMat);
    fire.position.y = 0.16;
    campGroup.add(fire);

    worldGroup.add(campGroup);
  }

  function buildFloatingFireflies() {
    const count = 150;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 5.0 + 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    fireflyParticles = new THREE.Points(geo, mat);
    worldGroup.add(fireflyParticles);
  }

  // --- PARALLAX & CONTROLS ---
  function setupControls() {
    // Canvas Drag Controls
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      autoRotate = false;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      // 1. Calculate normalized mouse coordinates for Parallax across entire screen
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      
      mouseParallax.x = normX * 0.45;
      mouseParallax.y = normY * 0.25;

      // DOM Parallax on elements with data-parallax
      document.querySelectorAll('[data-parallax]').forEach(el => {
        const factor = parseFloat(el.getAttribute('data-parallax')) || 10;
        const tx = normX * factor;
        const ty = normY * factor;
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      });

      // 2. Dragging on canvas
      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;

        targetRotation.y += deltaX * 0.007;
        targetRotation.x += deltaY * 0.005;
        targetRotation.x = Math.max(0.12, Math.min(0.95, targetRotation.x));

        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    // Touch support
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

      targetRotation.y += deltaX * 0.007;
      targetRotation.x += deltaY * 0.005;
      targetRotation.x = Math.max(0.12, Math.min(0.95, targetRotation.x));

      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    // Wheel Zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetCameraDistance += e.deltaY * 0.008;
      targetCameraDistance = Math.max(7, Math.min(22, targetCameraDistance));
    }, { passive: false });
  }

  // Scroll Parallax Handler
  function onScrollParallax() {
    const scrollY = window.scrollY || window.pageYOffset;
    const heroHeight = window.innerHeight;
    const scrollRatio = Math.min(1.5, scrollY / heroHeight);

    // Camera elevates subtly with scroll, panning closer into forest
    scrollOffset = scrollRatio * 3.5;
  }

  function setupHotspotTriggers() {
    document.querySelectorAll('[data-hotspot]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-hotspot');
        focusHotspot(id);
      });
    });

    document.querySelectorAll('[data-3d-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-3d-theme');
        setTheme(theme);
        document.querySelectorAll('[data-3d-theme]').forEach(b => {
          b.classList.remove('bg-emerald-600', 'text-white', 'shadow-md');
          b.classList.add('bg-forest-900/80', 'text-emerald-200');
        });
        btn.classList.remove('bg-forest-900/80', 'text-emerald-200');
        btn.classList.add('bg-emerald-600', 'text-white', 'shadow-md');
      });
    });

    const resetBtn = document.getElementById('btn-reset-3d');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        cameraTarget.set(0.5, 0.6, 0);
        targetCameraDistance = 13.5;
        targetRotation.x = baseRotation.x;
        targetRotation.y = baseRotation.y;
        autoRotate = true;
        hideHotspotModal();
      });
    }

    const rotateBtn = document.getElementById('btn-toggle-rotate');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        autoRotate = !autoRotate;
        rotateBtn.classList.toggle('text-mint');
      });
    }
  }

  function focusHotspot(id) {
    const spot = HOTSPOTS.find(h => h.id === id);
    if (!spot) return;

    autoRotate = false;
    cameraTarget.copy(spot.target);
    targetCameraDistance = spot.camDist;
    targetRotation.x = spot.rotX;
    targetRotation.y = spot.rotY;

    showHotspotInfo(spot);
  }

  function showHotspotInfo(spot) {
    const card = document.getElementById('hotspot-details-card');
    if (!card) return;

    document.getElementById('hotspot-title').textContent = spot.title;
    document.getElementById('hotspot-desc').textContent = spot.desc;
    document.getElementById('hotspot-difficulty').textContent = spot.difficulty;
    document.getElementById('hotspot-height').textContent = spot.height;

    const bookBtn = document.getElementById('hotspot-book-btn');
    if (bookBtn) {
      bookBtn.onclick = () => {
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
      hemiLight.groundColor.setHex(0x04170f);
      hemiLight.intensity = 1.0;
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 1.6;
      campLight.intensity = 1.2;
      scene.fog.color.setHex(0x04170f);
      if (fireflyParticles) fireflyParticles.material.color.setHex(0x6ee7b7);
    } else if (theme === 'sunset') {
      hemiLight.color.setHex(0xfecdd3);
      hemiLight.groundColor.setHex(0x1e1b4b);
      hemiLight.intensity = 0.85;
      sunLight.color.setHex(0xf97316);
      sunLight.intensity = 1.8;
      campLight.intensity = 2.2;
      scene.fog.color.setHex(0x1f1422);
      if (fireflyParticles) fireflyParticles.material.color.setHex(0xfde047);
    } else if (theme === 'night') {
      hemiLight.color.setHex(0x1e3a8a);
      hemiLight.groundColor.setHex(0x020617);
      hemiLight.intensity = 0.4;
      sunLight.color.setHex(0x93c5fd);
      sunLight.intensity = 0.5;
      campLight.intensity = 3.4;
      scene.fog.color.setHex(0x020a07);
      if (fireflyParticles) fireflyParticles.material.color.setHex(0x34d399);
    }
  }

  function onWindowResize() {
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // --- LOOP ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (autoRotate) {
      targetRotation.y += delta * 0.11;
    }

    // Smooth rotation lerp with mouse parallax integration
    currentRotation.x += (targetRotation.x + mouseParallax.y * 0.2 - currentRotation.x) * 0.06;
    currentRotation.y += (targetRotation.y + mouseParallax.x * 0.3 - currentRotation.y) * 0.06;
    cameraDistance += (targetCameraDistance - cameraDistance) * 0.08;

    currentLookAt.lerp(cameraTarget, 0.06);

    const cosY = Math.cos(currentRotation.y);
    const sinY = Math.sin(currentRotation.y);
    const cosX = Math.cos(currentRotation.x);
    const sinX = Math.sin(currentRotation.x);

    // Orbit position + scroll parallax lift
    camera.position.x = currentLookAt.x + cameraDistance * sinY * cosX;
    camera.position.y = currentLookAt.y + cameraDistance * sinX + scrollOffset * 0.8;
    camera.position.z = currentLookAt.z + cameraDistance * cosY * cosX;
    camera.lookAt(currentLookAt);

    // Zipline animation
    if (ziplineTrolley) {
      ziplineProgress += delta * 0.26;
      if (ziplineProgress > 1) ziplineProgress = 0;
      const pStart = new THREE.Vector3(ziplineStart.x, ziplineStart.y + 0.1, ziplineStart.z);
      const pEnd = new THREE.Vector3(ziplineEnd.x, 0.4 + 1.0, ziplineEnd.z);
      ziplineTrolley.position.lerpVectors(pStart, pEnd, ziplineProgress);
      ziplineTrolley.rotation.z = Math.sin(elapsedTime * 6) * 0.12;
    }

    // Deer head animation
    if (deerHead) {
      deerHead.rotation.x = Math.sin(elapsedTime * 1.6) * 0.14 - 0.08;
      deerHead.rotation.y = Math.cos(elapsedTime * 0.9) * 0.12;
    }

    // Floating fireflies animation
    if (fireflyParticles) {
      const positions = fireflyParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(elapsedTime * 1.5 + positions[i]) * 0.003;
      }
      fireflyParticles.geometry.attributes.position.needsUpdate = true;
      fireflyParticles.rotation.y = elapsedTime * 0.025;
    }

    // Campfire flicker
    if (campLight) {
      campLight.intensity += (Math.random() - 0.5) * 0.16;
    }

    renderer.render(scene, camera);
  }

  window.AdventureScene = {
    init,
    focusHotspot,
    setTheme,
    hideHotspotModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
