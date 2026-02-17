import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window === 'undefined') return;
  // Guard: skip if key is not configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set, analytics disabled');
    }
    return;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug();
    },
    capture_pageview: false,
  });
};

export { posthog };
