import React from 'react';

/**
 * Synthwave sunset festival backdrop combining the real OKEI college photo
 * placed in the center-right composition with sunset sky, city skyline, and plaza.
 */
export const CollegeSceneBg: React.FC<{ dimmed?: boolean }> = ({ dimmed = false }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#170730]">
      {/* Sunset Synthwave Sky */}
      <div
        className="absolute inset-x-0 top-0 h-[68%]"
        style={{
          background:
            'linear-gradient(155deg, #2e0a5e 0%, #7a1b8e 36%, #d9468f 68%, #fb923c 92%, #fde047 100%)',
        }}
      />

      {/* Real OKEI Building Photo positioned in center-right like the mockup & blended into the sunset */}
      <div
        className="absolute right-0 top-[8%] h-[58%] w-full sm:w-[74%] lg:w-[64%]"
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 18%, black 35%, black 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 14%, black 85%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 18%, black 35%, black 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 14%, black 85%, transparent 100%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      >
        <img
          src="/art/okei-college.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center contrast-[1.15] saturate-[1.25] brightness-[0.9]"
        />
        {/* Sunset tint over real building */}
        <div
          className="absolute inset-0 mix-blend-color"
          style={{
            background: 'linear-gradient(140deg, #9333ea 0%, #ec4899 55%, #f97316 100%)',
            opacity: 0.45,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            background: 'linear-gradient(180deg, #f472b6 0%, #7e22ce 100%)',
            opacity: 0.55,
          }}
        />
      </div>

      {/* Left Distant City Skyline + Framing Silhouette Foliage */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="plazaFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b1166" />
            <stop offset="48%" stopColor="#230842" />
            <stop offset="100%" stopColor="#120426" />
          </linearGradient>
        </defs>

        {/* Left City Skyline */}
        <g fill="#4c1d7a" opacity="0.65">
          <rect x="105" y="420" width="46" height="145" />
          <rect x="158" y="388" width="56" height="177" />
          <rect x="222" y="440" width="42" height="125" />
          <rect x="272" y="398" width="60" height="167" />
          <rect x="342" y="448" width="48" height="117" />
        </g>

        {/* Purple Perspective Cobblestone Plaza */}
        <rect x="0" y="555" width="1600" height="345" fill="url(#plazaFloor)" opacity="0.96" />
        <g stroke="#a855f7" strokeWidth="2" strokeOpacity="0.28">
          <line x1="0" y1="598" x2="1600" y2="598" />
          <line x1="0" y1="650" x2="1600" y2="650" />
          <line x1="0" y1="718" x2="1600" y2="718" />
          <line x1="0" y1="805" x2="1600" y2="805" />
          {[-550, -300, -100, 100, 300, 500, 700, 900, 1100, 1300, 1500, 1750, 2000].map((x, idx) => (
            <line key={idx} x1="800" y1="555" x2={x} y2="900" />
          ))}
        </g>

        {/* Framing Trees */}
        <g stroke="#1b0736" strokeWidth="4">
          <circle cx="70" cy="510" r="88" fill="#581c87" />
          <circle cx="155" cy="480" r="76" fill="#4d7c0f" />
          <circle cx="235" cy="505" r="64" fill="#65a30d" />
          <circle cx="1510" cy="435" r="85" fill="#65a30d" />
          <circle cx="1575" cy="495" r="78" fill="#4d7c0f" />
        </g>
      </svg>

      {dimmed && (
        <div className="absolute inset-0 bg-[#0d051a]/62 backdrop-blur-[3px]" />
      )}
    </div>
  );
};
