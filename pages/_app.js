import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig } from 'wagmi';
import { http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'USDEC',
  projectId: 'ced749b38222900677e11e8d3b875b2e', // ← your WalletConnect project ID
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});

export default function App({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider chains={[baseSepolia]}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
