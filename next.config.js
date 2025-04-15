// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src * 'self' data: blob:;
              script-src * 'self' 'unsafe-eval' 'unsafe-inline' data:;
              style-src * 'self' 'unsafe-inline' data:;
              connect-src *;
              img-src * data: blob:;
              font-src * 'self' data:;
              frame-src *;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
