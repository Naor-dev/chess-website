import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Game',
  description: 'Choose difficulty level and time control to start a new chess game',
};

export default function NewGameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
