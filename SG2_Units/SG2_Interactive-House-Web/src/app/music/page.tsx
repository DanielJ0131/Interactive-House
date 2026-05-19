"use client";
import { useEffect, useState, useRef } from "react";
import { PageShell } from "@/components/pageShell";
import TopHeader from "@/components/TopHeader";
import GuestGate from "@/components/GuestGate";
import { auth, db } from "@/utils/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, setDoc, deleteDoc, doc, getDoc, type DocumentData } from "firebase/firestore";
import Link from "next/link";
import { useGuestMode } from "@/app/hooks/useGuestMode";
import {
    MusicNotes,
    CaretLeft,
    Play,
    Stop
} from "@phosphor-icons/react";

interface Song {
    id: string;
    name: string;
    artist: string;
    frequencies: number[];
    noteDelays: number[];
}

const SPEED_MULTIPLIERS = {
    SLOW: 1.5,
    NORMAL: 1,
    FAST: 0.5,
};

type InstrumentOption = OscillatorType | "electric piano";

const INSTRUMENT_OPTIONS: { label: string; value: InstrumentOption }[] = [
    { label: "E-PIANO", value: "electric piano" },
    { label: "SINE", value: "sine" },
    { label: "SQUARE", value: "square" },
    { label: "SAW", value: "sawtooth" },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const PIANO_NOTES = [
    { label: "C", freq: 262 },
    { label: "D", freq: 294 },
    { label: "E", freq: 330 },
    { label: "F", freq: 349 },
    { label: "G", freq: 392 },
    { label: "A", freq: 440 },
    { label: "B", freq: 494 },
    { label: "C", freq: 523 },
    { label: "D", freq: 587 },
    { label: "E", freq: 659 },
    { label: "F", freq: 698 },
    { label: "G", freq: 784 },
    { label: "A", freq: 880 },
    { label: "B", freq: 988 },
    { label: "C", freq: 1047 },
    { label: "D", freq: 1175 },
];

const toNumberArray = (value: unknown): number[] => {
    if (Array.isArray(value)) {
        return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    }

    if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>)
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item));
    }

    return [];
};

const parseFrequencies = (value: string): number[] => {
    const tokens = value
        .split(/[,\s]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    const sequence: number[] = [];

    tokens.forEach((token) => {
        const pauseMatch = token.match(/^(p|pause|rest)(\d+)?$/i);
        if (pauseMatch) {
            const count = pauseMatch[2] ? Number(pauseMatch[2]) : 1;
            const pauseCount = Number.isFinite(count) && count > 0 ? count : 1;
            for (let i = 0; i < pauseCount; i += 1) {
                sequence.push(0);
            }
            return;
        }

        const valueNum = Number(token);
        if (Number.isFinite(valueNum) && valueNum >= 0) {
            sequence.push(valueNum);
        }
    });

    return sequence;
};

const parseNoteDelays = (value: string): number[] =>
    value
        .split(/[\s,]+/)
        .map((token) => Number(token.trim()))
        .filter((delay) => Number.isFinite(delay) && delay >= 0);

const formatAlignedFrequencyDelayStrings = (frequencies: number[], delays: number[]) => {
    const length = Math.max(frequencies.length, delays.length);
    const frequencyTokens: string[] = [];
    const delayTokens: string[] = [];

    for (let i = 0; i < length; i += 1) {
        const frequencyToken = i < frequencies.length
            ? frequencies[i] <= 0
                ? "0"
                : String(frequencies[i])
            : "";
        const delayToken = i < delays.length ? String(delays[i]) : "";
        const tokenWidth = Math.max(frequencyToken.length, delayToken.length, 1);

        frequencyTokens.push(frequencyToken.padStart(tokenWidth, " "));
        delayTokens.push(delayToken.padStart(tokenWidth, " "));
    }

    return {
        frequenciesText: frequencyTokens.join(", "),
        delaysText: delayTokens.join(", "),
    };
};

const frequencyToNoteName = (frequency: number | null): string | null => {
    if (frequency === null || !Number.isFinite(frequency) || frequency <= 0) {
        return null;
    }

    const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440));
    const noteIndex = ((midiNumber % 12) + 12) % 12;
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteName = NOTE_NAMES[noteIndex];
    return noteName ? `${noteName}${octave}` : null;
};

