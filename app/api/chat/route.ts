import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { buildTools } from '@/lib/tools';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, tenantId } = await req.json();

  if (!tenantId) {
    return new Response('Tenant ID required', { status: 400 });
  }

  const result = streamText({
    model: google('models/gemini-3.1-flash'),
    messages,
    system: "You are the Omni-Brief conversational assistant. You can help users summarize their platform data, change their dashboard theme, or update their personal website. When you update the personal website, ALWAYS reply saying \"I've updated your website! Vercel is deploying it now. It should be live in about 45 seconds.\"",
    tools: buildTools(tenantId),
  });

  return result.toDataStreamResponse();
}
