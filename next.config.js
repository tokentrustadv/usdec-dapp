/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)', // Apply headers to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' https://*.walletconnect.com https://cdn.jsdelivr.net;
              style-src 'self' 'unsafe-inline';
              connect-src *;
              img-src * blob: data:;
              font-src 'self' https://fonts.gstatic.com;
            `.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
