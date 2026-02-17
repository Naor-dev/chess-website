import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In Error',
  description: 'An error occurred during authentication',
};

export default function AuthErrorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
