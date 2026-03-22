import { describe, it, expect, vi } from 'vitest';
import { POST } from '../app/api/slack/webhook/route';
import crypto from 'crypto';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  }
}));

describe('Slack Webhook API', () => {
  it('fails verification if slack signature is missing', async () => {
    const req = new Request('http://localhost/api/slack/webhook', {
      method: 'POST',
      headers: {
        'x-slack-request-timestamp': Date.now().toString(),
      },
      body: '{}'
    });
    
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('fails verification if slack timestamp is missing', async () => {
    const req = new Request('http://localhost/api/slack/webhook', {
      method: 'POST',
      headers: {
        'x-slack-signature': 'mock-sig',
      },
      body: '{}'
    });
    
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('handles url_verification event', async () => {
    // We need to bypass the crypto verification for test by mocking the env and the hash or using invalid
    // Actually the code uses crypto directly. Let's provide a valid signature.
    const timestamp = Date.now().toString();
    const rawBody = JSON.stringify({ type: 'url_verification', challenge: 'mock-challenge' });
    
    // Calculate valid signature using the default secret in the test environment
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const mySignature = 'v0=' + crypto.createHmac('sha256', 'test-secret').update(sigBasestring, 'utf8').digest('hex');

    const req = new Request('http://localhost/api/slack/webhook', {
      method: 'POST',
      headers: {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': mySignature,
        'content-type': 'application/json'
      },
      body: rawBody
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.challenge).toBe('mock-challenge');
  });

});
