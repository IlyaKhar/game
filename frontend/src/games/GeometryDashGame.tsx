import React, { useEffect, useRef, useState } from 'react';
import {
  GD_SKIN_PHOTO_1,
  GD_SKIN_PHOTO_2,
  GD_SKIN_PHOTO_3,
  GD_ASSET_IMAGES,
} from './gd_custom_assets';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { sfx } from '../lib/sound';

interface GeometryDashGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

// -------------------------------------------------------------
// 1. CUBE SKINS DEFINITIONS (12 AUTHENTIC ROBTOP SKINS)
// -------------------------------------------------------------
export type FaceType = 'classic' | 'visor' | 'demon' | 'ninja' | 'angry' | 'star' | 'dots';

export interface CubeSkin {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  eyeColor: string;
  borderColor: string;
  faceType: FaceType;
  photoUrl?: string;
}

export const CUBE_SKINS: CubeSkin[] = [
  {
    id: 'utsyshka_og',
    name: 'Саня Ананьев с 2ВБ1',
    primaryColor: '#00f0ff',
    secondaryColor: '#ff2e93',
    eyeColor: '#ffffff',
    borderColor: '#00f0ff',
    faceType: 'classic',
    photoUrl: GD_SKIN_PHOTO_1,
  },
  {
    id: 'utsyshka_curls',
    name: 'Саня Ананьев с 2ВБ1 (2)',
    primaryColor: '#ffe600',
    secondaryColor: '#ff0055',
    eyeColor: '#ffffff',
    borderColor: '#ffe600',
    faceType: 'classic',
    photoUrl: GD_SKIN_PHOTO_2,
  },
  {
    id: 'utsyshka_salam',
    name: 'Саня Ананьев с 2ВБ1 (3)',
    primaryColor: '#3bff3b',
    secondaryColor: '#00f0ff',
    eyeColor: '#ffffff',
    borderColor: '#3bff3b',
    faceType: 'classic',
    photoUrl: GD_SKIN_PHOTO_3,
  },
  {
    id: 'classic',
    name: 'Classic RobTop',
    primaryColor: '#3bff3b',
    secondaryColor: '#ffe600',
    eyeColor: '#000000',
    borderColor: '#052b05',
    faceType: 'classic',
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    primaryColor: '#00f0ff',
    secondaryColor: '#ff2e93',
    eyeColor: '#ffffff',
    borderColor: '#160033',
    faceType: 'visor',
  },
  {
    id: 'gold',
    name: 'Golden Champion',
    primaryColor: '#ffcc00',
    secondaryColor: '#ff7700',
    eyeColor: '#000000',
    borderColor: '#422400',
    faceType: 'classic',
  },
  {
    id: 'demon',
    name: 'Demon Lord',
    primaryColor: '#1a0033',
    secondaryColor: '#ff0055',
    eyeColor: '#ffea00',
    borderColor: '#ff0055',
    faceType: 'demon',
  },
  {
    id: 'electric',
    name: 'Electric Aqua',
    primaryColor: '#0066ff',
    secondaryColor: '#00ffff',
    eyeColor: '#ffffff',
    borderColor: '#001a4d',
    faceType: 'visor',
  },
  {
    id: 'toxic',
    name: 'Toxic Acid',
    primaryColor: '#aaff00',
    secondaryColor: '#225500',
    eyeColor: '#000000',
    borderColor: '#113300',
    faceType: 'angry',
  },
  {
    id: 'magma',
    name: 'Magma Blaze',
    primaryColor: '#ff2200',
    secondaryColor: '#ff8800',
    eyeColor: '#ffee00',
    borderColor: '#4a0000',
    faceType: 'angry',
  },
  {
    id: 'ninja',
    name: 'Shadow Ninja',
    primaryColor: '#121218',
    secondaryColor: '#333344',
    eyeColor: '#ffffff',
    borderColor: '#ffffff',
    faceType: 'ninja',
  },
  {
    id: 'galaxy',
    name: 'Cosmic Star',
    primaryColor: '#5b00cc',
    secondaryColor: '#cc00ff',
    eyeColor: '#ffff55',
    borderColor: '#2b0066',
    faceType: 'star',
  },
  {
    id: 'ice',
    name: 'Ice Crystal',
    primaryColor: '#6fe7ff',
    secondaryColor: '#ffffff',
    eyeColor: '#003366',
    borderColor: '#005588',
    faceType: 'classic',
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    primaryColor: '#aa00cc',
    secondaryColor: '#ffdd00',
    eyeColor: '#000000',
    borderColor: '#440055',
    faceType: 'dots',
  },
  {
    id: 'synth',
    name: 'Sunset Synth',
    primaryColor: '#ff0077',
    secondaryColor: '#7928ca',
    eyeColor: '#00ffff',
    borderColor: '#330022',
    faceType: 'visor',
  },
];

// Helper to render cube face on canvas or preview
// Global image cache for instant canvas rendering
const imageCache: Record<string, HTMLImageElement> = {};

function getImage(url: string): HTMLImageElement | null {
  if (GD_ASSET_IMAGES[url]) {
    const pre = GD_ASSET_IMAGES[url]!;
    if (pre.complete && pre.naturalWidth > 0) return pre;
  }
  if (!imageCache[url]) {
    const img = new Image();
    img.src = url;
    imageCache[url] = img;
  }
  const img = imageCache[url];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

function renderRobTopBillboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  photoUrl: string
) {
  ctx.save();
  // Absolutely stable hanging position - no bobbing, no jerking, completely smooth
  const drawY = y;

  // Outer neon cyber glow
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;

  // Obsidian panel backing
  ctx.fillStyle = '#080119';
  ctx.fillRect(x, drawY, w, h);

  // Gradient neon border
  const borderGrad = ctx.createLinearGradient(x, drawY, x + w, drawY + h);
  borderGrad.addColorStop(0, '#00f0ff');
  borderGrad.addColorStop(0.5, '#ff2e93');
  borderGrad.addColorStop(1, '#ffe600');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(x, drawY, w, h);
  ctx.shadowBlur = 0;

  // Photo artwork filling the entire banner cleanly (NO text, NO caption banner)
  const img = getImage(photoUrl);
  if (img) {
    ctx.drawImage(img, x + 3.5, drawY + 3.5, w - 7, h - 7);
  } else {
    ctx.fillStyle = '#1e0836';
    ctx.fillRect(x + 3.5, drawY + 3.5, w - 7, h - 7);
  }

  // Neon corner brackets
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(x - 2, drawY - 2, 5, 5);
  ctx.fillRect(x + w - 3, drawY - 2, 5, 5);
  ctx.fillRect(x - 2, drawY + h - 3, 5, 5);
  ctx.fillRect(x + w - 3, drawY + h - 3, 5, 5);

  ctx.restore();
}

function renderRobTopPortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  portalType: 'ship' | 'cube' | 'wave',
  time: number
) {
  ctx.save();
  const themeColor = portalType === 'ship' ? '#ff00aa' : portalType === 'wave' ? '#00d4ff' : '#00ff66';
  const glowColor = portalType === 'ship' ? '#ff33bb' : portalType === 'wave' ? '#00f0ff' : '#39ff14';
  const innerBg = portalType === 'ship' ? '#28003a' : portalType === 'wave' ? '#002238' : '#002a15';
  const midX = x + w / 2;
  const midY = y + h / 2;
  const radX = w / 2;
  const radY = h / 2;

  // 1. Ambient Outer Halo Glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 22;

  // 2. Outer Ring Structure (Tall Ellipse / Capsule)
  ctx.fillStyle = '#060112';
  ctx.beginPath();
  ctx.ellipse(midX, midY, radX, radY, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Swirling Vortex Energy Core
  const pulse = Math.sin(time * 0.008) * 0.2 + 0.8;
  const vortexGrad = ctx.createRadialGradient(midX, midY, 4, midX, midY, radY * 0.95);
  vortexGrad.addColorStop(0, '#ffffff');
  vortexGrad.addColorStop(0.3, themeColor);
  vortexGrad.addColorStop(0.7, innerBg);
  vortexGrad.addColorStop(1, '#050010');

  ctx.fillStyle = vortexGrad;
  ctx.beginPath();
  ctx.ellipse(midX, midY, radX - 4, radY - 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Energetic Swirl Waves
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    const shift = (time * 0.003 + i * 0.33) % 1;
    const waveR = Math.max(1, (radX - 6) * (1 - shift));
    const waveH = Math.max(1, (radY - 8) * (1 - shift));
    ctx.strokeStyle = `rgba(255, 255, 255, ${shift * 0.8 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(midX, midY, waveR, waveH, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. Heavy Outer Neon Border
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(midX, midY, radX, radY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 6. Top & Bottom Metallic Emitters
  ctx.fillStyle = '#080119';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2;
  ctx.fillRect(midX - 16, y - 6, 32, 10);
  ctx.strokeRect(midX - 16, y - 6, 32, 10);
  ctx.fillRect(midX - 16, y + h - 4, 32, 10);
  ctx.strokeRect(midX - 16, y + h - 4, 32, 10);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(midX - 8, y - 4, 16, 5);
  ctx.fillRect(midX - 8, y + h - 1, 16, 5);

  // 7. Center Mode Glyph (Ship, Wave or Cube)
  ctx.fillStyle = '#ffffff';
  if (portalType === 'ship') {
    ctx.beginPath();
    ctx.moveTo(midX + 11, midY);
    ctx.lineTo(midX - 8, midY - 10);
    ctx.lineTo(midX - 4, midY);
    ctx.lineTo(midX - 8, midY + 10);
    ctx.closePath();
    ctx.fill();
  } else if (portalType === 'wave') {
    // Sharp Wave Dart Chevron (>)
    ctx.beginPath();
    ctx.moveTo(midX + 10, midY);
    ctx.lineTo(midX - 7, midY - 9);
    ctx.lineTo(midX - 3, midY);
    ctx.lineTo(midX - 7, midY + 9);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(midX - 8, midY - 8, 16, 16);
    ctx.fillStyle = '#060112';
    ctx.fillRect(midX - 5, midY - 5, 10, 10);
  }

  ctx.restore();
}

function renderRobTopWave(
  ctx: CanvasRenderingContext2D,
  skin: CubeSkin,
  angle: number,
  time: number
) {
  ctx.save();
  ctx.rotate(angle);

  const w = 32;
  const h = 20;

  // 1. Ambient Glow
  ctx.shadowColor = skin.borderColor || '#00f0ff';
  ctx.shadowBlur = 12;

  // 2. Base Dart Polygon: tip at (w/2, 0), top at (-w/2, -h/2), notch at (-w/4, 0), bottom at (-w/2, h/2)
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(-w / 2, -h / 2);
  ctx.lineTo(-w / 4, 0);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();

  // Gradient fill
  const dartGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  dartGrad.addColorStop(0, '#100424');
  dartGrad.addColorStop(0.5, skin.primaryColor);
  dartGrad.addColorStop(1, '#080114');
  ctx.fillStyle = dartGrad;
  ctx.fill();

  // Heavy dark border
  ctx.strokeStyle = '#05010e';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 3. Top light-catching facet
  const topFacet = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, 0);
  topFacet.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  topFacet.addColorStop(0.5, skin.secondaryColor);
  topFacet.addColorStop(1, '#ffffff');
  ctx.fillStyle = topFacet;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(-w / 2, -h / 2);
  ctx.lineTo(-w / 4, 0);
  ctx.closePath();
  ctx.fill();

  // Center ridge divider line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-w / 4, 0);
  ctx.lineTo(w / 2, 0);
  ctx.stroke();

  // 4. Center Mini-Icon / Eye Core
  ctx.fillStyle = skin.eyeColor || '#ffffff';
  ctx.beginPath();
  ctx.arc(-2, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // 5. Razor Sharp Tip Glint (Cross Sparkle)
  const pulse = Math.sin(time * 0.01) * 0.3 + 0.7;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(w / 2, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 3, 0);
  ctx.lineTo(w / 2 + 3, 0);
  ctx.moveTo(w / 2, -3);
  ctx.lineTo(w / 2, 3);
  ctx.stroke();

  ctx.restore();
}

function renderRobTopShip(
  ctx: CanvasRenderingContext2D,
  skin: CubeSkin,
  thrusting: boolean,
  time: number
) {
  ctx.save();
  const width = 54;
  const height = 30;
  const halfW = width / 2;
  const halfH = height / 2;

  // 1. Multi-Stage Thruster Exhaust Flame (Animated when holding thrust)
  if (thrusting) {
    const flameLen = 22 + Math.sin(time * 0.04) * 6;
    const flameGrad = ctx.createLinearGradient(-halfW, 4, -halfW - flameLen, 4);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.2, '#fff275');
    flameGrad.addColorStop(0.5, '#ff7700');
    flameGrad.addColorStop(0.85, '#ff0055');
    flameGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');

    ctx.fillStyle = flameGrad;
    ctx.shadowColor = '#ff7700';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(-halfW + 2, -1);
    ctx.lineTo(-halfW - flameLen, 4);
    ctx.lineTo(-halfW + 2, 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Secondary inner white-hot flame core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-halfW + 2, 1);
    ctx.lineTo(-halfW - flameLen * 0.5, 4);
    ctx.lineTo(-halfW + 2, 7);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Rear Engine Titanium Nozzle
  ctx.fillStyle = '#100c1e';
  ctx.strokeStyle = '#05020c';
  ctx.lineWidth = 2;
  ctx.fillRect(-halfW - 4, -1, 7, 10);
  ctx.strokeRect(-halfW - 4, -1, 7, 10);

  // Engine ring highlight
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-halfW - 3, 0, 2, 8);

  // 3. Lower Chassis / Hoverboard Body (Glossy Obsidian & Synthwave Gradient)
  const hullGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
  hullGrad.addColorStop(0, '#160830');
  hullGrad.addColorStop(0.5, skin.primaryColor);
  hullGrad.addColorStop(1, '#0b0218');

  ctx.fillStyle = hullGrad;
  ctx.beginPath();
  ctx.moveTo(-halfW, 4);
  ctx.lineTo(halfW - 8, 8);
  ctx.lineTo(halfW + 7, 0);
  ctx.lineTo(halfW - 4, -6);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-halfW + 4, -8);
  ctx.lineTo(-halfW, -2);
  ctx.closePath();
  ctx.fill();

  // Heavy Outer Dark Contour
  ctx.strokeStyle = '#05010e';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 4. Specular Hull Ridge Shine
  const shineGrad = ctx.createLinearGradient(-halfW + 4, 3, halfW + 4, 0);
  shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  shineGrad.addColorStop(0.5, skin.borderColor || '#00f0ff');
  shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

  ctx.strokeStyle = shineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-halfW + 4, 3);
  ctx.lineTo(halfW - 8, 7);
  ctx.lineTo(halfW + 5, 0);
  ctx.stroke();

  // Side Wing Stabilizer Fin with dual piping
  ctx.fillStyle = skin.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(12, 2);
  ctx.lineTo(2, 8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#05010e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Pilot: Equipped Cube Skin inside Cockpit!
  const pilotSize = 22;
  ctx.save();
  ctx.translate(-2, -7);
  renderCubeFace(ctx, skin, pilotSize);
  ctx.restore();

  // 6. Translucent Windscreen / Cockpit Canopy Glass with Specular Glare
  const canopyGrad = ctx.createLinearGradient(-4, -18, 18, -4);
  canopyGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
  canopyGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
  canopyGrad.addColorStop(1, 'rgba(0, 240, 255, 0.15)');

  ctx.fillStyle = canopyGrad;
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(10, -14);
  ctx.lineTo(20, -3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -5);
  ctx.lineTo(9, -13);
  ctx.stroke();

  ctx.restore();
}

function renderCubeFace(ctx: CanvasRenderingContext2D, skin: CubeSkin, size: number) {
  if (skin.photoUrl) {
    const img = getImage(skin.photoUrl);
    if (img) {
      // 1. Obsidian cyber chassis
      ctx.fillStyle = '#080214';
      ctx.fillRect(-size / 2, -size / 2, size, size);

      // 2. Photo artwork cleanly centered
      const pad = 2.5;
      ctx.drawImage(img, -size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2);

      // 3. Holographic cyber glass glare (diagonal reflection across face)
      const glareGrad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
      glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      glareGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
      glareGrad.addColorStop(1, 'rgba(0, 240, 255, 0.15)');
      ctx.fillStyle = glareGrad;
      ctx.fillRect(-size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2);

      // 4. Outer Neon Cyber Border with Bloom
      ctx.strokeStyle = skin.borderColor || '#00f0ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-size / 2, -size / 2, size, size);

      // 5. Tech corner pins
      ctx.fillStyle = skin.secondaryColor;
      ctx.fillRect(-size / 2, -size / 2, 4.5, 4.5);
      ctx.fillRect(size / 2 - 4.5, -size / 2, 4.5, 4.5);
      ctx.fillRect(-size / 2, size / 2 - 4.5, 4.5, 4.5);
      ctx.fillRect(size / 2 - 4.5, size / 2 - 4.5, 4.5, 4.5);
      return;
    }
  }
  // Outer frame
  ctx.fillStyle = skin.primaryColor;
  ctx.fillRect(-size / 2, -size / 2, size, size);

  ctx.strokeStyle = skin.borderColor;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(-size / 2, -size / 2, size, size);

  // Inner face base
  ctx.fillStyle = skin.secondaryColor;
  ctx.fillRect(-size / 2 + 5, -size / 2 + 5, size - 10, size - 10);

  ctx.fillStyle = skin.eyeColor;

  if (skin.faceType === 'visor') {
    ctx.fillRect(-10, -5, 20, 6);
  } else if (skin.faceType === 'demon') {
    ctx.beginPath();
    ctx.moveTo(-11, -7);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, -1);
    ctx.lineTo(-11, -4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(11, -7);
    ctx.lineTo(4, -4);
    ctx.lineTo(4, -1);
    ctx.lineTo(11, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin.borderColor;
    ctx.fillRect(-14, -size / 2 - 2, 4, 4);
    ctx.fillRect(10, -size / 2 - 2, 4, 4);
  } else if (skin.faceType === 'ninja') {
    ctx.fillStyle = skin.borderColor;
    ctx.fillRect(-size / 2 + 5, -8, size - 10, 8);
    ctx.fillStyle = skin.eyeColor;
    ctx.fillRect(-8, -6, 5, 4);
    ctx.fillRect(3, -6, 5, 4);
  } else if (skin.faceType === 'angry') {
    ctx.fillRect(-10, -6, 6, 6);
    ctx.fillRect(4, -6, 6, 6);
    ctx.fillRect(-10, -9, 8, 3);
    ctx.fillRect(2, -9, 8, 3);
  } else if (skin.faceType === 'star') {
    ctx.fillRect(-8, -6, 5, 5);
    ctx.fillRect(3, -6, 5, 5);
    ctx.fillRect(-2, -1, 4, 3);
  } else if (skin.faceType === 'dots') {
    ctx.fillRect(-8, -5, 4, 4);
    ctx.fillRect(4, -5, 4, 4);
    ctx.fillRect(-5, 3, 10, 2);
  } else {
    // Classic RobTop face
    ctx.fillRect(-3, -5, 7, 7);
    ctx.fillRect(7, -7, 5, 5);
    ctx.fillRect(-12, -7, 5, 5);
  }
}

// -------------------------------------------------------------
// 2. ROBTOP-AUTHENTIC OBSTACLE RENDERERS
// -------------------------------------------------------------

function renderRobTopSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _groundY: number,
  time: number,
  inverted: boolean = false,
  _accentColor: string = '#ff0066'
) {
  ctx.save();
  if (inverted) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(1, -1);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  const apexX = x + w / 2;
  const apexY = y;
  const baseY = y + h;
  const baseLeftX = x;
  const baseRightX = x + w;

  // 1. Heavy Outer Dark Contour
  ctx.strokeStyle = '#050010';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(baseLeftX - 1, baseY);
  ctx.lineTo(apexX, apexY - 1);
  ctx.lineTo(baseRightX + 1, baseY);
  ctx.closePath();
  ctx.stroke();

  // 2. Left Facet (Light-catching crystal slope with synthwave gradient)
  const leftGrad = ctx.createLinearGradient(baseLeftX, baseY, apexX, apexY);
  leftGrad.addColorStop(0, '#220038');
  leftGrad.addColorStop(0.35, '#7a0048');
  leftGrad.addColorStop(0.8, '#ff0066');
  leftGrad.addColorStop(1, '#ff80c0');

  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(baseLeftX, baseY);
  ctx.lineTo(apexX, apexY);
  ctx.lineTo(apexX, baseY);
  ctx.closePath();
  ctx.fill();

  // 3. Right Facet (Deep obsidian ambient occlusion shadow)
  const rightGrad = ctx.createLinearGradient(baseRightX, baseY, apexX, apexY);
  rightGrad.addColorStop(0, '#0a0014');
  rightGrad.addColorStop(0.4, '#36001a');
  rightGrad.addColorStop(0.85, '#8c0032');
  rightGrad.addColorStop(1, '#b80045');

  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(baseRightX, baseY);
  ctx.lineTo(apexX, baseY);
  ctx.closePath();
  ctx.fill();

  // 4. Center Specular Ridge Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(apexX, baseY);
  ctx.stroke();

  // 5. Inner Pulsing Core Hazard Rune (Pulsing with energy)
  const pulse = Math.sin(time * 0.009) * 0.25 + 0.75;
  const innerH = h * 0.44;
  const innerW = w * 0.32;
  ctx.fillStyle = `rgba(255, 46, 147, ${0.45 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY + h * 0.24);
  ctx.lineTo(apexX - innerW / 2, apexY + h * 0.24 + innerH);
  ctx.lineTo(apexX + innerW / 2, apexY + h * 0.24 + innerH);
  ctx.closePath();
  ctx.fill();

  // 6. Base Hazard Plate & Anchoring Teeth
  ctx.fillStyle = '#080116';
  ctx.fillRect(baseLeftX - 2, baseY - 3.5, w + 4, 4.5);
  ctx.fillStyle = '#ff0055';
  ctx.fillRect(baseLeftX + 3, baseY - 3.5, 4, 3.5);
  ctx.fillRect(baseRightX - 7, baseY - 3.5, 4, 3.5);

  // 7. Sharp 4-Point Apex Cross Sparkle (Matching Snake 3D gem glint)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(apexX, apexY + 0.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Cross flares
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(apexX - 4.5, apexY + 0.5);
  ctx.lineTo(apexX + 4.5, apexY + 0.5);
  ctx.moveTo(apexX, apexY - 4);
  ctx.lineTo(apexX, apexY + 5);
  ctx.stroke();

  ctx.restore();
}

function renderRobTopBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  accentColor: string = '#00f0ff'
) {
  ctx.save();

  // 1. Glossy Obsidian Metallic Base (Matches Snake 3D stage cubes)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, '#1c0e3a');
  bgGrad.addColorStop(0.4, '#120726');
  bgGrad.addColorStop(1, '#080214');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 2. Heavy Obsidian Outer Contour
  ctx.strokeStyle = '#05010e';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  // 3. Modular Tiling: each 36px segment gets an authentic techno core
  const cellSize = 36;
  const cols = Math.max(1, Math.round(w / cellSize));
  const cellW = w / cols;

  for (let c = 0; c < cols; c++) {
    const cx = x + c * cellW;
    const cy = y;
    const cw = cellW;
    const ch = h;

    // 3D Metallic Bevel (Light top/left highlight, deep shadow bottom/right)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + ch - 2);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx + cw - 2, cy + 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.moveTo(cx + cw - 2, cy + 2);
    ctx.lineTo(cx + cw - 2, cy + ch - 2);
    ctx.lineTo(cx + 2, cy + ch - 2);
    ctx.stroke();

    // Center Diamond (Iconic RobTop rotated square)
    const midX = cx + cw / 2;
    const midY = cy + ch / 2;
    const dSize = Math.min(cw, ch) * 0.35;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(Math.PI / 4);

    // Diamond Shadow / Cavity
    ctx.fillStyle = '#060012';
    ctx.fillRect(-dSize / 2, -dSize / 2, dSize, dSize);

    // Neon Cyber Core in Diamond
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-dSize / 2, -dSize / 2, dSize, dSize);

    // Inner glowing pulsating energy cell
    const dPulse = Math.sin(time * 0.007 + c * 0.6) * 0.3 + 0.7;
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.5 * dPulse;
    ctx.fillRect(-dSize / 4, -dSize / 4, dSize / 2, dSize / 2);

    // Center white-hot spark in diamond
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9 * dPulse;
    ctx.fillRect(-1, -1, 2, 2);

    ctx.restore();

    // Corner Metallic Chrome Rivets with glints
    const rR = 2.2;
    const offsets: [number, number][] = [
      [cx + 5, cy + 5],
      [cx + cw - 5, cy + 5],
      [cx + 5, cy + ch - 5],
      [cx + cw - 5, cy + ch - 5],
    ];
    for (const offset of offsets) {
      const rx = offset[0];
      const ry = offset[1];
      ctx.fillStyle = '#220e3d';
      ctx.beginPath();
      ctx.arc(rx, ry, rR, 0, Math.PI * 2);
      ctx.fill();

      // Specular pin highlight
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 0.7, ry - 0.7, 1.4, 1.4);
    }

    // Seam Divider between multi-blocks
    if (c > 0) {
      ctx.strokeStyle = '#05010e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + ch);
      ctx.stroke();

      // Neon seam line
      ctx.strokeStyle = `${accentColor}44`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + ch - 4);
      ctx.stroke();
    }
  }

  // 4. TOP LANDING SURFACE HIGHLIGHT (HIGH READABILITY & NEON BLOOM)
  const landingGrad = ctx.createLinearGradient(x, y, x + w, y);
  landingGrad.addColorStop(0, accentColor);
  landingGrad.addColorStop(0.5, '#ffffff');
  landingGrad.addColorStop(1, accentColor);

  ctx.fillStyle = landingGrad;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 12;
  ctx.fillRect(x + 1, y, w - 2, 3.5);
  ctx.shadowBlur = 0;

  // Front Left Danger Edge (Wall collision kill zone hash)
  ctx.fillStyle = 'rgba(255, 46, 147, 0.55)';
  ctx.fillRect(x, y + 4, 3, h - 5);

  ctx.restore();
}

