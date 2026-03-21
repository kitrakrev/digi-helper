import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Signature verification logic
    if (signature && appSecret) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(rawBody, 'utf8')
        .digest('hex')}`;
        
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              if (message.type === 'text') {
                const phoneNumberId = change.value.metadata.phone_number_id;
                
                // Find tenant by phone number ID
                const { data: integration } = await supabaseAdmin
                  .from('integrations')
                  .select('tenant_id')
                  .eq('platform', 'whatsapp')
                  .eq('credentials->>phone_number_id', phoneNumberId)
                  .single();

                if (integration) {
                  await supabaseAdmin.from('message_logs').insert({
                    tenant_id: integration.tenant_id,
                    platform: 'whatsapp',
                    sender_info: { from: message.from },
                    content: message.text.body,
                    is_read: false
                  });
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
