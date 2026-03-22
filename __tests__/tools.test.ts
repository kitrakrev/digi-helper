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
    // Reset global fetch mock
    global.fetch = vi.fn();
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
      // @ts-ignore
      const result = await tools.updateUserTheme.execute({ primaryColor: '221.2 83.2% 53.3%', radius: '0.5rem' }, {} as any);
      
      expect(result).toEqual({ success: true, theme: { primaryColor: '221.2 83.2% 53.3%', radius: '0.5rem' } });
    });

    it('returns error if tenant owner not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({ select: mockSelect });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.updateUserTheme.execute({ primaryColor: '0 0 0', radius: '1rem' }, {} as any);
      
      expect(result).toEqual({ success: false, error: 'Tenant owner not found' });
    });
  });

  describe('connectSlack', () => {
    it('inserts a new slack token if not existing', async () => {
      const mockEqPlatform = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) });
      const mockEqTenant = vi.fn().mockReturnValue({ eq: mockEqPlatform });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqTenant });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({
        select: mockSelect,
        insert: mockInsert
      });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.connectSlack.execute({ slackToken: 'xoxb-123', channels: ['C123'] }, {} as any);
      
      expect(result).toEqual({ success: true, message: 'Slack settings saved. Connected channels: C123' });
      expect(mockInsert).toHaveBeenCalledWith({
        tenant_id: 'tenant-1',
        platform: 'slack',
        credentials: { slack_token: 'xoxb-123', channels: ['C123'] }
      });
    });

    it('updates existing slack integration if found', async () => {
      const existing = { id: 5, credentials: { slack_token: 'old-token', channels: [] } };
      const mockEqPlatform = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: existing }) });
      const mockEqTenant = vi.fn().mockReturnValue({ eq: mockEqPlatform });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqTenant });
      
      const mockEqId = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.connectSlack.execute({ channels: ['C999'] }, {} as any);
      
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        credentials: { slack_token: 'old-token', channels: ['C999'] }
      });
    });
  });

  describe('readSlackMessages', () => {
    it('returns error if slack account not linked', async () => {
      const mockEqPlatform = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) });
      const mockEqTenant = vi.fn().mockReturnValue({ eq: mockEqPlatform });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqTenant });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({ select: mockSelect });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.readSlackMessages.execute({ channelId: 'C123', limit: 5 }, {} as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Slack account not linked.');
    });

    it('fetches slack messages if authorized and in channel list', async () => {
      const existing = { credentials: { slack_token: 'xoxb-123', channels: ['C123'] } };
      const mockEqPlatform = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: existing }) });
      const mockEqTenant = vi.fn().mockReturnValue({ eq: mockEqPlatform });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqTenant });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({ select: mockSelect });

      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ ok: true, messages: [{ text: 'Hello' }] })
      });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.readSlackMessages.execute({ channelId: 'C123', limit: 5 }, {} as any);
      
      expect(result.success).toBe(true);
      expect(result.messages).toEqual([{ text: 'Hello' }]);
      expect(global.fetch).toHaveBeenCalledWith('https://slack.com/api/conversations.history?channel=C123&limit=5', {
        headers: { 'Authorization': 'Bearer xoxb-123' }
      });
    });

    it('blocks access if channel is not in allowed list', async () => {
      const existing = { credentials: { slack_token: 'xoxb-123', channels: ['C999'] } }; // allowed C999, asked C123
      const mockEqPlatform = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: existing }) });
      const mockEqTenant = vi.fn().mockReturnValue({ eq: mockEqPlatform });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqTenant });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({ select: mockSelect });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.readSlackMessages.execute({ channelId: 'C123', limit: 5 }, {} as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('is not in your allowed channels list');
    });
  });

  describe('connectGitHub', () => {
    it('inserts new github token', async () => {
      const mockEqPlatform = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) });
      const mockEqTenant = vi.fn().mockReturnValue({ eq: mockEqPlatform });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqTenant });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any) = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert });

      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.connectGitHub.execute({ githubToken: 'ghp_123', githubUsername: 'test', repositories: ['test/repo'] }, {} as any);
      
      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith({
        tenant_id: 'tenant-1',
        platform: 'github',
        credentials: { github_token: 'ghp_123', github_username: 'test', repositories: ['test/repo'] }
      });
    });
  });

  describe('broadcastOmniMessage', () => {
    it('simulates linkedin and youtube broadcasts without github if omitted', async () => {
      const tools = buildTools('tenant-1');
      // @ts-ignore
      const result = await tools.broadcastOmniMessage.execute({ message: 'Hello World', platforms: ['linkedin', 'youtube'] }, {} as any);
      
      expect(result.success).toBe(true);
      expect(result.details).toContain('LinkedIn post successfully scheduled.');
      expect(result.details).toContain('YouTube Live Stream successfully initialized.');
    });
  });
});
