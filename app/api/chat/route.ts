import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { buildTools } from '@/lib/tools';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, tenantId } = body;

  if (!tenantId) {
    return new Response('Tenant ID required', { status: 400 });
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response('Messages array required', { status: 400 });
  }

  console.log(`[Chat] Processing request for tenant: ${tenantId}, message count: ${messages.length}`);

  // Safely map messages to CoreMessage format avoiding strict SDK version mismatches
  const coreMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content || (m.parts ? m.parts.map((p: any) => p.text).join('') : '')
  }));

  const result = streamText({
    model: google('models/gemini-2.5-flash'),
    messages: coreMessages,
    system: "You are the Omni-Brief conversational assistant. You can help users summarize their platform data, change their dashboard theme, or update their personal website. When you update the personal website, ALWAYS reply saying \"I've updated your website! Vercel is deploying it now. It should be live in about 45 seconds.\"",
    tools: buildTools(tenantId),
  });

  return result.toTextStreamResponse();
}
