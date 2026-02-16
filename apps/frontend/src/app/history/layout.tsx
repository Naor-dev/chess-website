import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Game History',
  description: 'View your past and active chess games',
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
