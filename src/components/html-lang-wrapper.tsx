'use client';

import { useLanguage } from '@/contexts/language-context';

/**
 * Wrapper component that sets the HTML lang attribute based on current language
 * Ensures proper accessibility and SEO by dynamically updating the document language
 * @param props Component properties
 * @param props.children Child components to render within the HTML wrapper
 */
export function HtmlLangWrapper({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();

  return (
    <html lang={language} suppressHydrationWarning>
      {children}
    </html>
  );
}
