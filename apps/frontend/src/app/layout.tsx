import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AriaLiveProvider } from '@/hooks/useAriaLiveAnnouncer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Chess Website',
    template: '%s | Chess Website',
  },
  description: 'Play chess against AI with various difficulty levels',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <AriaLiveProvider>
          <AuthProvider>{children}</AuthProvider>
        </AriaLiveProvider>
      </body>
    </html>
  );
}
