import React from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MusicScreen from '../../../app/(tabs)/music';
import { doc, deleteDoc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useGuest } from '../../../utils/GuestContext';
import { useAppTheme } from '../../../utils/AppThemeContext';
import { getMusicCollectionRef } from '../../../utils/firestorePaths';
import { registerMusicController } from '@/utils/musicController';
import {
  initializeAudioContext,
  playInstrumentNote,
  stopAllInstrumentNotes,
} from '../../../utils/musicAudio';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock-doc-ref'),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  db: {
    app: {
      options: {
        projectId: 'test-project',
      },
    },
  },
  auth: {
    currentUser: {
      uid: 'uid-123',
      email: 'ali@example.com',
    },
  },
}));

jest.mock('../../../utils/firestorePaths', () => ({
  getMusicCollectionRef: jest.fn(() => 'mock-music-collection-ref'),
}));

jest.mock('@/utils/musicController', () => ({
  registerMusicController: jest.fn(),
  getMusicController: jest.fn(),
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: jest.fn(),
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  useAppTheme: jest.fn(),
}));

jest.mock('../../../utils/musicAudio', () => ({
  initializeAudioContext: jest.fn(),
  playInstrumentNote: jest.fn(),
  stopAllInstrumentNotes: jest.fn(),
}));

const theme = {
  colors: {
    background: '#020617',
    backgroundAlt: '#0f172a',
    surface: '#111827',
    surfaceElevated: '#1f2937',
    surfaceStrong: '#334155',
    border: '#334155',
    borderStrong: '#475569',
    text: '#f8fafc',
    mutedText: '#94a3b8',
    subtleText: '#64748b',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    accentText: '#bae6fd',
    secondaryAccent: '#a855f7',
    secondaryAccentSoft: 'rgba(168, 85, 247, 0.14)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.14)',
    warning: '#facc15',
    warningSoft: 'rgba(250, 204, 21, 0.14)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.14)',
    info: '#0ea5e9',
    inputBackground: '#0f172a',
    selectedSurface: 'rgba(56, 189, 248, 0.18)',
    selectedBorder: 'rgba(125, 211, 252, 0.75)',
    chipBackground: 'rgba(15, 23, 42, 0.92)',
    chipBorder: '#1e293b',
    overlay: 'rgba(2, 6, 23, 0.76)',
  },
};

const sampleMelodies = [
  {
    id: 'alpha',
    data: () => ({
      artist: 'Composer One',
      frequencies: { 0: 262, 1: 294, 2: 0, 3: 330 },
      noteDelays: { 0: 500, 1: 500, 2: 250, 3: 750 },
      state: 'on',
    }),
  },
  {
    id: 'beta',
    data: () => ({
      artist: 'Composer Two',
      frequencies: { 0: 392, 1: 440 },
      noteDelays: { 0: 400, 1: 400 },
      state: 'off',
    }),
  },
];

const makeSnapshot = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => ({
  forEach: (callback: (docSnap: { id: string; data: () => Record<string, unknown> }) => void) => {
    docs.forEach((docSnap) => callback(docSnap));
  },
});

