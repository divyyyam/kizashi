import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { MarketScreen } from "@/features/market";

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chain?: string }>;
}) {
  const { id } = await params;
  const { chain } = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const chainId = chain === undefined ? undefined : Number(chain);
  if (chainId !== undefined && (!Number.isSafeInteger(chainId) || chainId <= 0)) notFound();
  return (
    <Container className="flex max-w-wide flex-col gap-6 py-6 md:py-8">
      <MarketScreen marketId={id} {...(chainId === undefined ? {} : { chainId })} />
    </Container>
  );
}
