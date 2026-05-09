type MusicAudioModule = typeof import('../../utils/musicAudio');

type FakeOscillator = {
  type: OscillatorType;
  frequency: { value: number };
  detune: { value: number };
  connect: jest.Mock;
  start: jest.Mock;
  stop: jest.Mock;
};

type FakeGain = {
  gain: {
    value: number;
    setValueAtTime: jest.Mock;
    exponentialRampToValueAtTime: jest.Mock;
  };
  connect: jest.Mock;
};

type FakeConvolver = {
  buffer: any;
  connect: jest.Mock;
};

class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  sampleRate = 44100;
  createdOscillators: FakeOscillator[] = [];

  createOscillator(): FakeOscillator {
    const osc: FakeOscillator = {
      type: 'sine',
      frequency: { value: 0 },
      detune: { value: 0 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
    this.createdOscillators.push(osc);
    return osc;
  }

  createGain(): FakeGain {
    return {
      gain: {
        value: 1,
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };
  }

  createConvolver(): FakeConvolver {
    return {
      buffer: null,
      connect: jest.fn(),
    };
  }

  createBuffer(channels: number, length: number) {
    return {
      numberOfChannels: channels,
      getChannelData: () => new Float32Array(length),
    };
  }

  resume() {
    return Promise.resolve();
  }
}

const loadMusicAudio = (): MusicAudioModule => {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: 'web' },
  }));
  jest.doMock('expo-constants', () => ({
    appOwnership: 'standalone',
  }));

  let module: MusicAudioModule;
  jest.isolateModules(() => {
    module = require('../../utils/musicAudio');
  });
  return module!;
};

describe('musicAudio web', () => {
  const originalAudioContext = (globalThis as any).AudioContext;
  const originalWebkitAudioContext = (globalThis as any).webkitAudioContext;

  afterEach(() => {
    (globalThis as any).AudioContext = originalAudioContext;
    (globalThis as any).webkitAudioContext = originalWebkitAudioContext;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('throws when Web Audio API is missing', () => {
    (globalThis as any).AudioContext = undefined;
    (globalThis as any).webkitAudioContext = undefined;

    const { initializeAudioContext } = loadMusicAudio();

    expect(() => initializeAudioContext({ current: {} })).toThrow(
      'Web Audio API is unavailable in this environment.'
    );
  });

  it('uses webkitAudioContext when AudioContext is missing', () => {
    (globalThis as any).AudioContext = undefined;
    (globalThis as any).webkitAudioContext = FakeAudioContext;

    const { initializeAudioContext } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;

    const audioContext = initializeAudioContext(audioContextRef);

    expect(audioContext).toBeInstanceOf(FakeAudioContext);
  });

  it('initializes audio context and reuses reverb fx', () => {
    (globalThis as any).AudioContext = FakeAudioContext;

    const { initializeAudioContext, initializeReverbFx } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;
    const audioContext = initializeAudioContext(audioContextRef) as any;

    const first = initializeReverbFx(audioContextRef, audioContext);
    const second = initializeReverbFx(audioContextRef, audioContext);

    expect(second.convolver).toBe(first.convolver);
    expect(second.wetGain).toBe(first.wetGain);
    expect(second.dryGain).toBe(first.dryGain);
  });

  it('plays oscillator and electric piano notes on web', () => {
    (globalThis as any).AudioContext = FakeAudioContext;

    const { initializeAudioContext, playInstrumentNote } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;
    const oscillatorsRef = { current: [] as any[] };
    const gainsRef = { current: [] as any[] };
    const audioContext = initializeAudioContext(audioContextRef) as any;

    playInstrumentNote({
      audioContextRef,
      audioContext,
      instrument: 'square',
      frequency: 440,
      noteLength: 0.25,
      noteStartTime: 0,
      oscillatorsRef,
      gainsRef,
    });

    expect(oscillatorsRef.current.length).toBe(1);
    expect(gainsRef.current.length).toBe(1);
    expect(audioContext.createdOscillators[0]?.type).toBe('square');

    playInstrumentNote({
      audioContextRef,
      audioContext,
      instrument: 'sawtooth',
      frequency: 220,
      noteLength: 0.2,
      noteStartTime: 0.1,
      oscillatorsRef,
      gainsRef,
    });

    expect(audioContext.createdOscillators[1]?.type).toBe('sawtooth');

    playInstrumentNote({
      audioContextRef,
      audioContext,
      instrument: 'electric piano',
      frequency: 440,
      noteLength: 0.25,
      noteStartTime: 0.3,
      oscillatorsRef,
      gainsRef,
    });

    expect(oscillatorsRef.current.length).toBeGreaterThan(1);
    expect(gainsRef.current.length).toBeGreaterThan(1);
  });

  it('no-ops when audioContext is not a Web Audio context', () => {
    (globalThis as any).AudioContext = FakeAudioContext;

    const { playInstrumentNote } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;
    const oscillatorsRef = { current: [] as any[] };
    const gainsRef = { current: [] as any[] };

    playInstrumentNote({
      audioContextRef,
      audioContext: { state: 'running' } as any,
      instrument: 'square',
      frequency: 440,
      noteLength: 0.25,
      noteStartTime: 0,
      oscillatorsRef,
      gainsRef,
    });

    expect(oscillatorsRef.current).toHaveLength(0);
    expect(gainsRef.current).toHaveLength(0);
  });

  it('stops all oscillators on web', async () => {
    (globalThis as any).AudioContext = FakeAudioContext;

    const { stopAllInstrumentNotes } = loadMusicAudio();
    const stopSpy = jest.fn();
    const oscillatorsRef = { current: [{ stop: stopSpy }] } as any;
    const gainsRef = { current: [{}] } as any;

    await stopAllInstrumentNotes({
      audioContextRef: { current: {} },
      oscillatorsRef,
      gainsRef,
    });

    expect(stopSpy).toHaveBeenCalled();
    expect(oscillatorsRef.current).toEqual([]);
    expect(gainsRef.current).toEqual([]);
  });

  it('ignores errors when stopping oscillators', async () => {
    (globalThis as any).AudioContext = FakeAudioContext;

    const { stopAllInstrumentNotes } = loadMusicAudio();
    const stopSpy = jest.fn(() => {
      throw new Error('stop failed');
    });
    const oscillatorsRef = { current: [{ stop: stopSpy }] } as any;
    const gainsRef = { current: [{}] } as any;

    await stopAllInstrumentNotes({
      audioContextRef: { current: {} },
      oscillatorsRef,
      gainsRef,
    });

    expect(stopSpy).toHaveBeenCalled();
    expect(oscillatorsRef.current).toEqual([]);
    expect(gainsRef.current).toEqual([]);
  });
});
