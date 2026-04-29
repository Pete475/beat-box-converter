export const DRUM_STYLES = {
  EIGHT_08: '808',
  TECHNO: 'techno',
  INDIE: 'indie',
  POP: 'pop',
} as const;

export type DrumStyle = (typeof DRUM_STYLES)[keyof typeof DRUM_STYLES];

export const kitSamples: Record<DrumStyle, Record<string, string>> = {
  808: {
    kick: '/samples/808/kick.wav',
    snare: '/samples/808/snare.wav',
  },
  techno: {
    kick: '/samples/hand/kick.wav',
    snare: '/samples/hand/snare.wav',
  },
  indie: {
    kick: '/samples/indie/kick.wav',
    snare: '/samples/indie/snare.wav',
  },
  pop: {
    kick: '/samples/pop/kick.wav',
    snare: '/samples/pop/snare.wav',
  },
};
