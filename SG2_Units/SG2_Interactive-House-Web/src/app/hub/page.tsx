"use client";

import React from 'react';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/utils/firebaseConfig";
import { useSpeechContext } from '../context/SpeechContext';    
import TopHeader from "@/components/TopHeader";
import { PageShell } from "@/components/pageShell";
import Icon from '@mdi/react';
import { mdiLightbulb, mdiDoor, mdiWeatherWindy, mdiFan, mdiRun, mdiCloud, mdiAlert, mdiRefresh, mdiMicrophone, mdiChevronRight } from '@mdi/js';


function DeviceCard({
    icon,
    title,
    pin,
    state,
    onToggle,
    loading = false,
}: {
    icon: string;
    title: string;
    pin: string;
    state: string;
    onToggle?: () => void;
    loading?: boolean;
}) {
    const isActive = state === "ON" || state === "OPEN" || state === "FORWARD" || state === "REVERSE";
    return (
        <div
            role={onToggle ? "button" : undefined}
            tabIndex={onToggle ? 0 : undefined}
            onClick={onToggle}
            onKeyDown={(event) => {
                if (!onToggle) return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggle();
                }
            }}
            className={`w-full rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all text-left ${onToggle ? "cursor-pointer hover:bg-white/10" : "cursor-default"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    <Icon path={icon} size={1.5} className={title.includes("Fan") && isActive ? "animate-spin" : ""} style={title.includes("Fan") && isActive ? {animationDuration: '0.5s'} : {}} />
                </div>
                <div>
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="text-white/40 text-sm font-mono">PIN {pin}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                disabled={loading}
                className={`px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all ${isActive
                    ? "bg-[var(--color-accent)] text-black shadow-lg scale-105"
                    : "bg-white/10 text-white/40 hover:bg-white/20"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                {loading ? "..." : state}
            </button>
        </div>
    );
}

function SliderCard({
    title,
    pin,
    icon,
    value,
    onChange,
}: {
    title: string;
    pin: string;
    icon: React.ReactNode;
    value: number;
    onChange: (val: number) => void;
}) {
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[var(--color-warning)]">
                        {icon}
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white">{title}</p>
                        <p className="text-white/40 text-sm font-mono">PIN {pin}</p>
                    </div>
                </div>
                <span className="text-[var(--color-accent)] font-mono font-bold bg-[var(--color-accent-soft)] px-3 py-1 rounded-lg text-xs">
                    {Math.round((value / 255) * 100)}%
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="255"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--color-accent)]"
            />
        </div>
    );
}

function SensorCard({ title, value, icon, unit = "" }: { title: string; value: number; icon: React.ReactNode; unit?: string }) {
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
                    {icon}
                </div>
                <p className="text-sm font-bold text-white/60 tracking-widest uppercase">{title}</p>
            </div>
            <p className="text-2xl font-mono text-white">{value}<span className="text-xs text-white/30 ml-1">{unit}</span></p>
        </div>
    );
}

/* --- MAIN PAGE --- */

