import React from 'react';
import { useChanting } from './ChantingContext';
import { WoodenFish } from '../../components/WoodenFish';

export const ChantingView: React.FC = () => {
  const { count, handleHit, activeScripture } = useChanting();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <h2 className="text-2xl font-serif font-bold mb-4">{activeScripture.title}</h2>
      <div className="text-6xl font-serif font-bold text-zen-accent mb-12">{count}</div>
      <WoodenFish onHit={handleHit} />
    </div>
  );
};