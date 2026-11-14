import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Trophy, ArrowDown, ArrowUp, Sparkles, Play } from 'lucide-react';
import { sfx } from '../lib/sound';

interface DinoGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

interface Obstacle3D {
  group: THREE.Group;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'cactus' | 'cactus_cluster' | 'stone' | 'ptero';
  active: boolean;
  wingL?: THREE.Mesh;
  wingR?: THREE.Mesh;
}

interface Coin3D {
  mesh: THREE.Group;
  halo: THREE.Mesh;
  sparkle: THREE.Group;
  x: number;
  y: number;
  active: boolean;
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
}

/**
 * 3D Dino Runner built with Three.js matching the festival synthwave / OKEl aesthetic:
 * - 3D Voxel Purple T-Rex with cool sunglasses, white pixel teeth, dorsal spikes & orange soles
 * - 3D Green Saguaro Cactus with side arms & purple neon glow
 * - 3D Stone Block obstacles & neon Pterodactyls
 * - 3D Spinning Golden Coins with particle bursts
 * - Parallax 3D scenery featuring the Orenburg College building, skyline & voxel clouds
 * - Silky smooth 60 FPS, object pooling, clean unmount disposal, mobile touch controls
 */
export const DinoGame: React.FC<DinoGameProps> = ({ onGameOver, bestScore, isNewRecord }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const scoreBadgeRef = useRef<HTMLSpanElement>(null);
  const coinsBadgeRef = useRef<HTMLSpanElement>(null);

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [coinsCount, setCoinsCount] = useState(0);
  const [sessionId, setSessionId] = useState(0);
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  const [isTouchDevice, setIsTouchDevice] = useState(() =>
    typeof window !== 'undefined'
      ? 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
      : false
  );

  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingDuck = useRef(false);

  useEffect(() => {
    const onResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setIsTouchDevice('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const handleViewportTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Instant 0ms response: jump the exact millisecond the finger hits the screen!
    if (gameState === 'ready') {
      startGameRef.current();
    } else if (gameState === 'playing') {
      jumpActionRef.current();
    }
  };

  const handleViewportTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dy = touch.clientY - touchStartPos.current.y;
    const dx = touch.clientX - touchStartPos.current.x;

    if (dy > 24 && Math.abs(dy) > Math.abs(dx)) {
      if (!isSwipingDuck.current) {
        isSwipingDuck.current = true;
        duckActionRef.current(true);
      }
    } else if (dy < -24 && Math.abs(dy) > Math.abs(dx)) {
      jumpActionRef.current();
      touchStartPos.current = null;
    }
  };

  const handleViewportTouchEnd = () => {
    if (isSwipingDuck.current) {
      isSwipingDuck.current = false;
      duckActionRef.current(false);
    }
    touchStartPos.current = null;
  };

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const jumpActionRef = useRef<() => void>(() => {});
  const duckActionRef = useRef<(active: boolean) => void>(() => {});
  const startGameRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Disposables pool for clean unmount
    const disposables: { dispose: () => void }[] = [];

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0736);
    scene.fog = new THREE.FogExp2(0x230948, 0.024);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    // 2.5D / 3D Isometric-depth side view
    camera.position.set(0.6, 2.5, 8.2);
    camera.lookAt(1.2, 1.3, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const updateCameraSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(Math.round(rect.width), 320);
      const h = Math.max(Math.round(rect.height), 240);
      const aspect = w / h;
      camera.aspect = aspect;

      // Adjust camera distance for mobile portrait
      const zoom = aspect < 1.1 ? Math.min(1.48, 1.15 / Math.max(aspect, 0.6)) : 1.0;
      camera.position.set(0.6 * zoom, 2.5 * zoom, 8.2 * zoom);
      camera.lookAt(1.2, 1.3, 0);
      camera.updateProjectionMatrix();

      renderer.setSize(w, h, false);
    };

    updateCameraSize();
    window.addEventListener('resize', updateCameraSize);
    const ro = new ResizeObserver(updateCameraSize);
    ro.observe(container);

    // --- LIGHTING ---
    const hemiLight = new THREE.HemisphereLight(0xffd5fa, 0x1a0c33, 1.1);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1aa, 1.45);
    sunLight.position.set(6, 14, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 14;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -4;
    scene.add(sunLight);

    const neonPinkLight = new THREE.PointLight(0xff2e93, 2.4, 25);
    neonPinkLight.position.set(-2, 1.2, 3);
    scene.add(neonPinkLight);

    const neonCyanLight = new THREE.PointLight(0x38bdf8, 1.6, 20);
    neonCyanLight.position.set(8, 2, 2);
    scene.add(neonCyanLight);

    // --- SHARED MATERIALS & GEOMETRIES ---
    const purpleDinoMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.35,
      metalness: 0.12,
      emissive: 0x3b0764,
      emissiveIntensity: 0.35,
    });
    disposables.push(purpleDinoMat);

    const lightBellyMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      roughness: 0.45,
    });
    disposables.push(lightBellyMat);

    const orangeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.4,
      emissive: 0x9a3412,
      emissiveIntensity: 0.3,
    });
    disposables.push(orangeSoleMat);

    const sunglassesMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.12,
      metalness: 0.85,
    });
    disposables.push(sunglassesMat);

    const lensReflectionMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });
    disposables.push(lensReflectionMat);

    const whiteTeethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    disposables.push(whiteTeethMat);

    const cactusGreenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.45,
      metalness: 0.08,
      emissive: 0x052e16,
      emissiveIntensity: 0.25,
    });
    disposables.push(cactusGreenMat);

    const cactusRibMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.5,
    });
    disposables.push(cactusRibMat);

    const stoneBlockMat = new THREE.MeshStandardMaterial({
      color: 0x4c1d95,
      roughness: 0.7,
      metalness: 0.2,
      emissive: 0x2e1065,
      emissiveIntensity: 0.25,
    });
    disposables.push(stoneBlockMat);

    const goldCoinMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      roughness: 0.12,
      metalness: 0.95,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
    });
    disposables.push(goldCoinMat);

    const coinEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.35,
      metalness: 0.6,
      emissive: 0x78350f,
      emissiveIntensity: 0.5,
    });
    disposables.push(coinEdgeMat);

    const coinStarMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
    });
    disposables.push(coinStarMat);

    const coinHaloMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    disposables.push(coinHaloMat);

    const coinSparkleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    disposables.push(coinSparkleMat);

    // --- 3D VOXEL DINOSAUR BUILDER ---
    const buildDino = () => {
      const root = new THREE.Group();

      const bodyGroup = new THREE.Group();
      root.add(bodyGroup);

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.72, 0.76, 0.52);
      disposables.push(torsoGeo);
      const torso = new THREE.Mesh(torsoGeo, purpleDinoMat);
      torso.position.set(0, 0.8, 0);
      torso.castShadow = true;
      bodyGroup.add(torso);

      // Belly plate
      const bellyGeo = new THREE.BoxGeometry(0.38, 0.54, 0.54);
      disposables.push(bellyGeo);
      const belly = new THREE.Mesh(bellyGeo, lightBellyMat);
      belly.position.set(0.18, 0.76, 0);
      bodyGroup.add(belly);

      // Dorsal spikes
      const spikeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.16);
      disposables.push(spikeGeo);
      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(spikeGeo, lightBellyMat);
        spike.position.set(-0.36, 0.7 + i * 0.16, 0);
        spike.rotation.z = 0.3;
        bodyGroup.add(spike);
      }

      // Head & Neck Group
      const headGroup = new THREE.Group();
      headGroup.position.set(0.24, 1.22, 0);
      bodyGroup.add(headGroup);

      // Head cube
      const headGeo = new THREE.BoxGeometry(0.72, 0.52, 0.54);
      disposables.push(headGeo);
      const head = new THREE.Mesh(headGeo, purpleDinoMat);
      head.position.set(0.16, 0, 0);
      head.castShadow = true;
      headGroup.add(head);

      // Snout
      const snoutGeo = new THREE.BoxGeometry(0.48, 0.3, 0.5);
      disposables.push(snoutGeo);
      const snout = new THREE.Mesh(snoutGeo, purpleDinoMat);
      snout.position.set(0.5, -0.06, 0);
      snout.castShadow = true;
      headGroup.add(snout);

      // Teeth
      const teethGeo = new THREE.BoxGeometry(0.08, 0.08, 0.48);
      disposables.push(teethGeo);
      const teeth = new THREE.Mesh(teethGeo, whiteTeethMat);
      teeth.position.set(0.52, -0.19, 0);
      headGroup.add(teeth);

      // Cool Pixel Sunglasses
      const shadesFrameGeo = new THREE.BoxGeometry(0.52, 0.18, 0.58);
      disposables.push(shadesFrameGeo);
      const shades = new THREE.Mesh(shadesFrameGeo, sunglassesMat);
      shades.position.set(0.4, 0.06, 0);
      headGroup.add(shades);

      // Lens Reflection
      const lensRefGeo = new THREE.BoxGeometry(0.12, 0.06, 0.59);
      disposables.push(lensRefGeo);
      const lensRef = new THREE.Mesh(lensRefGeo, lensReflectionMat);
      lensRef.position.set(0.46, 0.08, 0);
      headGroup.add(lensRef);

      // Cute Little T-Rex Arms
      const armGeo = new THREE.BoxGeometry(0.12, 0.22, 0.1);
      disposables.push(armGeo);
      const armL = new THREE.Mesh(armGeo, purpleDinoMat);
      armL.position.set(0.28, 0.72, 0.28);
      armL.rotation.z = 0.5;
      bodyGroup.add(armL);

      const armR = new THREE.Mesh(armGeo, purpleDinoMat);
      armR.position.set(0.28, 0.72, -0.28);
      armR.rotation.z = 0.5;
      bodyGroup.add(armR);

      // Tail
      const tailGroup = new THREE.Group();
      tailGroup.position.set(-0.36, 0.72, 0);
      bodyGroup.add(tailGroup);

      const tailBaseGeo = new THREE.BoxGeometry(0.42, 0.3, 0.32);
      disposables.push(tailBaseGeo);
      const tailBase = new THREE.Mesh(tailBaseGeo, purpleDinoMat);
      tailBase.position.set(-0.16, 0, 0);
      tailBase.rotation.z = -0.2;
      tailGroup.add(tailBase);

      const tailTipGeo = new THREE.BoxGeometry(0.36, 0.22, 0.24);
      disposables.push(tailTipGeo);
      const tailTip = new THREE.Mesh(tailTipGeo, purpleDinoMat);
      tailTip.position.set(-0.4, 0.1, 0);
      tailTip.rotation.z = 0.35;
      tailGroup.add(tailTip);

      // Legs with distinctive Orange/Brown Undersoles
      const legGeo = new THREE.BoxGeometry(0.22, 0.42, 0.16);
      disposables.push(legGeo);

      const footUpperGeo = new THREE.BoxGeometry(0.36, 0.12, 0.2);
      disposables.push(footUpperGeo);

      const footSoleGeo = new THREE.BoxGeometry(0.38, 0.05, 0.22);
      disposables.push(footSoleGeo);

      const legLeft = new THREE.Group();
      legLeft.position.set(0, 0.44, 0.22);
      const legMeshL = new THREE.Mesh(legGeo, purpleDinoMat);
      legMeshL.position.y = -0.16;
      legMeshL.castShadow = true;
      legLeft.add(legMeshL);

      const footL = new THREE.Mesh(footUpperGeo, purpleDinoMat);
      footL.position.set(0.08, -0.34, 0);
      footL.castShadow = true;
      legLeft.add(footL);

      const soleL = new THREE.Mesh(footSoleGeo, orangeSoleMat);
      soleL.position.set(0.08, -0.4, 0);
      legLeft.add(soleL);
      root.add(legLeft);

      const legRight = new THREE.Group();
      legRight.position.set(0, 0.44, -0.22);
      const legMeshR = new THREE.Mesh(legGeo, purpleDinoMat);
      legMeshR.position.y = -0.16;
      legMeshR.castShadow = true;
      legRight.add(legMeshR);

      const footR = new THREE.Mesh(footUpperGeo, purpleDinoMat);
      footR.position.set(0.08, -0.34, 0);
      footR.castShadow = true;
      legRight.add(footR);

      const soleR = new THREE.Mesh(footSoleGeo, orangeSoleMat);
      soleR.position.set(0.08, -0.4, 0);
      legRight.add(soleR);
      root.add(legRight);

      return {
        root,
        bodyGroup,
        headGroup,
        tailGroup,
        armL,
        armR,
        legLeft,
        legRight,
      };
    };

    const dino = buildDino();
    dino.root.position.set(-1.4, 0, 0);
    scene.add(dino.root);

    // --- 3D CACTUS BUILDER (MATCHING USER SCREENSHOT) ---
    const buildCactus = (isCluster = false) => {
      const grp = new THREE.Group();

      const makeStem = (h: number, xOff = 0) => {
        const sub = new THREE.Group();
        sub.position.x = xOff;

        // Main trunk
        const trunkGeo = new THREE.BoxGeometry(0.4, h, 0.38);
        disposables.push(trunkGeo);
        const trunk = new THREE.Mesh(trunkGeo, cactusGreenMat);
        trunk.position.y = h / 2;
        trunk.castShadow = true;
        sub.add(trunk);

        // Vertical rib highlight
        const ribGeo = new THREE.BoxGeometry(0.12, h * 0.94, 0.4);
        disposables.push(ribGeo);
        const rib = new THREE.Mesh(ribGeo, cactusRibMat);
        rib.position.y = h / 2;
        sub.add(rib);

        // Left Arm (branch turning 90deg upward)
        const leftHGeo = new THREE.BoxGeometry(0.32, 0.24, 0.32);
        disposables.push(leftHGeo);
        const leftH = new THREE.Mesh(leftHGeo, cactusGreenMat);
        leftH.position.set(-0.3, h * 0.48, 0);
        leftH.castShadow = true;
        sub.add(leftH);

        const leftVGeo = new THREE.BoxGeometry(0.24, 0.54, 0.28);
        disposables.push(leftVGeo);
        const leftV = new THREE.Mesh(leftVGeo, cactusGreenMat);
        leftV.position.set(-0.44, h * 0.48 + 0.26, 0);
        leftV.castShadow = true;
        sub.add(leftV);

        // Right Arm (branch turning 90deg upward, slightly higher)
        const rightHGeo = new THREE.BoxGeometry(0.32, 0.24, 0.32);
        disposables.push(rightHGeo);
        const rightH = new THREE.Mesh(rightHGeo, cactusGreenMat);
        rightH.position.set(0.3, h * 0.62, 0);
        rightH.castShadow = true;
        sub.add(rightH);

        const rightVGeo = new THREE.BoxGeometry(0.24, 0.48, 0.28);
        disposables.push(rightVGeo);
        const rightV = new THREE.Mesh(rightVGeo, cactusGreenMat);
        rightV.position.set(0.44, h * 0.62 + 0.24, 0);
        rightV.castShadow = true;
        sub.add(rightV);

        // Purple neon base aura disk (matching screenshot neon glow)
        const auraGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16);
        disposables.push(auraGeo);
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0xff47b3,
          transparent: true,
          opacity: 0.65,
        });
        disposables.push(auraMat);
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 0.02;
        sub.add(aura);

        return sub;
      };

      if (!isCluster) {
        grp.add(makeStem(1.45, 0));
      } else {
        grp.add(makeStem(1.5, -0.32));
        grp.add(makeStem(1.15, 0.32));
      }

      return grp;
    };

    // --- 3D STONE BLOCK BUILDER ---
    const buildStoneBlock = () => {
      const grp = new THREE.Group();
      const stoneGeo = new THREE.BoxGeometry(0.85, 0.65, 0.65);
      disposables.push(stoneGeo);
      const stone = new THREE.Mesh(stoneGeo, stoneBlockMat);
      stone.position.y = 0.325;
      stone.castShadow = true;
      stone.receiveShadow = true;
      grp.add(stone);

      // Crack lines on stone block
      const crackEdges = new THREE.EdgesGeometry(stoneGeo);
      disposables.push(crackEdges);
      const crackMat = new THREE.LineBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.7 });
      disposables.push(crackMat);
      const lines = new THREE.LineSegments(crackEdges, crackMat);
      lines.position.y = 0.325;
      grp.add(lines);

      return grp;
    };

    // --- 3D PTERODACTYL (DUCKING/HIGH JUMP OBSTACLE) ---
    const buildPtero = () => {
      const grp = new THREE.Group();
      const pteroMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0x881337,
        emissiveIntensity: 0.5,
        roughness: 0.3,
      });
      disposables.push(pteroMat);

      const pteroBodyGeo = new THREE.BoxGeometry(0.55, 0.22, 0.28);
      disposables.push(pteroBodyGeo);
      const pBody = new THREE.Mesh(pteroBodyGeo, pteroMat);
      pBody.castShadow = true;
      grp.add(pBody);

      // Beak
      const beakGeo = new THREE.ConeGeometry(0.14, 0.45, 4);
      disposables.push(beakGeo);
      const beak = new THREE.Mesh(beakGeo, new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      disposables.push(beak.material as THREE.Material);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.45, 0, 0);
      grp.add(beak);

      // Flapping Wings
      const wingGeo = new THREE.BoxGeometry(0.3, 0.04, 0.65);
      disposables.push(wingGeo);
      const wingL = new THREE.Mesh(wingGeo, pteroMat);
      wingL.position.set(0, 0.05, 0.42);
      grp.add(wingL);

      const wingR = new THREE.Mesh(wingGeo, pteroMat);
      wingR.position.set(0, 0.05, -0.42);
      grp.add(wingR);

      return { grp, wingL, wingR };
    };

    // --- 3D GOLD COIN BUILDER (VIBRANT ARCADE COIN WITH HALO & TWINKLE) ---
    const buildCoin = () => {
      const grp = new THREE.Group();

      // Main 3D coin cylinder (radiant gold)
      const coinGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.1, 24);
      disposables.push(coinGeo);
      const coin = new THREE.Mesh(coinGeo, goldCoinMat);
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;
      grp.add(coin);

      // Dark golden outer bevel rim
      const rimGeo = new THREE.TorusGeometry(0.34, 0.035, 8, 24);
      disposables.push(rimGeo);
      const rim = new THREE.Mesh(rimGeo, coinEdgeMat);
      grp.add(rim);

      // Embossed Diamond / Star on front & back faces
      const starGeo = new THREE.BoxGeometry(0.14, 0.14, 0.12);
      disposables.push(starGeo);
      const star = new THREE.Mesh(starGeo, coinStarMat);
      star.rotation.z = Math.PI / 4;
      grp.add(star);

      // Radiant glowing neon halo (additive blending)
      const haloGeo = new THREE.RingGeometry(0.36, 0.58, 24);
      disposables.push(haloGeo);
      const halo = new THREE.Mesh(haloGeo, coinHaloMat);
      grp.add(halo);

      // Twinkling glint sparkle cross on top-right
      const sparkle = new THREE.Group();
      sparkle.position.set(0.24, 0.24, 0.06);
      const spk1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.02), coinSparkleMat);
      const spk2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.02), coinSparkleMat);
      sparkle.add(spk1, spk2);
      disposables.push(spk1.geometry, spk2.geometry);
      grp.add(sparkle);

      return { grp, halo, sparkle };
    };

    // --- 3D RUNWAY & STONE PARAPET ---
    const trackWidth = 3.6;
    const trackLength = 48;
    const trackGeo = new THREE.BoxGeometry(trackLength, 0.8, trackWidth);
    disposables.push(trackGeo);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x1f0b3d,
      roughness: 0.7,
      metalness: 0.15,
    });
    disposables.push(trackMat);
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.position.set(4, -0.4, 0);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // Glowing Neon Magenta Parapet Rail (top edge facing camera)
    const neonRailGeo = new THREE.BoxGeometry(trackLength, 0.08, 0.14);
    disposables.push(neonRailGeo);
    const neonRailMat = new THREE.MeshStandardMaterial({
      color: 0xff47b3,
      emissive: 0xff2e93,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    disposables.push(neonRailMat);
    const neonRail = new THREE.Mesh(neonRailGeo, neonRailMat);
    neonRail.position.set(4, 0.02, 1.76);
    scene.add(neonRail);

    // Paver Slabs (Scrolling Grid Markings on the road)
    const slabCount = 14;
    const slabs: THREE.Mesh[] = [];
    const slabGeo = new THREE.BoxGeometry(0.12, 0.02, trackWidth - 0.2);
    disposables.push(slabGeo);
    const slabMat = new THREE.MeshBasicMaterial({ color: 0x581c87, transparent: true, opacity: 0.45 });
    disposables.push(slabMat);
    for (let i = 0; i < slabCount; i++) {
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(-6 + i * 3.2, 0.01, 0);
      scene.add(slab);
      slabs.push(slab);
    }

    // --- PARALLAX 3D SCENERY (COLLEGE, SKYLINE & PIXEL CLOUDS) ---
    const sceneryGroup = new THREE.Group();
    sceneryGroup.position.set(0, 0, -4.5);
    scene.add(sceneryGroup);

    // Synthwave Sunset Backdrop Plane
    const skyGeo = new THREE.PlaneGeometry(38, 16);
    disposables.push(skyGeo);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1a0736');
    grad.addColorStop(0.48, '#6b1d8c');
    grad.addColorStop(0.78, '#db2777');
    grad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Distant sun glow
    ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.beginPath();
    ctx.arc(380, 150, 48, 0, Math.PI * 2);
    ctx.fill();

    const skyTex = new THREE.CanvasTexture(canvas);
    disposables.push(skyTex);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
    disposables.push(skyMat);
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(4, 5.5, -9);
    scene.add(skyMesh);

    // 3D Voxel Pixel Clouds
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xfbcfe8,
      transparent: true,
      opacity: 0.72,
    });
    disposables.push(cloudMat);
    const clouds: { mesh: THREE.Group; speed: number }[] = [];

    for (let i = 0; i < 4; i++) {
      const cGrp = new THREE.Group();
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.3), cloudMat);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.3), cloudMat);
      p2.position.set(-0.2, 0.35, 0);
      cGrp.add(p1, p2);
      disposables.push(p1.geometry, p2.geometry);

      cGrp.position.set(-4 + i * 5.5, 4.2 + (i % 2) * 1.1, -6.5);
      scene.add(cGrp);
      clouds.push({ mesh: cGrp, speed: 0.35 + i * 0.12 });
    }

    // 3D Styled College Building ("Оренбургский колледж экономики и информатики")
    const collegeGroup = new THREE.Group();
    collegeGroup.position.set(7, 0.1, -4.2);
    scene.add(collegeGroup);

    // Main 3-story building block
    const bldgGeo = new THREE.BoxGeometry(9.6, 3.8, 1.8);
    disposables.push(bldgGeo);
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x311b58,
      roughness: 0.6,
      metalness: 0.1,
    });
    disposables.push(bldgMat);
    const bldg = new THREE.Mesh(bldgGeo, bldgMat);
    bldg.position.set(0, 1.9, 0);
    collegeGroup.add(bldg);

    // Orange top accent panels (matching real building facade)
    const orangeAccMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x9a3412,
      emissiveIntensity: 0.3,
    });
    disposables.push(orangeAccMat);
    for (let x = -4.2; x <= 4.2; x += 1.4) {
      const pnlGeo = new THREE.BoxGeometry(0.65, 0.4, 0.05);
      disposables.push(pnlGeo);
      const pnl = new THREE.Mesh(pnlGeo, orangeAccMat);
      pnl.position.set(x, 3.4, 0.93);
      collegeGroup.add(pnl);
    }

    // Lit College Windows Grid
    const winGeo = new THREE.BoxGeometry(0.5, 0.42, 0.05);
    disposables.push(winGeo);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    disposables.push(winMat);
    for (let row = 0; row < 3; row++) {
      for (let x = -4.2; x <= 4.2; x += 1.4) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(x, 1.0 + row * 0.95, 0.92);
        collegeGroup.add(win);
      }
    }

    // College Entrance Portico with columns
    const porticoGeo = new THREE.BoxGeometry(3.6, 1.2, 0.8);
    disposables.push(porticoGeo);
    const porticoMat = new THREE.MeshStandardMaterial({
      color: 0x1e123a,
      roughness: 0.4,
    });
    disposables.push(porticoMat);
    const portico = new THREE.Mesh(porticoGeo, porticoMat);
    portico.position.set(0, 0.6, 1.1);
    collegeGroup.add(portico);

    // College Sign Band (Cyan / White Neon)
    const signGeo = new THREE.BoxGeometry(3.4, 0.32, 0.08);
    disposables.push(signGeo);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
    });
    disposables.push(signMat);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.05, 1.54);
    collegeGroup.add(sign);

    // Front Green Trees/Shrubs
    const treeGeo = new THREE.ConeGeometry(0.5, 1.3, 5);
    disposables.push(treeGeo);
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.8,
    });
    disposables.push(treeMat);
    for (const tx of [-3.8, -2.6, 2.6, 3.8]) {
      const tree = new THREE.Mesh(treeGeo, treeMat);
      tree.position.set(tx, 0.65, 1.4);
      collegeGroup.add(tree);
    }

    // --- GAME ENGINE ENTITIES & POOLS ---
    const obstacles: Obstacle3D[] = [];
    const coins: Coin3D[] = [];
    const particles: Particle3D[] = [];
    const particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    disposables.push(particleGeo);

    // Dino Kinematics
    const dinoKinematics = {
      x: -1.4,
      y: 0,
      vy: 0,
      jumpsLeft: 2,
      ducking: false,
      runCycle: 0,
    };

    let worldSpeed = 6.2;
    let distanceTraveled = 0;
    let bonusScore = 0;
    let spawnTimer = 1.4;
    let coinTimer = 0.9;
    let isDead = false;
    let isRunning = false;
    let lastTime = performance.now();

    // Spawn 3D Particles
    const spawnParticles = (x: number, y: number, z: number, color: string, count: number) => {
      const mat = new THREE.MeshBasicMaterial({ color });
      disposables.push(mat);
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(particleGeo, mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        particles.push({
          mesh,
          vx: (Math.random() - 0.5) * 5.5,
          vy: Math.random() * 5.2 + 1.2,
          vz: (Math.random() - 0.5) * 4.2,
          life: 0,
          maxLife: 20 + Math.floor(Math.random() * 12),
          color,
        });
      }
    };

    // Spawn Obstacle
    const spawnObstacle = () => {
      const rand = Math.random();
      let kind: Obstacle3D['kind'] = 'cactus';
      let w = 0.65;
      let h = 1.45;
      let y = 0;
      let grp: THREE.Group;

      let wingL: THREE.Mesh | undefined;
      let wingR: THREE.Mesh | undefined;

      if (rand < 0.42) {
        // Single Saguaro Cactus
        kind = 'cactus';
        w = 0.65;
        h = 1.45;
        grp = buildCactus(false);
      } else if (rand < 0.68) {
        // Double Cactus Cluster
        kind = 'cactus_cluster';
        w = 1.1;
        h = 1.5;
        grp = buildCactus(true);
      } else if (rand < 0.86) {
        // Stone Masonry Block
        kind = 'stone';
        w = 0.85;
        h = 0.65;
        grp = buildStoneBlock();
      } else {
        // Flying Neon Pterodactyl / Rocket (flies at chest/head level: MUST DUCK to slide under!)
        kind = 'ptero';
        w = 0.85;
        h = 0.55;
        y = 1.05; // Raised to 1.05 so standing hits head (1.4m), while ducking (0.7m) glides under with clear headroom!
        const pObj = buildPtero();
        grp = pObj.grp;
        wingL = pObj.wingL;
        wingR = pObj.wingR;
      }

      grp.position.set(13.5, y, 0);
      scene.add(grp);
      obstacles.push({ group: grp, x: 13.5, y, w, h, kind, active: true, wingL, wingR });

      // Cleanse coin spawn collision: if any coin was just at x=13.5, elevate it safely above the new obstacle
      for (const c of coins) {
        if (c.active && Math.abs(c.x - 13.5) < 1.8 && c.y < 1.9) {
          c.y = Math.max(2.25, y + h + 0.65);
          c.mesh.position.y = c.y;
        }
      }
    };

    // Spawn Single Coin
    const spawnSingleCoin = (x: number, y: number) => {
      // Guaranteed safety check: never place a low coin inside or near an obstacle
      const nearObs = obstacles.find((ob) => ob.active && Math.abs(ob.x - x) < 1.6);
      let safeY = y;
      if (nearObs) {
        safeY = Math.max(2.2, nearObs.y + nearObs.h + 0.65);
      }
      const { grp, halo, sparkle } = buildCoin();
      grp.position.set(x, safeY, 0);
      scene.add(grp);
      coins.push({ mesh: grp, halo, sparkle, x, y: safeY, active: true });
    };

    // Spawn Coin Formations (Guaranteed Obstacle-Free on ground, or safely elevated on jump arcs)
    const spawnCoin = () => {
      // Check if an obstacle is currently in or approaching the spawn zone
      const nearObs = obstacles.find((ob) => ob.active && Math.abs(ob.x - 13.5) < 2.6);
      if (nearObs) {
        // Obstacle is present: place a single high reward coin directly at jump apex ABOVE the obstacle
        const safeY = Math.max(2.25, nearObs.y + nearObs.h + 0.65);
        spawnSingleCoin(nearObs.x, safeY);
        return;
      }

      // Ground is completely clear: safe to spawn ground patterns
      const pattern = Math.random();
      if (pattern < 0.45) {
        // Single coin (low or high)
        const high = Math.random() < 0.4;
        spawnSingleCoin(13.5, high ? 1.65 : 0.75);
      } else if (pattern < 0.75) {
        // Line of 3 coins on the ground
        for (let j = 0; j < 3; j++) {
          spawnSingleCoin(13.5 + j * 0.95, 0.75);
        }
      } else {
        // Jump Arc of 3 coins over empty ground
        spawnSingleCoin(13.5, 0.75);
        spawnSingleCoin(14.4, 1.7);
        spawnSingleCoin(15.3, 0.75);
      }
    };

    // Player Actions
    const doJump = () => {
      if (isDead) return;
      if (!isRunning) {
        isRunning = true;
        setGameState('playing');
      }

      if (dinoKinematics.jumpsLeft > 0) {
        const isDouble = dinoKinematics.jumpsLeft === 1;
        dinoKinematics.vy = isDouble ? 11.2 : 12.8;
        dinoKinematics.jumpsLeft -= 1;
        dinoKinematics.ducking = false;
        sfx.jump();

        // Neon jump burst at feet
        spawnParticles(
          dinoKinematics.x,
          dinoKinematics.y + 0.1,
          0,
          isDouble ? '#38bdf8' : '#ff47b3',
          8
        );
      }
    };

    const doDuck = (active: boolean) => {
      if (isDead) return;
      dinoKinematics.ducking = active;
      if (active && dinoKinematics.y > 0.05) {
        // Fast-drop downward
        dinoKinematics.vy = Math.min(dinoKinematics.vy, -16);
      }
    };

    jumpActionRef.current = doJump;
    duckActionRef.current = doDuck;
    startGameRef.current = () => {
      if (isDead) {
        setSessionId((s) => s + 1);
      } else {
        doJump();
      }
    };

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        doJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        doDuck(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        doDuck(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // --- MAIN 60 FPS RENDER LOOP ---
    let rafId = 0;

    const animate = (timestamp: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      // Parallax clouds & college drift
      clouds.forEach((c) => {
        c.mesh.position.x -= c.speed * dt * (isRunning ? 1.5 : 0.5);
        if (c.mesh.position.x < -14) {
          c.mesh.position.x = 18;
        }
      });

      if (isRunning && !isDead) {
        collegeGroup.position.x -= worldSpeed * dt * 0.18;
        if (collegeGroup.position.x < -18) {
          collegeGroup.position.x = 22;
        }

        // Increase speed smoothly and gradually like the classic dino runner
        worldSpeed = Math.min(13.8, 6.2 + Math.sqrt(Math.max(0, distanceTraveled)) * 0.22);
        distanceTraveled += worldSpeed * dt * 3.4;

        const currentScore = Math.floor(distanceTraveled) + bonusScore;
        if (scoreBadgeRef.current) {
          scoreBadgeRef.current.textContent = currentScore.toLocaleString('ru-RU');
        }

        // Road slab scrolling
        slabs.forEach((s) => {
          s.position.x -= worldSpeed * dt;
          if (s.position.x < -12) {
            s.position.x += slabCount * 3.2;
          }
        });

        // Dino Physics
        dinoKinematics.runCycle += dt * (worldSpeed * 1.5);
        dinoKinematics.vy -= 34 * dt;
        dinoKinematics.y += dinoKinematics.vy * dt;

        if (dinoKinematics.y <= 0) {
          dinoKinematics.y = 0;
          dinoKinematics.vy = 0;
          dinoKinematics.jumpsLeft = 2;
        }

        // Update Dino Rig Transforms
        dino.root.position.y = dinoKinematics.y;

        const isGrounded = dinoKinematics.y <= 0.02;
        if (isGrounded) {
          if (dinoKinematics.ducking) {
            // Ducking pose: body lower, head low, sunglasses tilt
            dino.bodyGroup.position.y = -0.32;
            dino.bodyGroup.rotation.z = -0.42;
            dino.legLeft.rotation.z = 0.35;
            dino.legRight.rotation.z = -0.35;
          } else {
            // Running stride animation
            dino.bodyGroup.position.y = Math.abs(Math.sin(dinoKinematics.runCycle * 2)) * 0.08;
            dino.bodyGroup.rotation.z = 0.04;
            dino.headGroup.rotation.z = Math.sin(dinoKinematics.runCycle * 2) * 0.04;
            dino.tailGroup.rotation.z = Math.sin(dinoKinematics.runCycle) * 0.18;
            dino.legLeft.rotation.z = Math.sin(dinoKinematics.runCycle) * 0.72;
            dino.legRight.rotation.z = -Math.sin(dinoKinematics.runCycle) * 0.72;
          }
        } else {
          // In air jumping pose
          dino.bodyGroup.position.y = 0;
          dino.bodyGroup.rotation.z = 0.16;
          dino.legLeft.rotation.z = -0.38;
          dino.legRight.rotation.z = -0.22;
          dino.tailGroup.rotation.z = -0.15;
        }

        // Spawning Obstacles
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnObstacle();
          const minInterval = Math.max(0.85, 2.05 - worldSpeed * 0.08);
          spawnTimer = minInterval + Math.random() * 0.9;
        }

        // Spawning Coins
        coinTimer -= dt;
        if (coinTimer <= 0) {
          spawnCoin();
          coinTimer = 1.2 + Math.random() * 1.6;
        }

        // Collisions: Dino Box
        const dinoH = dinoKinematics.ducking ? 0.7 : 1.4;
        const dinoY = dinoKinematics.y;
        const dinoX = dinoKinematics.x;
        const pad = 0.22;

        // Obstacles Update & Hit Test
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const ob = obstacles[i]!;
          ob.x -= worldSpeed * dt;
          ob.group.position.x = ob.x;

          // Flapping wing animation for flying neon pterodactyl
          if (ob.wingL && ob.wingR) {
            const flap = Math.sin(timestamp * 0.016 + i) * 0.55;
            ob.wingL.rotation.x = flap;
            ob.wingR.rotation.x = -flap;
            ob.group.position.y = ob.y + Math.sin(timestamp * 0.007 + i) * 0.035;
          }

          // Check AABB Box overlap in 3D
          const obL = ob.x - ob.w / 2 + pad;
          const obR = ob.x + ob.w / 2 - pad;
          const obB = ob.y;
          const obT = ob.y + ob.h;

          const dL = dinoX - 0.38 + pad;
          const dR = dinoX + 0.38 - pad;
          const dB = dinoY;
          const dT = dinoY + dinoH;

          if (dR > obL && dL < obR && dT > obB && dB < obT) {
            // Collision Crash!
            isDead = true;
            isRunning = false;
            sfx.hit();

            // Crash explosion of particles
            spawnParticles(dinoX, dinoY + 0.8, 0, '#f43f5e', 22);
            spawnParticles(ob.x, ob.y + 0.5, 0, '#22c55e', 14);

            setScore(currentScore);
            setGameState('gameover');
            onGameOverRef.current(currentScore);
            break;
          }

          if (ob.x < -8) {
            scene.remove(ob.group);
            obstacles.splice(i, 1);
          }
        }

        // Coins Update & Pickup
        for (let i = coins.length - 1; i >= 0; i--) {
          const c = coins[i]!;
          c.x -= worldSpeed * dt;
          c.mesh.position.x = c.x;

          // Energetic 3D spin with subtle tilt that catches specular highlights
          c.mesh.rotation.y += dt * 5.4;
          c.mesh.rotation.z = Math.sin(timestamp * 0.005 + i) * 0.16;
          c.mesh.position.y = c.y + Math.sin(timestamp * 0.007 + i * 1.5) * 0.1;

          // Twinkle sparkle cross spin and pulsation
          c.sparkle.rotation.z += dt * 6.0;
          const twinkle = 0.8 + Math.sin(timestamp * 0.012 + i * 2) * 0.42;
          c.sparkle.scale.set(twinkle, twinkle, twinkle);

          // Pulsing radiant halo
          (c.halo.material as THREE.MeshBasicMaterial).opacity =
            0.4 + Math.sin(timestamp * 0.008 + i) * 0.22;

          // Generous bounding column check so jumping over or through coins reliably collects!
          const inX = Math.abs(c.x - dinoX) < 0.85;
          const inY = c.mesh.position.y >= dinoY - 0.45 && c.mesh.position.y <= dinoY + dinoH + 0.65;
          if (inX && inY) {
            scene.remove(c.mesh);
            coins.splice(i, 1);
            bonusScore += 25;
            setCoinsCount((prev) => {
              const next = prev + 1;
              if (coinsBadgeRef.current) coinsBadgeRef.current.textContent = String(next);
              return next;
            });
            sfx.coin();

            // Rich golden & white sparkle fireworks
            spawnParticles(c.x, c.mesh.position.y, 0, '#fde047', 16);
            spawnParticles(c.x, c.mesh.position.y, 0, '#ffffff', 8);
            continue;
          }

          if (c.x < -8) {
            scene.remove(c.mesh);
            coins.splice(i, 1);
          }
        }
      } else if (!isDead) {
        // Idle running before game starts
        dinoKinematics.runCycle += dt * 8;
        dino.legLeft.rotation.z = Math.sin(dinoKinematics.runCycle) * 0.45;
        dino.legRight.rotation.z = -Math.sin(dinoKinematics.runCycle) * 0.45;
        dino.bodyGroup.position.y = Math.abs(Math.sin(dinoKinematics.runCycle * 2)) * 0.04;
      }

      // Update 3D Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i]!;
        pt.life += 1;
        pt.mesh.position.x += pt.vx * dt;
        pt.mesh.position.y += pt.vy * dt;
        pt.mesh.position.z += pt.vz * dt;
        pt.vy -= 14 * dt;
        pt.mesh.rotation.x += 0.12;
        pt.mesh.rotation.y += 0.15;
        const rem = Math.max(0, 1 - pt.life / pt.maxLife);
        pt.mesh.scale.setScalar(rem);
        if (pt.life >= pt.maxLife) {
          scene.remove(pt.mesh);
          particles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', updateCameraSize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);

      obstacles.forEach((ob) => scene.remove(ob.group));
      coins.forEach((c) => scene.remove(c.mesh));
      particles.forEach((p) => scene.remove(p.mesh));
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [sessionId]);

  const restart = () => {
    setScore(0);
    setCoinsCount(0);
    setGameState('ready');
    setSessionId((s) => s + 1);
  };

  return (
    <div className="relative flex flex-1 w-full h-full flex-col items-center justify-between p-1 sm:p-2 select-none touch-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        onTouchStart={handleViewportTouchStart}
        onTouchMove={handleViewportTouchMove}
        onTouchEnd={handleViewportTouchEnd}
        onTouchCancel={handleViewportTouchEnd}
        onClick={() => {
          if (gameState === 'ready') {
            startGameRef.current();
          } else if (gameState === 'playing') {
            jumpActionRef.current();
          }
        }}
        className="relative flex-1 w-full h-full min-h-[340px] overflow-hidden rounded-2xl cursor-pointer"
      >
        {/* Top-Left Live HUD (Score & Coins) */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
          {/* Live Score */}
          <div className="flex items-center gap-2 rounded-2xl border border-[#ff47b3]/40 bg-[#15062de0] px-3.5 py-1.5 shadow-[0_0_16px_rgba(255,71,179,0.35)] backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-[#ff47b3] animate-pulse" />
            <span className="font-display text-xs font-bold tracking-wider text-fuchsia-200 uppercase">
              СЧЁТ:
            </span>
            <span
              ref={scoreBadgeRef}
              className="font-display text-base font-black italic text-amber-300 tabular-nums sm:text-lg"
            >
              {score.toLocaleString('ru-RU')}
            </span>
          </div>

          {/* Collected Coins Counter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-amber-400/50 bg-[#15062de0] px-3 py-1.5 shadow-[0_0_16px_rgba(251,191,36,0.25)] backdrop-blur-md">
            <div className="h-3.5 w-3.5 rounded-full border border-amber-300 bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span
              ref={coinsBadgeRef}
              className="font-display text-xs font-black italic text-[#fde047] tabular-nums sm:text-sm"
            >
              {coinsCount}
            </span>
          </div>
        </div>

        {/* Top-Right Personal Best Record */}
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-[#15062de0] px-3.5 py-1.5 shadow-[0_0_16px_rgba(251,191,36,0.3)] backdrop-blur-md">
          <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
          <span className="font-display text-xs font-bold tracking-wider text-amber-200/80 uppercase">
            РЕКОРД:
          </span>
          <span className="font-display text-sm font-black italic text-amber-300 tabular-nums">
            {Math.max(bestScore, score).toLocaleString('ru-RU')}
          </span>
        </div>

        {/* Start Game Overlay (Matching User's Mockup) */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 text-center backdrop-blur-[2px] bg-gradient-to-t from-[#14062a]/85 via-transparent to-[#14062a]/60">
            {/* Top Slanted Banner */}
            <div className="pt-4 select-none -rotate-2">
              <h2 className="okei-title-white text-3xl sm:text-5xl drop-shadow-[0_4px_16px_rgba(255,46,147,0.7)]">
                ДИНОЗАВРИК
              </h2>
              <div className="relative mt-1 inline-block">
                <div
                  className="bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#f59e0b] px-5 py-1 shadow-[0_4px_16px_rgba(250,204,21,0.5)]"
                  style={{ clipPath: 'polygon(2% 4%, 98% 0%, 100% 92%, 0% 100%)' }}
                >
                  <span className="font-display block text-xs font-black italic tracking-wider text-[#18072b] uppercase sm:text-sm">
                    ПРЫГАЙ. БЕГИ. УСТАНАВЛИВАЙ РЕКОРД!
                  </span>
                </div>
              </div>
            </div>

            {/* Big Neon Play Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startGameRef.current();
              }}
              className="group relative flex min-h-[58px] min-w-[210px] items-center justify-center gap-3 rounded-full border-2 border-white/60 bg-gradient-to-r from-[#ff2e93] via-[#ec4899] to-[#c026d3] px-8 py-3.5 font-display text-lg font-black italic tracking-wider text-white uppercase shadow-[0_0_32px_rgba(255,46,147,0.85)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="h-6 w-6 fill-current text-white" aria-hidden="true" />
              ИГРАТЬ
            </button>

            {/* Bottom Keyboard & Touch Hint Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-fuchsia-200/90">
              <span className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-950/70 px-2.5 py-1">
                {isTouchDevice ? 'ТАП / СВАЙП ↑ — ПРЫЖОК' : 'ПРОБЕЛ — ПРЫЖОК'}
              </span>
              <span className="rounded-lg border border-indigo-400/40 bg-indigo-950/70 px-2.5 py-1">
                {isTouchDevice ? 'СВАЙП ↓ — ПРИГНУТЬСЯ' : '↓ — ПРИГНУТЬСЯ'}
              </span>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090b14]/90 p-5 text-center backdrop-blur-md">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3.5 py-1 font-display text-xs font-black italic text-amber-300 uppercase shadow-[0_0_18px_rgba(251,191,36,0.45)]">
                <Sparkles className="h-4 w-4" />
                НОВЫЙ РЕКОРД!
              </div>
            )}
            <h2 className="font-display text-3xl font-black italic text-white uppercase sm:text-4xl drop-shadow-[0_2px_12px_rgba(244,63,94,0.6)]">
              СТОЛКНОВЕНИЕ!
            </h2>
            <p className="mt-1.5 text-sm text-fuchsia-200">
              Счёт за забег:{' '}
              <span className="font-display text-lg font-black text-amber-300">
                {score.toLocaleString('ru-RU')}
              </span>{' '}
              • Монеты: <span className="font-bold text-yellow-300">+{coinsCount * 25}</span>
            </p>
            <p className="mt-1 text-xs text-white/55">
              Лучший результат:{' '}
              <span className="font-bold text-amber-300">
                {Math.max(bestScore, score).toLocaleString('ru-RU')}
              </span>
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                restart();
              }}
              className="font-display mt-5 flex min-h-[50px] cursor-pointer items-center gap-2.5 rounded-full bg-gradient-to-r from-[#ff2e93] to-[#7c3aed] px-8 py-3 text-sm font-black italic tracking-wide text-white uppercase shadow-[0_0_26px_rgba(255,46,147,0.65)] transition hover:brightness-110 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ИГРАТЬ СНОВА
            </button>
          </div>
        )}

        {/* Floating Gamepad Controls for Landscape Mobile */}
        {isTouchDevice && isLandscape && gameState === 'playing' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-center justify-between px-3 sm:px-6">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                duckActionRef.current(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                duckActionRef.current(false);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                duckActionRef.current(true);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                duckActionRef.current(false);
              }}
              className="pointer-events-auto flex h-14 w-24 items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-400/80 bg-[#1e0e3d]/90 font-display text-xs font-black italic text-indigo-100 uppercase shadow-[0_0_20px_rgba(99,102,241,0.6)] backdrop-blur-md active:bg-indigo-600 active:scale-95 transition"
            >
              <ArrowDown className="h-4 w-4" />
              НИЗ
            </button>

            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                jumpActionRef.current();
              }}
              onClick={(e) => {
                e.stopPropagation();
                jumpActionRef.current();
              }}
              className="pointer-events-auto flex h-14 w-28 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#ff47b3] bg-gradient-to-r from-[#ff2e93]/90 to-[#c026d3]/90 font-display text-xs font-black italic text-white uppercase shadow-[0_0_24px_rgba(255,46,147,0.8)] backdrop-blur-md active:scale-95 transition"
            >
              <ArrowUp className="h-4 w-4" />
              ПРЫЖОК
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls for Portrait Mode */}
      {isTouchDevice && !isLandscape && gameState === 'playing' && (
        <div className="mt-2 flex w-full max-w-[440px] items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              duckActionRef.current(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              duckActionRef.current(false);
            }}
            onMouseDown={() => duckActionRef.current(true)}
            onMouseUp={() => duckActionRef.current(false)}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-400/60 bg-[#1e0e3d]/90 font-display text-xs font-black italic text-indigo-100 uppercase shadow-[0_0_14px_rgba(99,102,241,0.35)] active:bg-indigo-600 active:text-white transition"
          >
            <ArrowDown className="h-4 w-4" />
            ПРИГНУТЬСЯ
          </button>

          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              jumpActionRef.current();
            }}
            onClick={() => jumpActionRef.current()}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#ff47b3]/70 bg-gradient-to-r from-[#ff2e93] to-[#c026d3] font-display text-xs font-black italic text-white uppercase shadow-[0_0_18px_rgba(255,46,147,0.55)] active:scale-95 transition"
          >
            <ArrowUp className="h-4 w-4" />
            ПРЫЖОК
          </button>
        </div>
      )}
    </div>
  );
};
