// Full-page loading spinner with gradient background (matches app theme)
export function LoadingSpinner() {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center z-[9999]"
            style={{
                background:
                    'radial-gradient(circle at top, rgba(56, 189, 248, 0.12), transparent 55%), var(--bg-primary)',
            }}
        >
            <div className="w-12 h-12 border-4 border-white/30 border-t-[#38bdf8] rounded-full animate-spin" />
        </div>
    );
}
