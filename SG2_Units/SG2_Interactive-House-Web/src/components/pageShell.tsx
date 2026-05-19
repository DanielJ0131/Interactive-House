export function PageShell({
    title,
    subtitle,
    rightActions,
    children,
}: {
    title: string;
    subtitle?: string;
    rightActions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        // 1. Removed `min-h-screen` and `bg-[var(--bg-color)]`. 
        // Forced `w-full` so it stops acting like a constrained card.
        <div className="relative w-full text-white">
            
            {/* background glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
                <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] blur-3xl" />
                <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[var(--color-secondary-accent-soft)] blur-3xl" />
            </div>

            {/* 2. Changed pt-8 to pt-2 to fix the massive top gap */}
            <header className="relative z-10 px-4 md:px-6 pt-2 pb-4">
                <div className="mx-auto max-w-6xl flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold">{title}</h1>
                        {subtitle ? <p className="mt-2 text-white/50">{subtitle}</p> : null}
                    </div>
                    {rightActions}
                </div>
            </header>

            <main className="relative z-10 px-4 md:px-6 pb-10">
                <div className="mx-auto max-w-6xl">{children}</div>
            </main>
        </div>
    );
}