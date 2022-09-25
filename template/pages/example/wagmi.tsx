import * as React from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsName,
  useNetwork,
  useSwitchNetwork,
} from 'wagmi';

function Page() {
  const isMounted = useIsMounted();
  const { isConnected } = useAccount();

  return (
    <>
      <Connect />

      {isMounted && isConnected && (
        <>
          <Account />
          <NetworkSwitcher />
        </>
      )}
    </>
  );
}

export default Page;

function Connect() {
  const isMounted = useIsMounted();
  const { connector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div>
      <div>
        {isConnected && (
          <button onClick={() => disconnect()}>Disconnect from {connector?.name}</button>
        )}

        {connectors
          .filter((x) => isMounted && x.ready && x.id !== connector?.id)
          .map((x) => (
            <button key={x.id} onClick={() => connect({ connector: x })}>
              {x.name}
              {isLoading && x.id === pendingConnector?.id && ' (connecting)'}
            </button>
          ))}
      </div>

      {error && <div>{error.message}</div>}
    </div>
  );
}

function Account() {
  const { address } = useAccount();
  const { data: ensNameData } = useEnsName({ address });

  return (
    <div>
      {ensNameData ?? address}
      {ensNameData ? ` (${address})` : null}
    </div>
  );
}

function NetworkSwitcher() {
  const { chain } = useNetwork();
  const { chains, error, isLoading, pendingChainId, switchNetwork } = useSwitchNetwork();

  return (
    <div>
      <div>
        Connected to {chain?.name ?? chain?.id}
        {chain?.unsupported && ' (unsupported)'}
      </div>

      {switchNetwork && (
        <div>
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

function useIsMounted() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return mounted;
}