function renderRobTopPad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  groundY: number,
  time: number
) {
  const padY = groundY - y - h;
  ctx.save();

  // Heavy Metallic Base Bracket
  ctx.fillStyle = '#100326';
  ctx.strokeStyle = '#050012';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, padY + h - 5, w, 6, 2);
  ctx.fill();
  ctx.stroke();

  // Yellow/Amber Spring Core Plate
  const springGrad = ctx.createLinearGradient(x, padY, x, padY + h);
  springGrad.addColorStop(0, '#fff475');
  springGrad.addColorStop(0.55, '#ffcc00');
  springGrad.addColorStop(1, '#ff7700');

  ctx.fillStyle = springGrad;
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(x + 2, padY, w - 4, h - 3, [4, 4, 2, 2]);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Outer Neon Outline
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Animated Upward Launch Chevrons (^ ^ ^)
  const chevronCount = 3;
  const midX = x + w / 2;

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < chevronCount; i++) {
    const shift = ((time * 0.008 + i * 0.4) % 1);
    const chevY = padY + h - 6 - shift * (h - 4);
    const alpha = Math.sin(shift * Math.PI);

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.beginPath();
    ctx.moveTo(midX - 7, chevY + 3);
    ctx.lineTo(midX, chevY);
    ctx.lineTo(midX + 7, chevY + 3);
    ctx.stroke();
  }

  // Hovering Energy Spark Above Pad
  const sparkX = midX + Math.sin(time * 0.01) * (w * 0.25);
  const sparkY = padY - 3 - Math.abs(Math.sin(time * 0.015)) * 6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sparkX, sparkY, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderRobTopOrb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  used: boolean = false
) {
  ctx.save();
  if (used) {
    ctx.globalAlpha = 0.35;
  }
  const radius = size / 2;
  const pulse = Math.sin(time * 0.008) * 1.5;
  const r = radius + pulse;

  // 1. Outer Radial Glow Halo
  const haloGrad = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r * 1.6);
  haloGrad.addColorStop(0, 'rgba(255, 230, 0, 0.45)');
  haloGrad.addColorStop(0.5, 'rgba(255, 160, 0, 0.2)');
  haloGrad.addColorStop(1, 'rgba(255, 160, 0, 0)');

  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer Rotating Dashed Orbit Ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.0025);
  ctx.strokeStyle = 'rgba(255, 240, 100, 0.9)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Main Orb Sphere
  const sphereGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  sphereGrad.addColorStop(0, '#ffffff');
  sphereGrad.addColorStop(0.25, '#fff677');
  sphereGrad.addColorStop(0.65, '#ffcc00');
  sphereGrad.addColorStop(1, '#ff6600');

  ctx.fillStyle = sphereGrad;
  ctx.shadowColor = '#ffdd00';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Outer Crisp White Rim
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 4. Inner Ring Core
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // Center White-Hot Spark
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderRobTopCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number
) {
  ctx.save();
  const radius = size / 2;
  const rotPhase = (time * 0.004) % (Math.PI * 2);
  const aspect = Math.cos(rotPhase);
  const rX = Math.max(2, Math.abs(aspect) * radius);
  const rY = radius;

  // Golden Glow
  ctx.shadowColor = '#ffe600';
  ctx.shadowBlur = 16;

  // Outer Rim
  ctx.fillStyle = '#ffaa00';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rX, rY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner Coin Face
  if (rX > 5) {
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rX * 0.8, rY * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center Star Symbol in Coin
    if (rX > 10) {
      ctx.fillStyle = '#996600';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sparkling gleam
  const glintAlpha = Math.max(0, Math.sin(time * 0.008));
  ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha})`;
  ctx.beginPath();
  ctx.arc(cx + rX * 0.4, cy - rY * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderRobTopFinish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  accentColor: string = '#00f0ff'
) {
  ctx.save();

  // Holographic Laser Portal Tower
  const colGrad = ctx.createLinearGradient(x, y, x + w, y);
  colGrad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
  colGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.55)');
  colGrad.addColorStop(1, 'rgba(0, 240, 255, 0.15)');

  ctx.fillStyle = colGrad;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 24;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;

  // Twin Cyber Pillars
  ctx.fillStyle = '#0a031a';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;

  ctx.fillRect(x, y, 8, h);
  ctx.strokeRect(x, y, 8, h);

  ctx.fillRect(x + w - 8, y, 8, h);
  ctx.strokeRect(x + w - 8, y, 8, h);

  // Animated Horizontal Scanning Laser Rings
  const ringCount = 6;
  for (let i = 0; i < ringCount; i++) {
    const shift = (time * 0.0015 + i / ringCount) % 1;
    const ringY = y + shift * h;
    const alpha = Math.sin(shift * Math.PI);

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, ringY);
    ctx.lineTo(x + w - 4, ringY);
    ctx.stroke();
  }

  // Floating Finish Icon / Beacon
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FINISH', x + w / 2, y + 25);

  ctx.restore();
}

export interface PixelVFXParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'shard' | 'smoke' | 'spark' | 'confetti';
  rot?: number;
  vRot?: number;
}

export interface PixelShockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
  thick: number;
}

// -------------------------------------------------------------
// 4. LEVEL & BALANCED ROBTOP PHYSICS CONSTANTS
// -------------------------------------------------------------
export type ObstacleKind = 'spike' | 'block' | 'pad' | 'orb' | 'coin' | 'finish' | 'portal_ship' | 'portal_cube' | 'portal_wave' | 'billboard';

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  coinIndex?: number;
  used?: boolean;
  photoUrl?: string;
  title?: string;
  inverted?: boolean;
}

const RUN_SPEED_1 = 430;      // 1x speed
const RUN_SPEED_2 = 455;      // 1.05x speed
const RUN_SPEED_3 = 480;      // 1.12x speed

const GRAVITY = 2300;         // Arcade crisp gravity
const JUMP_FORCE = -690;      // 2.4 block jump height
const PAD_FORCE = -880;       // 3.8 block jump height
const ORB_FORCE = -770;       // Mid-air orb jump
const CUBE_SIZE = 36;
const GROUND_Y = 365;

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  difficulty: 'easy' | 'normal' | 'hard';
  difficultyStars: number;
  length: number;
  speed: number;
  bpm: number;
  bgHue: number;
  accentColor: string;
  kickPattern: number[];
  bassNotes: number[];
  leadMelody: number[];
  obstacles: Obstacle[];
}

export const LEVELS: LevelConfig[] = [
  // -----------------------------------------------------------
  // LEVEL 1: STEREO MADNESS (EASY, 8,000 PX)
  // -----------------------------------------------------------
  {
    id: 0,
    name: 'STEREO MADNESS',
    subtitle: 'Уровень 1 • Введение в ритм (Easy)',
    difficulty: 'easy',
    difficultyStars: 1,
    length: 8000,
    speed: RUN_SPEED_1,
    bpm: 130,
    bgHue: 200,
    accentColor: '#00f0ff',
    kickPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    bassNotes: [
      110, 110, 110, 110, 87.3, 87.3, 87.3, 87.3,
      130.8, 130.8, 130.8, 130.8, 98, 98, 98, 98,
    ],
    leadMelody: [
      329.6, 0, 329.6, 0, 329.6, 0, 392, 0, 440, 0, 392, 0, 329.6, 0, 293.7, 0,
      261.6, 0, 293.7, 0, 329.6, 0, 329.6, 0, 293.7, 0, 261.6, 0, 220, 0, 0, 0,
    ],
    obstacles: [
      // Section 1: Cube warm-up runway (0% - 30%)
      { x: 600, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1000, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1400, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1800, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1836, y: 0, w: 36, h: 36, kind: 'spike' },

      // Step platforms & Secret Coin 1
      { x: 2150, y: 0, w: 72, h: 36, kind: 'block' },
      { x: 2222, y: 36, w: 72, h: 36, kind: 'block' },
      { x: 2250, y: 105, w: 30, h: 30, kind: 'coin', coinIndex: 0 },

      // ~30%: SHIP PORTAL (Transformation to Flying Board / Rocket Ship)
      { x: 2400, y: 35, w: 44, h: 120, kind: 'portal_ship' },

      // Section 2: Ship Flight Cavern (30% - 64%)
      { x: 2650, y: 0, w: 36, h: 36, kind: 'spike' },
      // Ceiling hanging structure
      { x: 2850, y: 220, w: 120, h: 40, kind: 'block' },
      { x: 2890, y: 184, w: 36, h: 36, kind: 'spike', inverted: true },

      // Floating island
      { x: 3150, y: 60, w: 72, h: 36, kind: 'block' },
      { x: 3450, y: 220, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 3500, y: 0, w: 36, h: 36, kind: 'spike' },

      // Secret Coin 2 (Flight Upper Air Pocket)
      { x: 3750, y: 170, w: 30, h: 30, kind: 'coin', coinIndex: 1 },

      // Slalom Gate (Top + Bottom blocks creating flight gap)
      { x: 3950, y: 0, w: 90, h: 45, kind: 'block' },
      { x: 3950, y: 195, w: 90, h: 55, kind: 'block' },

      // Floating Column
      { x: 4300, y: 70, w: 50, h: 80, kind: 'block' },
      { x: 4600, y: 214, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 4636, y: 214, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 4850, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 4886, y: 0, w: 36, h: 36, kind: 'spike' },

      // ~64%: CUBE PORTAL (Return to Cube Mode)
      { x: 5100, y: 35, w: 44, h: 120, kind: 'portal_cube' },

      // Section 3: Cube rhythm sprint (64% - 100%)
      { x: 5400, y: 0, w: 46, h: 14, kind: 'pad' },
      { x: 5650, y: 80, w: 36, h: 36, kind: 'orb' },
      { x: 5800, y: 70, w: 80, h: 25, kind: 'block' },
      { x: 6150, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 6450, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 6486, y: 0, w: 36, h: 36, kind: 'spike' },

      // High aerial platform & Secret Coin 3
      { x: 6850, y: 55, w: 108, h: 36, kind: 'block' },
      { x: 6980, y: 120, w: 30, h: 30, kind: 'coin', coinIndex: 2 },
      { x: 7100, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 7136, y: 0, w: 36, h: 36, kind: 'spike' },

      // Final sprint into finish
      { x: 7450, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 7750, y: 0, w: 45, h: 220, kind: 'finish' },
    ],
  },

  // -----------------------------------------------------------
  // LEVEL 2: BACK ON TRACK (NORMAL, 11,500 PX)
  // -----------------------------------------------------------
  {
    id: 1,
    name: 'BACK ON TRACK',
    subtitle: 'Уровень 2 • Каскадные прыжки, корабль и волна (Normal)',
    difficulty: 'normal',
    difficultyStars: 2,
    length: 11500,
    speed: RUN_SPEED_2,
    bpm: 142,
    bgHue: 120,
    accentColor: '#39ff14',
    kickPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    bassNotes: [
      130.8, 130.8, 130.8, 130.8, 98, 98, 98, 98,
      110, 110, 110, 110, 87.3, 87.3, 98, 110,
    ],
    leadMelody: [
      392, 0, 392, 440, 523.3, 0, 440, 0, 392, 0, 329.6, 0, 293.7, 329.6, 392, 0,
      440, 0, 523.3, 0, 587.3, 0, 523.3, 0, 440, 0, 392, 0, 329.6, 0, 392, 0,
    ],
    obstacles: [
      // -------------------------------------------------------
      // SECTION 1: CUBE INTRO (0% - 26%)
      // -------------------------------------------------------
      { x: 600, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 950, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 986, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1300, y: 0, w: 72, h: 36, kind: 'block' },
      { x: 1450, y: 40, w: 72, h: 36, kind: 'block' },
      { x: 1600, y: 80, w: 72, h: 36, kind: 'block' },
      { x: 1850, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1886, y: 0, w: 36, h: 36, kind: 'spike' },

      // Pad launch & Secret Coin 1
      { x: 2150, y: 0, w: 46, h: 14, kind: 'pad' },
      { x: 2350, y: 100, w: 72, h: 36, kind: 'block' },
      { x: 2370, y: 160, w: 30, h: 30, kind: 'coin', coinIndex: 0 },
      { x: 2450, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 2486, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 2750, y: 0, w: 36, h: 36, kind: 'spike' },

      // -------------------------------------------------------
      // SECTION 2: SHIP / FLYING BOARD (26% - 50%)
      // -------------------------------------------------------
      { x: 3000, y: 35, w: 44, h: 120, kind: 'portal_ship' },

      // Flight Cavern with hanging ceiling obstacles & floor hurdles
      { x: 3250, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 3450, y: 220, w: 120, h: 40, kind: 'block' },
      { x: 3490, y: 184, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 3750, y: 0, w: 50, h: 80, kind: 'block' },
      { x: 4000, y: 150, w: 80, h: 40, kind: 'block' },

      // Secret Coin 2 (Flight high pocket)
      { x: 4250, y: 160, w: 30, h: 30, kind: 'coin', coinIndex: 1 },

      { x: 4500, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 4500, y: 214, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 4800, y: 200, w: 130, h: 50, kind: 'block' },
      { x: 5000, y: 0, w: 60, h: 70, kind: 'block' },
      { x: 5300, y: 60, w: 80, h: 36, kind: 'block' },

      // -------------------------------------------------------
      // SECTION 3: WAVE / STRELOCHKA (50% - 73%)
      // -------------------------------------------------------
      { x: 5700, y: 35, w: 44, h: 120, kind: 'portal_wave' },

      // Authentic Wave Slalom (Exact 45-degree zig-zag with alternating teeth)
      // Tooth 1 (Bottom)
      { x: 6000, y: 0, w: 54, h: 45, kind: 'block' },
      { x: 6009, y: 45, w: 36, h: 36, kind: 'spike' },

      // Tooth 2 (Ceiling)
      { x: 6260, y: 185, w: 72, h: 60, kind: 'block' },
      { x: 6278, y: 149, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 3 (Bottom)
      { x: 6520, y: 0, w: 72, h: 55, kind: 'block' },
      { x: 6538, y: 55, w: 36, h: 36, kind: 'spike' },

      // Tooth 4 (Ceiling)
      { x: 6780, y: 180, w: 72, h: 65, kind: 'block' },
      { x: 6798, y: 144, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 5 (Bottom)
      { x: 7040, y: 0, w: 72, h: 65, kind: 'block' },
      { x: 7058, y: 65, w: 36, h: 36, kind: 'spike' },

      // Secret Coin 3 (In high wave peak!)
      { x: 7300, y: 175, w: 30, h: 30, kind: 'coin', coinIndex: 2 },
      // Tooth 6 (Ceiling)
      { x: 7360, y: 185, w: 72, h: 60, kind: 'block' },
      { x: 7378, y: 149, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 7 (Bottom)
      { x: 7640, y: 0, w: 72, h: 60, kind: 'block' },
      { x: 7658, y: 60, w: 36, h: 36, kind: 'spike' },

      // Tooth 8 (Ceiling)
      { x: 7920, y: 185, w: 72, h: 60, kind: 'block' },
      { x: 7938, y: 149, w: 36, h: 36, kind: 'spike', inverted: true },

      // Pre-portal bottom hazard
      { x: 8180, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 8216, y: 0, w: 36, h: 36, kind: 'spike' },

      // -------------------------------------------------------
      // SECTION 4: CUBE FINALE (73% - 100%)
      // -------------------------------------------------------
      { x: 8400, y: 35, w: 44, h: 120, kind: 'portal_cube' },

      { x: 8700, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 8736, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 9000, y: 40, w: 72, h: 36, kind: 'block' },
      { x: 9200, y: 80, w: 36, h: 36, kind: 'orb' },
      { x: 9400, y: 50, w: 72, h: 36, kind: 'block' },
      { x: 9650, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 9686, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 9722, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 10000, y: 0, w: 46, h: 14, kind: 'pad' },
      { x: 10300, y: 80, w: 36, h: 36, kind: 'orb' },
      { x: 10550, y: 50, w: 108, h: 36, kind: 'block' },
      { x: 10800, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 10836, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 11200, y: 0, w: 45, h: 220, kind: 'finish' },
    ],
  },

  // -----------------------------------------------------------
  // LEVEL 3: POLARGEIST (HARD, 15,000 PX)
  // -----------------------------------------------------------
  {
    id: 2,
    name: 'POLARGEIST',
    subtitle: 'Уровень 3 • Пещерный хардкор, корабль и волна (Hard)',
    difficulty: 'hard',
    difficultyStars: 3,
    length: 15000,
    speed: RUN_SPEED_3,
    bpm: 156,
    bgHue: 330,
    accentColor: '#ff0055',
    kickPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bassNotes: [
      82.4, 82.4, 82.4, 82.4, 110, 110, 98, 98,
      82.4, 82.4, 82.4, 82.4, 123.5, 123.5, 110, 98,
    ],
    leadMelody: [
      659.3, 0, 659.3, 0, 587.3, 0, 523.3, 0, 493.9, 0, 523.3, 0, 587.3, 0, 659.3, 0,
      783.9, 0, 783.9, 0, 659.3, 0, 587.3, 0, 523.3, 0, 493.9, 0, 440, 0, 493.9, 0,
    ],
    obstacles: [
      // -------------------------------------------------------
      // SECTION 1: HIGH PRESSURE CUBE INTRO (0% - 25%)
      // -------------------------------------------------------
      { x: 500, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 536, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 900, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 936, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1250, y: 0, w: 72, h: 36, kind: 'block' },
      { x: 1400, y: 45, w: 72, h: 36, kind: 'block' },
      { x: 1550, y: 90, w: 72, h: 36, kind: 'block' },
      { x: 1780, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1816, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 1852, y: 0, w: 36, h: 36, kind: 'spike' },

      // Triple spikes & Secret Coin 1
      { x: 2200, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 2236, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 2272, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 2600, y: 0, w: 46, h: 14, kind: 'pad' },
      { x: 2850, y: 90, w: 36, h: 36, kind: 'orb' },
      { x: 2920, y: 155, w: 30, h: 30, kind: 'coin', coinIndex: 0 },
      { x: 3050, y: 60, w: 72, h: 36, kind: 'block' },
      { x: 3250, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 3286, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 3500, y: 0, w: 36, h: 36, kind: 'spike' },

      // -------------------------------------------------------
      // SECTION 2: SHIP / FLYING BOARD (25% - 50%)
      // -------------------------------------------------------
      { x: 3800, y: 35, w: 44, h: 120, kind: 'portal_ship' },

      // High-Speed Ship Cavern with inverted ceiling teeth & obstacles
      { x: 4100, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 4350, y: 214, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 4600, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 4636, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 4900, y: 200, w: 140, h: 50, kind: 'block' },
      { x: 4950, y: 164, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 5200, y: 70, w: 60, h: 80, kind: 'block' },
      { x: 5500, y: 0, w: 70, h: 90, kind: 'block' },

      // Secret Coin 2 (Ship high cavern pocket)
      { x: 5800, y: 160, w: 30, h: 30, kind: 'coin', coinIndex: 1 },

      { x: 6100, y: 214, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 6136, y: 214, w: 36, h: 36, kind: 'spike', inverted: true },
      { x: 6450, y: 0, w: 60, h: 70, kind: 'block' },
      { x: 6450, y: 180, w: 60, h: 70, kind: 'block' },
      { x: 6800, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 6836, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 7100, y: 60, w: 80, h: 36, kind: 'block' },

      // -------------------------------------------------------
      // SECTION 3: WAVE / STRELOCHKA (50% - 75%)
      // -------------------------------------------------------
      { x: 7500, y: 35, w: 44, h: 120, kind: 'portal_wave' },

      // Inferno Wave Slalom (Tight 45-degree zig-zag with alternating teeth)
      // Tooth 1 (Bottom)
      { x: 7800, y: 0, w: 54, h: 50, kind: 'block' },
      { x: 7809, y: 50, w: 36, h: 36, kind: 'spike' },

      // Tooth 2 (Ceiling)
      { x: 8060, y: 185, w: 72, h: 60, kind: 'block' },
      { x: 8078, y: 149, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 3 (Bottom)
      { x: 8320, y: 0, w: 72, h: 65, kind: 'block' },
      { x: 8338, y: 65, w: 36, h: 36, kind: 'spike' },

      // Tooth 4 (Ceiling)
      { x: 8580, y: 180, w: 72, h: 65, kind: 'block' },
      { x: 8598, y: 144, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 5 (Bottom)
      { x: 8840, y: 0, w: 72, h: 70, kind: 'block' },
      { x: 8858, y: 70, w: 36, h: 36, kind: 'spike' },

      // Secret Coin 3 (In Wave razor peak!)
      { x: 9100, y: 175, w: 30, h: 30, kind: 'coin', coinIndex: 2 },
      // Tooth 6 (Ceiling)
      { x: 9160, y: 185, w: 72, h: 60, kind: 'block' },
      { x: 9178, y: 149, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 7 (Bottom)
      { x: 9440, y: 0, w: 72, h: 60, kind: 'block' },
      { x: 9458, y: 60, w: 36, h: 36, kind: 'spike' },

      // Tooth 8 (Ceiling)
      { x: 9720, y: 185, w: 72, h: 60, kind: 'block' },
      { x: 9738, y: 149, w: 36, h: 36, kind: 'spike', inverted: true },

      // Tooth 9 (Bottom)
      { x: 10000, y: 0, w: 72, h: 65, kind: 'block' },
      { x: 10018, y: 65, w: 36, h: 36, kind: 'spike' },

      // Tooth 10 (Ceiling)
      { x: 10280, y: 180, w: 72, h: 65, kind: 'block' },
      { x: 10298, y: 144, w: 36, h: 36, kind: 'spike', inverted: true },

      // Pre-portal teeth
      { x: 10560, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 10596, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 10820, y: 190, w: 90, h: 55, kind: 'block' },
      { x: 10850, y: 154, w: 36, h: 36, kind: 'spike', inverted: true },

      // -------------------------------------------------------
      // SECTION 4: GRAND FINALE CUBE RUSH (75% - 100%)
      // -------------------------------------------------------
      { x: 11200, y: 35, w: 44, h: 120, kind: 'portal_cube' },

      { x: 11500, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 11536, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 11800, y: 40, w: 108, h: 36, kind: 'block' },
      { x: 12050, y: 70, w: 108, h: 36, kind: 'block' },
      { x: 12350, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 12386, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 12422, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 12800, y: 0, w: 46, h: 14, kind: 'pad' },
      { x: 13050, y: 85, w: 36, h: 36, kind: 'orb' },
      { x: 13300, y: 95, w: 36, h: 36, kind: 'orb' },
      { x: 13550, y: 55, w: 72, h: 36, kind: 'block' },
      { x: 13900, y: 0, w: 46, h: 14, kind: 'pad' },
      { x: 14200, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 14236, y: 0, w: 36, h: 36, kind: 'spike' },
      { x: 14600, y: 0, w: 45, h: 220, kind: 'finish' },
    ],
  },
];

export const EasyDifficultyFace: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-label="Easy Difficulty">
    <defs>
      <radialGradient id="easyGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#66e0ff" />
        <stop offset="60%" stopColor="#0099ff" />
        <stop offset="100%" stopColor="#0055cc" />
      </radialGradient>
      <filter id="easyShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="44" fill="url(#easyGrad)" stroke="#000000" strokeWidth="6" filter="url(#easyShadow)" />
    <circle cx="34" cy="42" r="8" fill="#ffffff" stroke="#000000" strokeWidth="3" />
    <circle cx="35" cy="42" r="4" fill="#000000" />
    <circle cx="66" cy="42" r="8" fill="#ffffff" stroke="#000000" strokeWidth="3" />
    <circle cx="65" cy="42" r="4" fill="#000000" />
    <path d="M 28 58 Q 50 82 72 58 Z" fill="#000000" stroke="#000000" strokeWidth="2" />
    <path d="M 36 60 Q 50 74 64 60 Z" fill="#ff4d79" />
  </svg>
);

export const NormalDifficultyFace: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-label="Normal Difficulty">
    <defs>
      <radialGradient id="normalGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#66ff66" />
        <stop offset="60%" stopColor="#22cc22" />
        <stop offset="100%" stopColor="#0f7a0f" />
      </radialGradient>
      <filter id="normalShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="44" fill="url(#normalGrad)" stroke="#000000" strokeWidth="6" filter="url(#normalShadow)" />
    <path d="M 22 34 Q 35 30 44 35" stroke="#000000" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M 78 34 Q 65 30 56 35" stroke="#000000" strokeWidth="5" strokeLinecap="round" fill="none" />
    <circle cx="34" cy="44" r="8.5" fill="#ffffff" stroke="#000000" strokeWidth="3.5" />
    <circle cx="35" cy="44" r="4" fill="#000000" />
    <circle cx="66" cy="44" r="8.5" fill="#ffffff" stroke="#000000" strokeWidth="3.5" />
    <circle cx="65" cy="44" r="4" fill="#000000" />
    <path d="M 28 58 Q 50 82 72 58 Q 50 63 28 58 Z" fill="#000000" stroke="#000000" strokeWidth="2.5" />
    <path d="M 40 68 Q 50 80 60 68 Z" fill="#ff4d79" />
    <rect x="38" y="58" width="24" height="4" rx="2" fill="#ffffff" />
  </svg>
);

export const HardDifficultyFace: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-label="Hard Difficulty">
    <defs>
      <radialGradient id="hardGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffb300" />
        <stop offset="60%" stopColor="#ff7700" />
        <stop offset="100%" stopColor="#cc4400" />
      </radialGradient>
      <filter id="hardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="44" fill="url(#hardGrad)" stroke="#000000" strokeWidth="6" filter="url(#hardShadow)" />
    <path d="M 20 38 L 44 42" stroke="#000000" strokeWidth="6" strokeLinecap="round" />
    <path d="M 80 38 L 56 42" stroke="#000000" strokeWidth="6" strokeLinecap="round" />
    <circle cx="34" cy="46" r="7.5" fill="#ffffff" stroke="#000000" strokeWidth="3" />
    <circle cx="36" cy="46" r="3.5" fill="#000000" />
    <circle cx="66" cy="46" r="7.5" fill="#ffffff" stroke="#000000" strokeWidth="3" />
    <circle cx="64" cy="46" r="3.5" fill="#000000" />
    <path d="M 32 68 Q 50 56 68 68 Z" fill="#000000" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
    <rect x="42" y="62" width="16" height="3" fill="#ffffff" />
  </svg>
);

// -------------------------------------------------------------
// 6. MAIN GEOMETRY DASH COMPONENT
// -------------------------------------------------------------
export const GeometryDashGame: React.FC<GeometryDashGameProps> = ({
  onGameOver,
  bestScore,
  isNewRecord,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Level & Skin Selection State
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('gd_selected_level_index');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 0 && parsed < LEVELS.length) return parsed;
      }
    } catch {}
    return 0;
  });

  const [selectedSkinIndex, setSelectedSkinIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('gd_selected_skin_index');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 0 && parsed < CUBE_SKINS.length) return parsed;
      }
    } catch {}
    return 0;
  });

  const currentLevel = LEVELS[selectedLevelIndex] || LEVELS[0]!;
  const selectedSkin = CUBE_SKINS[selectedSkinIndex] || CUBE_SKINS[0]!;

  const levelRef = useRef<LevelConfig>(currentLevel);
  levelRef.current = currentLevel;

  const skinRef = useRef<CubeSkin>(selectedSkin);
  skinRef.current = selectedSkin;

  // Screen State
  const [screen, setScreen] = useState<'menu' | 'garage' | 'playing' | 'paused' | 'victory' | 'gameover'>('menu');
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const handleRestartRef = useRef<() => void>(() => {});
  const handleBackToMenuRef = useRef<() => void>(() => {});

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [percent, setPercent] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState<boolean[]>([false, false, false]);

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const isHoldingRef = useRef(false);
  const resetLevelRef = useRef<() => void>(() => {});

  // Sound Engine
  const [soundEnabled, setSoundEnabled] = useState(!sfx.muted);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playSynthJump = () => {
    if (sfx.muted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  };

  const playCoinChime = () => {
    if (sfx.muted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      [880, 1320, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.22, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.22);
      });
    } catch {}
  };

  const playSynthPortal = () => {
    if (sfx.muted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  };

  const playCrashSound = () => {
    if (sfx.muted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } catch {}
  };

  const playMenuClick = () => {
    if (sfx.muted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  };

  // -------------------------------------------------------------
  // ADVANCED WEB AUDIO EDM SYNTHESIZER WITH LOOKAHEAD SCHEDULER
  // -------------------------------------------------------------
  const startBackgroundMusic = () => {
    stopBackgroundMusic();
    if (sfx.muted) return;
    const ctx = getAudioContext();
    const lvl = levelRef.current;
    const bpm = lvl.bpm;
    const stepDuration = 60 / bpm / 4; // 16th note in seconds

    let currentStep = 0;
    let nextNoteTime = ctx.currentTime + 0.05;

    musicTimerRef.current = window.setInterval(() => {
      if (sfx.muted || screenRef.current !== 'playing') return;

      while (nextNoteTime < ctx.currentTime + 0.12) {
        const time = nextNoteTime;
        const beat16 = currentStep % 16;
        const phrase32 = currentStep % 32;

        // 1. Driving Kick Drum (4-on-the-floor)
        if (beat16 % 4 === 0) {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.frequency.setValueAtTime(155, time);
          kickOsc.frequency.exponentialRampToValueAtTime(38, time + 0.075);
          kickGain.gain.setValueAtTime(0.38, time);
          kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.085);
          kickOsc.connect(kickGain);
          kickGain.connect(ctx.destination);
          kickOsc.start(time);
          kickOsc.stop(time + 0.09);
        }

        // 2. Punchy Snare (beats 2 and 4 = steps 4 and 12)
        if (beat16 === 4 || beat16 === 12) {
          const snareFilter = ctx.createBiquadFilter();
          snareFilter.type = 'highpass';
          snareFilter.frequency.setValueAtTime(800, time);

          const snareNoiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
          const nData = snareNoiseBuf.getChannelData(0);
          for (let i = 0; i < nData.length; i++) nData[i] = Math.random() * 2 - 1;
          const snareNoise = ctx.createBufferSource();
          snareNoise.buffer = snareNoiseBuf;

          const snareGain = ctx.createGain();
          snareGain.gain.setValueAtTime(0.24, time);
          snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.095);

          snareNoise.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(ctx.destination);
          snareNoise.start(time);

          // Snare tone body
          const snareOsc = ctx.createOscillator();
          const bodyGain = ctx.createGain();
          snareOsc.frequency.setValueAtTime(190, time);
          snareOsc.frequency.exponentialRampToValueAtTime(80, time + 0.05);
          bodyGain.gain.setValueAtTime(0.2, time);
          bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
          snareOsc.connect(bodyGain);
          bodyGain.connect(ctx.destination);
          snareOsc.start(time);
          snareOsc.stop(time + 0.07);
        }

        // 3. Offbeat Hi-Hats (steps 2, 6, 10, 14)
        if (beat16 % 2 === 0 && beat16 % 4 !== 0) {
          const hatBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
          const hData = hatBuf.getChannelData(0);
          for (let i = 0; i < hData.length; i++) hData[i] = Math.random() * 2 - 1;
          const hat = ctx.createBufferSource();
          hat.buffer = hatBuf;
          const hatFilter = ctx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(7000, time);
          const hatGain = ctx.createGain();
          hatGain.gain.setValueAtTime(0.12, time);
          hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.038);
          hat.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(ctx.destination);
          hat.start(time);
        }

        // 4. Rolling Resonant 303 Bassline
        const bassFreq = lvl.bassNotes[beat16] || 110;
        const bassOsc = ctx.createOscillator();
        const bassFilter = ctx.createBiquadFilter();
        const bassGain = ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, time);

        bassFilter.type = 'lowpass';
        bassFilter.Q.setValueAtTime(4, time);
        bassFilter.frequency.setValueAtTime(650, time);
        bassFilter.frequency.exponentialRampToValueAtTime(120, time + 0.1);

        bassGain.gain.setValueAtTime(0.15, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(time);
        bassOsc.stop(time + 0.12);

        // 5. Arpeggiated / Melodic Lead Synth
        const leadFreq = lvl.leadMelody[phrase32];
        if (leadFreq && leadFreq > 0) {
          const leadOsc = ctx.createOscillator();
          const leadGain = ctx.createGain();
          leadOsc.type = 'square';
          leadOsc.frequency.setValueAtTime(leadFreq, time);
          leadGain.gain.setValueAtTime(0.13, time);
          leadGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
          leadOsc.connect(leadGain);
          leadGain.connect(ctx.destination);
          leadOsc.start(time);
          leadOsc.stop(time + 0.15);
        }

        currentStep++;
        nextNoteTime += stepDuration;
      }
    }, 25);
  };

  const stopBackgroundMusic = () => {
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
  };

  // -----------------------------------------------------------
  // MAIN ENGINE & CANVAS RENDER LOOP
  // -----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    function onResize() {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const targetW = Math.max(320, Math.min(rect.width, 940));
      const targetH = Math.round((targetW * 450) / 900);
      canvas.width = targetW;
      canvas.height = targetH;
    }
    window.addEventListener('resize', onResize);
    onResize();

    // Physics Engine State
    let worldX = 0;
    let cubeY = 0;
    let cubeVy = 0;
    let cubeRotation = 0;
    let onGround = true;
    let playerMode: 'cube' | 'ship' | 'wave' = 'cube';
    let shipPitch = 0;
    let waveTrail: { worldX: number; y: number }[] = [];

    // Load active level obstacles
    let obstacles: Obstacle[] = JSON.parse(JSON.stringify(levelRef.current.obstacles));
    let currentCoins = [false, false, false];

    // PixelFX & Particles System
    let pixelParticles: PixelVFXParticle[] = [];
    let shockwaves: PixelShockwave[] = [];
    let cubeTrail: { worldX: number; y: number; rot: number; alpha: number }[] = [];
    let trailTimer = 0;
    let isDying = false;

    // Persistent Cyber Starfield (Cohesive with Snake 3D synthwave universe)
    interface CyberStar {
      x: number;
      y: number;
      size: number;
      speed: number;
      baseAlpha: number;
      phase: number;
      color: string;
    }
    const cyberStars: CyberStar[] = [];
    const starPalette = ['#ffffff', '#00f0ff', '#ff2e93', '#c4b5fd', '#facc15'];
    for (let i = 0; i < 90; i++) {
      cyberStars.push({
        x: Math.random() * 900,
        y: Math.random() * 340,
        size: Math.random() * 2.2 + 0.8,
        speed: Math.random() * 0.14 + 0.04,
        baseAlpha: Math.random() * 0.55 + 0.25,
        phase: Math.random() * Math.PI * 2,
        color: starPalette[Math.floor(Math.random() * starPalette.length)]!,
      });
    }

    function resetLevel() {
      isDying = false;
      worldX = 0;
      cubeY = 0;
      cubeVy = 0;
      cubeRotation = 0;
      onGround = true;
      playerMode = 'cube';
      shipPitch = 0;
      waveTrail = [];
      obstacles = JSON.parse(JSON.stringify(levelRef.current.obstacles));
      currentCoins = [false, false, false];
      setCoinsCollected([false, false, false]);
      pixelParticles = [];
      shockwaves = [];
      cubeTrail = [];
      setPercent(0);
    }
    resetLevelRef.current = resetLevel;

    function activateOrb(obs: Obstacle) {
      if (obs.used) return;
      obs.used = true;
      cubeVy = ORB_FORCE; // Powerful upward RobTop boost
      onGround = false;
      playSynthJump();

      // PixelFX Yellow Orb EMP Shockwave
      shockwaves.push({
        x: obs.x + obs.w / 2 - worldX,
        y: GROUND_Y - (obs.y + obs.h / 2),
        r: 8,
        maxR: 68,
        alpha: 1,
        color: '#ffe600',
        thick: 4,
      });

      // Golden sparkle burst
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 180 + 60;
        pixelParticles.push({
          x: obs.x + obs.w / 2 - worldX,
          y: GROUND_Y - (obs.y + obs.h / 2),
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 30,
          size: Math.random() * 4 + 3,
          color: i % 2 === 0 ? '#ffe600' : '#ffffff',
          life: 0.35,
          maxLife: 0.35,
          kind: 'spark',
        });
      }
    }

    function doJump() {
      if (screenRef.current !== 'playing') return;
      if (playerMode === 'ship' || playerMode === 'wave') return;
      if (onGround) {
        cubeVy = JUMP_FORCE;
        onGround = false;
        playSynthJump();

        // PixelFX jump ground dust burst
        for (let i = 0; i < 8; i++) {
          pixelParticles.push({
            x: cubeX + CUBE_SIZE / 2,
            y: GROUND_Y - 2,
            vx: (Math.random() - 0.5) * 140,
            vy: -Math.random() * 60 - 20,
            size: Math.random() * 3 + 3,
            color: '#ffffff',
            life: 0.28,
            maxLife: 0.28,
            kind: 'spark',
          });
        }
      } else {
        // In mid-air: check nearby Jump Orbs (allows clicking or tapping near the orb)
        for (const obs of obstacles) {
          if (obs.kind === 'orb' && !obs.used) {
            const dist = Math.hypot(
              worldX + cubeX + CUBE_SIZE / 2 - (obs.x + obs.w / 2),
              cubeY + CUBE_SIZE / 2 - (obs.y + obs.h / 2)
            );
            if (dist < 68) {
              activateOrb(obs);
              return;
            }
          }
        }
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (screenRef.current === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          handleRestartRef.current();
          return;
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          handleBackToMenuRef.current();
          return;
        }
      }
      if (screenRef.current === 'victory') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleRestartRef.current();
          return;
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          handleBackToMenuRef.current();
          return;
        }
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        isHoldingRef.current = true;
        doJump();
        e.preventDefault();
      } else if (e.code === 'Escape') {
        if (screenRef.current === 'playing') {
          playMenuClick();
          stopBackgroundMusic();
          setScreen('paused');
        } else if (screenRef.current === 'paused') {
          playMenuClick();
          startBackgroundMusic();
          setScreen('playing');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        isHoldingRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const targetSurface = containerRef.current || canvas;
    const onPointerDown = (e?: Event) => {
      if (screenRef.current === 'playing') {
        if (e && 'button' in e && (e as MouseEvent).button !== 0) return;
        isHoldingRef.current = true;
        doJump();
      }
    };
    const onPointerUp = () => {
      isHoldingRef.current = false;
    };

    targetSurface.addEventListener('pointerdown', onPointerDown);
    targetSurface.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    // ---------------------------------------------------------
    // PIXELFX DEATH EXPLOSION (HUGO DUPREZ PIXEL BLAST RECIPE)
    // ---------------------------------------------------------
    function die() {
      if (isDying) return;
      isDying = true;

      playCrashSound();
      const currentSkin = skinRef.current;
      const centerX = cubeX + CUBE_SIZE / 2;
      const centerY = GROUND_Y - cubeY - CUBE_SIZE / 2;

      // 1. Dual Shockwave Rings (Primary snap + soft halo)
      shockwaves.push({
        x: centerX,
        y: centerY,
        r: 6,
        maxR: 95,
        alpha: 1,
        color: '#ffffff',
        thick: 4,
      });
      shockwaves.push({
        x: centerX,
        y: centerY,
        r: 4,
        maxR: 70,
        alpha: 0.8,
        color: currentSkin.primaryColor,
        thick: 3,
      });

      // 2. Pixel Shards (Square debris blocks with gravity & bounce)
      for (let i = 0; i < 32; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 320 + 80;
        pixelParticles.push({
          x: centerX + (Math.random() - 0.5) * 16,
          y: centerY + (Math.random() - 0.5) * 16,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 60,
          size: Math.random() * 5 + 4,
          color: i % 2 === 0 ? currentSkin.primaryColor : currentSkin.secondaryColor,
          life: 0.65,
          maxLife: 0.65,
          kind: 'shard',
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 15,
        });
      }

      // 3. Pixel Smoke Puffs (cooling fire puffs)
      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 120 + 20;
        pixelParticles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 30,
          size: Math.random() * 8 + 6,
          color: 'rgba(255, 255, 255, 0.8)',
          life: 0.45,
          maxLife: 0.45,
          kind: 'smoke',
        });
      }

      stopBackgroundMusic();
      const finalPoints = Math.floor(worldX);
      setScore(finalPoints);
      onGameOverRef.current(finalPoints);

      // Allow PixelFX explosion & shockwaves to play, then show Game Over screen
      setTimeout(() => {
        setScreen('gameover');
      }, 420);
    }

    // ---------------------------------------------------------
    // PIXELFX COIN PICKUP BURST (HUGO DUPREZ COLLECT-BURST RECIPE)
    // ---------------------------------------------------------
    function triggerCoinBurst(cx: number, cy: number) {
      playCoinChime();

      // Outer snap ring
      shockwaves.push({
        x: cx,
        y: cy,
        r: 8,
        maxR: 60,
        alpha: 1,
        color: '#ffe600',
        thick: 3,
      });

      // Curving star sparkles
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
        const spd = Math.random() * 160 + 60;
        pixelParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 30,
          size: Math.random() * 4 + 3,
          color: '#ffffff',
          life: 0.55,
          maxLife: 0.55,
          kind: 'spark',
        });
      }
    }

    const cubeX = 140;

    // ---------------------------------------------------------
    // RENDER LOOP
    // ---------------------------------------------------------
    function animate(currentTime: number) {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((currentTime - lastTime) / 1000, 0.04);
      lastTime = currentTime;

      const lvl = levelRef.current;
      const activeSkin = skinRef.current;
      const scaleX = canvas!.width / 900;
      const scaleY = canvas!.height / 450;

      ctx!.save();
      ctx!.scale(scaleX, scaleY);

      // 1. DYNAMIC SYNTHWAVE SPACE BACKGROUND (COHESIVE WITH SNAKE 3D)
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, GROUND_Y);
      if (lvl.id === 0) {
        // Level 1: Cyber Sunset / Cyan-Magenta space
        bgGrad.addColorStop(0, '#0a031a');
        bgGrad.addColorStop(0.65, '#160833');
        bgGrad.addColorStop(1, '#230a47');
      } else if (lvl.id === 1) {
        // Level 2: Emerald Matrix / Deep Cyber Jade space
        bgGrad.addColorStop(0, '#03120d');
        bgGrad.addColorStop(0.65, '#07241a');
        bgGrad.addColorStop(1, '#0e3828');
      } else {
        // Level 3: Inferno Ultraviolet space
        bgGrad.addColorStop(0, '#150218');
        bgGrad.addColorStop(0.65, '#29052d');
        bgGrad.addColorStop(1, '#3d0738');
      }
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, 900, 450);

      // Atmospheric Horizon Neon Bloom (Pulsing gently near the ground)
      const pulseBloom = Math.sin(currentTime * 0.003) * 0.15 + 0.85;
      const horizonGrad = ctx!.createRadialGradient(450, GROUND_Y, 20, 450, GROUND_Y, 400);
      horizonGrad.addColorStop(0, `rgba(${lvl.id === 0 ? '0, 240, 255' : lvl.id === 1 ? '57, 255, 20' : '255, 0, 85'}, ${0.18 * pulseBloom})`);
      horizonGrad.addColorStop(0.6, `rgba(255, 46, 147, ${0.08 * pulseBloom})`);
      horizonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = horizonGrad;
      ctx!.fillRect(0, 0, 900, GROUND_Y);

      // Twinkling Cyber Stars with Parallax Drift
      for (const st of cyberStars) {
        const sx = ((st.x - worldX * st.speed) % 900 + 900) % 900;
        const twinkle = st.baseAlpha * (0.65 + 0.35 * Math.sin(currentTime * 0.003 + st.phase));
        ctx!.fillStyle = st.color;
        ctx!.globalAlpha = twinkle;
        ctx!.fillRect(sx, st.y, st.size, st.size);
      }
      ctx!.globalAlpha = 1;

      // Parallax Laser Grid Columns (Fading perspective lines)
      const bgOffset = (worldX * 0.16) % 90;
      ctx!.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx!.lineWidth = 1;
      for (let x = -bgOffset; x < 900; x += 90) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, GROUND_Y);
        ctx!.stroke();
      }

      // 2. PHYSICS & COLLISION ENGINE
      if (screenRef.current === 'playing' && !isDying) {
        worldX += lvl.speed * dt;

        if (playerMode === 'cube') {
          if (isHoldingRef.current && onGround) {
            doJump();
          }

          cubeVy += GRAVITY * dt;
          cubeY -= cubeVy * dt;

          // Platform detection under cube
          let currentPlatformY = 0;
          const playerWorldLeft = worldX + cubeX;
          const playerWorldRight = playerWorldLeft + CUBE_SIZE;

          for (const obs of obstacles) {
            if (obs.kind === 'block') {
              const bLeft = obs.x;
              const bRight = obs.x + obs.w;
              const bTop = obs.y + obs.h;

              if (playerWorldRight > bLeft + 3 && playerWorldLeft < bRight - 3) {
                if (cubeY >= bTop - 12 && cubeY <= bTop + 20 && cubeVy >= 0) {
                  currentPlatformY = Math.max(currentPlatformY, bTop);
                }
              }
            }
          }

          if (cubeY <= currentPlatformY) {
            cubeY = currentPlatformY;
            cubeVy = 0;
            onGround = true;
            cubeRotation = Math.round(cubeRotation / (Math.PI / 2)) * (Math.PI / 2);
          } else {
            onGround = false;
            cubeRotation += dt * 9.2;
          }

          // Emit ground sparks backwards
          if (onGround && Math.random() < 0.35) {
            pixelParticles.push({
              x: cubeX,
              y: GROUND_Y - 2,
              vx: -Math.random() * 120 - 60,
              vy: -Math.random() * 35 - 10,
              size: Math.random() * 3 + 2,
              color: 'rgba(255, 255, 255, 0.65)',
              life: 0.22,
              maxLife: 0.22,
              kind: 'spark',
            });
          }
        } else if (playerMode === 'ship') {
          // ---------------------------------------------------------
          // SHIP / ROCKET FLIGHT PHYSICS (AUTHENTIC ROBTOP AERODYNAMICS)
          // ---------------------------------------------------------
          const SHIP_GRAVITY = 1600;
          const SHIP_THRUST = 2900;
          const SHIP_MAX_SPEED = 480;
          const CEILING_Y = 280;

          const isThrusting = isHoldingRef.current;
          if (isThrusting) {
            cubeVy -= SHIP_THRUST * dt;
          } else {
            cubeVy += SHIP_GRAVITY * dt;
          }

          cubeVy = Math.max(-SHIP_MAX_SPEED, Math.min(SHIP_MAX_SPEED, cubeVy));
          cubeY -= cubeVy * dt;

          // Smooth aerodynamic tilt
          const targetPitch = (cubeVy / SHIP_MAX_SPEED) * 0.52;
          shipPitch += (targetPitch - shipPitch) * Math.min(1, dt * 14);

          // Boundaries
          if (cubeY >= CEILING_Y) {
            cubeY = CEILING_Y;
            if (cubeVy < 0) cubeVy = 0;
          }

          if (cubeY <= 0) {
            cubeY = 0;
            if (cubeVy > 0) cubeVy = 0;
            onGround = true;
          } else {
            onGround = false;
          }

          // Fiery rocket thruster particles when boosting
          if (isThrusting) {
            const nozzleX = cubeX - 14;
            const nozzleY = GROUND_Y - cubeY - CUBE_SIZE / 2 + 4;
            for (let i = 0; i < 2; i++) {
              pixelParticles.push({
                x: nozzleX,
                y: nozzleY + (Math.random() - 0.5) * 6,
                vx: -Math.random() * 190 - 110,
                vy: (Math.random() - 0.5) * 50 + cubeVy * 0.15,
                size: Math.random() * 4 + 3,
                color: Math.random() < 0.6 ? '#ffaa00' : (Math.random() < 0.5 ? '#ff3300' : '#ffff55'),
                life: 0.22,
                maxLife: 0.22,
                kind: 'spark',
              });
            }
          } else if (Math.random() < 0.25) {
            pixelParticles.push({
              x: cubeX - 12,
              y: GROUND_Y - cubeY - CUBE_SIZE / 2 + 4,
              vx: -Math.random() * 80 - 40,
              vy: (Math.random() - 0.5) * 20,
              size: 2.5,
              color: '#00f0ff',
              life: 0.15,
              maxLife: 0.15,
              kind: 'spark',
            });
          }
        } else if (playerMode === 'wave') {
          // ---------------------------------------------------------
          // WAVE / ARROW PHYSICS (EXACT 45-DEGREE ZIG-ZAG DIAGONAL)
          // ---------------------------------------------------------
          const isHolding = isHoldingRef.current;
          if (isHolding) {
            cubeVy = -lvl.speed; // UP at constant 45-deg velocity
          } else {
            cubeVy = lvl.speed;  // DOWN at constant 45-deg velocity
          }

          cubeY -= cubeVy * dt;

          const CEILING_Y = 275;
          if (cubeY >= CEILING_Y) {
            cubeY = CEILING_Y;
          }
          if (cubeY <= 0) {
            cubeY = 0;
            onGround = true;
          } else {
            onGround = false;
          }

          // Record wave trail point
          waveTrail.push({
            worldX: worldX + cubeX + CUBE_SIZE / 2,
            y: cubeY + CUBE_SIZE / 2,
          });
          while (waveTrail.length > 0 && waveTrail[0]!.worldX < worldX - 700) {
            waveTrail.shift();
          }

          // Emit fine neon trail sparks
          if (Math.random() < 0.45) {
            pixelParticles.push({
              x: cubeX - 6,
              y: GROUND_Y - cubeY - CUBE_SIZE / 2 + (Math.random() - 0.5) * 4,
              vx: -Math.random() * 120 - 60,
              vy: (Math.random() - 0.5) * 30,
              size: Math.random() * 3 + 2,
              color: activeSkin.primaryColor || '#00f0ff',
              life: 0.18,
              maxLife: 0.18,
              kind: 'spark',
            });
          }
        }

        // REAL MOTION TRAIL: Store world position
        trailTimer += dt;
        if (trailTimer > 0.035) {
          trailTimer = 0;
          cubeTrail.push({
            worldX: worldX + cubeX,
            y: cubeY,
            rot: playerMode === 'ship' ? shipPitch : cubeRotation,
            alpha: 0.55,
          });
        }

        const curPct = Math.min(100, Math.floor((worldX / lvl.length) * 100));
        setPercent(curPct);
        setScore(Math.floor(worldX));

        const pBox = {
          x: worldX + cubeX,
          y: cubeY,
          w: CUBE_SIZE,
          h: CUBE_SIZE,
        };

        for (const obs of obstacles) {
          const oLeft = obs.x;
          const oRight = obs.x + obs.w;
          const oBottom = obs.y;
          const oTop = obs.y + obs.h;

          // Ship Portal
          if (obs.kind === 'portal_ship') {
            if (
              pBox.x + pBox.w > oLeft &&
              pBox.x < oRight &&
              pBox.y + pBox.h > oBottom &&
              pBox.y < oTop
            ) {
              if (playerMode !== 'ship') {
                playerMode = 'ship';
                cubeVy = -120;
                shipPitch = -0.15;
                playSynthPortal();

                shockwaves.push({
                  x: obs.x + obs.w / 2 - worldX,
                  y: GROUND_Y - (obs.y + obs.h / 2),
                  r: 10,
                  maxR: 90,
                  alpha: 1,
                  color: '#ff00aa',
                  thick: 4,
                });

                for (let i = 0; i < 20; i++) {
                  const ang = Math.random() * Math.PI * 2;
                  const spd = Math.random() * 220 + 80;
                  pixelParticles.push({
                    x: obs.x + obs.w / 2 - worldX,
                    y: GROUND_Y - (obs.y + obs.h / 2),
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    size: Math.random() * 4 + 3,
                    color: i % 2 === 0 ? '#ff00aa' : '#00f0ff',
                    life: 0.45,
                    maxLife: 0.45,
                    kind: 'spark',
                  });
                }
              }
            }
            continue;
          }

          // Wave Portal
          if (obs.kind === 'portal_wave') {
            if (
              pBox.x + pBox.w > oLeft &&
              pBox.x < oRight &&
              pBox.y + pBox.h > oBottom &&
              pBox.y < oTop
            ) {
              if (playerMode !== 'wave') {
                playerMode = 'wave';
                waveTrail = [];
                playSynthPortal();

                shockwaves.push({
                  x: obs.x + obs.w / 2 - worldX,
                  y: GROUND_Y - (obs.y + obs.h / 2),
                  r: 10,
                  maxR: 90,
                  alpha: 1,
                  color: '#00d4ff',
                  thick: 4,
                });

                for (let i = 0; i < 20; i++) {
                  const ang = Math.random() * Math.PI * 2;
                  const spd = Math.random() * 220 + 80;
                  pixelParticles.push({
                    x: obs.x + obs.w / 2 - worldX,
                    y: GROUND_Y - (obs.y + obs.h / 2),
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    size: Math.random() * 4 + 3,
                    color: i % 2 === 0 ? '#00d4ff' : '#ffffff',
                    life: 0.45,
                    maxLife: 0.45,
                    kind: 'spark',
                  });
                }
              }
            }
            continue;
          }

          // Cube Portal
          if (obs.kind === 'portal_cube') {
            if (
              pBox.x + pBox.w > oLeft &&
              pBox.x < oRight &&
              pBox.y + pBox.h > oBottom &&
              pBox.y < oTop
            ) {
              if (playerMode !== 'cube') {
                playerMode = 'cube';
                cubeRotation = 0;
                playSynthPortal();

                shockwaves.push({
                  x: obs.x + obs.w / 2 - worldX,
                  y: GROUND_Y - (obs.y + obs.h / 2),
                  r: 10,
                  maxR: 90,
                  alpha: 1,
                  color: '#00ff66',
                  thick: 4,
                });

                for (let i = 0; i < 20; i++) {
                  const ang = Math.random() * Math.PI * 2;
                  const spd = Math.random() * 220 + 80;
                  pixelParticles.push({
                    x: obs.x + obs.w / 2 - worldX,
                    y: GROUND_Y - (obs.y + obs.h / 2),
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    size: Math.random() * 4 + 3,
                    color: i % 2 === 0 ? '#00ff66' : '#ffe600',
                    life: 0.45,
                    maxLife: 0.45,
                    kind: 'spark',
                  });
                }
              }
            }
            continue;
          }

          // Secret Coin
          if (obs.kind === 'coin' && !obs.used && obs.coinIndex !== undefined) {
            const dist = Math.hypot(
              pBox.x + CUBE_SIZE / 2 - (obs.x + obs.w / 2),
              pBox.y + CUBE_SIZE / 2 - (obs.y + obs.h / 2)
            );
            if (dist < 36) {
              obs.used = true;
              currentCoins[obs.coinIndex] = true;
              setCoinsCollected([...currentCoins]);
              triggerCoinBurst(obs.x + obs.w / 2 - worldX, GROUND_Y - (obs.y + obs.h / 2));
            }
            continue;
          }

          // Jump Pad Springboard
          if (obs.kind === 'pad') {
            if (
              pBox.x + pBox.w > oLeft &&
              pBox.x < oRight &&
              pBox.y <= oTop + 6 &&
              pBox.y >= oBottom &&
              cubeVy >= 0
            ) {
              cubeVy = PAD_FORCE;
              onGround = false;
              playSynthJump();

              // PixelFX Pad EMP shockwave
              shockwaves.push({
                x: obs.x + obs.w / 2 - worldX,
                y: GROUND_Y - (obs.y + obs.h / 2),
                r: 6,
                maxR: 65,
                alpha: 1,
                color: '#ffcc00',
                thick: 3,
              });
            }
            continue;
          }

          // Mid-Air Jump Orb
          if (obs.kind === 'orb' && !obs.used) {
            const dist = Math.hypot(
              pBox.x + CUBE_SIZE / 2 - (obs.x + obs.w / 2),
              pBox.y + CUBE_SIZE / 2 - (obs.y + obs.h / 2)
            );
            // Auto-activate on contact (dist < 52) OR buffer hold (dist < 68)
            if (dist < 52 || (dist < 68 && isHoldingRef.current)) {
              activateOrb(obs);
              continue;
            }
          }

          // Spike Collision (Fair inner hitbox, supports inverted spikes)
          if (obs.kind === 'spike') {
            const innerPad = 9;
            const sLeft = oLeft + innerPad;
            const sRight = oRight - innerPad;
            const sBottom = obs.inverted ? oBottom + 6 : oBottom;
            const sTop = obs.inverted ? oTop : oTop - 6;

            if (
              pBox.x + pBox.w > sLeft &&
              pBox.x < sRight &&
              pBox.y < sTop &&
              pBox.y + pBox.h > sBottom
            ) {
              die();
              break;
            }
          }

          // Solid Block front wall collision
          if (obs.kind === 'block') {
            if (
              pBox.x + pBox.w > oLeft + 4 &&
              pBox.x < oRight - 4 &&
              pBox.y < oTop - 10 &&
              pBox.y + pBox.h > oBottom + 4
            ) {
              die();
              break;
            }
          }

          // Victory Finish Gate
          if (obs.kind === 'finish') {
            if (pBox.x + pBox.w >= oLeft) {
              stopBackgroundMusic();
              sfx.clear();
              setScore(lvl.length);
              setPercent(100);
              setScreen('victory');
              onGameOverRef.current(lvl.length);

              // PixelFX Confetti Blast
              for (let i = 0; i < 90; i++) {
                pixelParticles.push({
                  x: 450 + (Math.random() - 0.5) * 400,
                  y: 50 + Math.random() * 100,
                  vx: (Math.random() - 0.5) * 220,
                  vy: Math.random() * 120 + 40,
                  size: Math.random() * 6 + 4,
                  color: ['#00f0ff', '#ff2e93', '#ffcc00', '#39ff14', '#ffffff'][i % 5]!,
                  life: 2.5,
                  maxLife: 2.5,
                  kind: 'confetti',
                  rot: Math.random() * Math.PI,
                  vRot: (Math.random() - 0.5) * 8,
                });
              }
              break;
            }
          }
        }
      }

      // 3. DRAW GLOSSY OBSIDIAN GROUND & NEON CURB RAILS (SNAKE 3D AESTHETIC)
      const floorGrad = ctx!.createLinearGradient(0, GROUND_Y, 0, 450);
      floorGrad.addColorStop(0, '#0e0824');
      floorGrad.addColorStop(0.35, '#080317');
      floorGrad.addColorStop(1, '#03010a');
      ctx!.fillStyle = floorGrad;
      ctx!.fillRect(0, GROUND_Y, 900, 450 - GROUND_Y);

      // Cyber Grid Tiles on Floor (recalls Snake 3D obsidian arena grid)
      const groundOffset = (worldX % 36);
      ctx!.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx!.lineWidth = 1;
      for (let x = -groundOffset; x < 900; x += 36) {
        ctx!.strokeRect(x, GROUND_Y + 4, 36, 36);
        ctx!.strokeRect(x, GROUND_Y + 40, 36, 45);
      }

      // Neon cyber accent checkerboard tiles
      ctx!.fillStyle = `${lvl.accentColor}18`;
      for (let x = -groundOffset; x < 900; x += 72) {
        ctx!.fillRect(x + 4, GROUND_Y + 6, 28, 14);
        ctx!.fillRect(x + 40, GROUND_Y + 24, 28, 14);
      }

      // Subtle light reflection pool under the player
      const playerAltitudeRatio = Math.max(0, 1 - cubeY / 220);
      if (playerAltitudeRatio > 0.05) {
        const poolW = 54 + (1 - playerAltitudeRatio) * 30;
        const poolH = 8 * playerAltitudeRatio;
        const poolGrad = ctx!.createRadialGradient(cubeX + CUBE_SIZE / 2, GROUND_Y + 3, 2, cubeX + CUBE_SIZE / 2, GROUND_Y + 3, poolW / 2);
        poolGrad.addColorStop(0, `rgba(${lvl.id === 0 ? '0, 240, 255' : lvl.id === 1 ? '57, 255, 20' : '255, 0, 85'}, ${0.35 * playerAltitudeRatio})`);
        poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx!.fillStyle = poolGrad;
        ctx!.beginPath();
        ctx!.ellipse(cubeX + CUBE_SIZE / 2, GROUND_Y + 3, poolW / 2, poolH, 0, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Dual Neon Laser Curb (Directly inspired by Snake 3D's glowing rail pipes)
      // Lower secondary neon rail (Magenta / Pink)
      ctx!.strokeStyle = '#ff2e93';
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, GROUND_Y + 3);
      ctx!.lineTo(900, GROUND_Y + 3);
      ctx!.stroke();

      // Upper primary neon rail (Level Accent with intense neon bloom)
      ctx!.strokeStyle = lvl.accentColor;
      ctx!.lineWidth = 3.5;
      ctx!.shadowColor = lvl.accentColor;
      ctx!.shadowBlur = 14;
      ctx!.beginPath();
      ctx!.moveTo(0, GROUND_Y);
      ctx!.lineTo(900, GROUND_Y);
      ctx!.stroke();

      // White-hot inner core laser line
      ctx!.strokeStyle = '#ffffff';
      ctx!.lineWidth = 1.2;
      ctx!.beginPath();
      ctx!.moveTo(0, GROUND_Y);
      ctx!.lineTo(900, GROUND_Y);
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      // 4. DRAW ROBTOP AUTHENTIC OBSTACLES (SPIKES, BLOCKS, PADS, ORBS)
      for (const obs of obstacles) {
        const renderX = obs.x - worldX;
        if (renderX < -120 || renderX > 1020) continue;
        const renderY = GROUND_Y - obs.y - obs.h;

        if (obs.kind === 'spike') {
          renderRobTopSpike(ctx!, renderX, renderY, obs.w, obs.h, GROUND_Y - obs.y, currentTime, obs.inverted, lvl.accentColor);
        } else if (obs.kind === 'block') {
          renderRobTopBlock(ctx!, renderX, renderY, obs.w, obs.h, currentTime, lvl.accentColor);
        } else if (obs.kind === 'pad') {
          renderRobTopPad(ctx!, renderX, obs.y, obs.w, obs.h, GROUND_Y, currentTime);
        } else if (obs.kind === 'orb') {
          renderRobTopOrb(ctx!, renderX + obs.w / 2, renderY + obs.h / 2, obs.w, currentTime, obs.used);
        } else if (obs.kind === 'coin' && !obs.used) {
          renderRobTopCoin(ctx!, renderX + obs.w / 2, renderY + obs.h / 2, obs.w, currentTime);
        } else if (obs.kind === 'finish') {
          renderRobTopFinish(ctx!, renderX, renderY, obs.w, obs.h, currentTime, lvl.accentColor);
        } else if (obs.kind === 'portal_ship') {
          renderRobTopPortal(ctx!, renderX, renderY, obs.w, obs.h, 'ship', currentTime);
        } else if (obs.kind === 'portal_cube') {
          renderRobTopPortal(ctx!, renderX, renderY, obs.w, obs.h, 'cube', currentTime);
        } else if (obs.kind === 'portal_wave') {
          renderRobTopPortal(ctx!, renderX, renderY, obs.w, obs.h, 'wave', currentTime);
        } else if (obs.kind === 'billboard' && obs.photoUrl) {
          renderRobTopBillboard(ctx!, renderX, renderY, obs.w, obs.h, obs.photoUrl);
        }
      }

      // 5. DRAW CUBE TRAIL (SHADOW GHOSTS FALLING BACKWARDS)
      for (let i = cubeTrail.length - 1; i >= 0; i--) {
        const tr = cubeTrail[i]!;
        tr.alpha -= dt * 3.2;
        if (tr.alpha <= 0) {
          cubeTrail.splice(i, 1);
          continue;
        }

        const renderX = tr.worldX - worldX;
        if (renderX < -60) {
          cubeTrail.splice(i, 1);
          continue;
        }

        ctx!.save();
        ctx!.translate(renderX + CUBE_SIZE / 2, GROUND_Y - tr.y - CUBE_SIZE / 2);
        ctx!.rotate(tr.rot);
        ctx!.globalAlpha = tr.alpha * 0.45;

        // Faded ghost silhouette of the cube
        if (activeSkin.photoUrl) {
          const img = getImage(activeSkin.photoUrl);
          if (img) {
            ctx!.drawImage(img, -CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
          } else {
            ctx!.fillStyle = activeSkin.primaryColor;
            ctx!.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
          }
        } else {
          ctx!.fillStyle = activeSkin.primaryColor;
          ctx!.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
        }
        ctx!.strokeStyle = activeSkin.borderColor;
        ctx!.lineWidth = 2;
        ctx!.strokeRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);

        ctx!.restore();
      }

      // 5.5 DRAW WAVE NEON LINE TRAIL (SOLID ZIG-ZAG LASER BEAM)
      if (waveTrail.length > 1) {
        ctx!.save();
        ctx!.shadowColor = activeSkin.primaryColor || '#00f0ff';
        ctx!.shadowBlur = 14;
        ctx!.strokeStyle = activeSkin.primaryColor || '#00f0ff';
        ctx!.lineWidth = 4;
        ctx!.lineCap = 'round';
        ctx!.lineJoin = 'round';

        ctx!.beginPath();
        let first = true;
        for (const pt of waveTrail) {
          const rx = pt.worldX - worldX;
          const ry = GROUND_Y - pt.y;
          if (first) {
            ctx!.moveTo(rx, ry);
            first = false;
          } else {
            ctx!.lineTo(rx, ry);
          }
        }
        ctx!.stroke();

        // Inner white-hot laser core
        ctx!.shadowBlur = 0;
        ctx!.strokeStyle = '#ffffff';
        ctx!.lineWidth = 1.8;
        ctx!.stroke();
        ctx!.restore();
      }

      // 6. DRAW ACTIVE PLAYER (CUBE, SHIP OR WAVE)
      if (screenRef.current === 'playing' || screenRef.current === 'paused' || screenRef.current === 'menu') {
        const drawCubeX = screenRef.current === 'menu' ? 140 : cubeX;
        const drawCubeY = screenRef.current === 'menu' ? 0 : cubeY;

        ctx!.save();
        if (playerMode === 'wave' && screenRef.current !== 'menu') {
          const waveAngle = isHoldingRef.current ? -Math.PI / 4 : Math.PI / 4;
          ctx!.translate(drawCubeX + CUBE_SIZE / 2, GROUND_Y - drawCubeY - CUBE_SIZE / 2);
          renderRobTopWave(ctx!, activeSkin, waveAngle, currentTime);
        } else if (playerMode === 'ship' && screenRef.current !== 'menu') {
          ctx!.translate(drawCubeX + CUBE_SIZE / 2, GROUND_Y - drawCubeY - CUBE_SIZE / 2);
          ctx!.rotate(shipPitch);
          renderRobTopShip(ctx!, activeSkin, isHoldingRef.current, currentTime);
        } else {
          const drawRot = screenRef.current === 'menu' ? 0 : cubeRotation;
          ctx!.translate(drawCubeX + CUBE_SIZE / 2, GROUND_Y - drawCubeY - CUBE_SIZE / 2);
          ctx!.rotate(drawRot);
          renderCubeFace(ctx!, activeSkin, CUBE_SIZE);
        }
        ctx!.restore();
      }

      // 7. PIXELFX SHOCKWAVES (ADDITIVE BLEND)
      ctx!.save();
      ctx!.globalCompositeOperation = 'lighter';
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i]!;
        sw.r += dt * (sw.maxR * 4.5);
        sw.alpha -= dt * 3.0;

        if (sw.alpha <= 0 || sw.r >= sw.maxR) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx!.strokeStyle = sw.color;
        ctx!.globalAlpha = Math.max(0, sw.alpha);
        ctx!.lineWidth = sw.thick;
        ctx!.beginPath();
        ctx!.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.restore();

      // 8. PIXELFX PARTICLES (PIXEL PARTICLES ENGINE)
      for (let i = pixelParticles.length - 1; i >= 0; i--) {
        const p = pixelParticles[i]!;
        p.life -= dt;
        if (p.life <= 0) {
          pixelParticles.splice(i, 1);
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.kind === 'shard') {
          p.vy += 650 * dt; // gravity
          p.vx *= 0.985;    // air drag
          if (p.y > GROUND_Y - p.size / 2) {
            p.y = GROUND_Y - p.size / 2;
            p.vy = -p.vy * 0.45; // ground bounce
          }
        } else if (p.kind === 'smoke') {
          p.vy -= 40 * dt;  // buoyancy
          p.size += dt * 8; // expand
        } else if (p.kind === 'confetti') {
          p.y += 120 * dt;
          p.x += Math.sin(currentTime * 0.005 + i) * 60 * dt;
        }

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;

        if (p.rot !== undefined && p.vRot !== undefined) {
          p.rot += p.vRot * dt;
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.rot);
          ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx!.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx!.restore();
      }

      ctx!.restore();
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      targetSurface.removeEventListener('pointerdown', onPointerDown);
      targetSurface.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
      stopBackgroundMusic();
    };
  }, []);

  const handlePlayLevel = () => {
    playMenuClick();
    skinRef.current = CUBE_SKINS[selectedSkinIndex] || CUBE_SKINS[0]!;
    resetLevelRef.current();
    startBackgroundMusic();
    setScreen('playing');
  };

  const handleRestart = () => {
    playMenuClick();
    setAttempts((a) => a + 1); // Clean +1 attempt per restart
    skinRef.current = CUBE_SKINS[selectedSkinIndex] || CUBE_SKINS[0]!;
    resetLevelRef.current();
    startBackgroundMusic();
    setScreen('playing');
  };

  const handleBackToMenu = () => {
    playMenuClick();
    resetLevelRef.current();
    stopBackgroundMusic();
    setScreen('menu');
  };

  handleRestartRef.current = handleRestart;
  handleBackToMenuRef.current = handleBackToMenu;

  const handleNextLevel = () => {
    playMenuClick();
    const nextIdx = (selectedLevelIndex + 1) % LEVELS.length;
    setSelectedLevelIndex(nextIdx);
    try {
      localStorage.setItem('gd_selected_level_index', String(nextIdx));
    } catch {}
  };

  const handlePrevLevel = () => {
    playMenuClick();
    const prevIdx = (selectedLevelIndex - 1 + LEVELS.length) % LEVELS.length;
    setSelectedLevelIndex(prevIdx);
    try {
      localStorage.setItem('gd_selected_level_index', String(prevIdx));
    } catch {}
  };

  const handleSelectSkin = (index: number) => {
    playMenuClick();
    setSelectedSkinIndex(index);
    if (CUBE_SKINS[index]) {
      skinRef.current = CUBE_SKINS[index];
    }
    try {
      localStorage.setItem('gd_selected_skin_index', String(index));
    } catch {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sfx.muted = !next;
    if (!next) {
      stopBackgroundMusic();
    } else if (screen === 'playing') {
      startBackgroundMusic();
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-1 w-full h-full flex-col items-center justify-center select-none touch-none">
      <div className="relative aspect-[900/450] max-h-full w-full max-w-[940px] overflow-hidden rounded-2xl bg-[#090314] shadow-2xl">
        <canvas ref={canvasRef} className="block h-full w-full cursor-pointer touch-none select-none" />

        {/* ========================================================
            HUD OVERLAY DURING GAMEPLAY
           ======================================================== */}
        {screen === 'playing' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-5">
            {/* Level Info & Progress */}
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  stopBackgroundMusic();
                  setScreen('paused');
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:h-10 sm:w-10"
                title="Пауза (Esc)"
              >
                <Pause className="h-4 w-4 fill-white" />
              </button>

              <div className="flex flex-col">
                <span className="font-display text-xs font-black italic text-white uppercase drop-shadow-[0_2px_0_#000] sm:text-sm">
                  {currentLevel.name}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-fuchsia-300/80 uppercase">
                  ПОПЫТКА {attempts}
                </span>
              </div>
            </div>

            {/* Central Progress Bar */}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-black italic text-[#00f0ff] drop-shadow-[0_2px_0_#000] sm:text-lg">
                  {percent}%
                </span>
              </div>
              <div className="h-2 w-36 overflow-hidden rounded-full border border-white/20 bg-black/60 sm:w-56">
                <div
                  className="h-full bg-gradient-to-r from-[#00f0ff] via-[#ff2e93] to-[#ffe600] transition-all duration-75"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Collected Coins & Sound */}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 px-2 py-1 backdrop-blur-md">
                {coinsCollected.map((c, i) => (
                  <Sparkles
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      c ? 'text-amber-300 fill-amber-300 filter drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'text-white/20'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={toggleSound}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:h-10 sm:w-10"
                title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            1. MAIN MENU: 3-LEVEL CAROUSEL + GIANT PLAY + GARAGE
           ======================================================== */}
        {screen === 'menu' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between bg-gradient-to-b from-[#0e032488] via-transparent to-[#0a011aee] p-4 sm:p-6 backdrop-blur-[2px]">
            {/* Top Logo */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2 rounded-full border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-3 py-0.5">
                <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-ping" />
                <span className="font-display text-xs font-black tracking-widest text-[#00f0ff] uppercase">
                  OKЭI FESTIVAL 2026 • 3 ЭПИЧЕСКИХ УРОВНЯ
                </span>
              </div>
              <h1 className="font-display mt-0.5 text-3xl font-black italic tracking-tight text-white drop-shadow-[0_4px_0_#000] sm:text-5xl">
                <span className="bg-gradient-to-b from-[#fff066] to-[#ffaa00] bg-clip-text text-transparent [-webkit-text-stroke:2px_#000]">
                  GEOMETRY{' '}
                </span>
                <span className="bg-gradient-to-b from-[#00ffff] to-[#0088ff] bg-clip-text text-transparent [-webkit-text-stroke:2px_#000]">
                  DASH
                </span>
              </h1>
            </div>

            {/* Central Play Button & Garage */}
            <div className="my-auto flex items-center justify-center gap-8 sm:gap-14">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playMenuClick();
                    setScreen('garage');
                  }}
                  title={`Гараж: ${selectedSkin.name}`}
                  className="group relative flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#00f0ff] bg-gradient-to-b from-[#00ffff] via-[#00aaff] to-[#0055cc] shadow-[0_0_20px_rgba(0,240,255,0.6)] transition active:scale-95 hover:scale-105 sm:h-16 sm:w-16 overflow-hidden p-1"
                >
                  {selectedSkin.photoUrl ? (
                    <img
                      src={selectedSkin.photoUrl}
                      alt={selectedSkin.name}
                      className="h-full w-full rounded-xl object-cover border border-white/60"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black"
                      style={{ backgroundColor: selectedSkin.primaryColor }}
                    >
                      <div
                        className="h-4 w-4 rounded-sm border border-black"
                        style={{ backgroundColor: selectedSkin.secondaryColor }}
                      />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00f0ff] text-black shadow">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                </button>
                <span className="font-display text-[10px] font-black tracking-wider text-cyan-200 uppercase drop-shadow-[0_2px_0_#000]">
                  ГАРАЖ
                </span>
                <span className="max-w-[90px] truncate text-center text-[9px] font-black text-amber-300 drop-shadow">
                  {selectedSkin.name}
                </span>
              </div>

              {/* GIANT ROBTOP PLAY BUTTON */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayLevel}
                  title={`Играть уровень ${currentLevel.name}`}
                  className="group relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#ccff00] bg-gradient-to-b from-[#39ff14] via-[#22cc22] to-[#0f7a0f] shadow-[0_0_35px_rgba(57,255,20,0.7)] transition active:scale-90 hover:scale-105 sm:h-28 sm:w-28"
                >
                  <Play className="ml-1 h-12 w-12 fill-white text-white drop-shadow-[0_3px_0_#000] sm:h-14 sm:w-14" />
                </button>
                <span className="font-display text-xs font-black tracking-widest text-[#ccff00] uppercase drop-shadow-[0_2px_0_#000]">
                  ИГРАТЬ
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-fuchsia-400 bg-gradient-to-b from-[#ff2e93] to-[#99004d] shadow-[0_0_20px_rgba(255,46,147,0.6)] transition active:scale-95 hover:scale-105 sm:h-16 sm:w-16"
                >
                  {soundEnabled ? <Volume2 className="h-6 w-6 text-white" /> : <VolumeX className="h-6 w-6 text-white" />}
                </button>
                <span className="font-display text-[10px] font-black tracking-wider text-fuchsia-200 uppercase drop-shadow-[0_2px_0_#000]">
                  {soundEnabled ? 'ЗВУК ВКЛ' : 'МУТ'}
                </span>
              </div>
            </div>

            {/* 3-LEVEL CAROUSEL CARD */}
            <div className="w-full max-w-[560px] rounded-2xl border-2 border-white/20 bg-[#160633]/90 p-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrevLevel}
                  aria-label="Предыдущий уровень"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex flex-1 items-center justify-center gap-3">
                  {currentLevel.difficulty === 'easy' && (
                    <EasyDifficultyFace className="h-12 w-12 shrink-0 drop-shadow-[0_3px_0_#000]" />
                  )}
                  {currentLevel.difficulty === 'normal' && (
                    <NormalDifficultyFace className="h-12 w-12 shrink-0 drop-shadow-[0_3px_0_#000]" />
                  )}
                  {currentLevel.difficulty === 'hard' && (
                    <HardDifficultyFace className="h-12 w-12 shrink-0 drop-shadow-[0_3px_0_#000]" />
                  )}

                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-black italic text-white uppercase drop-shadow-[0_2px_0_#000] sm:text-lg">
                        {currentLevel.name}
                      </h3>
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                        {selectedLevelIndex + 1}/{LEVELS.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
                      <span>{'⭐'.repeat(currentLevel.difficultyStars)} {currentLevel.difficultyStars} ЗВ.</span>
                      <span className="text-white/40">•</span>
                      <span
                        className={
                          currentLevel.difficulty === 'easy'
                            ? 'text-cyan-400'
                            : currentLevel.difficulty === 'normal'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {currentLevel.difficulty.toUpperCase()}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/70">{currentLevel.length}m</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextLevel}
                  aria-label="Следующий уровень"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            2. GARAGE (ICON KIT) WITH 12 AUTHENTIC SKINS
           ======================================================== */}
        {screen === 'garage' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-[#0e0324]/95 p-4 sm:p-6 backdrop-blur-lg">
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  skinRef.current = selectedSkin;
                  setScreen('menu');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 font-display text-xs font-black text-white uppercase transition hover:bg-white/20 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" /> В МЕНЮ
              </button>

              <h2 className="font-display text-xl font-black italic tracking-wide text-white uppercase sm:text-2xl drop-shadow-[0_3px_0_#000]">
                ГАРАЖ (ICON KIT)
              </h2>

              <div className="w-20 text-right text-xs font-bold text-amber-300">
                {CUBE_SKINS.length} СКИНОВ
              </div>
            </div>

            {/* Active Preview */}
            <div className="flex flex-col items-center gap-2">
              {selectedSkin.photoUrl ? (
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-4 overflow-hidden shadow-2xl transition-transform hover:scale-105 sm:h-24 sm:w-24"
                  style={{
                    borderColor: selectedSkin.borderColor,
                    boxShadow: `0 0 25px ${selectedSkin.primaryColor}`,
                  }}
                >
                  <img
                    src={selectedSkin.photoUrl}
                    alt={selectedSkin.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-4 shadow-2xl transition-transform hover:scale-105 sm:h-24 sm:w-24"
                  style={{
                    backgroundColor: selectedSkin.primaryColor,
                    borderColor: selectedSkin.borderColor,
                  }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-black"
                    style={{ backgroundColor: selectedSkin.secondaryColor }}
                  >
                    <div
                      className="h-3 w-8 rounded-sm"
                      style={{ backgroundColor: selectedSkin.eyeColor }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 rounded-full border border-[#00f0ff] bg-[#00f0ff]/15 px-3 py-0.5">
                <Check className="h-3.5 w-3.5 text-[#00f0ff]" />
                <span className="font-display text-[10px] font-black tracking-wider text-[#00f0ff] uppercase">
                  ВЫБРАН (EQUIPPED)
                </span>
              </div>

              <span className="font-display text-sm font-black italic text-[#00f0ff] uppercase">
                {selectedSkin.name}
              </span>
            </div>

            {/* Skins Grid */}
            <div className="grid w-full max-w-[620px] grid-cols-6 gap-2 sm:gap-3">
              {CUBE_SKINS.map((skin, idx) => {
                const isSelected = idx === selectedSkinIndex;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => handleSelectSkin(idx)}
                    title={skin.name}
                    className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-1 transition-all active:scale-90 hover:scale-105 ${
                      isSelected
                        ? 'border-[#00f0ff] bg-white/20 shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-105 ring-2 ring-[#00f0ff]'
                        : 'border-white/15 bg-black/40 hover:border-white/40'
                    }`}
                  >
                    {skin.photoUrl ? (
                      <img
                        src={skin.photoUrl}
                        alt={skin.name}
                        className="h-8 w-8 rounded-md object-cover border"
                        style={{ borderColor: skin.borderColor }}
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md border"
                        style={{
                          backgroundColor: skin.primaryColor,
                          borderColor: skin.borderColor,
                        }}
                      >
                        <div
                          className="h-4 w-4 rounded-sm border border-black"
                          style={{ backgroundColor: skin.secondaryColor }}
                        />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00f0ff] text-black">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  skinRef.current = selectedSkin;
                  resetLevelRef.current();
                  startBackgroundMusic();
                  setScreen('playing');
                }}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ccff00] to-[#00f0ff] px-6 py-2.5 font-display text-xs font-black text-black uppercase shadow-[0_0_20px_rgba(204,255,0,0.6)] hover:brightness-110 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-black" /> ИГРАТЬ С ЭТИМ СКИНОМ
              </button>
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  skinRef.current = selectedSkin;
                  setScreen('menu');
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 font-display text-xs font-black text-white uppercase hover:bg-white/20 active:scale-95"
              >
                В МЕНЮ
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            3. PAUSE OVERLAY
           ======================================================== */}
        {screen === 'paused' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d0322e6] p-6 backdrop-blur-md text-center">
            <h2 className="font-display mb-6 text-3xl font-black italic text-white uppercase drop-shadow-[0_4px_0_#000]">
              ПАУЗА
            </h2>
            <div className="flex flex-col gap-3 w-64">
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  startBackgroundMusic();
                  setScreen('playing');
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] py-3 font-display text-xs font-black text-black uppercase shadow-lg hover:brightness-110 active:scale-95"
              >
                <Play className="h-4 w-4 fill-black" /> ПРОДОЛЖИТЬ
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-3 font-display text-xs font-black text-white uppercase hover:bg-white/20 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" /> ЗАНОВО С 0%
              </button>
              <button
                type="button"
                onClick={handleBackToMenu}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 font-display text-xs font-black text-rose-300 uppercase hover:bg-rose-500/20 active:scale-95"
              >
                В ГЛАВНОЕ МЕНЮ
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            4. VICTORY MODAL (100% COMPLETE!)
           ======================================================== */}
        {screen === 'victory' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#07011be8] p-6 text-center backdrop-blur-md">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-500/20 px-3.5 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" /> НОВЫЙ РЕКОРД!
              </div>
            )}
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-500/20 px-4 py-1.5 text-xs font-black text-amber-300 uppercase shadow-[0_0_20px_rgba(251,191,36,0.6)]">
              <Zap className="h-4 w-4" /> {currentLevel.name} ПРОЙДЕН НА 100%!
            </div>
            <h2 className="font-display mb-1 text-4xl font-black italic text-white uppercase drop-shadow-[0_4px_0_#000] sm:text-5xl">
              ПОБЕДА!
            </h2>
            <p className="mt-1 text-sm text-fuchsia-200">
              Очки уровня зачислены в фестивальный рейтинг: <span className="font-display text-lg font-black text-[#00f0ff]">{currentLevel.length}</span>
            </p>

            <div className="my-4 flex items-center justify-center gap-3">
              {coinsCollected.map((c, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    c
                      ? 'border-amber-300 bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-bounce'
                      : 'border-white/20 bg-black/40 text-white/20'
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex min-h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#0088ff] px-8 py-2.5 font-display text-xs font-black text-black uppercase shadow-lg hover:brightness-110 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" /> ЕЩЁ РАЗ
              </button>
              <button
                type="button"
                onClick={handleBackToMenu}
                className="flex min-h-[46px] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 font-display text-xs font-black text-white uppercase hover:bg-white/20 active:scale-95"
              >
                В МЕНЮ
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            5. GAME OVER MODAL (AUTHENTIC ATTEMPT COMPLETE)
           ======================================================== */}
        {screen === 'gameover' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-md rounded-[28px] border-2 border-[#ff2e93] bg-[#120726]/95 p-6 text-center shadow-[0_0_35px_rgba(255,46,147,0.45)] sm:p-8">
              <div
                className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff66d9] to-transparent opacity-90"
                aria-hidden="true"
              />

              <h2 className="font-display mb-2 text-2xl font-black italic tracking-wide text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-3xl">
                ПОПЫТКА {attempts} ЗАВЕРШЕНА
              </h2>

              <p className="mb-4 text-xs font-semibold text-white/80 sm:text-sm">
                Прогресс:{' '}
                <span className="font-display font-black text-[#00f0ff]">
                  {percent}%
                </span>{' '}
                • Счёт:{' '}
                <span className="font-display font-black text-[#ffe600]">
                  {score}
                </span>{' '}
                <span className="text-white/60">
                  (Рекорд: {Math.max(bestScore, score)})
                </span>
              </p>

              <div className="mb-6 flex flex-col items-center gap-1.5">
                <div className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                  СЕКРЕТНЫЕ МОНЕТЫ:
                </div>
                <div className="flex items-center gap-2.5">
                  {coinsCollected.map((collected, i) => (
                    <div
                      key={i}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                        collected
                          ? 'border-amber-400/80 bg-amber-400/20 text-[#ffe600] shadow-[0_0_12px_rgba(255,230,0,0.6)]'
                          : 'border-white/15 bg-white/5 text-white/25'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex min-h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e93] via-[#c026d3] to-[#00f0ff] px-7 py-2.5 font-display text-xs font-black text-white uppercase shadow-[0_0_20px_rgba(255,46,147,0.5)] transition hover:brightness-110 active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  ПОВТОРИТЬ
                </button>
                <button
                  type="button"
                  onClick={handleBackToMenu}
                  className="flex min-h-[46px] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 font-display text-xs font-black text-white uppercase transition hover:bg-white/20 active:scale-95"
                >
                  МЕНЮ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
