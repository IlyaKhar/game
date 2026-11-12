import React from 'react';
import type { GameId } from '../../types/festival';

/**
 * Renders crisp textless game artwork inside each festival card.
 * Uses generated high-res art where available and bespoke vector illustrations otherwise.
 */
export const GameCardArtwork: React.FC<{ gameId: GameId }> = ({ gameId }) => {
  if (gameId === 'block') {
    return (
      <img
        src="/art/card-block.jpg"
        alt=""
        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  if (gameId === 'dino') {
    return (
      <svg viewBox="0 0 320 340" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="dinoBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="55%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <rect width="320" height="340" fill="url(#dinoBg)" />
        {/* Sun & Desert Ridges */}
        <circle cx="245" cy="86" r="46" fill="#fde047" opacity="0.88" />
        <path d="M0 240 L75 180 L145 225 L235 165 L320 220 L320 340 L0 340 Z" fill="#581c87" opacity="0.7" />
        {/* Cacti */}
        <g fill="#2e1065" stroke="#c084fc" strokeWidth="2">
          <rect x="248" y="166" width="16" height="62" rx="8" />
          <rect x="234" y="182" width="14" height="10" rx="5" />
          <rect x="234" y="168" width="10" height="22" rx="5" />
          <rect x="264" y="176" width="14" height="10" rx="5" />
          <rect x="270" y="160" width="10" height="24" rx="5" />
        </g>
        {/* Floating Grass Platforms */}
        <g transform="translate(24, 240)">
          <rect x="0" y="0" width="92" height="24" rx="6" fill="#78350f" stroke="#1e0b36" strokeWidth="3" />
          <rect x="0" y="0" width="92" height="10" rx="4" fill="#4ade80" stroke="#1e0b36" strokeWidth="3" />
        </g>
        <g transform="translate(150, 224)">
          <rect x="0" y="0" width="135" height="26" rx="6" fill="#78350f" stroke="#1e0b36" strokeWidth="3" />
          <rect x="0" y="0" width="135" height="10" rx="4" fill="#4ade80" stroke="#1e0b36" strokeWidth="3" />
        </g>
        {/* Speed Lines */}
        <g stroke="#fde047" strokeWidth="4" strokeLinecap="round" opacity="0.85">
          <line x1="28" y1="88" x2="88" y2="88" />
          <line x1="18" y1="110" x2="78" y2="110" />
          <line x1="40" y1="132" x2="92" y2="132" />
        </g>
        {/* Purple Cool Dino with Sunglasses & Red Sneakers */}
        <g transform="translate(94, 86)">
          <g className="animate-float-slow">
            {/* Tail */}
            <path d="M18 110 L-16 86 L-12 72 L24 88 Z" fill="#a855f7" stroke="#1e0b36" strokeWidth="4" strokeLinejoin="round" />
            {/* Body */}
            <rect x="22" y="54" width="66" height="80" rx="14" fill="#a855f7" stroke="#1e0b36" strokeWidth="4" />
            <rect x="44" y="72" width="38" height="50" rx="8" fill="#d8b4fe" />
            {/* Head */}
            <rect x="38" y="4" width="84" height="58" rx="14" fill="#a855f7" stroke="#1e0b36" strokeWidth="4" />
            {/* Mouth / Grin */}
            <path d="M84 44 L118 44" stroke="#1e0b36" strokeWidth="4" strokeLinecap="round" />
            <polygon points="92,44 97,52 102,44" fill="#ffffff" />
            <polygon points="106,44 111,52 116,44" fill="#ffffff" />
            {/* Cool Black Sunglasses */}
            <rect x="64" y="16" width="58" height="18" rx="4" fill="#09090b" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="72" y1="22" x2="84" y2="22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            {/* Little Arm */}
            <rect x="78" y="84" width="24" height="14" rx="6" fill="#9333ea" stroke="#1e0b36" strokeWidth="3.5" />
            {/* Legs & Red Sneakers */}
            <rect x="28" y="130" width="18" height="26" rx="5" fill="#9333ea" stroke="#1e0b36" strokeWidth="3.5" />
            <rect x="64" y="126" width="18" height="24" rx="5" fill="#9333ea" stroke="#1e0b36" strokeWidth="3.5" />
            <rect x="22" y="150" width="34" height="16" rx="7" fill="#ef4444" stroke="#1e0b36" strokeWidth="3.5" />
            <rect x="60" y="144" width="34" height="16" rx="7" fill="#ef4444" stroke="#1e0b36" strokeWidth="3.5" />
          </g>
        </g>
      </svg>
    );
  }

  if (gameId === 'snake') {
    return (
      <svg viewBox="0 0 320 340" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="snakeBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="snakeBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect width="320" height="340" fill="url(#snakeBg)" />
        {/* Neon Perspective Grid */}
        <g stroke="#3b82f6" strokeOpacity="0.28" strokeWidth="1.5">
          {[40, 85, 130, 175, 220, 265, 310].map((y) => (
            <line key={y} x1="0" y1={y} x2="320" y2={y} />
          ))}
          {[35, 80, 125, 170, 215, 260, 305].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="340" />
          ))}
        </g>
        {/* 3 Glossy Red Apples */}
        {[
          { x: 56, y: 120 },
          { x: 266, y: 92 },
          { x: 256, y: 204 },
        ].map((a, i) => (
          <g key={i} transform={`translate(${a.x}, ${a.y})`}>
            <circle cx="0" cy="0" r="19" fill="#ef4444" stroke="#7f1d1d" strokeWidth="3" />
            <circle cx="-6" cy="-6" r="5" fill="#fca5a5" opacity="0.85" />
            <path d="M0 -18 Q4 -28 12 -24" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
        ))}
        {/* Glowing S-Curve Snake */}
        <g className="animate-float-slow">
          <path
            d="M95 256 C55 245, 70 198, 155 186 C235 174, 240 124, 165 112 C110 104, 125 68, 170 66"
            fill="none"
            stroke="url(#snakeBody)"
            strokeWidth="34"
            strokeLinecap="round"
          />
          <path
            d="M95 256 C55 245, 70 198, 155 186 C235 174, 240 124, 165 112 C110 104, 125 68, 170 66"
            fill="none"
            stroke="#e0f2fe"
            strokeOpacity="0.4"
            strokeWidth="8"
            strokeDasharray="10 18"
            strokeLinecap="round"
          />
          {/* Cute Expressive Snake Head */}
          <g transform="translate(172, 64)">
            <ellipse cx="0" cy="0" rx="28" ry="23" fill="#6366f1" stroke="#c084fc" strokeWidth="3" />
            <circle cx="-10" cy="-7" r="7" fill="#ffffff" />
            <circle cx="10" cy="-7" r="7" fill="#ffffff" />
            <circle cx="-9" cy="-7" r="3.5" fill="#09090b" />
            <circle cx="11" cy="-7" r="3.5" fill="#09090b" />
            <path d="M-8 10 Q0 16 8 10" stroke="#f472b6" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    );
  }

  if (gameId === 'gd') {
    return (
      <svg viewBox="0 0 320 340" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="gdBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="65%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#831843" />
          </linearGradient>
          <linearGradient id="gdCube" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <rect width="320" height="340" fill="url(#gdBg)" />
        {/* Floating Neon Geometry Shapes */}
        <rect x="42" y="76" width="32" height="32" rx="4" transform="rotate(-18 58 92)" fill="none" stroke="#38bdf8" strokeWidth="3.5" />
        <rect x="242" y="64" width="24" height="24" rx="3" fill="none" stroke="#f472b6" strokeWidth="3.5" />
        <circle cx="258" cy="144" r="6" fill="#38bdf8" />
        <circle cx="62" cy="154" r="5" fill="#f472b6" />
        {/* Ground & Laser Line */}
        <rect x="0" y="242" width="320" height="98" fill="#1b0736" />
        <line x1="0" y1="242" x2="320" y2="242" stroke="#f472b6" strokeWidth="4" />
        {/* Sharp Spikes */}
        {[24, 68, 182, 226, 270].map((x) => (
          <polygon
            key={x}
            points={`${x},242 ${x + 22},192 ${x + 44},242`}
            fill="#581c87"
            stroke="#c084fc"
            strokeWidth="3"
          />
        ))}
        {/* Vertical Jump Beam */}
        <line x1="158" y1="158" x2="158" y2="242" stroke="#fde047" strokeWidth="5" strokeOpacity="0.6" />
        {/* Angry Golden Geometry Dash Cube */}
        <g transform="translate(160, 126) rotate(-14)">
          <g className="animate-float-slow">
            <rect x="-42" y="-42" width="84" height="84" rx="10" fill="url(#gdCube)" stroke="#09090b" strokeWidth="5" />
            {/* Angry Eyes */}
            <polygon points="-26,-18 -6,-8 -22,-2" fill="#09090b" />
            <polygon points="26,-18 6,-8 22,-2" fill="#09090b" />
            {/* Mouth */}
            <rect x="-24" y="10" width="48" height="16" rx="3" fill="#09090b" />
            <rect x="-14" y="10" width="8" height="6" fill="#fde047" />
            <rect x="6" y="10" width="8" height="6" fill="#fde047" />
          </g>
        </g>
      </svg>
    );
  }

  // Subway Surfers Fest
  return (
    <svg viewBox="0 0 320 340" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="subSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="45%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width="320" height="340" fill="url(#subSky)" />
      {/* Sunset Ground & Rails */}
      <polygon points="0,340 120,175 200,175 320,340" fill="#311052" />
      <line x1="138" y1="175" x2="48" y2="340" stroke="#e2e8f0" strokeWidth="4" />
      <line x1="182" y1="175" x2="272" y2="340" stroke="#e2e8f0" strokeWidth="4" />
      {/* Left & Right Metro Trains */}
      <g transform="translate(-8, 108)">
        <polygon points="0,12 78,42 78,162 0,192" fill="#6366f1" stroke="#1e0b36" strokeWidth="3.5" />
        <polygon points="10,48 64,66 64,104 10,92" fill="#38bdf8" stroke="#1e0b36" strokeWidth="2.5" />
      </g>
      <g transform="translate(242, 108)">
        <polygon points="86,12 8,42 8,162 86,192" fill="#ec4899" stroke="#1e0b36" strokeWidth="3.5" />
        <polygon points="74,48 22,66 22,104 74,92" fill="#fde047" stroke="#1e0b36" strokeWidth="2.5" />
      </g>
      {/* Dashing Skater Kid */}
      <g transform="translate(160, 184)">
        <g className="animate-float-slow">
          {/* Backpack */}
          <rect x="-34" y="-44" width="24" height="44" rx="8" fill="#0ea5e9" stroke="#1e0b36" strokeWidth="3.5" />
          {/* Hoodie Body */}
          <rect x="-24" y="-46" width="50" height="62" rx="14" fill="#f8fafc" stroke="#1e0b36" strokeWidth="3.5" />
          <rect x="-12" y="-34" width="26" height="22" rx="5" fill="#fb923c" />
          {/* Head */}
          <circle cx="2" cy="-76" r="28" fill="#fed7aa" stroke="#1e0b36" strokeWidth="3.5" />
          {/* Eyes & Smile */}
          <circle cx="-7" cy="-75" r="4" fill="#09090b" />
          <circle cx="11" cy="-75" r="4" fill="#09090b" />
          <path d="M-4 -62 Q3 -55 10 -62" stroke="#09090b" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Red-White Cap */}
          <path d="M-28 -84 C-26 -112, 28 -112, 30 -84 Z" fill="#ef4444" stroke="#1e0b36" strokeWidth="3.5" />
          <rect x="-12" y="-102" width="24" height="16" rx="4" fill="#ffffff" />
          <path d="M-28 -84 L38 -80 L30 -74 L-26 -78 Z" fill="#dc2626" stroke="#1e0b36" strokeWidth="3" />
          {/* Legs & Red Sneakers */}
          <rect x="-22" y="14" width="16" height="36" rx="6" transform="rotate(14 -14 14)" fill="#1d4ed8" stroke="#1e0b36" strokeWidth="3.5" />
          <rect x="8" y="14" width="16" height="34" rx="6" transform="rotate(-16 16 14)" fill="#1d4ed8" stroke="#1e0b36" strokeWidth="3.5" />
          <ellipse cx="-24" cy="54" rx="18" ry="10" fill="#ef4444" stroke="#1e0b36" strokeWidth="3.5" />
          <ellipse cx="26" cy="50" rx="18" ry="10" fill="#ef4444" stroke="#1e0b36" strokeWidth="3.5" />
        </g>
      </g>
    </svg>
  );
};

