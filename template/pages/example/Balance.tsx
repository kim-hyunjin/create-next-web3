import { useBalance } from 'wagmi';

export default function Balance({
  addressOrName,
}: {
  addressOrName: string | undefined;
}) {
  const { data, isError, isLoading } = useBalance({
    addressOrName,
  });

  if (isLoading) return <div>Fetching balance…</div>;
  if (isError) return <div>Error fetching balance</div>;
  return (
    <div>
      Balance: {data?.formatted} {data?.symbol}
    </div>
  );
}
