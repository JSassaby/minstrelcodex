import { useState, useCallback, useEffect, useRef } from 'react';

export interface MusicTrack {
  id: string;
  name: string;
  category: 'ambient' | 'focus' | 'nature' | 'user';
  /** For built-in generated noise, 'generated:TYPE'; for files, an object URL or data URL */
  src: string;
  duration?: number;
}

const DB_NAME = 'pw-music-db';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const PREFS_KEY = 'pw-music-prefs';

// ── Built-in noise generators via Web Audio API ──────────────────────────

function createNoiseNode(ctx: AudioContext, type: 'white' | 'brown' | 'pink'): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 10; // 10-second loop
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * w) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  } else {
    // Pink noise (Voss-McCartney approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

// ── Built-in tracks ──────────────────────────────────────────────────────

const BUILT_IN_TRACKS: MusicTrack[] = [
  { id: 'noise-white', name: 'White Noise', category: 'ambient', src: 'generated:white' },
  { id: 'noise-brown', name: 'Brown Noise', category: 'ambient', src: 'generated:brown' },
  { id: 'noise-pink', name: 'Pink Noise', category: 'ambient', src: 'generated:pink' },
];

// ── IndexedDB helpers ────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadUserTracks(): Promise<MusicTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: 'user' as const,
      src: r.dataUrl,
    })));
    req.onerror = () => reject(req.error);
  });
}

async function saveUserTrack(id: string, name: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, name, dataUrl });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteUserTrack(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useMusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>(BUILT_IN_TRACKS);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}').volume ?? 0.5; }
    catch { return 0.5; }
  });
  const [loop, setLoop] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Load user tracks from IndexedDB on mount
  useEffect(() => {
    loadUserTracks().then(userTracks => {
      setTracks([...BUILT_IN_TRACKS, ...userTracks]);
    }).catch(() => {});
  }, []);

  // Save prefs
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume }));
  }, [volume]);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (noiseSourceRef.current) {
      try { noiseSourceRef.current.stop(); } catch {}
      noiseSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      gainNodeRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback((trackId: string) => {
    stopCurrent();
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    setCurrentTrackId(trackId);

    if (track.src.startsWith('generated:')) {
      const noiseType = track.src.replace('generated:', '') as 'white' | 'brown' | 'pink';
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
      const source = createNoiseNode(ctx, noiseType);
      source.connect(gain);
      source.start();
      noiseSourceRef.current = source;
      setPlaying(true);
    } else {
      const audio = new Audio();
      audio.volume = volume;
      audio.loop = loop;
      audio.preload = 'auto';
      audio.onended = () => { if (!loop) setPlaying(false); };
      audio.oncanplaythrough = () => {
        audio.play().catch(err => console.error('[MusicPlayer] Playback failed:', err));
      };
      audio.onerror = () => console.error('[MusicPlayer] Audio load error');
      audio.src = track.src;
      audioRef.current = audio;
      setPlaying(true);
    }
  }, [tracks, volume, loop, stopCurrent]);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      audioCtxRef.current.suspend();
    }
    setPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) { audioRef.current.play().catch(() => {}); setPlaying(true); }
    else if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume(); setPlaying(true);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (playing) pause();
    else if (currentTrackId) resume();
  }, [playing, currentTrackId, pause, resume]);

  // Update volume on running audio
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
  }, [volume]);

  const addUserFile = useCallback(async (file: File) => {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const name = file.name.replace(/\.[^.]+$/, '');
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    await saveUserTrack(id, name, dataUrl);
    const newTrack: MusicTrack = { id, name, category: 'user', src: dataUrl };
    setTracks(prev => [...prev, newTrack]);
    return newTrack;
  }, []);

  const removeUserTrack = useCallback(async (trackId: string) => {
    if (currentTrackId === trackId) stopCurrent();
    await deleteUserTrack(trackId);
    setTracks(prev => prev.filter(t => t.id !== trackId));
  }, [currentTrackId, stopCurrent]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopCurrent();
  }, [stopCurrent]);

  return {
    tracks,
    currentTrackId,
    playing,
    volume,
    loop,
    setVolume,
    setLoop,
    play,
    pause,
    resume,
    togglePlayPause,
    stopCurrent,
    addUserFile,
    removeUserTrack,
  };
}
