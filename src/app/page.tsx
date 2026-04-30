'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAudioEngine from '../hooks/useAudioEngine';
import Recorder from '../components/Recorder';
import StyleSelector from '../components/StyleSelector';
import DemoDisplay from '../components/DemoBeats';

export default function Home() {
  const [selectedStyle, setSelectedStyle] = useState('808');
  const {
    isRecording,
    startRecording,
    stopRecording,
    reset,
    exportMidi,
    detectedBpm,
  } = useAudioEngine(selectedStyle);

  return (
    <main className='min-h-screen bg-black text-white flex flex-col items-center justify-center p-4'>
      <div className='max-w-md w-full border border-zinc-800 bg-zinc-900/50 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden'>
        <header className='p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80'>
          <h1 className='text-xl font-bold tracking-tight'>BeatScript</h1>
          <div className='px-3 py-1 bg-zinc-800 rounded-full text-[10px] uppercase font-bold text-zinc-400'>
            {selectedStyle} Kit
          </div>
        </header>

        <DemoDisplay />

        <div className='px-8 py-3 bg-blue-500/5 border-b border-zinc-800'>
          <p className='text-[11px] text-zinc-400 leading-relaxed'>
            <span className='text-blue-400 font-bold mr-2'>PRO TIP:</span>
            <br />

            <span className='text-white'>
              Don't just sing! (Ppppuh puh Tssst)
              <br />
              Bang on your desk for a kick & clap your hands for a snare
              <br />
              That will get you the cleanest takes
            </span>
          </p>
        </div>

        <Recorder
          isRecording={isRecording}
          onStart={startRecording}
          onStop={stopRecording}
          bpm={detectedBpm}
        />

        <AnimatePresence>
          {detectedBpm && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className='flex justify-center pb-6'
            >
              <button
                onClick={reset}
                className='flex items-center space-x-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors text-zinc-300 text-xs font-bold uppercase tracking-widest'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
                  <path d='M3 3v5h5' />
                </svg>
                <span>Reset Session</span>
                <button
                  onClick={exportMidi}
                  className='flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors text-white text-xs font-bold uppercase tracking-widest'
                >
                  <span>Export MIDI</span>
                </button>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className='border-t border-zinc-800 bg-black/20'>
          <StyleSelector
            currentStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
          />
        </div>

        <footer className='p-6 text-center text-zinc-600 text-xs border-t border-zinc-800/50'>
          Select kit • Record beat • Get slick audio
        </footer>
      </div>
    </main>
  );
}
