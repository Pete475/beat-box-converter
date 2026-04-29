'use client';

import React from 'react';
import { Mic, Square, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  bpm: number | null;
}

const Recorder = ({ isRecording, onStart, onStop, bpm }: RecorderProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-10">
      {/* Visual Feedback Area */}
      <div className="h-24 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-2 text-red-500"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              <span className="font-mono font-bold tracking-widest uppercase">Recording Beat...</span>
            </motion.div>
          ) : bpm ? (
            <motion.div
              key="bpm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <span className="text-6xl font-black text-white">{bpm}</span>
              <p className="text-zinc-500 uppercase tracking-tighter font-bold">Estimated BPM</p>
            </motion.div>
          ) : (
            <p className="text-zinc-400 italic">Sing your beat to begin</p>
          )}
        </AnimatePresence>
      </div>

      {/* Main Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? onStop : onStart}
        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-colors shadow-2xl ${
          isRecording 
            ? 'bg-zinc-800 border-4 border-red-500' 
            : 'bg-white hover:bg-zinc-200'
        }`}
      >
        {isRecording ? (
          <Square className="text-red-500 w-12 h-12 fill-current" />
        ) : (
          <Mic className="text-black w-12 h-12" />
        )}

        {/* Pulsing Outer Ring while recording */}
        {isRecording && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-red-500 -z-10"
          />
        )}
      </motion.button>

      {/* Simple Status Bar */}
      <div className="flex items-center space-x-4 text-zinc-500 text-sm font-medium">
        <div className="flex items-center">
          <Activity className="w-4 h-4 mr-1" />
          <span>44.1 kHz</span>
        </div>
        <span>•</span>
        <span>Mono Input</span>
      </div>
    </div>
  );
};

export default Recorder;