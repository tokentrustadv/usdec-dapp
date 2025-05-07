import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import '@rainbow-me/rainbowkit/styles.css';

const { chains, publicClient } = configureChains(
  [
    {
      id: 84532,
      name: 'Base Sepolia',
      network: 'base-sepolia',
      nativeCurrency: {
        decimals: 18,
        name: 'Base Sepolia ETH',
        symbol: 'ETH',
      },
      rpcUrls: {
        default: { http: ['https://sepolia.base.org'] }, // ✅ fix
      },
      blockExplorers: {
        default: { name: 'BaseScan', url: 'https://base-sepolia.blockscout.com' },
      },
      testnet: true,
    },
  ],
  [
    jsonRpcProvider({
      rpc: () => ({ http: 'https://sepolia.base.org' }),
    }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'USDEC',
  projectId: 'ced749b38222900677e11e8d3b875b2e',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export default function App({ Component, pageProps }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
