import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Trophy } from 'lucide-react';
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
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const handleInputRef = useRef<(x: number, z: number) => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- THREE.JS SETUP (PORTED EXACTLY FROM 60FPS PROTOTYPE) ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e1a);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const domEl = renderer.domElement;
    domEl.style.width = '100%';
    domEl.style.height = '100%';
    domEl.style.display = 'block';
    container.appendChild(domEl);

    function onResize() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width) || 320;
      const h = Math.round(rect.height) || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    const ro = new ResizeObserver(() => onResize());
    ro.observe(container);
    window.addEventListener('resize', onResize);
    onResize();

    // --- LIGHTING (BLOCK BLAST SYNTHWAVE PALETTE) ---
    const ambLight = new THREE.AmbientLight(0xdbeafe, 0.9);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(10, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimPink = new THREE.PointLight(0xff2e93, 2.2, 25);
    rimPink.position.set(-14, 6, -10);
    scene.add(rimPink);

    const rimCyan = new THREE.PointLight(0x38bdf8, 2.0, 25);
    rimCyan.position.set(14, 6, 12);
    scene.add(rimCyan);

    const foodLight = new THREE.PointLight(0xff2e93, 2.8, 7);
    scene.add(foodLight);

    // --- 3D ARENA PLATFORM ---
    const floorGeo = new THREE.BoxGeometry(GRID_SIZE * CELL_SIZE + 0.6, 0.6, GRID_SIZE * CELL_SIZE + 0.6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x161336,
      roughness: 0.65,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.3;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Glowing Synthwave Grid lines
    const gridHelper = new THREE.GridHelper(GRID_SIZE * CELL_SIZE, GRID_SIZE, 0x818cf8, 0x312e81);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Arena Outer Border with Neon Edges
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x1e123d, metalness: 0.3, roughness: 0.5 });
    const bW = GRID_SIZE * CELL_SIZE + 0.8;
    const bT = 0.25;
    const bH = 0.5;

    const b1 = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bT), borderMat);
    b1.position.set(0, bH / 2, -HALF_GRID - bT / 2);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bT), borderMat);
    b2.position.set(0, bH / 2, HALF_GRID + bT / 2);
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(bT, bH, bW), borderMat);
    b3.position.set(-HALF_GRID - bT / 2, bH / 2, 0);
    const b4 = new THREE.Mesh(new THREE.BoxGeometry(bT, bH, bW), borderMat);
    b4.position.set(HALF_GRID + bT / 2, bH / 2, 0);
    scene.add(b1, b2, b3, b4);

    // Neon Frame Line around arena border
    const borderEdgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(bW + 0.05, 0.52, bW + 0.05)
    );
    const borderEdgeMat = new THREE.LineBasicMaterial({ color: 0xff47b3, transparent: true, opacity: 0.75 });
    const borderLines = new THREE.LineSegments(borderEdgeGeo, borderEdgeMat);
    borderLines.position.set(0, bH / 2, 0);
    scene.add(borderLines);

    // --- REUSABLE MESHES & MATERIALS (BLOCK BLAST PALETTE: CYAN, PURPLE & MAGENTA) ---
    const headGeo = new THREE.BoxGeometry(0.88, 0.75, 0.88);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.15,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });

    const eyeWhiteGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });

    const bodyGeo = new THREE.BoxGeometry(0.82, 0.68, 0.82);
    const bodyMatCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    const bodyMatPurple = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.35,
    });
    const bodyMatPink = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0xbe185d,
      emissiveIntensity: 0.35,
    });
    const bodyMaterials = [bodyMatCyan, bodyMatPurple, bodyMatPink];

    // Neon Apple Food
    const foodGroup = new THREE.Group();
    const foodGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const foodMat = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      emissive: 0xdb2777,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.2,
    });
    const foodBody = new THREE.Mesh(foodGeo, foodMat);
    foodBody.castShadow = true;
    foodGroup.add(foodBody);

    const leafGeo = new THREE.BoxGeometry(0.12, 0.16, 0.08);
    const leafMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.1, 0.42, 0);
    leaf.rotation.z = -0.35;
    foodGroup.add(leaf);

    const foodMesh = foodGroup;
    scene.add(foodMesh);

    // --- GAME STATE ---
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
    let particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];

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
        pupilL.position.set(0.24, 0.52, 0.48);
        const pupilR = new THREE.Mesh(eyePupilGeo, eyePupilMat);
        pupilR.position.set(-0.24, 0.52, 0.48);
        group.add(pupilL, pupilR);

        scene.add(group);
        return group;
      } else {
        const mat = bodyMaterials[segIdx % bodyMaterials.length]!;
        const mesh = new THREE.Mesh(bodyGeo, mat);
        mesh.castShadow = true;
        mesh.position.y = 0.34;
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
      foodMesh.position.set(pos.x, 0.5, pos.z);
      foodLight.position.set(pos.x, 1.2, pos.z);
    }

    const particleColors = [0x38bdf8, 0xff2e93, 0xa855f7, 0xfde047];
    function create3DParticles(x: number, z: number, count = 22) {
      const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

      for (let i = 0; i < count; i++) {
        const clr = particleColors[i % particleColors.length]!;
        const pMat = new THREE.MeshBasicMaterial({ color: clr });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(x, 0.5, z);
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 2;
        scene.add(p);
        particles.push({
          mesh: p,
          vx: Math.cos(ang) * spd,
          vy: Math.random() * 5 + 3,
          vz: Math.sin(ang) * spd,
          life: 1.0,
        });
      }
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

    // Touch Swipes with Instant TouchMove Turn Detection
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

      if (scoreBadgeRef.current) {
        scoreBadgeRef.current.innerText = '0';
      }

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
        const pos = gridToWorld(snake[0]!.x, snake[0]!.z);
        create3DParticles(pos.x, pos.z, 35);
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
        const pos = gridToWorld(food.x, food.z);
        create3DParticles(pos.x, pos.z, 22);

        // Add body segment mesh with alternating synthwave color
        const newMesh = createSnakeSegmentMesh(false, snakeMeshes.length);
        snakeMeshes.push(newMesh);

        stepSpeed = Math.max(70, stepSpeed - 1.5);
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

      // Food Animation: Floating bounce + Spin
      if (foodMesh) {
        foodMesh.rotation.y += 1.8 * delta;
        foodMesh.rotation.x += 1.2 * delta;
        foodMesh.position.y = 0.5 + Math.sin(time * 4) * 0.12;
      }

      // Particles Physics
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.vy -= 9.8 * delta;
        p.life -= 1.8 * delta;
        p.mesh.scale.setScalar(Math.max(0.01, p.life));

        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          particles.splice(i, 1);
        }
      }

      // Subtle dynamic camera float
      camera.position.x = Math.sin(time * 0.4) * 0.6;
      camera.lookAt(0, 0, 1.2);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      touchSurface.removeEventListener('touchstart', onTouchStart);
      touchSurface.removeEventListener('touchmove', onTouchMove);
      touchSurface.removeEventListener('touchend', onTouchEnd);

      snakeMeshes.forEach((m) => scene.remove(m));
      particles.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
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
      className="relative flex h-full w-full flex-1 flex-col items-center justify-center select-none touch-none p-2 sm:p-4"
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="relative aspect-square w-full max-w-[340px] sm:max-w-[420px] max-h-[54dvh] sm:max-h-[62dvh] mx-auto my-auto overflow-hidden rounded-2xl border border-indigo-400/40 bg-[#0b0e1a] shadow-[0_0_32px_rgba(99,102,241,0.28)]"
      >
        {/* Live Score Badge (Direct DOM update - zero re-renders/zero lag) */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e111ce0] px-3.5 py-1.5 backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-[#38bdf8] animate-pulse" />
          <span className="font-display text-xs font-bold tracking-wider text-white/55 uppercase">
            СЧЁТ:
          </span>
          <span
            ref={scoreBadgeRef}
            className="font-display text-base font-black italic text-amber-300 tabular-nums"
          >
            0
          </span>
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090b14]/90 p-5 text-center backdrop-blur-md">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-2xl font-black text-rose-400">
              ✕
            </div>
            <h2 className="font-display mb-1 text-2xl font-black italic tracking-wide text-white uppercase sm:text-3xl">
              СТОЛКНОВЕНИЕ
            </h2>
            <p className="mb-1 text-sm text-fuchsia-200/80">
              Набрано очков:{' '}
              <span className="font-bold text-amber-300">{score.toLocaleString('ru-RU')}</span>
            </p>
            <p className="mb-2 text-xs text-white/50">
              Рекорд: <span className="font-bold text-amber-300">{bestScore.toLocaleString('ru-RU')}</span>
            </p>
            {isNewRecord && (
              <div className="mb-4 flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3.5 py-1 text-xs font-black italic text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]">
                <Trophy className="h-3.5 w-3.5" />
                НОВЫЙ РЕКОРД!
              </div>
            )}
            <button
              type="button"
              onClick={restart}
              className="mt-2 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e93] via-[#d946ef] to-[#7c3aed] px-8 py-3 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_26px_rgba(255,46,147,0.65)] transition hover:brightness-110 active:scale-95 cursor-pointer"
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
