import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from '@/components/providers/PostHogProvider';

export const metadata: Metadata = {
  title: 'BeckRock AI',
  description: 'AI Chat powered by AWS Bedrock',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
