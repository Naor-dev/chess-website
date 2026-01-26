export function EngineThinkingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-xl dark:bg-zinc-800/95">
        {/* Animated chess piece */}
        <div className="relative">
          <div className="h-10 w-10 animate-bounce">
            <svg viewBox="0 0 45 45" className="h-full w-full">
              <g
                fill="none"
                fillRule="evenodd"
                stroke="#000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
                <path
                  d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
                  fill="#000"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                />
                <path
                  d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
                  fill="#000"
                />
                <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
              </g>
            </svg>
          </div>
          {/* Thinking dots */}
          <div className="absolute -right-1 -top-1 flex gap-0.5">
            <div
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">Stockfish is thinking</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Calculating best move...</p>
        </div>
      </div>
    </div>
  );
}
