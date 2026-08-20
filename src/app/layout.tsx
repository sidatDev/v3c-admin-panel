import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import QueryProvider from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { tasaDisplay, tasaDeck, tasaText } from '@/lib/fonts';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'V3C Admin Panel',
  description: 'Manage your AI agents, widgets, knowledge base, and conversations.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${tasaDisplay.variable} ${tasaDeck.variable} ${tasaText.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${tasaDisplay.variable} ${tasaDeck.variable} ${tasaText.variable} ${geistMono.variable} min-h-full bg-background text-foreground font-sans antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              {children}
            </div>
            <Toaster richColors position="top-right" closeButton />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

