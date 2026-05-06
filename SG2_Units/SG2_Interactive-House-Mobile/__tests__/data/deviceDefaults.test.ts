import { INITIAL_DEVICE_DATA } from '../../data/deviceDefaults';

describe('deviceDefaults test data', () => {
  it('re-exports the initial device data', () => {
    expect(INITIAL_DEVICE_DATA).toBeDefined();
    expect(INITIAL_DEVICE_DATA).toEqual(
      expect.objectContaining({
        buzzer: expect.any(Object),
        door: expect.any(Object),
      })
    );
  });
});