describe('Music Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    (useAppTheme as jest.Mock).mockReturnValue({
      theme,
      mode: 'default',
      setMode: jest.fn(),
    });

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback({
        uid: 'uid-123',
        email: 'ali@example.com',
      });
      return jest.fn();
    });

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: 'admin',
      }),
    });

    (onSnapshot as jest.Mock).mockImplementation((_ref, onNext) => {
      onNext(makeSnapshot(sampleMelodies));
      return jest.fn();
    });

    (initializeAudioContext as jest.Mock).mockReturnValue({
      state: 'running',
      currentTime: 0,
      resume: jest.fn(),
    });

    (playInstrumentNote as jest.Mock).mockImplementation(() => undefined);
    (stopAllInstrumentNotes as jest.Mock).mockResolvedValue(undefined);
    (registerMusicController as jest.Mock).mockImplementation(() => undefined);
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows guest warning', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(
        getByText('Guest mode cannot access cloud melodies. Sign in to view songs.')
      ).toBeTruthy();
    });

    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('shows sign in warning when unauthenticated', async () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback(null);
      return jest.fn();
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Please sign in to load cloud melodies.')).toBeTruthy();
    });
  });

  it('shows permission denied error', async () => {
    (onSnapshot as jest.Mock).mockImplementation((_ref, _onNext, onError) => {
      onError({ code: 'permission-denied' });
      return jest.fn();
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(
        getByText(
          'Access denied to melodies (permission-denied). Please sign in with an authorized account.'
        )
      ).toBeTruthy();
    });
  });

  it('shows generic firestore error', async () => {
    (onSnapshot as jest.Mock).mockImplementation((_ref, _onNext, onError) => {
      onError({ code: 'unavailable' });
      return jest.fn();
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(
        getByText('Unable to load melodies right now (unavailable). Please try again.')
      ).toBeTruthy();
    });
  });

  it('renders melodies and saves new melody', async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Music Player')).toBeTruthy();
      expect(getByText('Add Melody')).toBeTruthy();
      expect(getAllByText('alpha').length).toBeGreaterThan(0);
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Morning Tune');
    fireEvent.changeText(getByPlaceholderText('Artist (optional)'), 'DJ SG2');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '262, 294, 0, 330'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '500, 500, 250, 750'
    );

    fireEvent.press(getByText('Save Melody'));

    await waitFor(() => {
      expect(getMusicCollectionRef).toHaveBeenCalled();
      expect(doc).toHaveBeenCalledWith('mock-music-collection-ref', 'Morning Tune');
      expect(setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          name: 'Morning Tune',
          artist: 'DJ SG2',
          frequencies: [262, 294, 0, 330],
          noteDelays: [500, 500, 250, 750],
          updatedAt: expect.any(String),
        })
      );
    });
  });

  it('shows missing name validation', async () => {
    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.press(getByText('Save Melody'));

    expect(Alert.alert).toHaveBeenCalledWith('Missing name', 'Enter a melody name.');
  });

  it('shows invalid frequencies validation', async () => {
    const { getByText, getByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Bad Melody');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '0, 0, rest'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '500, 500, 500'
    );

    fireEvent.press(getByText('Save Melody'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Invalid frequencies',
      'Enter notes and optional pauses as 0, for example 262, 294, 0, 330.'
    );
  });

  it('shows missing delays validation', async () => {
    const { getByText, getByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'No Delay Song');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '262, 294'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      'abc'
    );

    fireEvent.press(getByText('Save Melody'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing note delays',
      'Enter an Arduino delay value for each note, for example 500, 500, 250, 750.'
    );
  });

  it('shows sequence mismatch validation', async () => {
    const { getByText, getByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Mismatch');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '262, 294, 330'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '500'
    );

    fireEvent.press(getByText('Save Melody'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sequence mismatch',
      'Delay count must match frequency count so each note has one Arduino delay value.'
    );
  });

  it('shows invalid name validation', async () => {
    const { getByText, getByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Bad/Melody');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '262, 294'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '500, 500'
    );

    fireEvent.press(getByText('Save Melody'));

    expect(Alert.alert).toHaveBeenCalledWith('Invalid name', 'Melody name cannot include /.');
  });

  it('shows native delete confirmation for admin', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { getByTestId } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-melody-alpha')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-melody-alpha'), {
      stopPropagation: jest.fn(),
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete melody?',
      'This will permanently delete "alpha" from cloud storage.',
      expect.any(Array)
    );

    alertSpy.mockRestore();
  });

  it('uses web confirm when deleting on web and cancels', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    (globalThis as any).window = { confirm: jest.fn(() => false) };

    const { getByTestId } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-melody-alpha')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-melody-alpha'), {
      stopPropagation: jest.fn(),
    });

    expect((globalThis as any).window.confirm).toHaveBeenCalled();
    expect(deleteDoc).not.toHaveBeenCalled();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('deletes on web when confirmation is accepted', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    (globalThis as any).window = { confirm: jest.fn(() => true) };

    const { getByTestId } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-melody-alpha')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-melody-alpha'), {
      stopPropagation: jest.fn(),
    });

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
    });

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('parses pause tokens into rest frequencies', async () => {
    const { getByText, getByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Pause Song');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      'pause2 262 rest 330'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '100, 100, 100, 100, 100'
    );

    fireEvent.press(getByText('Save Melody'));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          frequencies: [0, 0, 262, 0, 330],
          noteDelays: [100, 100, 100, 100, 100],
        })
      );
    });
  });

  it('shows save error when add melody fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (setDoc as jest.Mock).mockRejectedValueOnce({ code: 'permission-denied' });

    const { getByText, getByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Save Melody')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Bad Save');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '262, 294'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '500, 500'
    );

    fireEvent.press(getByText('Save Melody'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Save failed',
        'Unable to save melody (permission-denied).'
      );
    });

    alertSpy.mockRestore();
  });

  it('plays and then stops melody', async () => {
    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Play')).toBeTruthy();
    });

    fireEvent.press(getByText('Play'));

    await waitFor(() => {
      expect(initializeAudioContext).toHaveBeenCalled();
      expect(playInstrumentNote).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByText('Stop')).toBeTruthy();
    });

    fireEvent.press(getByText('Stop'));

    await waitFor(() => {
      expect(stopAllInstrumentNotes).toHaveBeenCalled();
    });
  });

  it('uses base note length when delays length mismatches', async () => {
    (onSnapshot as jest.Mock).mockImplementation((_ref, onNext) => {
      onNext(
        makeSnapshot([
          {
            id: 'gamma',
            data: () => ({
              artist: 'Composer Three',
              frequencies: { 0: 262, 1: 294 },
              noteDelays: { 0: 250 },
              state: 'on',
            }),
          },
        ])
      );
      return jest.fn();
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Play')).toBeTruthy();
    });

    fireEvent.press(getByText('Play'));

    await waitFor(() => {
      expect(playInstrumentNote).toHaveBeenCalledWith(
        expect.objectContaining({ noteLength: 0.5 })
      );
    });
  });

  it('skips playback when frequency is a rest', async () => {
    (onSnapshot as jest.Mock).mockImplementation((_ref, onNext) => {
      onNext(
        makeSnapshot([
          {
            id: 'rest-only',
            data: () => ({
              artist: 'Composer Rest',
              frequencies: { 0: 0 },
              noteDelays: { 0: 200 },
              state: 'on',
            }),
          },
        ])
      );
      return jest.fn();
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Play')).toBeTruthy();
    });

    fireEvent.press(getByText('Play'));

    await waitFor(() => {
      expect(playInstrumentNote).not.toHaveBeenCalled();
    });
  });

  it('resumes audio context when suspended', async () => {
    const resumeSpy = jest.fn().mockResolvedValue(undefined);
    (initializeAudioContext as jest.Mock).mockReturnValue({
      state: 'suspended',
      currentTime: 0,
      resume: resumeSpy,
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Play')).toBeTruthy();
    });

    fireEvent.press(getByText('Play'));

    await waitFor(() => {
      expect(resumeSpy).toHaveBeenCalled();
    });
  });

  it('does not persist play state when user is not admin', async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'user' }),
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Play')).toBeTruthy();
    });

    fireEvent.press(getByText('Play'));

    await waitFor(() => {
      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  it('changes instrument and playback speed', async () => {
    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Instrument')).toBeTruthy();
      expect(getByText('Playback Speed')).toBeTruthy();
    });

    fireEvent.press(getByText('sawtooth'));
    fireEvent.press(getByText('2x'));

    expect(getByText('sawtooth')).toBeTruthy();
    expect(getByText('2x')).toBeTruthy();
  });

  it('opens edit panel and updates melody', async () => {
    const { getByText, getAllByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Edit Frequencies / Delays')).toBeTruthy();
    });

    fireEvent.press(getByText('Edit Frequencies / Delays'));

    await waitFor(() => {
      expect(getByText('Update Melody')).toBeTruthy();
    });

    const frequencyInputs = getAllByPlaceholderText(
      'Frequencies (0 for silent), e.g. 262, 294, 0, 330'
    );
    const delayInputs = getAllByPlaceholderText(
      'Arduino delays (ms), e.g. 500, 500, 250, 750'
    );

    fireEvent.changeText(frequencyInputs[1], '262, 294, 330');
    fireEvent.changeText(delayInputs[1], '500, 500, 500');

    fireEvent.press(getByText('Update Melody'));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          frequencies: [262, 294, 330],
          noteDelays: [500, 500, 500],
          updatedAt: expect.any(String),
        }),
        { merge: true }
      );
    });
  });

  it('shows update sequence mismatch validation', async () => {
    const { getByText, getAllByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Edit Frequencies / Delays')).toBeTruthy();
    });

    fireEvent.press(getByText('Edit Frequencies / Delays'));

    await waitFor(() => {
      expect(getByText('Update Melody')).toBeTruthy();
    });

    const frequencyInputs = getAllByPlaceholderText(
      'Frequencies (0 for silent), e.g. 262, 294, 0, 330'
    );
    const delayInputs = getAllByPlaceholderText(
      'Arduino delays (ms), e.g. 500, 500, 250, 750'
    );

    fireEvent.changeText(frequencyInputs[1], '262, 294, 330');
    fireEvent.changeText(delayInputs[1], '500');

    fireEvent.press(getByText('Update Melody'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sequence mismatch',
      'Delay count must match frequency count so each note has one Arduino delay value.'
    );
  });

  it('shows update error when edit melody fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (setDoc as jest.Mock).mockRejectedValueOnce({ code: 'unavailable' });

    const { getByText, getAllByPlaceholderText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Edit Frequencies / Delays')).toBeTruthy();
    });

    fireEvent.press(getByText('Edit Frequencies / Delays'));

    await waitFor(() => {
      expect(getByText('Update Melody')).toBeTruthy();
    });

    const frequencyInputs = getAllByPlaceholderText(
      'Frequencies (0 for silent), e.g. 262, 294, 0, 330'
    );
    const delayInputs = getAllByPlaceholderText(
      'Arduino delays (ms), e.g. 500, 500, 250, 750'
    );

    fireEvent.changeText(frequencyInputs[1], '262, 294, 330');
    fireEvent.changeText(delayInputs[1], '500, 500, 500');

    fireEvent.press(getByText('Update Melody'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Update failed',
        'Unable to update melody (unavailable).'
      );
    });

    alertSpy.mockRestore();
  });

  it('selects another melody', async () => {
    const { getAllByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getAllByText('beta').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('beta')[0]);

    await waitFor(() => {
      expect(getAllByText('beta').length).toBeGreaterThan(0);
    });
  });

  it('registers music controller', async () => {
    render(<MusicScreen />);

    await waitFor(() => {
      expect(registerMusicController).toHaveBeenCalledWith(
        expect.objectContaining({
          play: expect.any(Function),
          stop: expect.any(Function),
          setInstrument: expect.any(Function),
          setSpeed: expect.any(Function),
          playSongByName: expect.any(Function),
        })
      );
    });
  });

  it('selects a song via playSongByName when matched', async () => {
    render(<MusicScreen />);

    await waitFor(() => {
      expect(registerMusicController).toHaveBeenCalled();
    });

    const calls = (registerMusicController as jest.Mock).mock.calls;
    const controller = calls[calls.length - 1][0];
    (stopAllInstrumentNotes as jest.Mock).mockClear();

    controller.playSongByName('beta');

    await waitFor(() => {
      expect(stopAllInstrumentNotes).toHaveBeenCalled();
    });
  });

  it('does nothing when playSongByName does not match', async () => {
    render(<MusicScreen />);

    await waitFor(() => {
      expect(registerMusicController).toHaveBeenCalled();
    });

    const calls = (registerMusicController as jest.Mock).mock.calls;
    const controller = calls[calls.length - 1][0];
    (stopAllInstrumentNotes as jest.Mock).mockClear();

    controller.playSongByName('nonexistent song');

    expect(stopAllInstrumentNotes).not.toHaveBeenCalled();
  });

  it('marks melody off after playback finishes', async () => {
    jest.useFakeTimers();
    (onSnapshot as jest.Mock).mockImplementation((_ref, onNext) => {
      onNext(
        makeSnapshot([
          {
            id: 'single',
            data: () => ({
              artist: 'One Note',
              frequencies: { 0: 262 },
              noteDelays: { 0: 0 },
              state: 'on',
            }),
          },
        ])
      );
      return jest.fn();
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Play')).toBeTruthy();
    });

    fireEvent.press(getByText('Play'));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({ state: 'on' }),
        { merge: true }
      );
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({ state: 'off' }),
        { merge: true }
      );
    });

    jest.useRealTimers();
  });
});