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
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://*.walletconnect.com https://*.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src *; img-src * data: blob:; font-src 'self' https://fonts.gstatic.com; frame-src *;"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
