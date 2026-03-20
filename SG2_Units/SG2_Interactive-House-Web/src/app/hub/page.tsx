"use client";

import TopHeader from "@/components/TopHeader";
import { PageShell } from "@/components/pageShell";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/utils/firebaseConfig";


import {
    Lightbulb,
    Door,
    Wind,
    Fan,
    PersonSimpleRun,
    Cloud,
    Warning,
    ArrowsClockwise,
} from "@phosphor-icons/react";

/* --- GLASS-STYLE COMPONENTS --- */

function DeviceCard({
    icon,
    title,
    pin,
    state,
    onToggle,
}: {
    icon: React.ReactNode;
    title: string;
    pin: string;
    state: string;
    onToggle?: () => void;
}) {
    const isActive = state === "ON" || state === "OPEN";

    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    {icon}
                </div>
                <div>
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="text-white/40 text-sm">Pin {pin}</p>
                </div>
            </div>

            <button
                onClick={onToggle}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                    isActive
                    ? "bg-[#0EA5E9] text-black shadow-lg shadow-[#0EA5E9]/20"
                    : "bg-white/10 text-white/60"
                }`}
            >
                {state}
            </button>
        </div>
    );
}

function SensorCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    {icon}
                </div>
                <p className="text-lg font-semibold text-white">{title}</p>
            </div>
            <p className="text-white/50 mt-3 text-sm tracking-wide">RAW VALUE: {value}</p>
        </div>
    );
}

function SyncCard({ source, time }: { source: string; time: string }) {
    return (
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
                <ArrowsClockwise size={22} className="text-emerald-400" />
                <p className="text-lg font-semibold text-white">Arduino Sync</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-white/30 uppercase text-[10px] tracking-widest">Source</div>
                    <div className="text-white">{source}</div>
                </div>
                <div>
                    <div className="text-white/30 uppercase text-[10px] tracking-widest">Updated</div>
                    <div className="text-white text-xs">{time}</div>
                </div>
            </div>
        </div>
    );
}

/* --- MAIN PAGE --- */

export default function HubPage() {
    const router = useRouter();
    const deviceRef = doc(db, "devices", "arduino");

    const [username, setUsername] = useState("Home");

    // Actuator States
    const [whiteLight, setWhiteLight] = useState(false);
    const [door, setDoor] = useState(false);
    const [windowState, setWindowState] = useState(false);
    const [fanINA, setFanINA] = useState(false);
    const [fanINB, setFanINB] = useState(false);
    const [bazaar, setBazaar] = useState(false);

    // Sensor States
    const [motion, setMotion] = useState(0);
    const [steam, setSteam] = useState(0);
    const [gas, setGas] = useState(0);

    const [syncSource, setSyncSource] = useState("arduino");
    const [syncTime, setSyncTime] = useState("");

    useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
        if (!user) {
            router.push("/auth/login");
        }
    });

    return () => unsub();
}, []);

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
            setDoor(data.door?.state === "open");
            setWindowState(data.window?.state === "open");
            setFanINA(data.fan_INA?.state === "on");
            setFanINB(data.fan_INB?.state === "on");
            setBazaar(data.bazaar?.state === "on");

            setMotion(data.telemetry?.motion ?? 0);
            setSteam(data.telemetry?.steam ?? 0);
            setGas(data.telemetry?.gas ?? 0);

            setSyncSource(data.sync?.lastSource ?? "arduino");
            if (data.sync?.lastUpdatedAt?.seconds) {
                const date = new Date(data.sync.lastUpdatedAt.seconds * 1000);
                setSyncTime(date.toLocaleString());
            }
        });
        return () => unsub();
    }, []);

    const toggleLight = async () => await updateDoc(deviceRef, { "white_light.state": whiteLight ? "off" : "on" });
    const toggleDoor = async () => await updateDoc(deviceRef, { "door.state": door ? "closed" : "open" });
    const toggleWindow = async () => await updateDoc(deviceRef, { "window.state": windowState ? "closed" : "open" });
    const toggleFanINA = async () => await updateDoc(deviceRef, { "fan_INA.state": fanINA ? "off" : "on" });
    const toggleFanINB = async () => await updateDoc(deviceRef, { "fan_INB.state": fanINB ? "off" : "on" });
    const toggleBazaar = async () => await updateDoc(deviceRef, { "bazaar.state": bazaar ? "off" : "on" });
    return (
        <main className="min-h-screen bg-transparent">
            <TopHeader />

            <PageShell title={`${username}'s Home`} subtitle="Live Hardware Control">
                
                <h2 className="text-[10px] tracking-[0.4em] text-[#0EA5E9] font-bold mt-4 mb-6 uppercase">
                    Actuators
                </h2>

                <div className="space-y-4">
                    <DeviceCard
                        title="White Light"
                        pin="13"
                        icon={<Lightbulb size={24} weight="fill" />}
                        state={whiteLight ? "ON" : "OFF"}
                        onToggle={toggleLight}
                    />

                    <DeviceCard
                        title="Fan INA"
                        pin="7"
                        icon={<Fan size={24} weight="fill" />}
                        state={fanINA ? "ON" : "OFF"}
                        onToggle={toggleFanINA}
                    />

                    <DeviceCard
                        title="Fan INB"
                        pin="6"
                        icon={<Fan size={24} weight="fill" />}
                        state={fanINB ? "ON" : "OFF"}
                        onToggle={toggleFanINB}
                    />

                    <DeviceCard
                        title="Door"
                        pin="9"
                        icon={<Door size={24} weight="fill" />}
                        state={door ? "OPEN" : "CLOSED"}
                        onToggle={toggleDoor}
                    />

                    <DeviceCard
                        title="Window"
                        pin="10"
                        icon={<Wind size={24} weight="fill" />}
                        state={windowState ? "OPEN" : "CLOSED"}
                        onToggle={toggleWindow}
                    />

                    <DeviceCard
                        title="Bazaar"
                        pin="3"
                        icon={<Cloud size={24} weight="fill" />}
                        state={bazaar ? "ON" : "OFF"}
                        onToggle={toggleBazaar}
                    />
                </div>

                <h2 className="text-[10px] tracking-[0.4em] text-purple-400 font-bold mt-12 mb-6 uppercase">
                    Sensors
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <SensorCard title="Motion" value={motion} icon={<PersonSimpleRun size={22} />} />
                    <SensorCard title="Steam" value={steam} icon={<Cloud size={22} />} />
                    <SensorCard title="Gas" value={gas} icon={<Warning size={22} />} />
                </div>

                <h2 className="text-[10px] tracking-[0.4em] text-emerald-400 font-bold mt-12 mb-6 uppercase">
                    Sync Status
                </h2>

                <SyncCard source={syncSource} time={syncTime} />
            </PageShell>
        </main>
    );
}