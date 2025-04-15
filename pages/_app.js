import '../styles.css';
import { WagmiConfig, createClient, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { chain, getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';

const { chains, provider } = configureChains(
  [chain.baseSepolia],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'USDEC Testnet',
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

export default function App({ Component, pageProps }) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
