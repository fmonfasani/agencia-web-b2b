import { prisma } from "@/lib/prisma";

/**
 * Knowledge Base Retrieval (Context Injection)
 */
export async function getAgentKnowledge(tenantId: string): Promise<string | null> {
    try {
        // Get the first active agent for this tenant 
        const agent = await prisma.agent.findFirst({
            where: {
                tenantId,
                active: true
            },
            select: {
                knowledgeBase: true,
                systemPrompt: true
            }
        });

        if (!agent) return null;

        return `
      KNOWLEDGE BASE:
      ---
      ${agent.knowledgeBase || "No extra knowledge provided."}
      
      AGENT INSTRUCTIONS:
      ${agent.systemPrompt || ""}
    `;
    } catch (error) {
        console.error("[Knowledge] Error fetching agent knowledge:", error);
        return null;
    }
}
