"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cpu, Mic, Sparkles, Database } from "lucide-react";

const tabs = [
    { href: "/devices", label: "Devices", icon: Cpu },
    { href: "/ai", label: "AI", icon: Sparkles },
    { href: "/speech", label: "Speech", icon: Mic },
    { href: "/hub", label: "Hub", icon: Home },
    { href: "/database", label: "Database", icon: Database },
];

export function BottomTabs() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#070B18]/80 backdrop-blur px-3 py-2">
            <div className="mx-auto max-w-4xl flex items-center justify-between">
                {tabs.map((t) => {
                    const active = pathname.startsWith(t.href);
                    const Icon = t.icon;
                    return (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${active ? "text-[#0EA5E9]" : "text-white/50 hover:text-white"
                                }`}
                        >
                            <Icon size={20} />
                            <span className="text-xs">{t.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}