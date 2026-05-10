type MusicAudioModule = typeof import('../../utils/musicAudio');

describe('musicAudio helpers', () => {
  const loadModule = (): MusicAudioModule => {
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

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('base64 encodes bytes with padding', () => {
    const { __testOnly } = loadModule() as any;
    const result = __testOnly.base64EncodeBytes(new Uint8Array([72, 73]));

    expect(result).toBe('SEk=');
  });

  it('clamps values to range', () => {
    const { __testOnly } = loadModule() as any;

    expect(__testOnly.clamp(10, 0, 5)).toBe(5);
    expect(__testOnly.clamp(-2, 0, 5)).toBe(0);
    expect(__testOnly.clamp(3, 0, 5)).toBe(3);
  });

  it('generates wave samples for instruments', () => {
    const { __testOnly } = loadModule() as any;

    const square = __testOnly.getWaveSample(0, 440, 'square');
    expect(square).toBe(1);

    const saw = __testOnly.getWaveSample(0.25, 1, 'sawtooth');
    expect(saw).toBeCloseTo(0.5, 2);

    const piano = __testOnly.getWaveSample(0.1, 440, 'electric piano');
    expect(Number.isFinite(piano)).toBe(true);
  });

  it('builds wav data URIs', () => {
    const { __testOnly } = loadModule() as any;

    const uri = __testOnly.createWavDataUri(440, 0.01, 'square');
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan('data:audio/wav;base64,'.length);
  });

  it('caches native tone URIs', () => {
    const { __testOnly } = loadModule() as any;
    const cache = new Map<string, string>();

    const first = __testOnly.getNativeToneUri(cache, 440, 0.5, 'square');
    const second = __testOnly.getNativeToneUri(cache, 440, 0.5, 'square');
    const third = __testOnly.getNativeToneUri(cache, 220, 0.5, 'square');

    expect(first).toBe(second);
    expect(third).not.toBe(first);
    expect(cache.size).toBe(2);
  });
});