const frequencyToNoteClass = (frequency: number | null): string | null => {
    if (frequency === null || !Number.isFinite(frequency) || frequency <= 0) {
        return null;
    }

    const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440));
    const noteIndex = ((midiNumber % 12) + 12) % 12;
    return NOTE_NAMES[noteIndex] ?? null;
};

const getSharpNoteName = (whiteLabel: string, whiteNoteName: string | null): string | null => {
    if (!whiteNoteName) return null;

    const octaveMatch = whiteNoteName.match(/(-?\d+)$/);
    if (!octaveMatch) return null;

    return `${whiteLabel}#${octaveMatch[1]}`;
};

type PianoSelection = { type: "white" | "black"; index: number } | null;

const SEMITONE_RATIO = Math.pow(2, 1 / 12);

const getPianoSelection = (frequency: number | null, notes: typeof PIANO_NOTES = PIANO_NOTES): PianoSelection => {
    const activeNoteName = frequencyToNoteName(frequency);
    const activeNoteClass = frequencyToNoteClass(frequency);

    if (!activeNoteClass) return null;

    for (let i = 0; i < notes.length; i += 1) {
        const note = notes[i];
        const whiteNoteName = frequencyToNoteName(note.freq);
        if (whiteNoteName && whiteNoteName === activeNoteName) {
            return { type: "white", index: i };
        }

        const blackNoteName = ["C", "D", "F", "G", "A"].includes(note.label)
            ? getSharpNoteName(note.label, whiteNoteName)
            : null;
        if (blackNoteName && blackNoteName === activeNoteName) {
            return { type: "black", index: i };
        }
    }

    const isSharp = activeNoteClass.includes("#");
    const baseLabel = isSharp ? activeNoteClass.replace("#", "") : activeNoteClass;
    const candidates = notes.map((note, index) => ({ note, index }))
        .filter(({ note, index }) => {
            if (note.label !== baseLabel) return false;
            if (isSharp) {
                return ["C", "D", "F", "G", "A"].includes(note.label) && index < notes.length - 1;
            }
            return true;
        });

    if (candidates.length === 0) return null;

    const targetFrequency = frequency ?? candidates[0].note.freq;
    const closest = candidates.reduce((best, current) => {
        const currentFreq = isSharp
            ? current.note.freq * SEMITONE_RATIO
            : current.note.freq;
        const bestFreq = isSharp
            ? best.note.freq * SEMITONE_RATIO
            : best.note.freq;
        return Math.abs(currentFreq - targetFrequency) < Math.abs(bestFreq - targetFrequency)
            ? current
            : best;
    });

    return { type: isSharp ? "black" : "white", index: closest.index };
};

const initializeReverbFx = (audioCtx: AudioContext) => {
    const convolver = audioCtx.createConvolver();
    const wetGain = audioCtx.createGain();
    const dryGain = audioCtx.createGain();

    const durationSeconds = 1.8;
    const decay = 2.8;
    const sampleRate = audioCtx.sampleRate;
    const impulseLength = Math.floor(sampleRate * durationSeconds);
    const impulseBuffer = audioCtx.createBuffer(2, impulseLength, sampleRate);

    for (let channel = 0; channel < impulseBuffer.numberOfChannels; channel += 1) {
        const channelData = impulseBuffer.getChannelData(channel);
        for (let i = 0; i < impulseLength; i += 1) {
            const envelope = Math.pow(1 - i / impulseLength, decay);
            channelData[i] = (Math.random() * 2 - 1) * envelope;
        }
    }

    convolver.buffer = impulseBuffer;
    wetGain.gain.value = 0.36;
    dryGain.gain.value = 0.72;

    convolver.connect(wetGain);
    wetGain.connect(audioCtx.destination);
    dryGain.connect(audioCtx.destination);

    return { convolver, wetGain, dryGain };
};

