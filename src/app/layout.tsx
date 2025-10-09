import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ErrorBoundary } from '@/components/error-boundary';
import { HtmlLangWrapper } from '@/components/html-lang-wrapper';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/contexts/language-context';
import { ENV_CONFIG } from '@/lib/config';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Tenant name mapping
 */
const TENANT_NAMES: Record<string, { en: string; ja: string }> = {
  fasthelp: { en: 'FastHelp', ja: 'FastHelp' },
  tsuzumi: { en: 'Tsuzumi', ja: 'Tsuzumi' },
  default: { en: 'vottia', ja: 'vottia' },
};

/**
 * Get tenant-specific title
 */
function getTenantTitle(): string {
  const tenantId = ENV_CONFIG.TENANT_ID || 'default';
  return TENANT_NAMES[tenantId]?.en || 'vottia';
}

/**
 * Metadata configuration for the Mastra UI application.
 */
export const metadata: Metadata = {
  title: getTenantTitle(),
  description: `Chat with ${getTenantTitle()} AI Assistant`,
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