export default function HubPage() {
    const router = useRouter();
    const deviceRef = doc(db, "devices", "arduino");

    const [username, setUsername] = useState("Home");

    // States
    const [whiteLight, setWhiteLight] = useState(false);
    const [door, setDoor] = useState(false);
    const [windowState, setWindowState] = useState(false);
    const [fanState, setFanState] = useState<'off' | 'forward' | 'reverse'>('off');
    const [fanLoading, setFanLoading] = useState(false);
    const [orange_light, setOrangeLight] = useState(0);
    const [buzzer, setBuzzer] = useState(false);

    const [motion, setMotion] = useState(0);
    const [steam, setSteam] = useState(0);
    const [gas, setGas] = useState(0);
    const [soil, setSoil] = useState(0);
    const [light, setLight] = useState(0);

    const [syncSource, setSyncSource] = useState("arduino");
    const [syncTime, setSyncTime] = useState("");
    
    //for speech
    const {transcript} = useSpeechContext();

   useEffect(() =>{
    if  (!transcript) return;


    const text = transcript.toLowerCase();

    if ((text.includes("on light") || text.includes("light on")) && !whiteLight){
        toggleLight();}

    if ((text.includes("off light") || text.includes("light off")) && whiteLight){
        toggleLight();}

if ((text.includes("open door")) && !door){
        toggleDoor();}

if ((text.includes("close door")) && door){
        toggleDoor();}

    if ((text.includes("open window")) && !windowState){
        toggleWindow();}

    if  ((text.includes("close window")) && windowState){
        toggleWindow();}

    if  ((text.includes("turn on buzzer") || text.includes("buzzer on")) && !buzzer){
        toggleBuzzer();}

    if ((text.includes("turn off buzzer") || text.includes("buzzer off")) && buzzer){
        toggleBuzzer();}

    if ((text.includes("on fan") || text.includes("fan on")) && fanState === "off"){
    toggleFan();}

    if ((text.includes("off fan") || text.includes("fan off")) && fanState !== "off"){
    toggleFan();}

    if (
      (text.includes("reverse") || text.includes("switch fan direction")) &&
          fanState !== "off"){
    toggleReverse();

    
}}, [transcript, whiteLight, door, windowState, buzzer, fanState, fanLoading]);

    // Auth & Data Listeners
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (!user) router.replace("/auth/login");
            else setUsername(user.email?.split("@")[0] || "Home");
        });
        return () => unsub();
    }, [router]);

    useEffect(() => {
        const unsub = onSnapshot(deviceRef, (snap) => {
            const data = snap.data();
            if (!data) return;

            setWhiteLight(data.white_light?.state === "on");
            const doorState = String(data.door?.state ?? "").toLowerCase();
            const windowStateValue = String(data.window?.state ?? "").toLowerCase();

            setDoor(doorState === "open");
            setWindowState(windowStateValue === "open");
            const fanINAOn = data.fan_INA?.state === "on";
            const fanINBOn = data.fan_INB?.state === "on";
            if (fanINAOn && !fanINBOn) setFanState('forward');
            else if (!fanINAOn && fanINBOn) setFanState('reverse');
            else setFanState('off');
            setOrangeLight(data.orange_light?.value ?? 0);
            setBuzzer(data.buzzer?.state === "on");

            setMotion(data.telemetry?.motion ?? 0);
            setSteam(data.telemetry?.steam ?? 0);
            setGas(data.telemetry?.gas ?? 0);
            setSoil(data.telemetry?.soil ?? 0);
            setLight(data.telemetry?.light ?? 0);

            setSyncSource(data.sync?.lastSource ?? "arduino");
            if (data.sync?.lastUpdatedAt?.seconds) {
                const date = new Date(data.sync.lastUpdatedAt.seconds * 1000);
                setSyncTime(date.toLocaleString());
            }
        });
        return () => unsub();
    }, []);

    // Handlers
    const toggleLight = async () => await updateDoc(deviceRef, { "white_light.state": whiteLight ? "off" : "on" });
    const toggleDoor = async () => await updateDoc(deviceRef, { "door.state": door ? "closed" : "open" });
    const toggleWindow = async () => await updateDoc(deviceRef, { "window.state": windowState ? "closed" : "open" });
    const toggleFan = () => {
        if (fanLoading) return;
        setFanLoading(true);
        const newState: 'off' | 'forward' | 'reverse' = fanState === 'off' ? 'forward' : 'off';
        setFanState(newState);
        if (newState === 'forward') {
            updateDoc(deviceRef, { "fan_INA.state": "on", "fan_INB.state": "off" }).then(() => setFanLoading(false));
        } else {
            updateDoc(deviceRef, { "fan_INA.state": "off", "fan_INB.state": "off" }).then(() => setFanLoading(false));
        }
    };
    const toggleReverse = () => {
        if (fanLoading) return;
        setFanLoading(true);
        
        if (fanState === 'forward') {
            // Currently forward, switch to reverse
            setFanState('reverse');
            updateDoc(deviceRef, { "fan_INA.state": "off" }).then(() => {
                setTimeout(async () => {
                    await updateDoc(deviceRef, { "fan_INB.state": "on" });
                    setFanLoading(false);
                }, 2000);
            });
        } else if (fanState === 'reverse') {
            // Currently reverse, switch to forward
            setFanState('forward');
            updateDoc(deviceRef, { "fan_INB.state": "off" }).then(() => {
                setTimeout(async () => {
                    await updateDoc(deviceRef, { "fan_INA.state": "on" });
                    setFanLoading(false);
                }, 2000);
            });
        }
    };
    const toggleBuzzer = async () => await updateDoc(deviceRef, { "buzzer.state": buzzer ? "off" : "on" });

    const handleOrangeLightChange = async (val: number) => {
        setOrangeLight(val);
        await updateDoc(deviceRef, { "orange_light.value": val });
    };

    return (
        <main className="min-h-screen bg-transparent">
<TopHeader />

<PageShell title={`${username}'s Hub`} subtitle="Control Center">

                {/* <VoiceTile /> */}

                <h2 className="text-[10px] tracking-[0.4em] text-[var(--color-accent)] font-black mt-4 mb-6 uppercase opacity-80">
                    Actuators
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    <DeviceCard title="White Light" pin="13" icon={mdiLightbulb} state={whiteLight ? "ON" : "OFF"} onToggle={toggleLight} />
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={toggleFan}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleFan();
                            }
                        }}
                        className={`rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all text-left ${fanLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/10"}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Icon path={mdiFan} size={1.5} className={fanState !== 'off' ? "animate-spin" : ""} style={fanState !== 'off' ? {animationDuration: '0.5s'} : {}} />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-white">Fan</p>
                                <p className="text-white/40 text-sm font-mono">PIN 7/6</p>
                            </div>
                        </div>
                        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                            <button
                                onClick={toggleFan}
                                disabled={fanLoading}
                                className={`px-4 py-2 rounded-full text-xs font-black tracking-widest transition-all ${fanState !== 'off'
                                        ? "bg-[var(--color-accent)] text-black shadow-lg shadow-[var(--color-accent-glow)] scale-105"
                                        : "bg-white/10 text-white/40 hover:bg-white/20"
                                    } ${fanLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {fanLoading ? "..." : fanState === "off" ? "OFF" : "ON"}
                            </button>
                            <button
                                onClick={toggleReverse}
                                disabled={fanLoading}
                                className={`px-4 py-2 rounded-full text-xs font-black tracking-widest transition-all ${fanState === "off"
                                        ? "bg-white/10 text-white/40 hover:bg-white/20"
                                        : "bg-[var(--color-secondary-accent)] text-white hover:opacity-90"
                                    } ${fanLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {fanLoading ? "..." : fanState === "reverse" ? "FORWARD" : "REVERSE"}
                            </button>
                        </div>
                    </div>
                    <DeviceCard title="Door" pin="9" icon={mdiDoor} state={door ? "OPEN" : "CLOSED"} onToggle={toggleDoor} />
                    <DeviceCard title="Window" pin="10" icon={mdiWeatherWindy} state={windowState ? "OPEN" : "CLOSED"} onToggle={toggleWindow} />

                    <SliderCard title="Orange Light" pin="5" icon={<Icon path={mdiLightbulb} size={1.5} />} value={orange_light} onChange={handleOrangeLightChange} />

                    <DeviceCard title="Buzzer" pin="3" icon={mdiCloud} state={buzzer ? "ON" : "OFF"} onToggle={toggleBuzzer} />
                </div>

                <h2 className="text-[10px] tracking-[0.4em] text-[var(--color-secondary-accent)] font-black mt-12 mb-6 uppercase opacity-80">
                    Sensors
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <SensorCard title="Motion" value={motion} icon={<Icon path={mdiRun} size={1.375} />} />
                    <SensorCard title="Steam" value={steam} icon={<Icon path={mdiCloud} size={1.375} />} />
                    <SensorCard title="Gas" value={gas} icon={<Icon path={mdiAlert} size={1.375} />} />
                    <SensorCard title="Soil" value={soil} icon={<Icon path={mdiCloud} size={1.375} />} unit="%" />
                    <SensorCard title="Light" value={light} icon={<Icon path={mdiAlert} size={1.375} />} />

                </div>

                <div className="mt-12 rounded-3xl bg-white/5 border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Icon path={mdiRefresh} size={1.375} className="text-[var(--color-accent)]" />
                        <p className="text-sm font-bold text-white tracking-widest uppercase">System Sync</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="text-white/30 uppercase tracking-tighter">Controller</p>
                            <p className="text-white font-mono">{syncSource}</p>
                        </div>
                        <div>
                            <p className="text-white/30 uppercase tracking-tighter">Last Seen</p>
                            <p className="text-white font-mono">{syncTime || "Never"}</p>
                        </div>
                    </div>
                </div>
            </PageShell>
        </main>
    );
}