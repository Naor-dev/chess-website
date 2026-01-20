'use client';

import { useState, useEffect } from 'react';

interface BoardSizeResult {
  boardSize: number;
}

/**
 * Custom hook that calculates optimal chess board size based on viewport.
 * Handles responsive sizing across breakpoints and landscape mode.
 */
export function useBoardSize(): BoardSizeResult {
  const [boardSize, setBoardSize] = useState(400);

  useEffect(() => {
    const calculateBoardSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Determine size based on width breakpoints
      let size: number;
      if (width < 640) {
        // Mobile: full width minus padding
        size = width - 32;
      } else if (width < 768) {
        // sm: 400px
        size = 400;
      } else if (width < 1024) {
        // md: 480px
        size = 480;
      } else if (width < 1280) {
        // lg: 560px
        size = 560;
      } else {
        // xl+: 640px
        size = 640;
      }

      // Handle landscape mode - limit board to 65% of viewport height
      // This prevents the board from being cut off in landscape
      const maxHeightSize = height * 0.65;
      if (size > maxHeightSize) {
        size = Math.floor(maxHeightSize);
      }

      setBoardSize(size);
    };

    // Calculate initial size
    calculateBoardSize();

    // Recalculate on resize
    window.addEventListener('resize', calculateBoardSize);
    return () => window.removeEventListener('resize', calculateBoardSize);
  }, []);

  return { boardSize };
}
