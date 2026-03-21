import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTools } from '../lib/tools';
import { supabaseAdmin } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  }
}));

// Mock Octokit
vi.mock('@octokit/rest', () => {
  const MockOctokit = vi.fn();
  MockOctokit.prototype.repos = {
    getContent: vi.fn(),
    createOrUpdateFileContents: vi.fn()
  };
  return { Octokit: MockOctokit };
});

describe('Omni-Brief AI Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateUserTheme', () => {
    it('successfully updates theme when tenant owner is found', async () => {
      const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { owner_id: 'user-1' } }) }) });
      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      
      (supabaseAdmin.from as any) = vi.fn((table) => {
        if (table === 'tenants') return { select: mockSelect };
        if (table === 'users') return { update: mockUpdate };
      });

      const tools = buildTools('tenant-1');
      const result = await tools.updateUserTheme.execute({ primaryColor: '221.2 83.2% 53.3%', radius: '0.5rem' }, {} as any);
      
      expect(result).toEqual({ success: true, theme: { primaryColor: '221.2 83.2% 53.3%', radius: '0.5rem' } });
    });

    it('returns error if tenant owner not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) });
      
      (supabaseAdmin.from as any).mockReturnValue({ select: mockSelect });

      const tools = buildTools('tenant-1');
      const result = await tools.updateUserTheme.execute({ primaryColor: '0 0 0', radius: '1rem' }, {} as any);
      
      expect(result).toEqual({ success: false, error: 'Tenant owner not found' });
    });
  });

  describe('broadcastOmniMessage', () => {
    it('simulates linkedin and youtube broadcasts', async () => {
      const tools = buildTools('tenant-1');
      const result = await tools.broadcastOmniMessage.execute({ message: 'Hello World', platforms: ['linkedin', 'youtube'] }, {} as any);
      
      expect(result.success).toBe(true);
      expect(result.details).toContain('LinkedIn post successfully scheduled.');
      expect(result.details).toContain('YouTube Live Stream successfully initialized.');
    });
  });
});
