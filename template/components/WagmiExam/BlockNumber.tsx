import { useBlockNumber } from 'wagmi';

export default function BlockNumber() {
  const { data, isError, isLoading } = useBlockNumber();

  return (
    <div>
      <h2>Block Number</h2>
      {isLoading && <div>Fetching block number…</div>}
      {isError && <div>Error fetching block number</div>}
      {!isLoading && !isError && <div>Block number: {data}</div>}
    </div>
  );
}
