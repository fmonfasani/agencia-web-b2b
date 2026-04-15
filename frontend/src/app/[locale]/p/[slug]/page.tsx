import { notFound } from "next/navigation";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  await params;
  // Proposals are managed via backend API (not yet implemented).
  notFound();
}
