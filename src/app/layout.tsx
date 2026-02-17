'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/posthog';
import './globals.css';

// Component that uses useSearchParams - must be wrapped in Suspense
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <html lang="id" suppressHydrationWarning>
      <body className="h-full antialiased">
        {children}
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
      </body>
    </html>
  );
}
