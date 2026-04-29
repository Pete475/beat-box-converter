'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const STYLES = [
  { id: '808', label: '808', description: 'electronic' },
  { id: 'handperc', label: 'Hand Perc', description: 'organic' },
  { id: 'indie', label: 'Indie', description: 'crashy' },
  { id: 'pop', label: 'Pop', description: 'throwback pop' },
];

interface StyleSelectorProps {
  currentStyle: string;
  onStyleChange: (id: string) => void;
}

const StyleSelector = ({ currentStyle, onStyleChange }: StyleSelectorProps) => {
  return (
    <div className='grid grid-cols-2 gap-4 p-6'>
      {STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => onStyleChange(style.id)}
          className='relative group flex flex-col items-start p-4 rounded-xl border transition-all duration-300'
          style={{
            borderColor: currentStyle === style.id ? '#ffffff' : '#27272a',
            backgroundColor:
              currentStyle === style.id ? '#18181b' : 'transparent',
          }}
        >
          <span
            className={`text-sm font-bold ${currentStyle === style.id ? 'text-white' : 'text-zinc-500'}`}
          >
            {style.label}
          </span>
          <span className='text-[10px] text-zinc-600 uppercase tracking-widest mt-1'>
            {style.description}
          </span>

          {currentStyle === style.id && (
            <motion.div
              layoutId='activeGlow'
              className='absolute -inset-px rounded-xl border border-white/50 z-[-1] blur-[2px]'
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default StyleSelector;
