import { Chat } from 'chat';
import { createDiscordAdapter } from '@chat-adapter/discord';
import { createMemoryState } from '@chat-adapter/state-memory';
import { supabaseAdmin } from '@/lib/supabase';

const chat = new Chat({
  userName: 'Omni-Brief Bot',
  state: createMemoryState(),
  adapters: {
    discord: createDiscordAdapter({
      applicationId: process.env.DISCORD_APP_ID!,
      botToken: process.env.DISCORD_BOT_TOKEN!,
      publicKey: process.env.DISCORD_PUBLIC_KEY!,
    }),
  },
});

chat.onNewMessage(/^!recent-logs/, async (thread, message) => {
  const discordUserId = message.author.userId;
  
  // Find the tenant for this Discord user
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('tenant_id')
    .eq('platform', 'discord')
    .eq('credentials->>discord_user_id', discordUserId)
    .single();

  if (!integration) {
    await thread.post("You haven't linked your Discord account to Omni-Brief. Please link it in the dashboard.");
    return;
  }

  // Fetch the 5 most recent message logs for this tenant
  const { data: logs } = await supabaseAdmin
    .from('message_logs')
    .select('platform, content')
    .eq('tenant_id', integration.tenant_id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!logs || logs.length === 0) {
    await thread.post("No recent messages found for your tenant.");
    return;
  }

  const logSummary = logs.map((l: any) => `[**${l.platform.toUpperCase()}**] ${l.content}`).join('\n');
  await thread.post(`**Recent Activity Logs:**\n${logSummary}`);
});

// Export the webhook handler for Next.js App Router
export const POST = async (req: Request) => chat.webhooks.discord(req);
