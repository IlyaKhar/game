import React from 'react';

/**
 * Full-bleed stylized synthwave sunset background based on the real OKEI college building.
 */
export const CollegeSceneBg: React.FC<{ dimmed?: boolean }> = ({ dimmed = false }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#14062b]">
      <img
        src="/art/bg-festival.jpg"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover object-center"
      />

      {/* Subtle bottom vignette so footer controls and cards always pop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(18, 6, 40, 0.12) 0%, rgba(18, 6, 40, 0.04) 45%, rgba(15, 5, 34, 0.42) 100%)',
        }}
      />

      {dimmed && (
        <div className="absolute inset-0 bg-[#0d051a]/65 backdrop-blur-[4px]" />
      )}
    </div>
  );
};
