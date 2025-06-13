// middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const res = NextResponse.next();

  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://*.walletconnect.com https://*.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src *; img-src * data: blob:; font-src 'self' https://fonts.gstatic.com; frame-src *;"
  );

  return res;
}
