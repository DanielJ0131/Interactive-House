"use client";
import { useEffect, useState, useRef } from "react";
import { PageShell } from "@/components/pageShell";
import TopHeader from "@/components/TopHeader";
import { db } from "@/utils/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
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

const PIANO_RANGE = {
    min: Math.min(...PIANO_NOTES.map((note) => note.freq)),
    max: Math.max(...PIANO_NOTES.map((note) => note.freq)),
};

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

const getPianoSelection = (frequency: number | null): PianoSelection => {
    const activeNoteName = frequencyToNoteName(frequency);
    const activeNoteClass = frequencyToNoteClass(frequency);

    if (!activeNoteClass) return null;

    for (let i = 0; i < PIANO_NOTES.length; i += 1) {
        const note = PIANO_NOTES[i];
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
    const candidates = PIANO_NOTES.map((note, index) => ({ note, index }))
        .filter(({ note, index }) => {
            if (note.label !== baseLabel) return false;
            if (isSharp) {
                return ["C", "D", "F", "G", "A"].includes(note.label) && index < PIANO_NOTES.length - 1;
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
    const [songs, setSongs] = useState<Song[]>([]);
    const [activeSongId, setActiveSongId] = useState<string | null>(null);
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(SPEED_MULTIPLIERS.NORMAL);
    const [instrument, setInstrument] = useState<InstrumentOption>("electric piano");
    const audioCtxRef = useRef<AudioContext | null>(null);
    const audioReverbRef = useRef<{ convolver: ConvolverNode; wetGain: GainNode; dryGain: GainNode } | null>(null);
    const speedMultiplierRef = useRef(SPEED_MULTIPLIERS.NORMAL);
    const instrumentRef = useRef<InstrumentOption>("electric piano");
    const [activeFrequency, setActiveFrequency] = useState<number | null>(null);

    const stopMusic = () => {
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
            audioReverbRef.current = null;
            setActiveSongId(null);
            setActiveFrequency(null);
        }
    };

    const playMusic = async (
        songId: string,
        frequencies: number[],
        noteDelays: number[],
    ) => {
        stopMusic();

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
        }
    };

    useEffect(() => {
    const fetchMusic = async () => {
        const querySnapshot = await getDocs(collection(db, "music"));
        const musicData = querySnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;

            return {
                id: doc.id,
                name: typeof data.name === "string" && data.name ? data.name : doc.id,
                artist: typeof data.artist === "string" && data.artist ? data.artist : "Unknown",
                frequencies: toNumberArray(data.frequencies),
                noteDelays: toNumberArray(data.noteDelays),
            } as Song;
        });
        setSongs(musicData);
    };

    fetchMusic();

    return () => stopMusic();
    }, []);

    useEffect(() => {
        instrumentRef.current = instrument;
    }, [instrument]);

const pianoSelection = getPianoSelection(activeFrequency);

    return (
        <main className="min-h-screen bg-transparent">
        <TopHeader />
        <PageShell title="Music" subtitle="Music Control ">
            <div className="max-w-5xl mx-auto p-4 md:p-6">

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
                            style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}
                        >
                            {PIANO_NOTES.map((note, index) => {
                                const isWhiteActive = pianoSelection?.type === "white" && pianoSelection.index === index;
                                const isBlackActive = pianoSelection?.type === "black" && pianoSelection.index === index;

                                return (
                                <div
                                    key={`${note.label}-${index}`}
                                    className={`relative h-28 rounded-b-lg border border-white/10 transition-all flex items-end justify-center pb-2 text-xs font-black ${
                                        isWhiteActive
                                            ? "bg-[var(--color-accent)] text-black shadow-lg"
                                            : "bg-white text-black/60"
                                    }`}
                                 >
                                {["C", "D", "F", "G", "A"].includes(note.label) && index !== PIANO_NOTES.length - 1 && (
                                    <div className={`absolute -top-1 right-[-12px] z-10 w-5 h-14 rounded-b-md shadow-lg transition-all flex items-center justify-center ${
                                        isBlackActive
                                        ? "bg-[var(--color-accent)] brightness-110"
                                        : "bg-black"
                                    }`}
                                    >
                                        <span className="text-[8px] font-black text-white">
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

                {/* TRACK LIST - MATCHING HUB TILES */}
                <div className="grid grid-cols-1 gap-4">
                    {songs.map((song) => (
                        <div
                            key={song.id}
                            className={`group rounded-3xl backdrop-blur-md border transition-all duration-500 p-5 flex items-center justify-between shadow-xl ${activeSongId === song.id
                                    ? "bg-white/15 border-[var(--color-accent)] border-l-4 border-l-[var(--color-accent)]"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                }`}
                        >
                            <div className="flex items-center gap-5">
                                {/* ICON CONTAINER */}
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${activeSongId === song.id
                                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] scale-110"
                                        : "bg-white/10 text-white/40 group-hover:text-white/70"
                                    }`}>
                                    <MusicNotes size={32} weight={activeSongId === song.id ? "fill" : "regular"} />
                                </div>

                                <div>
                                    <p className="text-xl font-bold text-white tracking-tight leading-none mb-1">
                                        {song.name}
                                    </p>
                                    <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase font-black italic">
                                        {song.artist}
                                    </p>
                                </div>
                            </div>

                            {/* ACTION BUTTON */}
                            <button
                                onClick={() => activeSongId === song.id ? stopMusic() : playMusic(song.id, song.frequencies, song.noteDelays)}
                                className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black tracking-widest transition-all active:scale-95 ${activeSongId === song.id
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
            </div>
        </PageShell>
        </main>
    );
}