const playInstrumentNote = (params: {
    audioCtx: AudioContext;
    instrument: InstrumentOption;
    frequency: number;
    noteLength: number;
    noteStartTime: number;
    reverb: { convolver: ConvolverNode; dryGain: GainNode };
}) => {
    const {
        audioCtx,
        instrument,
        frequency,
        noteLength,
        noteStartTime,
        reverb,
    } = params;

    const safeLength = Math.max(0.05, noteLength);

    if (instrument === "electric piano") {
        const masterGain = audioCtx.createGain();
        masterGain.connect(reverb.dryGain);
        masterGain.connect(reverb.convolver);

        masterGain.gain.setValueAtTime(0.0001, noteStartTime);
        masterGain.gain.exponentialRampToValueAtTime(0.42, noteStartTime + 0.008);
        masterGain.gain.exponentialRampToValueAtTime(
            0.16,
            noteStartTime + Math.min(safeLength * 0.35, 0.11)
        );
        masterGain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + safeLength);

        const partials: Array<{ ratio: number; amp: number; type: OscillatorType; detune?: number }> = [
            { ratio: 1, amp: 1, type: "triangle", detune: -2 },
            { ratio: 1, amp: 0.55, type: "triangle", detune: 3 },
            { ratio: 2, amp: 0.3, type: "sine" },
            { ratio: 3, amp: 0.12, type: "sine" },
        ];

        partials.forEach((partial) => {
            const partialOsc = audioCtx.createOscillator();
            const partialGain = audioCtx.createGain();

            partialOsc.type = partial.type;
            partialOsc.frequency.value = frequency * partial.ratio;
            partialOsc.detune.value = partial.detune ?? 0;
            partialGain.gain.value = partial.amp;

            partialOsc.connect(partialGain);
            partialGain.connect(masterGain);

            partialOsc.start(noteStartTime);
            partialOsc.stop(noteStartTime + safeLength);
        });

        return;
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = instrument;
    oscillator.frequency.value = frequency;
    oscillator.connect(gainNode);
    gainNode.connect(reverb.dryGain);
    gainNode.connect(reverb.convolver);

    gainNode.gain.setValueAtTime(0.0001, noteStartTime);
    gainNode.gain.exponentialRampToValueAtTime(0.3, noteStartTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.01, noteStartTime + safeLength);

    oscillator.start(noteStartTime);
    oscillator.stop(noteStartTime + safeLength);
};

