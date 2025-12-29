// Full-page loading spinner with gradient background
export function LoadingSpinner() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 z-[9999]">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
    );
}
