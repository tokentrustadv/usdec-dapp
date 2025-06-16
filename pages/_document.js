// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Allow Wagmi/NextJS to use dynamic evaluation */}
          <meta
            httpEquiv="Content-Security-Policy"
            content={
              [
                `default-src 'self'`,
                `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://*.walletconnect.com https://*.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.coinbase.com`,
                `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
                `font-src 'self' https://fonts.gstatic.com`,
                `connect-src *`,
                `img-src * data: blob:`,
                `frame-src *`,
              ].join('; ')
            }
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
