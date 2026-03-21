import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { supabaseAdmin } from '@/lib/supabase';

async function queryUnreadLogs(tenantId: string) {
  'use step';
  const { data: logs, error } = await supabaseAdmin
    .from('message_logs')
    .select('id, platform, content, sender_info')
    .eq('tenant_id', tenantId)
    .eq('is_read', false)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch logs: ${error.message}`);
  }
  
  // Mark as read
  if (logs && logs.length > 0) {
    await supabaseAdmin
      .from('message_logs')
      .update({ is_read: true })
      .in('id', logs.map(l => l.id));
  }
  
  return logs || [];
}

async function summarizeLogs(logs: any[]) {
  'use step';
  if (logs.length === 0) return null;

  const logsText = logs.map(l => `[${l.platform.toUpperCase()}] From ${JSON.stringify(l.sender_info)}: ${l.content}`).join('\n');

  const { text: summary } = await generateText({
    model: google('models/gemini-3.1-flash'),
    prompt: `You are an executive assistant. Summarize the following messages logically, highlighting key action items and requests. Keep it concise, professional, and well-formatted for Discord.\n\nMessages:\n${logsText}`,
  });

  return summary;
}

async function pushToDiscord(tenantId: string, summary: string) {
  'use step';
  // Get discord integration info
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('credentials')
    .eq('tenant_id', tenantId)
    .eq('platform', 'discord')
    .single();

  if (!integration || !integration.credentials || !integration.credentials.discord_channel_id) {
    throw new Error('Discord channel not linked or missing');
  }

  const channelId = integration.credentials.discord_channel_id;

  // Send message via Discord API
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: `**Daily Omni-Briefing**\n\n${summary}`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to push to Discord: ${err}`);
  }

  return true;
}

export async function dailyBriefingWorkflow(tenantId: string) {
  'use workflow';
  
  const logs = await queryUnreadLogs(tenantId);
  
  if (logs.length > 0) {
    const summary = await summarizeLogs(logs);
    if (summary) {
      await pushToDiscord(tenantId, summary);
    }
  }
  
  return { processed: logs.length };
}
