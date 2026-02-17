// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  
  // Optional: Environment detection
  environment: process.env.NODE_ENV,
  
  // Optional: Release version tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
