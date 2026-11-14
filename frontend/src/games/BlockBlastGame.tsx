import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { sfx } from '../lib/sound';

interface BlockBlastGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

interface Piece {
  id: string;
  cells: [number, number][]; // [row, col]
  color: string;
  rows: number;
  cols: number;
}

interface PlacedAnim {
  scale: number;
  color: string;
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const GRID_SIZE = 8;
const CELL_PITCH = 1.08;
const BOARD_SPAN = GRID_SIZE * CELL_PITCH;
const HALF_SPAN = BOARD_SPAN / 2;

const COLORS = [
  '#facc15', // yellow
  '#38bdf8', // cyan
  '#6366f1', // indigo
  '#22c55e', // emerald
  '#fb923c', // orange
  '#f43f5e', // rose
  '#c084fc', // purple
];

const SHAPES: [number, number][][] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
];

function createRandomPiece(seq: number): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
  const rows = Math.max(...shape.map((c) => c[0])) + 1;
  const cols = Math.max(...shape.map((c) => c[1])) + 1;
  return { id: `${seq}-${Math.random()}`, cells: shape, color, rows, cols };
}

function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null));
}

function canPlace(grid: (string | null)[][], piece: Piece, r0: number, c0: number): boolean {
  for (const [dr, dc] of piece.cells) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r]?.[c] !== null) return false;
  }
  return true;
}

function anyPlacementExists(grid: (string | null)[][], tray: (Piece | null)[]): boolean {
  for (const p of tray) {
    if (!p) continue;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(grid, p, r, c)) return true;
      }
    }
  }
  return false;
}

function cellToWorld(r: number, c: number): { x: number; z: number } {
  return {
    x: (c - (GRID_SIZE - 1) / 2) * CELL_PITCH,
    z: (r - (GRID_SIZE - 1) / 2) * CELL_PITCH,
  };
}

