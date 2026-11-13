/// <reference types="vite/client" />
import React, { useEffect, useRef } from 'react';

interface FestivalRunnerGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

export const FestivalRunnerGame: React.FC<FestivalRunnerGameProps> = ({ onGameOver }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function receiveScore(event: MessageEvent<unknown>) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (typeof data !== 'object' || data === null || !('type' in data) || !('score' in data)) return;
      if (data.type !== 'festival-runner:gameover' || typeof data.score !== 'number' || !Number.isSafeInteger(data.score) || data.score < 0) return;
      onGameOver(data.score);
    }
    window.addEventListener('message', receiveScore);
    return () => window.removeEventListener('message', receiveScore);
  }, [onGameOver]);

  return (
    <iframe
      ref={frameRef}
      title="Festival Runner"
      src={`${import.meta.env.BASE_URL}festival-runner/index.html`}
      className="min-h-[440px] w-full flex-1 border-0"
      allow="fullscreen"
    />
  );
};
