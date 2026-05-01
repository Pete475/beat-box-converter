import { useState, useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { analyze } from 'web-audio-beat-detector';
import { Midi } from '@tonejs/midi';

// Define a clear interface for our drum kit
interface DrumKit {
  players: Tone.Players;
}

const useAudioEngine = (selectedStyle: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const kit = useRef<DrumKit | null>(null);
  const lastKickTimes = useRef<number[]>([]);
  const lastSnareTimes = useRef<number[]>([]);

  const initKit = useCallback(() => {
    if (kit.current) {
      kit.current.players.dispose();
    }

    const stylePaths: Record<string, { kick: string; snare: string }> = {
      '808': { kick: '/samples/808/kick.wav', snare: '/samples/808/snare.wav' },
      handperc: {
        kick: '/samples/hand/kick.wav',
        snare: '/samples/hand/snare.wav',
      },
      indie: {
        kick: '/samples/indie/kick.wav',
        snare: '/samples/indie/snare.wav',
      },
      pop: { kick: '/samples/pop/kick.wav', snare: '/samples/pop/snare.wav' },
    };

    const paths = stylePaths[selectedStyle] || stylePaths['808'];

    const players = new Tone.Players({
      kick: paths.kick,
      snare: paths.snare,
    }).toDestination();

    kit.current = { players };
  }, [selectedStyle]);

  useEffect(() => {
    initKit();
  }, [initKit]);

  const getTimestamps = async (buffer: AudioBuffer, type: 'low' | 'high') => {
    const offlineCtx = new OfflineAudioContext(
      1,
      buffer.length,
      buffer.sampleRate,
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = type === 'low' ? 'lowpass' : 'highpass';
    filter.frequency.value = type === 'low' ? 150 : 2500;

    source.connect(filter);
    filter.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const data = renderedBuffer.getChannelData(0);
    const timestamps: number[] = [];
    const threshold = 0.18;
    const step = Math.floor(buffer.sampleRate * 0.2);

    for (let i = 0; i < data.length; i += 100) {
      if (Math.abs(data[i]) > threshold) {
        timestamps.push(i / buffer.sampleRate);
        i += step;
      }
    }
    return timestamps;
  };

  const trimSilence = (buffer: AudioBuffer, threshold = 0.02): AudioBuffer => {
    const samples = buffer.getChannelData(0);
    let start = 0;
    let end = samples.length;

    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > threshold) {
        start = i;
        break;
      }
    }

    for (let i = samples.length - 1; i >= 0; i--) {
      if (Math.abs(samples[i]) > threshold) {
        end = i;
        break;
      }
    }

    if (start >= end) return buffer;

    const trimmedLength = end - start;
    const trimmedBuffer = new AudioContext().createBuffer(
      buffer.numberOfChannels,
      trimmedLength,
      buffer.sampleRate,
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const newChannelData = trimmedBuffer.getChannelData(channel);
      newChannelData.set(channelData.subarray(start, end));
    }

    return trimmedBuffer;
  };

  const exportMidi = useCallback(() => {
    if (!detectedBpm) return;

    const midi = new Midi();
    midi.header.setTempo(detectedBpm);

    const track = midi.addTrack();
    track.name = 'BeatScript Drums';

    lastKickTimes.current.forEach((time) => {
      track.addNote({ midi: 36, time: time, duration: 0.2 });
    });

    lastSnareTimes.current.forEach((time) => {
      track.addNote({ midi: 38, time: time, duration: 0.2 });
    });

    const midiArray = midi.toArray();
    // THE VERCEL FIX: Cast to any to bypass strict BlobPart checks
    const blobPart: any = midiArray;
    const blob = new Blob([blobPart], { type: 'audio/midi' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beat-${selectedStyle}.mid`;
    link.click();
  }, [detectedBpm, selectedStyle]);

  const processAudio = useCallback(async () => {
    if (audioChunks.current.length === 0) return;

    await Tone.loaded();

    const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = Tone.getContext().rawContext as AudioContext;
    const rawBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioBuffer = trimSilence(rawBuffer);

    let tempo = 120;
    try {
      tempo = await analyze(audioBuffer);
      setDetectedBpm(Math.round(tempo));
      Tone.getTransport().bpm.value = tempo;
    } catch (e) {
      console.warn('BPM fail');
      setDetectedBpm(120);
    }

    const kickTimes = await getTimestamps(audioBuffer, 'low');
    const snareTimes = await getTimestamps(audioBuffer, 'high');

    lastKickTimes.current = kickTimes;
    lastSnareTimes.current = snareTimes;

    const transport = Tone.getTransport();
    transport.stop().cancel();

    const sixteenth = 60 / tempo / 4;
    const lastHit = Math.max(...kickTimes, ...snareTimes, 0);
    const loopLength =
      Math.ceil(lastHit / (sixteenth * 16)) * (sixteenth * 16) ||
      sixteenth * 16;

    kickTimes.forEach((t) => {
      const qt = Math.round(t / sixteenth) * sixteenth;
      transport.schedule((time) => {
        kit.current?.players.player('kick').start(time);
      }, qt);
    });

    snareTimes.forEach((t) => {
      const qt = Math.round(t / sixteenth) * sixteenth;
      transport.schedule((time) => {
        kit.current?.players.player('snare').start(time);
      }, qt);
    });

    transport.loop = true;
    transport.loopEnd = loopLength;
    transport.start();
  }, [getTimestamps]);

  const reset = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;

    setDetectedBpm(null);
    audioChunks.current = [];
    console.log('Engine reset. Ready for new input.');
  }, []);

  const startRecording = async () => {
    await Tone.start();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    mediaRecorder.current = new MediaRecorder(stream);
    audioChunks.current = [];
    mediaRecorder.current.ondataavailable = (e) =>
      audioChunks.current.push(e.data);
    mediaRecorder.current.onstop = processAudio;
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const stopPlayback = () => {
    Tone.getTransport().stop().cancel();
  };

  return {
    isRecording,
    startRecording,
    stopPlayback,
    stopRecording,
    detectedBpm,
    reset,
    exportMidi,
  };
};

export default useAudioEngine;
