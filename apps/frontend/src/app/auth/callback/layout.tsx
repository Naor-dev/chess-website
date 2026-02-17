import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signing In',
  description: 'Completing authentication',
};

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
