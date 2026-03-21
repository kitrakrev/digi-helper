import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      tracesSampleRate: 1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      tracesSampleRate: 1,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
