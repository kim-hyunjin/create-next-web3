import Image from 'next/image';

import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi';

import Balance from './Balance';
import styles from './wagmi.module.css';

export default function Account() {
  const { connector, isConnected, address } = useAccount();
  const { data: ensAvatar } = useEnsAvatar({ address });
  const { data: ensName } = useEnsName({ address });
  const { disconnect } = useDisconnect();

  return (
    <div>
      <h2>Account</h2>
      {isConnected && (
        <div className={styles.account}>
          <div className={styles.address}>
            <Image
              src={ensAvatar ?? '/user-profile.svg'}
              alt="ENS Avatar"
              width={20}
              height={20}
            />
            <div>{ensName ? `${ensName} (${address})` : address}</div>
          </div>
          <Balance address={address} />
          <div>Connected to {connector?.name}</div>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
      {!isConnected && <div>Not connected</div>}
    </div>
  );
}
