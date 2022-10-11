import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';

import styles from './wagmi.module.css';

export default function NetworkSwitcher() {
  const { chain } = useNetwork();
  const { isConnected } = useAccount();
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
    useSwitchNetwork();

  return (
    <div className={styles.network}>
      <h2>Chains</h2>
      {isConnected && (
        <div>
          Connected to {chain?.name ?? chain?.id}
          {chain?.unsupported && ' (unsupported)'}
        </div>
      )}

      {switchNetwork && (
        <div className={styles.chains}>
          {chains.map((x) =>
            x.id === chain?.id ? null : (
              <button key={x.id} onClick={() => switchNetwork(x.id)}>
                {x.name}
                {isLoading && x.id === pendingChainId && ' (switching)'}
              </button>
            )
          )}
        </div>
      )}

      <div>{error && error.message}</div>
    </div>
  );
}
