import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Trophy } from 'lucide-react';
import { sfx } from '../lib/sound';

interface SubwaySurfersGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

interface ObstacleEntity {
  mesh: THREE.Group;
  lane: number;
  z: number;
  kind: 'train' | 'low' | 'high';
  active: boolean;
}

interface CoinEntity {
  mesh: THREE.Mesh;
  lane: number;
  z: number;
  active: boolean;
}

const LANE_X = [-2.4, 0, 2.4] as const;

/**
 * 3D Subway Surfers Fest built with Three.js following 3d-web-godmode:
 * clamped DPR, object pooling, zero allocations inside rAF, full resource disposal.
 */
export const SubwaySurfersGame: React.FC<SubwaySurfersGameProps> = ({
  onGameOver,
  bestScore,
  isNewRecord,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [coinsCount, setCoinsCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [sessionId, setSessionId] = useState(0);

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 860;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#270b4d');
    scene.fog = new THREE.FogExp2('#2e0e57', 0.022);

    const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 140);
    camera.position.set(0, 4.2, 7.6);
    camera.lookAt(0, 1.4, -12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lighting
    const hemi = new THREE.HemisphereLight('#fbcfe8', '#1e1b4b', 1.15);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight('#fde047', 1.5);
    dirLight.position.set(6, 14, 10);
    scene.add(dirLight);

    // Track floor + 3 pairs of shiny rails
    const disposables: { dispose: () => void }[] = [];
    const trackGeo = new THREE.PlaneGeometry(11, 140);
    const trackMat = new THREE.MeshStandardMaterial({ color: '#1b0b38', roughness: 0.9 });
    disposables.push(trackGeo, trackMat);
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.z = -55;
    scene.add(track);

    const railGeo = new THREE.BoxGeometry(0.12, 0.08, 140);
    const railMat = new THREE.MeshStandardMaterial({ color: '#c4b5fd', metalness: 0.7, roughness: 0.25 });
    disposables.push(railGeo, railMat);
    for (const lx of LANE_X) {
      for (const offset of [-0.62, 0.62]) {
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(lx + offset, 0.04, -55);
        scene.add(rail);
      }
    }

    // Scrolling sleepers + neon side posts
    const sleeperGeo = new THREE.BoxGeometry(8.2, 0.05, 0.35);
    const sleeperMat = new THREE.MeshStandardMaterial({ color: '#4c1d95' });
    const postGeo = new THREE.BoxGeometry(0.28, 3.6, 0.28);
    const postMat = new THREE.MeshStandardMaterial({
      color: '#ec4899',
      emissive: '#db2777',
      emissiveIntensity: 0.7,
    });
    disposables.push(sleeperGeo, sleeperMat, postGeo, postMat);

    const sleepers: THREE.Mesh[] = [];
    const posts: THREE.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const z = 8 - i * 5;
      const sl = new THREE.Mesh(sleeperGeo, sleeperMat);
      sl.position.set(0, 0.02, z);
      scene.add(sl);
      sleepers.push(sl);

      if (i % 2 === 0) {
        for (const sx of [-4.6, 4.6]) {
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(sx, 1.8, z);
          scene.add(post);
          posts.push(post);
        }
      }
    }

    // Skater Character Group
    const player = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.85, 1.05, 0.55);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#f8fafc' });
    const headGeo = new THREE.SphereGeometry(0.36, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: '#fed7aa' });
    const capGeo = new THREE.BoxGeometry(0.76, 0.28, 0.85);
    const capMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
    const legGeo = new THREE.BoxGeometry(0.28, 0.65, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: '#2563eb' });
    const shoeGeo = new THREE.BoxGeometry(0.32, 0.2, 0.48);
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
    disposables.push(bodyGeo, bodyMat, headGeo, headMat, capGeo, capMat, legGeo, legMat, shoeGeo, shoeMat);

    const torso = new THREE.Mesh(bodyGeo, bodyMat);
    torso.position.y = 1.2;
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.02;
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 2.26, -0.06);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.68, 0);
    const lLegMesh = new THREE.Mesh(legGeo, legMat);
    lLegMesh.position.y = -0.32;
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(0, -0.6, -0.08);
    leftLeg.add(lLegMesh, lShoe);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.68, 0);
    const rLegMesh = new THREE.Mesh(legGeo, legMat);
    rLegMesh.position.y = -0.32;
    const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0, -0.6, -0.08);
    rightLeg.add(rLegMesh, rShoe);

    player.add(torso, head, cap, leftLeg, rightLeg);
    scene.add(player);

    // Pooled Obstacles (Trains, Low Barriers, High Gantries)
    const trainBodyGeo = new THREE.BoxGeometry(1.75, 2.4, 6.2);
    const trainMat = new THREE.MeshStandardMaterial({ color: '#6366f1', roughness: 0.4 });
    const trainFrontMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#f59e0b', emissiveIntensity: 0.6 });
    const trainFrontGeo = new THREE.BoxGeometry(1.4, 0.6, 0.15);
    const lowGeo = new THREE.BoxGeometry(1.7, 0.85, 0.45);
    const lowMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#be123c', emissiveIntensity: 0.45 });
    const highGeo = new THREE.BoxGeometry(1.9, 1.35, 0.45);
    const highMat = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#7e22ce', emissiveIntensity: 0.5 });
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#f59e0b',
      emissiveIntensity: 0.65,
      metalness: 0.6,
      roughness: 0.2,
    });
    disposables.push(trainBodyGeo, trainMat, trainFrontMat, trainFrontGeo, lowGeo, lowMat, highGeo, highMat, coinGeo, coinMat);

    const obstaclePool: ObstacleEntity[] = [];
    const createObstacleMesh = (kind: 'train' | 'low' | 'high'): THREE.Group => {
      const g = new THREE.Group();
      if (kind === 'train') {
        const body = new THREE.Mesh(trainBodyGeo, trainMat);
        body.position.y = 1.2;
        const win = new THREE.Mesh(trainFrontGeo, trainFrontMat);
        win.position.set(0, 1.65, 3.12);
        g.add(body, win);
      } else if (kind === 'low') {
        const bar = new THREE.Mesh(lowGeo, lowMat);
        bar.position.y = 0.45;
        g.add(bar);
      } else {
        const sign = new THREE.Mesh(highGeo, highMat);
        sign.position.y = 1.95;
        g.add(sign);
      }
      g.visible = false;
      scene.add(g);
      return g;
    };

    const kinds: ('train' | 'low' | 'high')[] = ['train', 'train', 'train', 'low', 'low', 'low', 'high', 'high'];
    for (const k of kinds) {
      obstaclePool.push({ mesh: createObstacleMesh(k), lane: 1, z: -100, kind: k, active: false });
    }

    const coinPool: CoinEntity[] = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.rotation.z = Math.PI / 2;
      m.visible = false;
      scene.add(m);
      coinPool.push({ mesh: m, lane: 1, z: -100, active: false });
    }

    // State
    let targetLane = 1;
    let playerY = 0;
    let playerVy = 0;
    let rollTimer = 0;
    let speed = 22;
    let distScore = 0;
    let bonusCoins = 0;
    let spawnTimer = 0.7;
    let coinTimer = 0.5;
    let dead = false;
    let lastTs = performance.now();

    const moveLeft = () => {
      if (!dead && targetLane > 0) targetLane -= 1;
    };
    const moveRight = () => {
      if (!dead && targetLane < 2) targetLane += 1;
    };
    const triggerJump = () => {
      if (!dead && playerY <= 0.02) {
        playerVy = 12.6;
        rollTimer = 0;
        sfx.jump();
      }
    };
    const triggerRoll = () => {
      if (dead) return;
      if (playerY > 0.05) {
        playerVy = Math.min(playerVy, -18);
      }
      rollTimer = 0.65;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        moveLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        moveRight();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        e.preventDefault();
        if (dead) {
          setGameOver(false);
          setScore(0);
          setCoinsCount(0);
          setSessionId((s) => s + 1);
          return;
        }
        triggerJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        triggerRoll();
      }
    };

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
        if (Math.abs(dx) > 22) (dx > 0 ? moveRight : moveLeft)();
      } else if (Math.abs(dy) > 22) {
        (dy < 0 ? triggerJump : triggerRoll)();
      }
      touchStart = null;
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 860;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    let rafId = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (!dead) {
        speed = Math.min(44, 22 + distScore * 0.012);
        distScore += speed * dt * 0.8;
        const total = Math.floor(distScore) + bonusCoins * 15;
        setScore(total);

        // Smooth lane lerp
        const targetX = LANE_X[targetLane] ?? 0;
        player.position.x += (targetX - player.position.x) * Math.min(1, dt * 14);

        // Vertical physics
        playerVy -= 34 * dt;
        playerY = Math.max(0, playerY + playerVy * dt);
        if (playerY === 0 && playerVy < 0) playerVy = 0;
        player.position.y = playerY;

        // Roll / squash animation
        if (rollTimer > 0) {
          rollTimer -= dt;
          player.scale.y = 0.52;
        } else {
          player.scale.y = 1;
        }

        // Running legs swing
        const swing = playerY < 0.1 ? Math.sin(now * 0.018) * 0.65 : 0.35;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;

        // Scroll sleepers & posts
        for (const sl of sleepers) {
          sl.position.z += speed * dt;
          if (sl.position.z > 10) sl.position.z -= 120;
        }
        for (const post of posts) {
          post.position.z += speed * dt;
          if (post.position.z > 10) post.position.z -= 120;
        }

        // Spawn obstacles
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const inactive = obstaclePool.filter((o) => !o.active);
          if (inactive.length > 0) {
            const pick = inactive[Math.floor(Math.random() * inactive.length)]!;
            pick.lane = Math.floor(Math.random() * 3);
            pick.z = -95;
            pick.active = true;
            pick.mesh.position.set(LANE_X[pick.lane] ?? 0, 0, pick.z);
            pick.mesh.visible = true;
          }
          spawnTimer = Math.max(0.48, 1.05 - speed / 60) + Math.random() * 0.35;
        }

        // Spawn coins
        coinTimer -= dt;
        if (coinTimer <= 0) {
          const lane = Math.floor(Math.random() * 3);
          let placed = 0;
          for (const c of coinPool) {
            if (!c.active && placed < 3) {
              c.active = true;
              c.lane = lane;
              c.z = -90 - placed * 2.6;
              c.mesh.position.set(LANE_X[lane] ?? 0, 0.95, c.z);
              c.mesh.visible = true;
              placed++;
            }
          }
          coinTimer = 0.85 + Math.random() * 0.7;
        }

        // Update coins
        for (const c of coinPool) {
          if (!c.active) continue;
          c.z += speed * dt;
          c.mesh.position.z = c.z;
          c.mesh.rotation.y += dt * 4;

          if (
            Math.abs(c.z - 0) < 1.0 &&
            Math.abs((LANE_X[c.lane] ?? 0) - player.position.x) < 1.1 &&
            playerY < 1.8
          ) {
            c.active = false;
            c.mesh.visible = false;
            bonusCoins += 1;
            setCoinsCount(bonusCoins);
            sfx.coin();
          } else if (c.z > 9) {
            c.active = false;
            c.mesh.visible = false;
          }
        }

        // Update obstacles & check collisions
        for (const ob of obstaclePool) {
          if (!ob.active) continue;
          ob.z += speed * dt;
          ob.mesh.position.z = ob.z;

          const halfLen = ob.kind === 'train' ? 3.1 : 0.45;
          const sameLane = Math.abs((LANE_X[ob.lane] ?? 0) - player.position.x) < 1.05;
          const zOverlap = Math.abs(ob.z) < halfLen + 0.35;

          if (sameLane && zOverlap) {
            const hit =
              ob.kind === 'train'
                ? playerY < 2.2
                : ob.kind === 'low'
                  ? playerY < 0.78
                  : rollTimer <= 0 && playerY < 2.5;

            if (hit) {
              dead = true;
              sfx.hit();
              setGameOver(true);
              onGameOverRef.current(total);
              break;
            }
          }

          if (ob.z > 12) {
            ob.active = false;
            ob.mesh.visible = false;
          }
        }

        // Subtle camera follow
        camera.position.x += (player.position.x * 0.38 - camera.position.x) * Math.min(1, dt * 8);
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [sessionId]);

  const restart = () => {
    setGameOver(false);
    setScore(0);
    setCoinsCount(0);
    setSessionId((s) => s + 1);
  };

  return (
    <div className="relative flex flex-1 flex-col p-2 sm:p-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-semibold text-fuchsia-200">
          Монеты: <span className="text-amber-300">{coinsCount}</span> • 3D Three.js Арена
        </span>
        <span className="font-display text-xl font-black italic text-amber-300 tabular-nums">
          {score}
        </span>
      </div>

      <div className="relative flex-1 min-h-[380px] w-full overflow-hidden rounded-2xl border border-fuchsia-400/50">
        <div ref={mountRef} className="h-full min-h-[380px] w-full touch-none select-none" />

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#120426]/82 p-6 text-center backdrop-blur-sm">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Новый 3D рекорд!
              </div>
            )}
            <h2 className="font-display text-3xl font-black italic text-white uppercase">Крушение!</h2>
            <p className="mt-1 text-sm text-fuchsia-200">
              Счёт: <span className="font-display text-lg font-black text-amber-300">{score}</span> (Лучший:{' '}
              {Math.max(bestScore, score)})
            </p>
            <button
              type="button"
              onClick={restart}
              className="font-display mt-5 flex min-h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e93] to-[#6366f1] px-6 py-2.5 text-sm font-black italic text-white uppercase shadow-[0_0_20px_rgba(255,46,147,0.6)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Бежать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