export const BlockBlastGame: React.FC<BlockBlastGameProps> = ({
  onGameOver,
  bestScore,
  isNewRecord,
}) => {
  const [grid, setGrid] = useState<(string | null)[][]>(createEmptyGrid);
  const [tray, setTray] = useState<(Piece | null)[]>(() => [
    createRandomPiece(1),
    createRandomPiece(2),
    createRandomPiece(3),
  ]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const [selectedTrayIdx, setSelectedTrayIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{
    trayIndex: number;
    piece: Piece;
    x: number;
    y: number;
    pointerType: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ r: number; c: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(4);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // Shared Three.js state ref so React updates sync smoothly at 60fps without recreating the scene
  const sceneBridgeRef = useRef<{
    grid: (string | null)[][];
    anims: (PlacedAnim | null)[][];
    previewSet: Set<string>;
    previewColor: string | null;
    clearRows: Set<number>;
    clearCols: Set<number>;
    invalidHoverSet: Set<string>;
    raycastAt: (
      clientX: number,
      clientY: number,
      piece: Piece,
      pointerType: string,
      isTap?: boolean
    ) => { r: number; c: number } | null;
    spawnBurst: (cells: { r: number; c: number; color: string }[]) => void;
  }>({
    grid: createEmptyGrid(),
    anims: Array.from({ length: GRID_SIZE }, () => Array<PlacedAnim | null>(GRID_SIZE).fill(null)),
    previewSet: new Set(),
    previewColor: null,
    clearRows: new Set(),
    clearCols: new Set(),
    invalidHoverSet: new Set(),
    raycastAt: () => null,
    spawnBurst: () => {},
  });

  const activePiece = dragging?.piece ?? (selectedTrayIdx !== null ? tray[selectedTrayIdx] ?? null : null);

  const previewInfo = useMemo(() => {
    if (!activePiece || !hoverAnchor) return null;
    const valid = canPlace(grid, activePiece, hoverAnchor.r, hoverAnchor.c);
    if (!valid) {
      const invalidSet = new Set<string>();
      for (const [dr, dc] of activePiece.cells) {
        const r = hoverAnchor.r + dr;
        const c = hoverAnchor.c + dc;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          invalidSet.add(`${r},${c}`);
        }
      }
      return { valid: false as const, invalidSet };
    }

    const previewSet = new Set<string>();
    const testGrid = grid.map((row) => [...row]);
    for (const [dr, dc] of activePiece.cells) {
      const r = hoverAnchor.r + dr;
      const c = hoverAnchor.c + dc;
      previewSet.add(`${r},${c}`);
      testGrid[r]![c] = activePiece.color;
    }

    const clearRows = new Set<number>();
    const clearCols = new Set<number>();
    for (let r = 0; r < GRID_SIZE; r++) {
      if (testGrid[r]!.every((cell) => cell !== null)) clearRows.add(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (testGrid[r]![c] === null) {
          full = false;
          break;
        }
      }
      if (full) clearCols.add(c);
    }

    return { valid: true as const, previewSet, clearRows, clearCols, color: activePiece.color };
  }, [activePiece, hoverAnchor, grid]);

  // Sync preview highlights into the 3D scene bridge
  useEffect(() => {
    const bridge = sceneBridgeRef.current;
    bridge.grid = grid;
    if (previewInfo?.valid) {
      bridge.previewSet = previewInfo.previewSet;
      bridge.previewColor = previewInfo.color;
      bridge.clearRows = previewInfo.clearRows;
      bridge.clearCols = previewInfo.clearCols;
      bridge.invalidHoverSet = new Set();
    } else if (previewInfo && !previewInfo.valid) {
      bridge.previewSet = new Set();
      bridge.previewColor = null;
      bridge.clearRows = new Set();
      bridge.clearCols = new Set();
      bridge.invalidHoverSet = previewInfo.invalidSet;
    } else {
      bridge.previewSet = new Set();
      bridge.previewColor = null;
      bridge.clearRows = new Set();
      bridge.clearCols = new Set();
      bridge.invalidHoverSet = new Set();
    }
  }, [grid, previewInfo]);

  // Initialize 3D Three.js Arena
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e1a);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
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
      const w = Math.max(Math.round(rect.width), 280);
      const h = Math.max(Math.round(rect.height), 240);
      const aspect = w / h;
      camera.aspect = aspect;
      // Straighter, less steep 3D camera angle (~10-11 degrees tilt instead of 35 degrees)
      // makes the 8x8 grid look clean, square, and easy to place blocks on, while retaining 3D block bevels
      const fitScale = aspect < 1.1 ? Math.min(1.68, 1.12 / Math.max(aspect, 0.56)) : 1.0;
      camera.position.set(0, 15.2 * fitScale, 2.6 * fitScale);
      camera.lookAt(0, 0, 0.15);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      // updateStyle=false prevents Three.js from setting inline px height that causes layout feedback loops
      renderer.setSize(w, h, false);
    };

    updateCameraSize();
    window.addEventListener('resize', updateCameraSize);
    const ro = new ResizeObserver(updateCameraSize);
    ro.observe(container);

    // Lighting matching 3D Snake cyber-arcade style
    const ambLight = new THREE.AmbientLight(0xdbeafe, 0.9);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(7, 16, 9);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 35;
    dirLight.shadow.camera.left = -7;
    dirLight.shadow.camera.right = 7;
    dirLight.shadow.camera.top = 7;
    dirLight.shadow.camera.bottom = -7;
    scene.add(dirLight);

    const rimPink = new THREE.PointLight(0xff2e93, 2.2, 22);
    rimPink.position.set(-6, 4, -5);
    scene.add(rimPink);

    const rimCyan = new THREE.PointLight(0x38bdf8, 2.0, 22);
    rimCyan.position.set(6, 4, 6);
    scene.add(rimCyan);

    // 3D Base Platform
    const baseGeo = new THREE.BoxGeometry(BOARD_SPAN + 0.8, 0.65, BOARD_SPAN + 0.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x161336,
      roughness: 0.6,
      metalness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.36;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Neon platform edge frame
    const frameEdges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(BOARD_SPAN + 0.82, 0.67, BOARD_SPAN + 0.82)
    );
    const frameMat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.75 });
    const frameLines = new THREE.LineSegments(frameEdges, frameMat);
    frameLines.position.copy(baseMesh.position);
    scene.add(frameLines);

    // Subtle cyber outer grid floor
    const bgGrid = new THREE.GridHelper(32, 32, 0x312e81, 0x1a1742);
    bgGrid.position.y = -0.7;
    scene.add(bgGrid);

    // Recessed 8x8 tile pads
    const tileGeo = new THREE.BoxGeometry(0.95, 0.08, 0.95);
    const tileMeshes: THREE.Mesh[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const rowMeshes: THREE.Mesh[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const isChecker = (r + c) % 2 === 0;
        const mat = new THREE.MeshStandardMaterial({
          color: isChecker ? 0x201c4a : 0x19163d,
          roughness: 0.75,
          metalness: 0.15,
        });
        const tile = new THREE.Mesh(tileGeo, mat);
        const { x, z } = cellToWorld(r, c);
        tile.position.set(x, -0.02, z);
        tile.receiveShadow = true;
        scene.add(tile);
        rowMeshes.push(tile);
      }
      tileMeshes.push(rowMeshes);
    }

    // Placed 3D Block Meshes (one pooled 3D cube + top bevel highlight per cell)
    const blockGeo = new THREE.BoxGeometry(0.9, 0.62, 0.9);
    const blockCapGeo = new THREE.BoxGeometry(0.7, 0.08, 0.7);
    const blockEdgeGeo = new THREE.EdgesGeometry(blockGeo);

    interface CellBlock {
      group: THREE.Group;
      bodyMat: THREE.MeshStandardMaterial;
      capMat: THREE.MeshStandardMaterial;
      edgeMat: THREE.LineBasicMaterial;
    }

    const cellBlocks: CellBlock[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const rowArr: CellBlock[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const grp = new THREE.Group();
        const { x, z } = cellToWorld(r, c);
        grp.position.set(x, 0.32, z);
        grp.visible = false;

        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.28,
          metalness: 0.18,
          emissive: 0x000000,
          emissiveIntensity: 0.22,
        });
        const body = new THREE.Mesh(blockGeo, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        grp.add(body);

        const capMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.18,
          metalness: 0.08,
          emissive: 0xffffff,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.45,
        });
        const cap = new THREE.Mesh(blockCapGeo, capMat);
        cap.position.y = 0.31;
        grp.add(cap);

        const edgeMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.45,
        });
        const edge = new THREE.LineSegments(blockEdgeGeo, edgeMat);
        grp.add(edge);

        scene.add(grp);
        rowArr.push({ group: grp, bodyMat, capMat, edgeMat });
      }
      cellBlocks.push(rowArr);
    }

    // 3D Line-Clear Explosion Particles
    const particles: Particle3D[] = [];
    const particleGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const sharedParticleMats = new Map<string, THREE.MeshStandardMaterial>();

    const spawnBurst = (cells: { r: number; c: number; color: string }[]) => {
      for (const item of cells) {
        const { x, z } = cellToWorld(item.r, item.c);
        let mat = sharedParticleMats.get(item.color);
        if (!mat) {
          mat = new THREE.MeshStandardMaterial({
            color: item.color,
            emissive: item.color,
            emissiveIntensity: 0.75,
            roughness: 0.3,
          });
          sharedParticleMats.set(item.color, mat);
        }
        for (let i = 0; i < 4; i++) {
          const mesh = new THREE.Mesh(particleGeo, mat);
          mesh.position.set(
            x + (Math.random() - 0.5) * 0.4,
            0.35 + Math.random() * 0.25,
            z + (Math.random() - 0.5) * 0.4
          );
          scene.add(mesh);
          particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 0.18,
            vy: 0.14 + Math.random() * 0.16,
            vz: (Math.random() - 0.5) * 0.18,
            life: 0,
            maxLife: 24 + Math.floor(Math.random() * 14),
          });
        }
      }
    };

    // Raycaster projecting screen pointer onto y = 0.2 plane
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15);
    const hitPoint = new THREE.Vector3();

    const raycastAt = (
      clientX: number,
      clientY: number,
      piece: Piece,
      pointerType: string,
      isTap = false
    ): { r: number; c: number } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      // When dragging on touch, lift target upward so thumb does not obscure target placement
      // On direct tap, keep lift 0 so the tapped cell is exactly hit
      const liftPx = isTap ? 0 : pointerType === 'touch' ? 54 : 6;
      const sx = clientX;
      const sy = clientY - liftPx;

      ndc.x = ((sx - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((sy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(boardPlane, hitPoint);
      if (!hit) return null;

      // Generous bounds check around 3D platform
      if (Math.abs(hitPoint.x) > HALF_SPAN + 1.6 || Math.abs(hitPoint.z) > HALF_SPAN + 1.6) {
        return null;
      }

      // Align piece center to the hit point
      const centerColOffset = (piece.cols - 1) / 2;
      const centerRowOffset = (piece.rows - 1) / 2;

      const rawC = hitPoint.x / CELL_PITCH + (GRID_SIZE - 1) / 2 - centerColOffset;
      const rawR = hitPoint.z / CELL_PITCH + (GRID_SIZE - 1) / 2 - centerRowOffset;

      const baseC = Math.round(rawC);
      const baseR = Math.round(rawR);

      const currentGrid = sceneBridgeRef.current.grid;

      // 1. Exact snap check
      if (canPlace(currentGrid, piece, baseR, baseC)) {
        return { r: baseR, c: baseC };
      }

      // 2. Magnetic snapping to closest valid neighbor within forgiving radius (~0.95 pitch)
      let bestCandidate: { r: number; c: number } | null = null;
      let minDistanceSq = 0.95 * 0.95;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const candR = baseR + dr;
          const candC = baseC + dc;
          if (canPlace(currentGrid, piece, candR, candC)) {
            const dSq = (rawR - candR) ** 2 + (rawC - candC) ** 2;
            if (dSq < minDistanceSq) {
              minDistanceSq = dSq;
              bestCandidate = { r: candR, c: candC };
            }
          }
        }
      }

      if (bestCandidate) {
        return bestCandidate;
      }

      // If no valid snap found, return base coordinate if within bounds to show red invalid preview
      if (baseR >= -1 && baseC >= -1 && baseR < GRID_SIZE && baseC < GRID_SIZE) {
        return { r: baseR, c: baseC };
      }

      return null;
    };

    sceneBridgeRef.current.raycastAt = raycastAt;
    sceneBridgeRef.current.spawnBurst = spawnBurst;

    let rafId = 0;
    let time = 0;
    const tmpColor = new THREE.Color();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time += 0.05;
      const bridge = sceneBridgeRef.current;

      // Update tiles & 3D blocks
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cellColor = bridge.grid[r]?.[c] ?? null;
          const isGhost = bridge.previewSet.has(`${r},${c}`);
          const willClear = bridge.clearRows.has(r) || bridge.clearCols.has(c);
          const isInvalid = bridge.invalidHoverSet.has(`${r},${c}`);
          const tile = tileMeshes[r]![c]!;
          const tileMat = tile.material as THREE.MeshStandardMaterial;

          if (willClear) {
            tileMat.color.setHex(0xfde047);
            tileMat.emissive.setHex(0xf59e0b);
            tileMat.emissiveIntensity = 0.35 + Math.sin(time * 4) * 0.15;
          } else if (isInvalid) {
            tileMat.color.setHex(0xf43f5e);
            tileMat.emissive.setHex(0xe11d48);
            tileMat.emissiveIntensity = 0.4;
          } else if (isGhost && bridge.previewColor) {
            tmpColor.set(bridge.previewColor);
            tileMat.color.copy(tmpColor).multiplyScalar(0.55);
            tileMat.emissive.copy(tmpColor);
            tileMat.emissiveIntensity = 0.25;
          } else {
            const isChecker = (r + c) % 2 === 0;
            tileMat.color.setHex(isChecker ? 0x201c4a : 0x19163d);
            tileMat.emissive.setHex(0x000000);
            tileMat.emissiveIntensity = 0;
          }

          const block = cellBlocks[r]![c]!;
          const anim = bridge.anims[r]?.[c] ?? null;

          if (cellColor) {
            block.group.visible = true;
            block.bodyMat.color.set(cellColor);
            block.bodyMat.emissive.set(willClear ? '#ffffff' : cellColor);
            block.bodyMat.emissiveIntensity = willClear ? 0.55 + Math.sin(time * 5) * 0.2 : 0.2;
            block.bodyMat.transparent = false;
            block.bodyMat.opacity = 1;
            block.capMat.opacity = 0.45;
            block.edgeMat.color.setHex(willClear ? 0xfef08a : 0xffffff);
            block.edgeMat.opacity = willClear ? 0.95 : 0.45;

            let s = 1;
            if (anim && anim.scale < 1) {
              anim.scale = Math.min(1, anim.scale + 0.16);
              s = anim.scale;
            }
            const clearPulse = willClear ? 1.07 + Math.sin(time * 6) * 0.04 : 1.0;
            block.group.scale.set(s * clearPulse, s * clearPulse, s * clearPulse);
            block.group.position.y = 0.32 * s;
          } else if (isGhost && bridge.previewColor) {
            block.group.visible = true;
            block.bodyMat.color.set(bridge.previewColor);
            block.bodyMat.emissive.set(bridge.previewColor);
            block.bodyMat.emissiveIntensity = 0.45;
            block.bodyMat.transparent = true;
            block.bodyMat.opacity = 0.65;
            block.capMat.opacity = 0.3;
            block.edgeMat.color.setHex(0xffffff);
            block.edgeMat.opacity = 0.85;
            const hoverBob = 0.38 + Math.sin(time * 2.8) * 0.04;
            block.group.scale.set(0.95, 0.95, 0.95);
            block.group.position.y = hoverBob;
          } else {
            block.group.visible = false;
          }
        }
      }

      // Animate 3D clear particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life += 1;
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        p.vy -= 0.012;
        p.mesh.rotation.x += 0.14;
        p.mesh.rotation.y += 0.16;
        const remain = Math.max(0, 1 - p.life / p.maxLife);
        p.mesh.scale.setScalar(remain);
        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', updateCameraSize);

      particles.forEach((p) => scene.remove(p.mesh));
      bgGrid.geometry.dispose();
      if (Array.isArray(bgGrid.material)) {
        bgGrid.material.forEach((m) => m.dispose());
      } else {
        bgGrid.material.dispose();
      }
      baseGeo.dispose();
      baseMat.dispose();
      frameEdges.dispose();
      frameMat.dispose();
      tileGeo.dispose();
      tileMeshes.flat().forEach((m) => (m.material as THREE.Material).dispose());
      blockGeo.dispose();
      blockCapGeo.dispose();
      blockEdgeGeo.dispose();
      cellBlocks.flat().forEach((b) => {
        b.bodyMat.dispose();
        b.capMat.dispose();
        b.edgeMat.dispose();
      });
      particleGeo.dispose();
      sharedParticleMats.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  const commitDrop = useCallback(
    (trayIndex: number, piece: Piece, anchor: { r: number; c: number } | null): boolean => {
      if (!anchor || !canPlace(grid, piece, anchor.r, anchor.c)) return false;

      const nextGrid = grid.map((row) => [...row]);
      for (const [dr, dc] of piece.cells) {
        const r = anchor.r + dr;
        const c = anchor.c + dc;
        nextGrid[r]![c] = piece.color;
        sceneBridgeRef.current.anims[r]![c] = { scale: 0.25, color: piece.color };
      }

      const fullRows: number[] = [];
      const fullCols: number[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        if (nextGrid[r]!.every((cell) => cell !== null)) fullRows.push(r);
      }
      for (let c = 0; c < GRID_SIZE; c++) {
        if (nextGrid.every((row) => row[c] !== null)) fullCols.push(c);
      }

      const clearedCells: { r: number; c: number; color: string }[] = [];
      const seenCleared = new Set<string>();

      for (const r of fullRows) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const clr = nextGrid[r]![c];
          if (clr && !seenCleared.has(`${r},${c}`)) {
            seenCleared.add(`${r},${c}`);
            clearedCells.push({ r, c, color: clr });
          }
          nextGrid[r]![c] = null;
          sceneBridgeRef.current.anims[r]![c] = null;
        }
      }
      for (const c of fullCols) {
        for (let r = 0; r < GRID_SIZE; r++) {
          const clr = nextGrid[r]![c];
          if (clr && !seenCleared.has(`${r},${c}`)) {
            seenCleared.add(`${r},${c}`);
            clearedCells.push({ r, c, color: clr });
          }
          nextGrid[r]![c] = null;
          sceneBridgeRef.current.anims[r]![c] = null;
        }
      }

      if (clearedCells.length > 0) {
        sceneBridgeRef.current.spawnBurst(clearedCells);
      }

      const lines = fullRows.length + fullCols.length;
      const nextCombo = lines > 0 ? combo + 1 : 0;
      const gained = piece.cells.length * 10 + (lines > 0 ? lines * 80 * nextCombo : 0);
      const nextScore = score + gained;

      if (lines > 0) {
        sfx.clear();
        setBanner(
          lines > 1 || nextCombo > 1
            ? `КОМБО ×${Math.max(lines, nextCombo)}! +${gained}`
            : `ЛИНИЯ! +${gained}`
        );
        window.setTimeout(() => setBanner(null), 1100);
      } else {
        sfx.coin();
      }

      let nextTray = tray.map((item, idx) => (idx === trayIndex ? null : item));
      if (nextTray.every((item) => item === null)) {
        nextTray = [
          createRandomPiece(seqRef.current++),
          createRandomPiece(seqRef.current++),
          createRandomPiece(seqRef.current++),
        ];
      }

      setGrid(nextGrid);
      setTray(nextTray);
      setScore(nextScore);
      setCombo(nextCombo);
      setSelectedTrayIdx(null);
      setHoverAnchor(null);

      if (!anyPlacementExists(nextGrid, nextTray)) {
        sfx.hit();
        setGameOver(true);
        onGameOverRef.current(nextScore);
      }
      return true;
    },
    [grid, combo, score, tray]
  );

  // Dragging pointer handlers
  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragging.startX, e.clientY - dragging.startY);
      setDragging((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX,
              y: e.clientY,
              moved: prev.moved || dist > 8,
            }
          : null
      );
      setHoverAnchor(
        sceneBridgeRef.current.raycastAt(e.clientX, e.clientY, dragging.piece, e.pointerType)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      const anchor = sceneBridgeRef.current.raycastAt(
        e.clientX,
        e.clientY,
        dragging.piece,
        e.pointerType
      );
      // Fallback: if release coordinates shifted slightly or jittered, but hoverAnchor was valid,
      // snap directly to the previewed spot!
      const targetAnchor =
        anchor && canPlace(grid, dragging.piece, anchor.r, anchor.c)
          ? anchor
          : hoverAnchor && canPlace(grid, dragging.piece, hoverAnchor.r, hoverAnchor.c)
          ? hoverAnchor
          : anchor;

      const placed = targetAnchor ? commitDrop(dragging.trayIndex, dragging.piece, targetAnchor) : false;

      // Support tap-to-select on mobile/desktop if user tapped tray piece without dragging
      if (!placed && !dragging.moved) {
        setSelectedTrayIdx((curr) => (curr === dragging.trayIndex ? null : dragging.trayIndex));
      }

      setDragging(null);
      setHoverAnchor(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragging, hoverAnchor, grid, commitDrop]);

  const restart = () => {
    sceneBridgeRef.current.anims = Array.from({ length: GRID_SIZE }, () =>
      Array<PlacedAnim | null>(GRID_SIZE).fill(null)
    );
    setGrid(createEmptyGrid());
    setTray([
      createRandomPiece(seqRef.current++),
      createRandomPiece(seqRef.current++),
      createRandomPiece(seqRef.current++),
    ]);
    setScore(0);
    setCombo(0);
    setSelectedTrayIdx(null);
    setHoverAnchor(null);
    setGameOver(false);
    setBanner(null);
  };

  return (
    <div className="relative flex flex-1 w-full flex-col items-center justify-between gap-2.5 p-2 sm:p-3 touch-none select-none">
      {/* 3D WebGL Board Canvas */}
      <div
        ref={containerRef}
        onPointerMove={(e) => {
          if (dragging || selectedTrayIdx === null) return;
          const piece = tray[selectedTrayIdx];
          if (!piece) return;
          setHoverAnchor(sceneBridgeRef.current.raycastAt(e.clientX, e.clientY, piece, e.pointerType, true));
        }}
        onPointerLeave={() => {
          if (!dragging) setHoverAnchor(null);
        }}
        onPointerDown={(e) => {
          if (dragging || selectedTrayIdx === null) return;
          const piece = tray[selectedTrayIdx];
          if (!piece) return;
          const anchor = sceneBridgeRef.current.raycastAt(e.clientX, e.clientY, piece, e.pointerType, true);
          if (anchor) {
            commitDrop(selectedTrayIdx, piece, anchor);
          }
        }}
        className="relative h-[clamp(270px,56dvh,520px)] w-full overflow-hidden rounded-2xl border border-indigo-400/35 bg-[#0b0e1a] shadow-[0_0_32px_rgba(99,102,241,0.28)] sm:h-[clamp(340px,62dvh,560px)]"
      >
        {/* Top-Left Live Score & Combo HUD */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e111ce0] px-3.5 py-1.5 backdrop-blur-md">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#38bdf8]" />
          <span className="font-display text-xs font-bold tracking-wider text-white/55 uppercase">
            СЧЁТ:
          </span>
          <span className="font-display text-base font-black italic text-amber-300 tabular-nums">
            {score.toLocaleString('ru-RU')}
          </span>
          {combo > 1 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-black text-amber-300">
              <Sparkles className="h-3 w-3" /> ×{combo}
            </span>
          )}
        </div>

        {/* Floating Combo / Clear Banner */}
        {banner && (
          <div className="pointer-events-none absolute inset-x-0 top-14 z-10 text-center">
            <span className="font-display inline-block rounded-full bg-gradient-to-r from-[#ff2e93] to-[#facc15] px-5 py-1.5 text-base font-black italic text-white uppercase shadow-xl sm:text-lg">
              {banner}
            </span>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090b14]/90 p-5 text-center backdrop-blur-md">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Новый рекорд!
              </div>
            )}
            <h2 className="font-display text-2xl font-black italic text-white uppercase sm:text-3xl">
              Нет ходов!
            </h2>
            <p className="mt-1 text-sm text-indigo-200">
              Итого:{' '}
              <span className="font-display text-lg font-black text-amber-300">
                {score.toLocaleString('ru-RU')}
              </span>{' '}
              (Лучший: {Math.max(bestScore, score).toLocaleString('ru-RU')})
            </p>
            <button
              type="button"
              onClick={restart}
              className="font-display mt-5 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#ec4899] px-7 py-2.5 text-sm font-black italic text-white uppercase shadow-[0_0_24px_rgba(236,72,153,0.5)] transition hover:brightness-110 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Заново
            </button>
          </div>
        )}
      </div>

      {/* 3-Piece Tray (Responsive & Touch-Friendly for Mobile + Desktop) */}
      <div className="flex w-full max-w-[460px] items-center justify-around gap-2 rounded-2xl border border-indigo-400/30 bg-[#13082e]/90 px-2.5 py-2.5 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3">
        {tray.map((piece, idx) => {
          const isSelected = selectedTrayIdx === idx && !dragging;
          return (
            <div
              key={idx}
              className={`flex h-20 flex-1 items-center justify-center rounded-xl transition ${
                isSelected
                  ? 'border border-cyan-400/70 bg-cyan-500/15 shadow-[0_0_16px_rgba(56,189,248,0.35)]'
                  : 'border border-transparent'
              }`}
            >
              {piece && dragging?.trayIndex !== idx && (
                <div
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragging({
                      trayIndex: idx,
                      piece,
                      x: e.clientX,
                      y: e.clientY,
                      pointerType: e.pointerType,
                      startX: e.clientX,
                      startY: e.clientY,
                      moved: false,
                    });
                    setHoverAnchor(
                      sceneBridgeRef.current.raycastAt(e.clientX, e.clientY, piece, e.pointerType)
                    );
                  }}
                  className="grid cursor-grab touch-none gap-1 p-2 transition hover:scale-110 active:cursor-grabbing"
                  style={{
                    gridTemplateRows: `repeat(${piece.rows}, 15px)`,
                    gridTemplateColumns: `repeat(${piece.cols}, 15px)`,
                  }}
                >
                  {Array.from({ length: piece.rows }).map((_, r) =>
                    Array.from({ length: piece.cols }).map((__, c) => {
                      const filled = piece.cells.some(([cr, cc]) => cr === r && cc === c);
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="rounded-[4px]"
                          style={{
                            backgroundColor: filled ? piece.color : 'transparent',
                            boxShadow: filled
                              ? `inset 0 2.5px 0 rgba(255,255,255,0.45), inset 0 -2.5px 0 rgba(0,0,0,0.35), 0 0 8px ${piece.color}55`
                              : 'none',
                          }}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Dragging Piece (shown before snapping onto valid 3D board cells) */}
      {dragging && !previewInfo?.valid && (
        <div
          className="pointer-events-none fixed z-50 grid gap-1.5 opacity-90"
          style={{
            left: dragging.x,
            top: dragging.y,
            transform: dragging.pointerType === 'touch' ? 'translate(-50%, -135%)' : 'translate(-50%, -85%)',
            gridTemplateRows: `repeat(${dragging.piece.rows}, 30px)`,
            gridTemplateColumns: `repeat(${dragging.piece.cols}, 30px)`,
          }}
        >
          {Array.from({ length: dragging.piece.rows }).map((_, r) =>
            Array.from({ length: dragging.piece.cols }).map((__, c) => {
              const filled = dragging.piece.cells.some(([cr, cc]) => cr === r && cc === c);
              return (
                <div
                  key={`${r}-${c}`}
                  className="rounded-md"
                  style={{
                    backgroundColor: filled ? dragging.piece.color : 'transparent',
                    boxShadow: filled
                      ? `inset 0 3px 0 rgba(255,255,255,0.45), 0 6px 16px rgba(0,0,0,0.45)`
                      : 'none',
                  }}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
