'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * Priority levels for ARIA live announcements.
 * - assertive: Interrupts screen reader (game over, critical errors)
 * - polite: Queued after current speech (moves, check, thinking)
 */
type AnnouncementPriority = 'assertive' | 'polite';

interface AriaLiveContextType {
  /** Announce a message to screen readers via ARIA live region. */
  announce: (message: string, priority?: AnnouncementPriority) => void;
}

const AriaLiveContext = createContext<AriaLiveContextType | null>(null);

// Regex patterns for validating chess move notation before announcing.
// Security: Never render unvalidated content in live regions.
const SAN_PATTERN = /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/;
const COORDINATE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/**
 * Validates that a string looks like a chess move notation.
 * Returns the original string if valid, or sanitizes it otherwise.
 */
export function sanitizeMoveNotation(move: string): string | null {
  const trimmed = move.trim();
  if (SAN_PATTERN.test(trimmed) || COORDINATE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Provider component that renders ARIA live regions and provides
 * the announce function via context. Place in root layout.
 */
export function AriaLiveProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  // Use refs to track last announcement time for deduplication
  const lastPoliteRef = useRef('');
  const lastAssertiveRef = useRef('');

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    if (!message) return;

    // To ensure screen readers announce repeated identical messages,
    // append a zero-width space alternately
    const setter = priority === 'assertive' ? setAssertiveMessage : setPoliteMessage;
    const lastRef = priority === 'assertive' ? lastAssertiveRef : lastPoliteRef;

    // Toggle trailing zero-width space to force re-announcement of same message
    const dedupedMessage = message === lastRef.current ? `${message}\u200B` : message;
    lastRef.current = message;

    setter(dedupedMessage);
  }, []);

  return (
    <AriaLiveContext.Provider value={{ announce }}>
      {children}
      {/*
        Single pair of ARIA live regions for the entire app.
        These must be present in the DOM at all times for screen readers
        to detect changes. Content is set via the announce() function.
      */}
      <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
        {politeMessage}
      </div>
      <div aria-live="assertive" aria-atomic="true" role="alert" className="sr-only">
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  );
}

/**
 * Hook to access the ARIA live announcer.
 * Must be used within an AriaLiveProvider.
 */
export function useAriaLiveAnnouncer(): AriaLiveContextType {
  const context = useContext(AriaLiveContext);
  if (!context) {
    throw new Error('useAriaLiveAnnouncer must be used within an AriaLiveProvider');
  }
  return context;
}
