import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Trophy } from 'lucide-react';
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
    scene.background = new THREE.Color(0x0e111a);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    function onResize() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(rect.width, 320);
      const h = Math.max(rect.height, 220);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    window.addEventListener('resize', onResize);
    onResize();

    // --- LIGHTING ---
    const ambLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(10, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const foodLight = new THREE.PointLight(0xccff00, 2.5, 6);
    scene.add(foodLight);

    // --- 3D ARENA PLATFORM ---
    const floorGeo = new THREE.BoxGeometry(GRID_SIZE * CELL_SIZE + 0.6, 0.6, GRID_SIZE * CELL_SIZE + 0.6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2438,
      roughness: 0.7,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.3;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Grid lines
    const gridHelper = new THREE.GridHelper(GRID_SIZE * CELL_SIZE, GRID_SIZE, 0x64748b, 0x334155);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Arena Outer Border
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x242838, metalness: 0.5, roughness: 0.5 });
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

    // --- REUSABLE MESHES & MATERIALS ---
    const headGeo = new THREE.BoxGeometry(0.88, 0.75, 0.88);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 });

    const eyeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

    const bodyGeo = new THREE.BoxGeometry(0.8, 0.65, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xccff00, roughness: 0.35, metalness: 0.2 });

    const foodGeo = new THREE.OctahedronGeometry(0.42, 0);
    const foodMat = new THREE.MeshStandardMaterial({
      color: 0xccff00,
      emissive: 0x88bb00,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.4,
    });
    const foodMesh = new THREE.Mesh(foodGeo, foodMat);
    foodMesh.castShadow = true;
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

    function createSnakeSegmentMesh(isHead: boolean) {
      if (isHead) {
        const group = new THREE.Group();
        const head = new THREE.Mesh(headGeo, headMat);
        head.castShadow = true;
        head.position.y = 0.38;
        group.add(head);

        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(0.24, 0.55, 0.4);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(-0.24, 0.55, 0.4);
        group.add(eyeL, eyeR);
        scene.add(group);
        return group;
      } else {
        const mesh = new THREE.Mesh(bodyGeo, bodyMat);
        mesh.castShadow = true;
        mesh.position.y = 0.33;
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

    function create3DParticles(x: number, z: number, count = 22) {
      const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xccff00 });

      for (let i = 0; i < count; i++) {
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

    // Touch Swipes
    let touchStart: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) touchStart = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t || !touchStart) return;
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 20) handleInput(dx > 0 ? 1 : -1, 0);
      } else {
        if (Math.abs(dy) > 20) handleInput(0, dy > 0 ? 1 : -1);
      }
      touchStart = null;
    };
    const domEl = renderer.domElement;
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    domEl.addEventListener('touchend', onTouchEnd, { passive: true });

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
        const mesh = createSnakeSegmentMesh(idx === 0);
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

        // Add body segment mesh
        const newMesh = createSnakeSegmentMesh(false);
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      domEl.removeEventListener('touchstart', onTouchStart);
      domEl.removeEventListener('touchend', onTouchEnd);

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
    <div className="relative flex h-full w-full flex-col">
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full flex-1 overflow-hidden rounded-2xl border border-white/15 bg-[#0e111a] shadow-2xl sm:aspect-[16/10]"
      >
        {/* Live Score Badge (Direct DOM update - zero re-renders/zero lag) */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e111ce0] px-3.5 py-1.5 backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-[#ccff00] animate-pulse" />
          <span className="font-display text-xs font-bold tracking-wider text-white/50 uppercase">
            СЧЁТ:
          </span>
          <span
            ref={scoreBadgeRef}
            className="font-display text-base font-black italic text-[#ccff00] tabular-nums"
          >
            0
          </span>
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090b14]/90 p-4 text-center backdrop-blur-md">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-2xl font-black text-rose-400">
              ✕
            </div>
            <h2 className="font-display mb-1 text-2xl font-black italic tracking-wide text-white uppercase sm:text-3xl">
              СТОЛКНОВЕНИЕ
            </h2>
            <p className="mb-1 text-sm text-fuchsia-200/80">
              Набрано очков:{' '}
              <span className="font-bold text-[#ccff00]">{score.toLocaleString('ru-RU')}</span>
            </p>
            <p className="mb-2 text-xs text-white/50">
              Рекорд: <span className="font-bold text-amber-300">{bestScore.toLocaleString('ru-RU')}</span>
            </p>
            {isNewRecord && (
              <div className="mb-4 flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-xs font-black italic text-amber-300">
                <Trophy className="h-3.5 w-3.5" />
                НОВЫЙ РЕКОРД!
              </div>
            )}
            <button
              type="button"
              onClick={restart}
              className="mt-2 flex items-center gap-2 rounded-full bg-[#ccff00] px-8 py-3 font-display text-xs font-black italic tracking-wider text-black uppercase shadow-[0_0_25px_rgba(204,255,0,0.5)] transition hover:bg-[#b8e600] active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              ИГРАТЬ СНОВА
            </button>
          </div>
        )}
      </div>

      {/* Mobile Virtual D-Pad */}
      <div className="mt-3 flex flex-col items-center gap-1.5 sm:hidden">
        <button
          type="button"
          onClick={() => handleInputRef.current(0, -1)}
          aria-label="Вверх"
          className="flex h-12 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white active:bg-[#ccff00] active:text-black transition"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleInputRef.current(-1, 0)}
            aria-label="Влево"
            className="flex h-12 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white active:bg-[#ccff00] active:text-black transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleInputRef.current(0, 1)}
            aria-label="Вниз"
            className="flex h-12 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white active:bg-[#ccff00] active:text-black transition"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleInputRef.current(1, 0)}
            aria-label="Вправо"
            className="flex h-12 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white active:bg-[#ccff00] active:text-black transition"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
