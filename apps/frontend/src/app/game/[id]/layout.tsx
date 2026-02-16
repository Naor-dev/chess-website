import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chess Game',
  description: 'Play chess against the AI engine',
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
