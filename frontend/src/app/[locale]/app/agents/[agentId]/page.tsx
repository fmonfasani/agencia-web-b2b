// Server wrapper — reads session, passes apiKey to client component
import { auth } from "@/lib/auth";
import AgentDetailsClient from "./AgentDetailsClient";

export default async function AgentDetailsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const session = await auth();
  const apiKey = (session?.user as any)?.apiKey ?? "";
  return <AgentDetailsClient agentId={agentId} apiKey={apiKey} />;
}
