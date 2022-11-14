import { useBalance } from 'wagmi';

export default function Balance({
  address,
}: {
  address: `0x${string}` | undefined;
}) {
  const { data, isError, isLoading } = useBalance({
    address,
  });

  if (isLoading) return <div>Fetching balance…</div>;
  if (isError) return <div>Error fetching balance</div>;
  return (
    <div>
      Balance: {data?.formatted} {data?.symbol}
    </div>
  );
}
