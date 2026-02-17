'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { initPostHog, posthog } from '@/lib/posthog';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return (
    <html lang="id" suppressHydrationWarning>
      <body className="h-full antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
