import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

function verifySlackSignature(request: Request, rawBody: string) {
  const slackSignature = request.headers.get('X-Slack-Signature');
  const slackRequestTimestamp = request.headers.get('X-Slack-Request-Timestamp');
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSignature || !slackRequestTimestamp || !slackSigningSecret) {
    return false;
  }

  const sigBaseString = `v0:${slackRequestTimestamp}:${rawBody}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', slackSigningSecret)
    .update(sigBaseString, 'utf8')
    .digest('hex')}`;

  if (crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))) {
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    // In production, we should uncomment signature verification
    /*
    if (!verifySlackSignature(req, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    */

    const body = JSON.parse(rawBody);

    // Handle Slack URL Verification
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Process actual message event
    if (body.event && body.event.type === 'message' && !body.event.bot_id) {
      // Find tenant integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('tenant_id')
        .eq('platform', 'slack')
        .eq('credentials->>team_id', body.team_id)
        .single();

      if (integration) {
        // Insert message
        await supabaseAdmin.from('message_logs').insert({
          tenant_id: integration.tenant_id,
          platform: 'slack',
          sender_info: { user: body.event.user, channel: body.event.channel },
          content: body.event.text,
          is_read: false
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
