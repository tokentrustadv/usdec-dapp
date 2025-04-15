// next.config.js

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
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.walletconnect.com https://*.cloudflare.com https://cdn.jsdelivr.net;
              style-src 'self' 'unsafe-inline';
              connect-src *;
              img-src * data: blob:;
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
