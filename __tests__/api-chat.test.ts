import { describe, it, expect, vi } from 'vitest';
import { POST } from '../app/api/chat/route';

vi.mock('ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('ai')>();
  return {
    ...mod,
    streamText: vi.fn().mockReturnValue({
      toTextStreamResponse: vi.fn().mockReturnValue(new Response('streamed text', { status: 200 }))
    }),
    convertToModelMessages: vi.fn((msgs) => msgs)
  };
});

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn().mockReturnValue('mock-google-model')
}));

vi.mock('../lib/tools', () => ({
  buildTools: vi.fn().mockReturnValue({ mockTool: {} })
}));

describe('Chat API', () => {
  it('returns 400 if tenantId is missing', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Tenant ID required');
  });

  it('returns 400 if messages is missing or not an array', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 'tenant-1', messages: "not an array" })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Messages array required');
  });

  it('successfully triggers streamText if valid payload is provided', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 'tenant-1', messages: [{ role: 'user', content: 'hello' }] })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('streamed text');
  });
});
