import { SpeciesDetail } from "@/components/fishlog/pages";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SpeciesDetail id={id} />;
}
