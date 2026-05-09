type MusicAudioModule = typeof import('../../utils/musicAudio');

const loadMusicAudio = () => {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: 'android' },
  }));
  jest.doMock('expo-constants', () => ({
    appOwnership: 'standalone',
  }));

  let module: MusicAudioModule;
  jest.isolateModules(() => {
    module = require('../../utils/musicAudio');
  });

  return { module: module! };
};

describe('musicAudio native', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('initializes a non-web audio context', () => {
    const { module } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;

    const audioContext = module.initializeAudioContext(audioContextRef) as any;

    expect(audioContext.state).toBe('running');
    expect(typeof audioContext.resume).toBe('function');
  });

  it('stops native sounds when present', async () => {
    const { module } = loadMusicAudio();
    const stopAsync = jest.fn().mockResolvedValue(undefined);
    const unloadAsync = jest.fn().mockResolvedValue(undefined);
    const sound = {
      stopAsync,
      unloadAsync,
    };

    const audioContextRef = {
      current: {
        nativeActiveSounds: new Set([sound]),
      },
    } as any;

    await module.stopAllInstrumentNotes({
      audioContextRef,
      oscillatorsRef: { current: [] },
      gainsRef: { current: [] },
    });

    expect(stopAsync).toHaveBeenCalled();
    expect(unloadAsync).toHaveBeenCalled();
  });

  it('plays a native note when expo-av is available', async () => {
    const { module } = loadMusicAudio();
    const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
    const unloadAsync = jest.fn().mockResolvedValue(undefined);
    const stopAsync = jest.fn().mockResolvedValue(undefined);
    let statusCallback: ((status: { isLoaded: boolean; didJustFinish?: boolean }) => void) | null = null;

    const createAsync = jest.fn().mockResolvedValue({
      sound: {
        stopAsync,
        unloadAsync,
        setOnPlaybackStatusUpdate: jest.fn((callback: any) => {
          statusCallback = callback;
        }),
      },
    });

    (module as any).__testOnly.setExpoAvModulePromise(
      Promise.resolve({
        Audio: {
          setAudioModeAsync,
          Sound: { createAsync },
        },
        InterruptionModeAndroid: { DoNotMix: 'DoNotMix' },
      })
    );

    module.playInstrumentNote({
      audioContextRef: { current: {} },
      audioContext: { state: 'running' } as any,
      instrument: 'square',
      frequency: 440,
      noteLength: 0.25,
      noteStartTime: 0,
      oscillatorsRef: { current: [] },
      gainsRef: { current: [] },
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(setAudioModeAsync).toHaveBeenCalled();
    expect(createAsync).toHaveBeenCalled();

    statusCallback?.({ isLoaded: true, didJustFinish: true });
    await new Promise((resolve) => setImmediate(resolve));

    expect(unloadAsync).toHaveBeenCalled();
  });

  it('skips native playback when Audio module is missing', async () => {
    const { module } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;

    (module as any).__testOnly.setExpoAvModulePromise(Promise.resolve({}));

    module.playInstrumentNote({
      audioContextRef,
      audioContext: { state: 'running' } as any,
      instrument: 'square',
      frequency: 440,
      noteLength: 0.25,
      noteStartTime: 0,
      oscillatorsRef: { current: [] },
      gainsRef: { current: [] },
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(audioContextRef.current.nativeAudioConfigured).toBeUndefined();
  });

  it('skips native playback for silent frequencies', async () => {
    const { module } = loadMusicAudio();
    const audioContextRef = { current: {} } as any;

    module.playInstrumentNote({
      audioContextRef,
      audioContext: { state: 'running' } as any,
      instrument: 'square',
      frequency: 0,
      noteLength: 0.25,
      noteStartTime: 0,
      oscillatorsRef: { current: [] },
      gainsRef: { current: [] },
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(audioContextRef.current.nativeAudioConfigured).toBeUndefined();
  });
});
