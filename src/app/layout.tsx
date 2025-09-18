import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Metadata configuration for the Mastra UI application.
 */
export const metadata: Metadata = {
  title: 'vottia',
  description: 'Chat with vottia AI Assistant',
  icons: {
    icon: '/favicon.svg',
  },
};

/**
 * Root layout component that wraps all pages with common structure and fonts.
 * @param props - The component props
 * @param props.children - The page content to be rendered
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
