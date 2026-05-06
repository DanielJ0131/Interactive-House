jest.mock('expo-constants', () => ({
  appOwnership: 'expo',
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

jest.mock('expo-av', () => {
  throw new Error('expo-av should not be imported in Expo Go');
}, { virtual: true });

describe('musicAudio Expo Go guard', () => {
  it('does not import expo-av when running in Expo Go', async () => {
    jest.resetModules();

    const musicAudio = require('../../utils/musicAudio');

    expect(
      musicAudio.playInstrumentNote({
        audioContextRef: { current: {} },
        audioContext: { state: 'running' } as any,
        instrument: 'square',
        frequency: 440,
        noteLength: 0.25,
        noteStartTime: 0,
        oscillatorsRef: { current: [] },
        gainsRef: { current: [] },
      })
    ).toBeUndefined();
  });
});