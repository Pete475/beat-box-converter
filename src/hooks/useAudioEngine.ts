import { useState, useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { analyze } from 'web-audio-beat-detector';

// Define a clear interface for our drum kit
interface DrumKit {
  players: Tone.Players;
}

const useAudioEngine = (selectedStyle: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Replace 'any' with our DrumKit interface
  const kit = useRef<DrumKit | null>(null);

  const initKit = useCallback(() => {
    // If the kit already exists, dispose of old synths to prevent memory leaks
    if (kit.current) {
      kit.current.players.dispose();
    }

    const is808 = selectedStyle === '808';

    // Explicitly type the new synths
    // Map styles to your public/samples folder paths
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
  }, [selectedStyle, initKit]);

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

    // Find the first sample above threshold
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > threshold) {
        start = i;
        break;
      }
    }

    // Find the last sample above threshold
    for (let i = samples.length - 1; i >= 0; i--) {
      if (Math.abs(samples[i]) > threshold) {
        end = i;
        break;
      }
    }

    // If the clip is silent or too short to trim, return the original
    if (start >= end) return buffer;

    const trimmedLength = end - start;
    const trimmedBuffer = new AudioContext().createBuffer(
      buffer.numberOfChannels,
      trimmedLength,
      buffer.sampleRate,
    );

    // Copy data from the original buffer to the new one
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const newChannelData = trimmedBuffer.getChannelData(channel);
      newChannelData.set(channelData.subarray(start, end));
    }

    return trimmedBuffer;
  };

  const processAudio = useCallback(async () => {
    if (audioChunks.current.length === 0) return;

    // Ensure samples are loaded before playing
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
    }

    const kickTimes = await getTimestamps(audioBuffer, 'low');
    const snareTimes = await getTimestamps(audioBuffer, 'high');

    const transport = Tone.getTransport();
    transport.stop().cancel();

    const sixteenth = 60 / tempo / 4;
    const lastHit = Math.max(...kickTimes, ...snareTimes, 0);
    const loopLength =
      Math.ceil(lastHit / (sixteenth * 16)) * (sixteenth * 16) ||
      sixteenth * 16;

    // 2. Schedule the SAMPLES instead of synths
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
  }, [initKit]);

  const reset = useCallback(() => {
    // 1. Stop the audio engine
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;

    // 2. Clear the UI state
    setDetectedBpm(null);
    audioChunks.current = [];

    console.log('Engine reset. Ready for new input.');
  }, []);

  const startRecording = async () => {
    await Tone.start();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
  };
};

export default useAudioEngine;
