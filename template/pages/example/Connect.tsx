import { useConnect } from 'wagmi';

import styles from './wagmi.module.css';

export default function Connect() {
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();

  return (
    <div>
      <h2>Connectors</h2>
      <div className={styles.connectors}>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            disabled={!connector.ready}
            onClick={() => connect({ connector })}
          >
            {connector.name}
            {!connector.ready && ' (unsupported)'}
            {isLoading &&
              connector.id === pendingConnector?.id &&
              ' (connecting)'}
          </button>
        ))}
      </div>

      {error && <div className={styles.errMsg}>{error.message}</div>}
    </div>
  );
}
