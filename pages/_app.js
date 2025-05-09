import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig } from 'wagmi';
import { http, createPublicClient } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

const config = createConfig({
  autoConnect: true,
  publicClient: createPublicClient({
    chain: baseSepolia,
    transport: http()
  })
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
