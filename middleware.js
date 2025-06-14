// middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const res = NextResponse.next();

  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.walletconnect.com https://*.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.coinbase.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src *",
      "img-src * data: blob:",
      "frame-src *"
    ].join('; ')
  );

  return res;
}
