import React from 'react';
import type { GameId } from '../../types/festival';

const CARD_ART: Record<GameId, { src: string; pos: string }> = {
  dino: { src: '/art/card-dino.jpg', pos: 'object-[center_22%]' },
  snake: { src: '/art/card-snake.jpg', pos: 'object-[center_25%]' },
  gd: { src: '/art/card-gd.jpg', pos: 'object-[center_30%]' },
  block: { src: '/art/card-block.jpg', pos: 'object-center' },
  subway: { src: '/art/card-subway.jpg', pos: 'object-[center_20%]' },
};

/**
 * Renders clean textless artwork inside each festival card so real crisp typography sits on top.
 */
export const GameCardArtwork: React.FC<{ gameId: GameId }> = ({ gameId }) => {
  const art = CARD_ART[gameId];
  return (
    <img
      src={art.src}
      alt=""
      aria-hidden="true"
      className={`h-full w-full object-cover ${art.pos} transition-transform duration-500 group-hover:scale-105`}
    />
  );
};
