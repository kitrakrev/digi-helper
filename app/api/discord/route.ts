import { createDiscordBot } from '@chat-adapter/discord';
import { supabaseAdmin } from '@/lib/supabase';

const bot = createDiscordBot({
  appId: process.env.DISCORD_APP_ID!,
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  token: process.env.DISCORD_BOT_TOKEN!,
});

bot.onMessage(async (message: any) => {
  if (message.content === '!recent-logs') {
    const discordUserId = message.user.id;
    
    // Find the tenant for this Discord user
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('tenant_id')
      .eq('platform', 'discord')
      .eq('credentials->>discord_user_id', discordUserId)
      .single();

    if (!integration) {
      await message.reply("You haven't linked your Discord account to Omni-Brief. Please link it in the dashboard.");
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
      await message.reply("No recent messages found for your tenant.");
      return;
    }

    const logSummary = logs.map((l: any) => `[**${l.platform.toUpperCase()}**] ${l.content}`).join('\n');
    await message.reply(`**Recent Activity Logs:**\n${logSummary}`);
  }
});

// Export the webhook handler for Next.js App Router
export const POST = bot.createEndpoint();
