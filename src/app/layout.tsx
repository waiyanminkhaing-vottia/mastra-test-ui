import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ErrorBoundary } from '@/components/error-boundary';
import { HtmlLangWrapper } from '@/components/html-lang-wrapper';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/contexts/language-context';

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
    <LanguageProvider>
      <HtmlLangWrapper>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ErrorBoundary>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </ErrorBoundary>
        </body>
      </HtmlLangWrapper>
    </LanguageProvider>
  );
}
