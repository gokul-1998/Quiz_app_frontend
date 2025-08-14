import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/layout/navbar';
import { AuthGate } from '@/components/auth/auth-gate';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlashCard - AI-Powered Learning',
  description: 'Master any subject with AI-powered flashcards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <AuthGate>
          <main>{children}</main>
        </AuthGate>
        <Toaster />
      </body>
    </html>
  );
}