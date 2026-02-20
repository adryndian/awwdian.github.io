import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeckRock AI',
  description: 'Chat with Claude Opus 4.6, Claude Sonnet 4.0, and Llama 4 Maverick',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <div className="app-bg">
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}