'use client';

import React from 'react';

export const DEMOS = [
  { label: 'Classic 808', file: '/demos/808-demo.mp3' },
  { label: 'Hand Perc Groove', file: '/demos/handperc-demo.mp3' },
];

const DemoDisplay = () => {
  return (
    <div className='px-8 py-4 bg-zinc-900/30 border-b border-zinc-800 flex items-center gap-4'>
      <span className='text-[10px] text-blue-400 uppercase font-bold tracking-tighter'>
        Inspiration:
      </span>
      {DEMOS.map((demo) => (
        <button
          key={demo.label}
          onClick={() => {
            const audio = new Audio(demo.file);
            audio.volume = 0.5; // Keeping it slightly lower so it doesn't blast ears
            audio.play();
          }}
          className='text-[10px] text-white hover:text-blue-400 transition-colors'
        >
          ▶ {demo.label}
        </button>
      ))}
    </div>
  );
};

export default DemoDisplay;
