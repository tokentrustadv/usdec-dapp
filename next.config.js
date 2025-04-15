// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)', // Apply to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.walletconnect.com https://*.cloudflare.com;
              style-src 'self' 'unsafe-inline';
              connect-src *;
              img-src * blob: data:;
              font-src 'self' https://fonts.gstatic.com;
              frame-src *;
            `.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
