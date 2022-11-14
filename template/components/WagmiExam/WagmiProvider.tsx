import { PropsWithChildren } from 'react';

import {
  WagmiConfig,
  configureChains,
  createClient,
  defaultChains,
} from 'wagmi';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { publicProvider } from 'wagmi/providers/public';

/**
 * Note: In a production app, it is not recommended to only pass publicProvider to configureChains as you will probably face rate-limiting on the public provider endpoints.
 * It is recommended to also pass an alchemyProvider or infuraProvider as well.
 */
const { chains, provider, webSocketProvider } = configureChains(defaultChains, [
  publicProvider(),
]);

const client = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'wagmi',
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        qrcode: true,
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
  ],
  provider,
  webSocketProvider,
});
const WagmiProvider = ({ children }: PropsWithChildren) => (
  <WagmiConfig client={client}>{children}</WagmiConfig>
);

export default WagmiProvider;
