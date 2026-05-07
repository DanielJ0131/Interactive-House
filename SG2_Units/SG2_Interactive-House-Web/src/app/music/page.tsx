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

export default function MusicPage() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [activeSongId, setActiveSongId] = useState<string | null>(null);
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(SPEED_MULTIPLIERS.NORMAL);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const speedMultiplierRef = useRef(SPEED_MULTIPLIERS.NORMAL);
    const [activeFrequency, setActiveFrequency] = useState<number | null>(null);

    const stopMusic = () => {
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
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

        audioCtxRef.current = audioCtx;
        setActiveSongId(songId);

        for (let i = 0; i < frequencies.length; i++) {
            if (!audioCtxRef.current) break;

            const freq = frequencies[i];
            setActiveFrequency(freq);

            const baseDelay = noteDelays[i] ?? 300;
            const delay = baseDelay * speedMultiplierRef.current;

            if (freq > 0) {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.0001,
                    audioCtx.currentTime + delay / 1000
                );

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + delay / 1000);
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
            const musicData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Song[];
            setSongs(musicData);
        };
        fetchMusic();
        return () => stopMusic();
    }, []);

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
                            {PIANO_NOTES.map((note, index) => (
                                <div
                                    key={`${note.label}-${index}`}
                                    className={`relative h-28 rounded-b-lg border border-white/10 transition-all flex items-end justify-center pb-2 text-xs font-black ${
                                        activeFrequency === note.freq
                                            ? "bg-[var(--color-accent)] text-black scale-105 shadow-lg"
                                            : "bg-white text-black/60"
                                    }`}
                                >
                                    {["C", "D", "F", "G", "A"].includes(note.label) && (
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-14 bg-black rounded-b-md text-white flex items-end justify-center pb-1 text-[9px]">
                                            {note.label}
                                        </div>
                                    )}

                                    {note.label}
                                </div>
                            ))}
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