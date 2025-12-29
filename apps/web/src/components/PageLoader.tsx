// Suspense fallback loader for lazy-loaded pages
export function PageLoader() {
    return (
        <div className="flex items-center justify-center p-8 min-h-[200px] bg-[var(--bg-primary)]">
            <div className="loader" />
            <style>{`
        .loader {
          width: 35px;
          aspect-ratio: 1;
          --_g: no-repeat radial-gradient(farthest-side, #38bdf8 94%, #0000);
          background:
            var(--_g) 0 0,
            var(--_g) 100% 0,
            var(--_g) 100% 100%,
            var(--_g) 0 100%;
          background-size: 40% 40%;
          animation: l38 0.5s infinite;
        }
        @keyframes l38 {
          100% { background-position: 100% 0, 100% 100%, 0 100%, 0 0; }
        }
      `}</style>
        </div>
    );
}
