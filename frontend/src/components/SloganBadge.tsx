import React from 'react';

/**
 * Clean bottom-right festival slogan lockup without any outer box/border.
 */
export const SloganBadge: React.FC = () => {
  return (
    <div className="ml-auto inline-flex items-center gap-3.5 py-1 sm:gap-4">
      <div className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-4 w-5 -skew-x-[26deg] bg-gradient-to-t from-[#db2777] via-[#ec4899] to-[#f472b6] shadow-[0_0_14px_rgba(255,46,147,0.75)] sm:h-5 sm:w-6"
          />
        ))}
      </div>
      <span className="okei-slogan-neon text-base leading-none uppercase sm:text-2xl">
        ИГРАЙ. РАЗВИВАЙСЯ. ПОБЕЖДАЙ!
      </span>
    </div>
  );
};
