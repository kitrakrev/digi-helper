import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/discord/route';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  }
}));

// Mock chat/discord adapter since it uses environment variables and complex logic
vi.mock('chat', () => {
  class MockChat {
    onNewMessage = vi.fn();
    webhooks = {
      discord: vi.fn().mockResolvedValue(new Response(JSON.stringify({ type: 1 }), { status: 200 }))
    };
  }
  return { Chat: MockChat };
});

vi.mock('@chat-adapter/discord', () => ({
  createDiscordAdapter: vi.fn()
}));

vi.mock('@chat-adapter/state-memory', () => ({
  createMemoryState: vi.fn()
}));

describe('Discord Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_PUBLIC_KEY = 'test-key';
  });

  it('returns 500 if DISCORD_PUBLIC_KEY is missing', async () => {
    delete process.env.DISCORD_PUBLIC_KEY;
    const req = new Request('http://localhost/api/discord', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Missing Discord Environment Variables on Vercel');
  });

  it('calls chat.webhooks.discord if public key is present', async () => {
    const req = new Request('http://localhost/api/discord', { 
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 1 })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe(1);
  });
});