export default function MusicPage() {
    const isGuest = useGuestMode();
    const [songs, setSongs] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [activeSongId, setActiveSongId] = useState<string | null>(null);
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(SPEED_MULTIPLIERS.NORMAL);
    const [instrument, setInstrument] = useState<InstrumentOption>("electric piano");
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(() => Boolean(auth.currentUser));
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(auth.currentUser));
    const [isAdmin, setIsAdmin] = useState(false);
    const [newMelodyName, setNewMelodyName] = useState("");
    const [newMelodyArtist, setNewMelodyArtist] = useState("");
    const [newMelodyFrequencies, setNewMelodyFrequencies] = useState("");
    const [newMelodyDelays, setNewMelodyDelays] = useState("");
    const [editMelodyFrequencies, setEditMelodyFrequencies] = useState("");
    const [editMelodyDelays, setEditMelodyDelays] = useState("");
    const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
    const [isSavingMelody, setIsSavingMelody] = useState(false);
    const [isUpdatingMelody, setIsUpdatingMelody] = useState(false);
    const [deletingMelodyId, setDeletingMelodyId] = useState<string | null>(null);
    const [isMobilePiano, setIsMobilePiano] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const audioReverbRef = useRef<{ convolver: ConvolverNode; wetGain: GainNode; dryGain: GainNode } | null>(null);
    const speedMultiplierRef = useRef(SPEED_MULTIPLIERS.NORMAL);
    const instrumentRef = useRef<InstrumentOption>("electric piano");
    const [activeFrequency, setActiveFrequency] = useState<number | null>(null);

    const updatePlaybackState = async (songId: string, isPlaying: boolean) => {
        if (isGuest) {
            return;
        }

        if (!songId || !isAuthenticated || !isAdmin) {
            return;
        }

        try {
            await setDoc(
                doc(db, "music", songId),
                {
                    state: isPlaying ? "on" : "off",
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Error updating melody playback state:", error);
        }
    };

    const stopMusic = (songId?: string) => {
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
            audioReverbRef.current = null;
            setActiveSongId(null);
            setActiveFrequency(null);
        }

        const idToStop = songId ?? activeSongId;
        if (idToStop) {
            void updatePlaybackState(idToStop, false);
        }
    };

    const playMusic = async (
        songId: string,
        frequencies: number[],
        noteDelays: number[],
    ) => {
        stopMusic();
        void updatePlaybackState(songId, true);

        const WinAudioContext = (window as unknown as {
            AudioContext: typeof AudioContext;
            webkitAudioContext: typeof AudioContext
        });

        const SelectedContext = WinAudioContext.AudioContext || WinAudioContext.webkitAudioContext;
        const audioCtx = new SelectedContext();

        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

        audioCtxRef.current = audioCtx;
        audioReverbRef.current = initializeReverbFx(audioCtx);
        setActiveSongId(songId);

        for (let i = 0; i < frequencies.length; i++) {
            if (!audioCtxRef.current || audioCtxRef.current !== audioCtx) break;

            const reverb = audioReverbRef.current;
            if (!reverb || reverb.convolver.context !== audioCtx) break;

            const freq = frequencies[i] ?? 0;
            const normalizedFreq = Number.isFinite(freq) ? freq : 0;
            setActiveFrequency(normalizedFreq > 0 ? normalizedFreq : null);

            const baseDelay = noteDelays[i] ?? 300;
            const delay = baseDelay * speedMultiplierRef.current;
            const noteLength = delay / 1000;

            if (normalizedFreq > 0) {
                playInstrumentNote({
                    audioCtx,
                    instrument: instrumentRef.current,
                    frequency: normalizedFreq,
                    noteLength,
                    noteStartTime: audioCtx.currentTime,
                    reverb,
                });
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (audioCtxRef.current === audioCtx) {
            setActiveSongId(null);
            setActiveFrequency(null);
            void updatePlaybackState(songId, false);
        }
    };

    useEffect(() => {
        if (isGuest) {
            setIsAuthReady(true);
            setIsAuthenticated(false);
            setIsAdmin(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(Boolean(user));
            setIsAuthReady(true);

            if (!user) {
                setIsAdmin(false);
                return;
            }

            const userDocRefs = [
                user.email ? doc(db, "users", user.email) : null,
                doc(db, "users", user.uid),
            ].filter(Boolean) as ReturnType<typeof doc>[];

            (async () => {
                try {
                    for (const userDocRef of userDocRefs) {
                        const snap = await getDoc(userDocRef);
                        if (snap.exists()) {
                            const role = String(snap.data()?.role || "").toLowerCase();
                            setIsAdmin(role === "admin");
                            return;
                        }
                    }
                    setIsAdmin(false);
                } catch (error) {
                    console.error("Error resolving user role:", error);
                    setIsAdmin(false);
                }
            })();
        });

        return unsubscribe;
    }, [isGuest]);

    useEffect(() => {
        if (isGuest) {
            setIsLoading(false);
            setLoadError(null);
            setSongs([]);
            return;
        }

        setIsLoading(true);
        setLoadError(null);

        const unsubscribe = onSnapshot(
            collection(db, "music"),
            (querySnapshot) => {
                const musicData: Song[] = [];

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data() as DocumentData;

                    musicData.push({
                        id: docSnap.id,
                        name: typeof data.name === "string" && data.name ? data.name : docSnap.id,
                        artist: typeof data.artist === "string" && data.artist ? data.artist : "Unknown",
                        frequencies: toNumberArray(data.frequencies),
                        noteDelays: toNumberArray(data.noteDelays),
                    });
                });

                setSongs(musicData);
                setIsLoading(false);
            },
            (error) => {
                const errorCode = error?.code ? ` (${error.code})` : "";
                if (error?.code === "permission-denied") {
                    setLoadError(`Access denied to melodies${errorCode}. Please sign in with an authorized account.`);
                } else {
                    setLoadError(`Unable to load melodies right now${errorCode}. Please try again.`);
                }
                setIsLoading(false);
                console.error("Error syncing melodies:", error);
            }
        );

        return () => {
            unsubscribe();
            stopMusic();
        };
    }, [isGuest]);

    useEffect(() => {
        instrumentRef.current = instrument;
    }, [instrument]);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 640px)");

        const updateMobilePiano = () => {
            setIsMobilePiano(mediaQuery.matches);
        };

        updateMobilePiano();
        mediaQuery.addEventListener("change", updateMobilePiano);

        return () => {
            mediaQuery.removeEventListener("change", updateMobilePiano);
        };
    }, []);

    useEffect(() => {
        setSelectedSong((prev) => {
            if (songs.length === 0) {
                return null;
            }

            if (!prev) {
                return songs[0];
            }

            return songs.find((song) => song.id === prev.id) ?? songs[0];
        });
    }, [songs]);

    useEffect(() => {
        if (!selectedSong) {
            setEditMelodyFrequencies("");
            setEditMelodyDelays("");
            setIsEditPanelOpen(false);
            return;
        }

        const aligned = formatAlignedFrequencyDelayStrings(
            selectedSong.frequencies,
            selectedSong.noteDelays || []
        );
        setEditMelodyFrequencies(aligned.frequenciesText);
        setEditMelodyDelays(aligned.delaysText);
    }, [selectedSong]);

    const handleAddMelody = async () => {
        if (isSavingMelody) return;

        if (!isAuthenticated) {
            alert("Please sign in before adding a melody.");
            return;
        }

        if (!isAdmin) {
            alert("Only admin users can add melodies.");
            return;
        }

        const melodyName = newMelodyName.trim();
        const artistName = newMelodyArtist.trim() || "Unknown";
        const frequencies = parseFrequencies(newMelodyFrequencies);
        const noteDelays = parseNoteDelays(newMelodyDelays);

        if (!melodyName) {
            alert("Enter a melody name.");
            return;
        }

        if (frequencies.length === 0 || frequencies.every((freq) => freq <= 0)) {
            alert("Enter notes and optional pauses as 0, for example 262, 294, 0, 330.");
            return;
        }

        if (noteDelays.length === 0) {
            alert("Enter an Arduino delay value for each note, for example 500, 500, 250, 750.");
            return;
        }

        if (noteDelays.length !== frequencies.length) {
            alert("Delay count must match frequency count so each note has one Arduino delay value.");
            return;
        }

        if (melodyName.includes("/")) {
            alert("Melody name cannot include /.");
            return;
        }

        try {
            setIsSavingMelody(true);
            const melodyDocRef = doc(collection(db, "music"), melodyName);
            await setDoc(melodyDocRef, {
                name: melodyName,
                artist: artistName,
                frequencies,
                noteDelays,
                updatedAt: new Date().toISOString(),
            });

            setNewMelodyName("");
            setNewMelodyArtist("");
            setNewMelodyFrequencies("");
            setNewMelodyDelays("");
            alert(`Melody "${melodyName}" was saved.`);
        } catch (error: any) {
            const message = error?.code ? `Unable to save melody (${error.code}).` : "Unable to save melody.";
            console.error("Error adding melody:", error);
            alert(message);
        } finally {
            setIsSavingMelody(false);
        }
    };

    const handleUpdateMelody = async () => {
        if (isUpdatingMelody || !selectedSong) return;

        if (!isAuthenticated) {
            alert("Please sign in before editing a melody.");
            return;
        }

        if (!isAdmin) {
            alert("Only admin users can edit melodies.");
            return;
        }

        const frequencies = parseFrequencies(editMelodyFrequencies);
        const noteDelays = parseNoteDelays(editMelodyDelays);

        if (frequencies.length === 0 || frequencies.every((freq) => freq <= 0)) {
            alert("Enter notes and optional pauses as 0, for example 262, 294, 0, 330.");
            return;
        }

        if (noteDelays.length === 0) {
            alert("Enter an Arduino delay value for each note, for example 500, 500, 250, 750.");
            return;
        }

        if (noteDelays.length !== frequencies.length) {
            alert("Delay count must match frequency count so each note has one Arduino delay value.");
            return;
        }

        try {
            setIsUpdatingMelody(true);
            const melodyDocRef = doc(collection(db, "music"), selectedSong.id);
            await setDoc(
                melodyDocRef,
                {
                    frequencies,
                    noteDelays,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );

            alert(`Melody "${selectedSong.name}" was updated.`);
        } catch (error: any) {
            const message = error?.code ? `Unable to update melody (${error.code}).` : "Unable to update melody.";
            console.error("Error updating melody:", error);
            alert(message);
        } finally {
            setIsUpdatingMelody(false);
        }
    };

    const handleDeleteMelody = async () => {
        if (!selectedSong || deletingMelodyId) return;

        if (!isAuthenticated) {
            alert("Please sign in before deleting a melody.");
            return;
        }

        if (!isAdmin) {
            alert("Only admin users can delete melodies.");
            return;
        }

        const confirmed = window.confirm(
            `Delete "${selectedSong.name}"? This will permanently remove it from cloud storage.`
        );
        if (!confirmed) return;

        try {
            setDeletingMelodyId(selectedSong.id);
            await deleteDoc(doc(collection(db, "music"), selectedSong.id));
            alert(`Melody "${selectedSong.name}" was deleted.`);
        } catch (error: any) {
            const message = error?.code ? `Unable to delete melody (${error.code}).` : "Unable to delete melody.";
            console.error("Error deleting melody:", error);
            alert(message);
        } finally {
            setDeletingMelodyId(null);
        }
    };

    const displayedPianoNotes = isMobilePiano ? PIANO_NOTES.slice(0, 7) : PIANO_NOTES;
    const pianoSelection = getPianoSelection(activeFrequency, displayedPianoNotes);

    return (
        <main className="min-h-screen bg-transparent">
            <TopHeader />
            <PageShell title="Music" subtitle="Music Control ">
                <div className="max-w-5xl mx-auto p-4 md:p-6">

                    {/* 1. Hold off rendering while we check hydration status */}
                    {isGuest === null ? (
                        <div className="flex items-center justify-center min-h-[60vh] text-white/20 uppercase tracking-[0.2em] font-black text-xs animate-pulse">
                            Loading Music System...
                        </div>
                    ) : isGuest === true ? (
                        /* 2. Confirmed Guest */
                        <GuestGate
                            title="Sign in required"
                            message="You need to sign up or log in to use music controls in guest mode."
                        />
                    ) : (
                        /* 3. Confirmed Authenticated User */
                        <>
                            {/* TOP NAVIGATION & CONTROLS */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                                <Link
                                    href="/hub"
                                    className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white/80 font-bold text-sm hover:bg-white/10 transition-all shadow-xl"
                                >
                                    <CaretLeft size={18} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
                                    Back to hub
                                </Link>

                                <div className="flex flex-col gap-3 items-end">
                                    {/* SPEED SELECTOR - HUB STYLE */}
                                    <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 backdrop-blur-lg">
                                        {Object.entries(SPEED_MULTIPLIERS).map(([label, value]) => (
                                            <button
                                                key={label}
                                                onClick={() => {
                                                    setSpeedMultiplier(value);
                                                    speedMultiplierRef.current = value;
                                                }}
                                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${speedMultiplier === value
                                                    ? 'bg-[var(--color-accent)] text-black shadow-lg scale-105'
                                                    : 'text-white/40 hover:text-white/70'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* INSTRUMENT SELECTOR */}
                                    <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 backdrop-blur-lg">
                                        {INSTRUMENT_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setInstrument(option.value)}
                                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${instrument === option.value
                                                    ? 'bg-[var(--color-accent)] text-black shadow-lg scale-105'
                                                    : 'text-white/40 hover:text-white/70'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-10 rounded-3xl bg-white/5 border border-white/10 p-5 shadow-xl backdrop-blur-md w-full">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-white font-black text-sm">
                                        Current Melody
                                    </h3>

                                    <span className="px-3 py-1 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-[9px] font-black uppercase">
                                        {activeSongId ? "ON" : "OFF"}
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-black/30 p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]">
                                            Mini Piano
                                        </p>
                                        <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">
                                            Playing Now
                                        </p>
                                    </div>

                                    <div
                                        className="grid gap-1"
                                        style={{ gridTemplateColumns: `repeat(${displayedPianoNotes.length}, minmax(0, 1fr))` }}
                                    >
                                        {displayedPianoNotes.map((note, index) => {
                                            const isWhiteActive = pianoSelection?.type === "white" && pianoSelection.index === index;
                                            const isBlackActive = pianoSelection?.type === "black" && pianoSelection.index === index;
                                            const isLastMobileWhiteKey = isMobilePiano && index === displayedPianoNotes.length - 1;

                                            return (
                                                <div
                                                    key={`${note.label}-${index}`}
                                                    className={`relative h-24 sm:h-28 rounded-b-lg border border-white/10 transition-all flex items-end justify-center pb-2 text-xs font-black ${isWhiteActive
                                                            ? "bg-[var(--color-accent)] text-black shadow-lg"
                                                            : "bg-white text-black/60"
                                                        }`}
                                                >
                                                    {["C", "D", "F", "G", "A"].includes(note.label) && !isLastMobileWhiteKey && (
                                                        <div className={`absolute -top-1 right-[-12px] z-10 w-5 h-14 rounded-b-md shadow-lg transition-all flex items-center justify-center ${isBlackActive
                                                                ? "bg-[var(--color-accent)] brightness-110"
                                                                : "bg-black"
                                                            }`}
                                                        >
                                                            <span className={`text-[8px] font-black ${isBlackActive ? "text-black" : "text-white"}`}>
                                                                {note.label}#
                                                            </span>
                                                        </div>
                                                    )}

                                                    {note.label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-[10px] tracking-[0.4em] text-[var(--color-accent)] font-black mb-6 uppercase opacity-80 flex items-center gap-2">
                                <MusicNotes size={16} weight="fill" />
                                Available Tracks
                            </h2>

                            {isLoading && (
                                <div className="mb-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white/70 text-sm">
                                    Loading melodies...
                                </div>
                            )}

                            {loadError && (
                                <div className="mb-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-[var(--color-danger)] text-sm">
                                    {loadError}
                                </div>
                            )}

                            {/* TRACK GRID */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {songs.map((song) => (
                                    <div
                                        key={song.id}
                                        className={`group rounded-3xl backdrop-blur-md border transition-all duration-500 p-5 flex flex-col gap-5 shadow-xl ${activeSongId === song.id
                                            ? "bg-white/15 border-[var(--color-accent)]"
                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* ICON CONTAINER */}
                                            <div className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500 ${activeSongId === song.id
                                                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] scale-110"
                                                : "bg-white/10 text-white/40 group-hover:text-white/70"
                                                }`}>
                                                <MusicNotes size={32} weight={activeSongId === song.id ? "fill" : "regular"} />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="overflow-hidden">
                                                    <p className="song-marquee text-lg font-bold text-white tracking-tight leading-snug whitespace-nowrap">
                                                        {song.name}
                                                    </p>
                                                </div>
                                                <p className="text-white/60 text-[10px] tracking-[0.2em] uppercase font-black italic">
                                                    {song.artist}
                                                </p>
                                            </div>
                                        </div>

                                        {/* ACTION BUTTON */}
                                        <button
                                            onClick={() => activeSongId === song.id
                                                ? stopMusic(song.id)
                                                : playMusic(song.id, song.frequencies, song.noteDelays)}
                                            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-black tracking-widest transition-all active:scale-95 ${activeSongId === song.id
                                                ? "bg-[var(--color-danger)] text-white shadow-lg shadow-[var(--color-danger-glow)]"
                                                : "bg-[var(--color-accent)] text-black shadow-lg hover:scale-105"
                                                }`}
                                        >
                                            {activeSongId === song.id ? (
                                                <>
                                                    <Stop size={18} weight="fill" />
                                                    STOP
                                                </>
                                            ) : (
                                                <>
                                                    <Play size={18} weight="fill" />
                                                    PLAY
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {songs.length === 0 && !isLoading && !loadError && (
                                <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white/60 text-sm">
                                    No melodies available yet.
                                </div>
                            )}

                            <h2 className="text-[10px] tracking-[0.4em] text-[var(--color-accent)] font-black mt-12 mb-6 uppercase opacity-80">
                                Admin Dashboard
                            </h2>

                            {!isAuthReady && (
                                <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-xl backdrop-blur-md text-white/70 text-sm">
                                    Checking your account...
                                </div>
                            )}

                            {isAuthReady && !isAuthenticated && (
                                <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-xl backdrop-blur-md text-white/70 text-sm">
                                    Sign in with an admin account to manage melodies.
                                </div>
                            )}

                            {isAuthReady && isAuthenticated && !isAdmin && (
                                <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-xl backdrop-blur-md text-white/70 text-sm">
                                    Admin access required to edit or delete melodies.
                                </div>
                            )}

                            {isAuthReady && isAuthenticated && isAdmin && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-xl backdrop-blur-md">
                                        <h3 className="text-white font-black text-sm mb-4">Add Melody</h3>
                                        <div className="space-y-3">
                                            <input
                                                value={newMelodyName}
                                                onChange={(event) => setNewMelodyName(event.target.value)}
                                                placeholder="Melody name"
                                                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[var(--color-accent)]"
                                            />
                                            <input
                                                value={newMelodyArtist}
                                                onChange={(event) => setNewMelodyArtist(event.target.value)}
                                                placeholder="Artist (optional)"
                                                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[var(--color-accent)]"
                                            />
                                            <textarea
                                                value={newMelodyFrequencies}
                                                onChange={(event) => setNewMelodyFrequencies(event.target.value)}
                                                placeholder="Frequencies (0 for rest), e.g. 262, 294, 0, 330"
                                                rows={3}
                                                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[var(--color-accent)]"
                                            />
                                            <textarea
                                                value={newMelodyDelays}
                                                onChange={(event) => setNewMelodyDelays(event.target.value)}
                                                placeholder="Arduino delays (ms), e.g. 500, 500, 250, 750"
                                                rows={3}
                                                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[var(--color-accent)]"
                                            />
                                            <button
                                                onClick={handleAddMelody}
                                                disabled={isSavingMelody}
                                                className={`w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${isSavingMelody
                                                    ? "bg-white/10 text-white/40"
                                                    : "bg-[var(--color-accent)] text-black shadow-lg"
                                                    }`}
                                            >
                                                {isSavingMelody ? "Saving..." : "Save Melody"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-xl backdrop-blur-md">
                                        <h3 className="text-white font-black text-sm mb-4">Manage Melody</h3>
                                        {songs.length === 0 ? (
                                            <div className="text-white/60 text-sm">Add a melody to start editing.</div>
                                        ) : (
                                            <div className="space-y-4">
                                                <select
                                                    value={selectedSong?.id ?? ""}
                                                    onChange={(event) => {
                                                        const next = songs.find((song) => song.id === event.target.value) || null;
                                                        setSelectedSong(next);
                                                    }}
                                                    className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none focus:border-[var(--color-accent)]"
                                                >
                                                    {songs.map((song) => (
                                                        <option key={song.id} value={song.id} className="text-black">
                                                            {song.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-white/70 text-xs">
                                                    {selectedSong?.artist ?? "Unknown"}
                                                </div>

                                                <button
                                                    onClick={() => setIsEditPanelOpen((prev) => !prev)}
                                                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/70 hover:text-white"
                                                >
                                                    {isEditPanelOpen ? "Hide Editor" : "Edit Frequencies / Delays"}
                                                </button>

                                                {isEditPanelOpen && (
                                                    <div className="space-y-3">
                                                        <textarea
                                                            value={editMelodyFrequencies}
                                                            onChange={(event) => setEditMelodyFrequencies(event.target.value)}
                                                            placeholder="Frequencies (0 for rest)"
                                                            rows={3}
                                                            className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[var(--color-accent)]"
                                                        />
                                                        <textarea
                                                            value={editMelodyDelays}
                                                            onChange={(event) => setEditMelodyDelays(event.target.value)}
                                                            placeholder="Arduino delays (ms)"
                                                            rows={3}
                                                            className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[var(--color-accent)]"
                                                        />
                                                        <button
                                                            onClick={handleUpdateMelody}
                                                            disabled={isUpdatingMelody}
                                                            className={`w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${isUpdatingMelody
                                                                ? "bg-white/10 text-white/40"
                                                                : "bg-[var(--color-accent)] text-black shadow-lg"
                                                                }`}
                                                        >
                                                            {isUpdatingMelody ? "Updating..." : "Update Melody"}
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleDeleteMelody}
                                                    disabled={Boolean(deletingMelodyId)}
                                                    className={`w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${deletingMelodyId
                                                        ? "bg-white/10 text-white/40"
                                                        : "bg-[var(--color-danger)] text-white shadow-lg"
                                                        }`}
                                                >
                                                    {deletingMelodyId ? "Deleting..." : "Delete Melody"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </PageShell>
        </main>
    );
}