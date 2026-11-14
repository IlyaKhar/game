import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { sfx } from '../lib/sound';

interface SnakeGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

const GRID_SIZE = 18;
const CELL_SIZE = 1.0;
const HALF_GRID = (GRID_SIZE * CELL_SIZE) / 2;

export const SnakeGame: React.FC<SnakeGameProps> = ({
  onGameOver,
  bestScore,
  isNewRecord,
}) => {
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreBadgeRef = useRef<HTMLSpanElement>(null);
  const lengthBadgeRef = useRef<HTMLSpanElement>(null);

  const [score, setScore] = useState(0);
  const [snakeLength, setSnakeLength] = useState(4);
  const [gameOver, setGameOver] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const handleInputRef = useRef<(x: number, z: number) => void>(() => {});

  useEffect(() => {
    setIsTouchDevice(
      typeof window !== 'undefined' &&
        Boolean('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // =========================================================
    // 1. HIGH-QUALITY THREE.JS RENDERER & SCENE SETUP
    // =========================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060212);
    scene.fog = new THREE.FogExp2(0x060212, 0.018);

    // Camera with dynamic framing
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const domEl = renderer.domElement;
    domEl.style.width = '100%';
    domEl.style.height = '100%';
    domEl.style.display = 'block';
    domEl.style.position = 'absolute';
    domEl.style.inset = '0';
    container.appendChild(domEl);

    // =========================================================
    // 2. DYNAMIC CAMERA FRAMING (FILL SCREEN ON ANY DISPLAY)
    // =========================================================
    function updateCameraFraming() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(300, Math.round(rect.width));
      const h = Math.max(300, Math.round(rect.height));
      const aspect = w / h;
      camera.aspect = aspect;

      // Board half-span with borders
      const boardRadius = 10.6;
      const vFovRad = (camera.fov * Math.PI) / 180;

      // Distance needed vertically
      const distV = boardRadius / Math.tan(vFovRad / 2);
      // Distance needed horizontally
      const distH = boardRadius / (Math.tan(vFovRad / 2) * aspect);

      // Comfortable framing factor to make board look massive & majestic
      const baseDist = Math.max(distV, distH) * 1.05;

      // ~52° isometric elevation angle
      const elevation = 0.90;
      const camY = Math.sin(elevation) * baseDist;
      const camZ = Math.cos(elevation) * baseDist + 0.8;

      camera.position.set(0, camY, camZ);
      camera.lookAt(0, 0, 0.4);
      camera.updateProjectionMatrix();

      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    }

    const ro = new ResizeObserver(() => updateCameraFraming());
    ro.observe(container);
    window.addEventListener('resize', updateCameraFraming);
    updateCameraFraming();

    // =========================================================
    // 3. CYBERPUNK STAGE LIGHTING
    // =========================================================
    const ambLight = new THREE.AmbientLight(0xd8b4fe, 0.7);
    scene.add(ambLight);

    // Sun key light casting crisp soft shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(12, 28, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    const shadowSpan = 14;
    dirLight.shadow.camera.left = -shadowSpan;
    dirLight.shadow.camera.right = shadowSpan;
    dirLight.shadow.camera.top = shadowSpan;
    dirLight.shadow.camera.bottom = -shadowSpan;
    dirLight.shadow.bias = -0.0006;
    dirLight.shadow.normalBias = 0.025;
    scene.add(dirLight);

    // Hot pink neon rim light (upper-left)
    const rimPink = new THREE.PointLight(0xff2e93, 3.2, 35);
    rimPink.position.set(-15, 8, -12);
    scene.add(rimPink);

    // Electric cyan neon rim light (upper-right)
    const rimCyan = new THREE.PointLight(0x00f0ff, 3.0, 35);
    rimCyan.position.set(15, 8, 14);
    scene.add(rimCyan);

    // Pulsing local apple light
    const foodLight = new THREE.PointLight(0xff007f, 3.8, 9);
    scene.add(foodLight);

    // =========================================================
    // 4. REFLECTIVE STAGE FLOOR & NEON GLOW GRID
    // =========================================================
    // High-gloss metallic obsidian stage
    const floorGeo = new THREE.BoxGeometry(
      GRID_SIZE * CELL_SIZE + 0.8,
      0.6,
      GRID_SIZE * CELL_SIZE + 0.8
    );
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0e0926,
      roughness: 0.16,
      metalness: 0.78,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.3;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Primary Neon Grid
    const gridHelper = new THREE.GridHelper(
      GRID_SIZE * CELL_SIZE,
      GRID_SIZE,
      0xa855f7, // center lines: neon violet
      0x3b1d75  // grid cells: deep synthwave indigo
    );
    gridHelper.position.y = 0.015;
    scene.add(gridHelper);

    // Glowing Neon Center Crosshair
    const crossGeoX = new THREE.BoxGeometry(GRID_SIZE * CELL_SIZE, 0.02, 0.06);
    const crossGeoZ = new THREE.BoxGeometry(0.06, 0.02, GRID_SIZE * CELL_SIZE);
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.55,
    });
    const crossX = new THREE.Mesh(crossGeoX, crossMat);
    const crossZ = new THREE.Mesh(crossGeoZ, crossMat);
    crossX.position.y = 0.02;
    crossZ.position.y = 0.02;
    scene.add(crossX, crossZ);

    // Outer Neon Curb Walls
    const bW = GRID_SIZE * CELL_SIZE + 0.8;
    const bT = 0.32;
    const bH = 0.55;
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x180d38,
      metalness: 0.6,
      roughness: 0.25,
    });

    const b1 = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bT), borderMat);
    b1.position.set(0, bH / 2, -HALF_GRID - bT / 2);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bT), borderMat);
    b2.position.set(0, bH / 2, HALF_GRID + bT / 2);
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(bT, bH, bW), borderMat);
    b3.position.set(-HALF_GRID - bT / 2, bH / 2, 0);
    const b4 = new THREE.Mesh(new THREE.BoxGeometry(bT, bH, bW), borderMat);
    b4.position.set(HALF_GRID + bT / 2, bH / 2, 0);
    b1.receiveShadow = b2.receiveShadow = b3.receiveShadow = b4.receiveShadow = true;
    b1.castShadow = b2.castShadow = b3.castShadow = b4.castShadow = true;
    scene.add(b1, b2, b3, b4);

    // Glowing Neon Top Pipes (Pink & Cyan Dual-Tone)
    const pipeMatPink = new THREE.MeshBasicMaterial({ color: 0xff2e93 });
    const pipeMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const pipeRadius = 0.06;

    const pTop = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, bW, 12), pipeMatPink);
    pTop.rotation.z = Math.PI / 2;
    pTop.position.set(0, bH + 0.04, -HALF_GRID - bT / 2);

    const pBottom = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, bW, 12), pipeMatPink);
    pBottom.rotation.z = Math.PI / 2;
    pBottom.position.set(0, bH + 0.04, HALF_GRID + bT / 2);

    const pLeft = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, bW, 12), pipeMatCyan);
    pLeft.rotation.x = Math.PI / 2;
    pLeft.position.set(-HALF_GRID - bT / 2, bH + 0.04, 0);

    const pRight = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, bW, 12), pipeMatCyan);
    pRight.rotation.x = Math.PI / 2;
    pRight.position.set(HALF_GRID + bT / 2, bH + 0.04, 0);

    scene.add(pTop, pBottom, pLeft, pRight);

    // 4 Corner Neon Beacons / Power Pillars
    const cornerPillarGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.85, 16);
    const cornerMat = new THREE.MeshStandardMaterial({
      color: 0x1f1147,
      metalness: 0.7,
      roughness: 0.2,
    });
    const cornerCapGeo = new THREE.SphereGeometry(0.24, 16, 12);
    const cornerCapMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const cornerOffsets: [number, number][] = [
      [-HALF_GRID - bT / 2, -HALF_GRID - bT / 2],
      [HALF_GRID + bT / 2, -HALF_GRID - bT / 2],
      [-HALF_GRID - bT / 2, HALF_GRID + bT / 2],
      [HALF_GRID + bT / 2, HALF_GRID + bT / 2],
    ];

    cornerOffsets.forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(cornerPillarGeo, cornerMat);
      pillar.position.set(cx, 0.42, cz);
      pillar.castShadow = true;
      const cap = new THREE.Mesh(cornerCapGeo, cornerCapMat);
      cap.position.set(cx, 0.88, cz);
      scene.add(pillar, cap);
    });

    // Deep Space Star Dust Particles (Atmospheric Parallax Depth)
    const starCount = 160;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 60;
      starPositions[i + 1] = Math.random() * 25 + 2;
      starPositions[i + 2] = (Math.random() - 0.5) * 60;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // =========================================================
    // 5. SNAKE 3D ASSETS & MATERIALS (HIGH SPECULAR GLOSS)
    // =========================================================
    // Head Geometry & Material
    const headGeo = new THREE.BoxGeometry(0.88, 0.74, 0.88);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.12,
      metalness: 0.35,
      emissive: 0x0088cc,
      emissiveIntensity: 0.45,
    });

    // Eye Geometry & Materials
    const eyeWhiteGeo = new THREE.SphereGeometry(0.14, 16, 14);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilGeo = new THREE.SphereGeometry(0.08, 14, 14);
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x030308 });
    const eyeSparkleGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeSparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Cyber Horns / Antennae on Head
    const hornGeo = new THREE.ConeGeometry(0.07, 0.24, 8);
    const hornMat = new THREE.MeshBasicMaterial({ color: 0xff2e93 });

    // Body Segment Materials (Alternating Iridescent Synthwave Palette)
    const bodyGeo = new THREE.BoxGeometry(0.84, 0.70, 0.84);
    const bodyMatCyan = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.18,
      metalness: 0.3,
      emissive: 0x0077aa,
      emissiveIntensity: 0.35,
    });
    const bodyMatPurple = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.18,
      metalness: 0.3,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.35,
    });
    const bodyMatPink = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      roughness: 0.18,
      metalness: 0.3,
      emissive: 0xdb2777,
      emissiveIntensity: 0.35,
    });
    const bodyMatGold = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.18,
      metalness: 0.3,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
    });
    const bodyMaterials = [bodyMatCyan, bodyMatPurple, bodyMatPink, bodyMatGold];

    // =========================================================
    // 6. 3D GLOSSY RUBY APPLE WITH LEAF & ORBITING SPARKLES
    // =========================================================
    const foodGroup = new THREE.Group();

    // Apple Body
    const foodGeo = new THREE.SphereGeometry(0.44, 24, 20);
    const foodMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xdd0055,
      emissiveIntensity: 0.95,
      roughness: 0.10,
      metalness: 0.35,
    });
    const foodBody = new THREE.Mesh(foodGeo, foodMat);
    foodBody.castShadow = true;
    foodGroup.add(foodBody);

    // Apple Stem
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a2d0c, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.44, 0);
    stem.rotation.z = -0.15;
    foodGroup.add(stem);

    // Emerald Leaf
    const leafGeo = new THREE.BoxGeometry(0.14, 0.18, 0.05);
    const leafMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.11, 0.48, 0);
    leaf.rotation.z = -0.45;
    foodGroup.add(leaf);

    // Mini Orbiting Energy Sparkles around Apple
    const orbitCount = 4;
    const orbitMeshes: THREE.Mesh[] = [];
    const orbitGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0xfff066 });
    for (let i = 0; i < orbitCount; i++) {
      const o = new THREE.Mesh(orbitGeo, orbitMat);
      foodGroup.add(o);
      orbitMeshes.push(o);
    }

    scene.add(foodGroup);

    // =========================================================
    // 7. GAME STATE & MECHANICS
    // =========================================================
    let snake = [
      { x: 6, z: 9 },
      { x: 5, z: 9 },
      { x: 4, z: 9 },
      { x: 3, z: 9 },
    ];
    let snakeMeshes: THREE.Object3D[] = [];
    let dir = { x: 1, z: 0 };
    let nextDir = { x: 1, z: 0 };
    let food = { x: 4, z: 0 };
    let currentScore = 0;
    let isGameOver = false;
    let lastStepTime = 0;
    let stepSpeed = 120;

    let particles: {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      rotSpeed: number;
    }[] = [];

    // Floor Shockwave Ring on Eat
    let shockwaves: {
      mesh: THREE.Mesh;
      scale: number;
      opacity: number;
    }[] = [];

    function gridToWorld(gx: number, gz: number) {
      return {
        x: (gx - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
        z: (gz - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
      };
    }

    function createSnakeSegmentMesh(isHead: boolean, segIdx = 0) {
      if (isHead) {
        const group = new THREE.Group();
        const head = new THREE.Mesh(headGeo, headMat);
        head.castShadow = true;
        head.position.y = 0.38;
        group.add(head);

        // White eye base
        const eyeL = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeL.position.set(0.24, 0.52, 0.38);
        const eyeR = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeR.position.set(-0.24, 0.52, 0.38);
        group.add(eyeL, eyeR);

        // Dark pupil
        const pupilL = new THREE.Mesh(eyePupilGeo, eyePupilMat);
        pupilL.position.set(0.24, 0.52, 0.49);
        const pupilR = new THREE.Mesh(eyePupilGeo, eyePupilMat);
        pupilR.position.set(-0.24, 0.52, 0.49);
        group.add(pupilL, pupilR);

        // Pupil sparkle reflections
        const spL = new THREE.Mesh(eyeSparkleGeo, eyeSparkleMat);
        spL.position.set(0.26, 0.55, 0.54);
        const spR = new THREE.Mesh(eyeSparkleGeo, eyeSparkleMat);
        spR.position.set(-0.22, 0.55, 0.54);
        group.add(spL, spR);

        // Cute cyber antennae / horns
        const hL = new THREE.Mesh(hornGeo, hornMat);
        hL.position.set(0.28, 0.82, -0.15);
        hL.rotation.x = -0.25;
        const hR = new THREE.Mesh(hornGeo, hornMat);
        hR.position.set(-0.28, 0.82, -0.15);
        hR.rotation.x = -0.25;
        group.add(hL, hR);

        scene.add(group);
        return group;
      } else {
        const mat = bodyMaterials[segIdx % bodyMaterials.length]!;
        const mesh = new THREE.Mesh(bodyGeo, mat);
        mesh.castShadow = true;
        mesh.position.y = 0.35;

        // Glowing trim edges on body block
        const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(edges);

        scene.add(mesh);
        return mesh;
      }
    }

    function spawnFood() {
      let fx = 0;
      let fz = 0;
      let safe = false;
      let tries = 0;
      do {
        fx = Math.floor(Math.random() * GRID_SIZE);
        fz = Math.floor(Math.random() * GRID_SIZE);
        safe = !snake.some((s) => s.x === fx && s.z === fz);
        tries++;
      } while (!safe && tries < 300);

      food = { x: fx, z: fz };
      const pos = gridToWorld(fx, fz);
      foodGroup.position.set(pos.x, 0.5, pos.z);
      foodLight.position.set(pos.x, 1.3, pos.z);
    }

    const particleColors = [0x00f0ff, 0xff2e93, 0xa855f7, 0xfde047, 0xffffff];
    function create3DParticles(x: number, z: number, count = 28) {
      const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);

      for (let i = 0; i < count; i++) {
        const clr = particleColors[i % particleColors.length]!;
        const pMat = new THREE.MeshBasicMaterial({ color: clr });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(x, 0.5, z);
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4.5 + 2.5;
        scene.add(p);
        particles.push({
          mesh: p,
          vx: Math.cos(ang) * spd,
          vy: Math.random() * 5.5 + 3.0,
          vz: Math.sin(ang) * spd,
          life: 1.0,
          rotSpeed: (Math.random() - 0.5) * 12,
        });
      }

      // Shockwave ring on floor
      const ringGeo = new THREE.RingGeometry(0.2, 0.35, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.03, z);
      scene.add(ring);
      shockwaves.push({ mesh: ring, scale: 1, opacity: 0.9 });
    }

    function handleInput(x: number, z: number) {
      if (dir.x + x === 0 && dir.z + z === 0) return;
      nextDir = { x, z };
    }
    handleInputRef.current = handleInput;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        handleInput(0, -1);
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        handleInput(0, 1);
        e.preventDefault();
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        handleInput(-1, 0);
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        handleInput(1, 0);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Touch Swipes
    let touchStart: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) touchStart = { x: t.clientX, y: t.clientY };
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || !touchStart) return;
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) > 16 || Math.abs(dy) > 16) {
        if (Math.abs(dx) > Math.abs(dy)) {
          handleInput(dx > 0 ? 1 : -1, 0);
        } else {
          handleInput(0, dy > 0 ? 1 : -1);
        }
        touchStart = { x: t.clientX, y: t.clientY };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t || !touchStart) return;
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        if (Math.abs(dx) > Math.abs(dy)) {
          handleInput(dx > 0 ? 1 : -1, 0);
        } else {
          handleInput(0, dy > 0 ? 1 : -1);
        }
      }
      touchStart = null;
    };

    const touchSurface = outerWrapperRef.current || container;
    touchSurface.addEventListener('touchstart', onTouchStart, { passive: true });
    touchSurface.addEventListener('touchmove', onTouchMove, { passive: true });
    touchSurface.addEventListener('touchend', onTouchEnd, { passive: true });

    function initGame() {
      snakeMeshes.forEach((m) => scene.remove(m));
      snakeMeshes = [];

      snake = [
        { x: 6, z: 9 },
        { x: 5, z: 9 },
        { x: 4, z: 9 },
        { x: 3, z: 9 },
      ];

      dir = { x: 1, z: 0 };
      nextDir = { x: 1, z: 0 };
      currentScore = 0;
      stepSpeed = 120;
      isGameOver = false;

      if (scoreBadgeRef.current) scoreBadgeRef.current.innerText = '0';
      if (lengthBadgeRef.current) lengthBadgeRef.current.innerText = '4';
      setSnakeLength(4);

      snake.forEach((s, idx) => {
        const mesh = createSnakeSegmentMesh(idx === 0, idx);
        const pos = gridToWorld(s.x, s.z);
        mesh.position.x = pos.x;
        mesh.position.z = pos.z;
        snakeMeshes.push(mesh);
      });

      spawnFood();
    }
    initGame();

    // Camera Shake on Collision
    let cameraShake = 0;

    function step() {
      dir = { ...nextDir };
      const head = { x: snake[0]!.x + dir.x, z: snake[0]!.z + dir.z };

      // Wall or Self Collision
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.z < 0 ||
        head.z >= GRID_SIZE ||
        snake.some((s) => s.x === head.x && s.z === head.z)
      ) {
        isGameOver = true;
        sfx.hit();
        cameraShake = 0.55;
        const pos = gridToWorld(snake[0]!.x, snake[0]!.z);
        create3DParticles(pos.x, pos.z, 45);

        // Scatter all snake segments
        snakeMeshes.forEach((m) => {
          create3DParticles(m.position.x, m.position.z, 8);
          scene.remove(m);
        });
        snakeMeshes = [];

        setScore(currentScore);
        setGameOver(true);
        onGameOverRef.current(currentScore);
        return;
      }

      snake.unshift(head);

      // Eat Food
      if (head.x === food.x && head.z === food.z) {
        currentScore += 15;
        sfx.coin();
        if (scoreBadgeRef.current) {
          scoreBadgeRef.current.innerText = String(currentScore);
        }
        const newLen = snake.length;
        if (lengthBadgeRef.current) {
          lengthBadgeRef.current.innerText = String(newLen);
        }
        setSnakeLength(newLen);

        const pos = gridToWorld(food.x, food.z);
        create3DParticles(pos.x, pos.z, 28);

        // Add body segment mesh with alternating synthwave color
        const newMesh = createSnakeSegmentMesh(false, snakeMeshes.length);
        snakeMeshes.push(newMesh);

        stepSpeed = Math.max(65, stepSpeed - 1.5);
        spawnFood();
      } else {
        snake.pop();
      }

      // Update Mesh Positions & Rotate Head to Direction
      snake.forEach((s, idx) => {
        const mesh = snakeMeshes[idx];
        if (!mesh) return;
        const pos = gridToWorld(s.x, s.z);
        mesh.position.x = pos.x;
        mesh.position.z = pos.z;

        if (idx === 0) {
          const angle = Math.atan2(dir.x, dir.z);
          mesh.rotation.y = angle;
        }
      });
    }

    let clock = new THREE.Clock();
    let rafId = 0;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (!isGameOver && performance.now() - lastStepTime > stepSpeed) {
        step();
        lastStepTime = performance.now();
      }

      // Food Animation: Floating bounce + Spin + Orbiting Sparkles
      if (foodGroup) {
        foodGroup.rotation.y += 1.6 * delta;
        foodGroup.position.y = 0.52 + Math.sin(time * 4) * 0.12;

        orbitMeshes.forEach((o, i) => {
          const ang = time * 3.5 + (i * Math.PI * 2) / orbitCount;
          const rad = 0.65;
          o.position.set(Math.cos(ang) * rad, Math.sin(time * 5 + i) * 0.15, Math.sin(ang) * rad);
        });

        // Pulsing light
        foodLight.intensity = 3.2 + Math.sin(time * 6) * 0.8;
      }

      // Shockwaves Animation
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i]!;
        sw.scale += delta * 6.0;
        sw.opacity -= delta * 1.5;
        sw.mesh.scale.set(sw.scale, sw.scale, 1);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, sw.opacity);

        if (sw.opacity <= 0) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          shockwaves.splice(i, 1);
        }
      }

      // Particles Physics
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.mesh.rotation.x += p.rotSpeed * delta;
        p.mesh.rotation.y += p.rotSpeed * delta;
        p.vy -= 12.0 * delta;
        p.life -= 1.6 * delta;
        p.mesh.scale.setScalar(Math.max(0.01, p.life));

        // Bounce on floor
        if (p.mesh.position.y <= 0.08) {
          p.mesh.position.y = 0.08;
          p.vy = -p.vy * 0.45;
        }

        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          particles.splice(i, 1);
        }
      }

      // Rotate Background Starfield slowly
      if (starField) {
        starField.rotation.y += delta * 0.02;
      }

      // Camera Floating & Shake
      const baseCamX = Math.sin(time * 0.35) * 0.45;
      if (cameraShake > 0) {
        camera.position.x = baseCamX + (Math.random() - 0.5) * cameraShake;
        camera.position.y += (Math.random() - 0.5) * cameraShake;
        cameraShake = Math.max(0, cameraShake - delta * 1.8);
      } else {
        camera.position.x = baseCamX;
      }
      camera.lookAt(0, 0, 0.4);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updateCameraFraming);
      touchSurface.removeEventListener('touchstart', onTouchStart);
      touchSurface.removeEventListener('touchmove', onTouchMove);
      touchSurface.removeEventListener('touchend', onTouchEnd);

      snakeMeshes.forEach((m) => scene.remove(m));
      particles.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
      });
      shockwaves.forEach((s) => {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
      });
      renderer.dispose();
      if (domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
    };
  }, [sessionId]);

  const restart = () => {
    setScore(0);
    setGameOver(false);
    setSessionId((s) => s + 1);
  };

  return (
    <div
      ref={outerWrapperRef}
      className="relative flex h-full w-full flex-1 flex-col select-none touch-none overflow-hidden"
    >
      {/* 3D WebGL Canvas - 100% Edge-to-Edge of Arena */}
      <div
        ref={containerRef}
        className="relative h-full w-full flex-1 overflow-hidden"
      >
        {/* Floating HUD: Live Score & Snake Length */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-[#0c0520cc] px-3.5 py-1.5 shadow-[0_0_20px_rgba(0,240,255,0.25)] backdrop-blur-md">
            <div className="h-2.5 w-2.5 rounded-full bg-[#00f0ff] animate-ping" />
            <span className="font-display text-[11px] font-bold tracking-wider text-white/60 uppercase">
              СЧЁТ:
            </span>
            <span
              ref={scoreBadgeRef}
              className="font-display text-lg font-black italic text-[#ffe600] tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              0
            </span>
          </div>

          <div className="hidden xs:flex items-center gap-1.5 rounded-2xl border border-fuchsia-400/30 bg-[#0c0520cc] px-3 py-1.5 shadow-[0_0_15px_rgba(255,46,147,0.2)] backdrop-blur-md">
            <span className="font-display text-[10px] font-bold tracking-wider text-fuchsia-300 uppercase">
              ДЛИНА:
            </span>
            <span
              ref={lengthBadgeRef}
              className="font-display text-sm font-black italic text-white tabular-nums"
            >
              {snakeLength}
            </span>
          </div>
        </div>

        {/* On-Screen Mobile Touch D-Pad Controls */}
        {isTouchDevice && !gameOver && (
          <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex flex-col items-center gap-1 opacity-80 active:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleInputRef.current(0, -1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-cyan-400/50 bg-[#160b38]/90 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-90"
              aria-label="Вверх"
            >
              <ArrowUp className="h-6 w-6 stroke-[3]" />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputRef.current(-1, 0)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-cyan-400/50 bg-[#160b38]/90 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-90"
                aria-label="Влево"
              >
                <ArrowLeft className="h-6 w-6 stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={() => handleInputRef.current(0, 1)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-cyan-400/50 bg-[#160b38]/90 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-90"
                aria-label="Вниз"
              >
                <ArrowDown className="h-6 w-6 stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={() => handleInputRef.current(1, 0)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-cyan-400/50 bg-[#160b38]/90 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-90"
                aria-label="Вправо"
              >
                <ArrowRight className="h-6 w-6 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07011be8] p-5 text-center backdrop-blur-md">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-rose-500/60 bg-rose-500/20 text-3xl font-black text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)]">
              ✕
            </div>
            <h2 className="font-display mb-1 text-3xl font-black italic tracking-wide text-white uppercase drop-shadow-[0_4px_0_#000] sm:text-4xl">
              СТОЛКНОВЕНИЕ
            </h2>
            <p className="mb-1 text-sm text-fuchsia-200">
              Набрано очков:{' '}
              <span className="font-display font-black text-[#ffe600] text-lg">
                {score.toLocaleString('ru-RU')}
              </span>
            </p>
            <p className="mb-2 text-xs text-white/60">
              Рекорд:{' '}
              <span className="font-bold text-amber-300">
                {Math.max(bestScore, score).toLocaleString('ru-RU')}
              </span>
            </p>
            {isNewRecord && (
              <div className="mb-4 flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-500/25 px-4 py-1.5 text-xs font-black italic text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                <Trophy className="h-4 w-4" />
                НОВЫЙ РЕКОРД!
              </div>
            )}
            <button
              type="button"
              onClick={restart}
              className="mt-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e93] via-[#d946ef] to-[#00f0ff] px-8 py-3.5 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_28px_rgba(255,46,147,0.7)] transition hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              ИГРАТЬ СНОВА
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
