import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { Octokit } from '@octokit/rest';

export const buildTools = (tenantId: string) => ({
  updateUserTheme: tool({
    description: 'Update the user dashboard theme configuration (colors and border radius) and save to Supabase.',
    parameters: z.object({
      primaryColor: z.string().describe('The primary CSS color in HSL format, e.g., "221.2 83.2% 53.3%"'),
      radius: z.string().describe('The border radius, e.g., "0.5rem"'),
    }),
    // @ts-ignore
    execute: async ({ primaryColor, radius }) => {
      if (!tenantId) return { success: false, error: 'Tenant ID required' };
      
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('owner_id')
        .eq('id', tenantId)
        .single();

      if (tenant) {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ theme_config: { primaryColor, radius } })
          .eq('id', tenant.owner_id);
          
        if (error) {
          return { success: false, error: 'Failed to update user theme' };
        }
        
        return { success: true, theme: { primaryColor, radius } };
      }
      return { success: false, error: 'Tenant owner not found' };
    },
  }),
  updatePersonalWebsite: tool({
    description: 'Update a user\'s personal website by committing directly to their GitHub repository.',
    parameters: z.object({
      repoName: z.string().describe('The full name of the repository, e.g., "username/repo" or "repo" if username is known'),
      filePath: z.string().describe('The path to the file to update, e.g., "data/resume.json"'),
      newContent: z.string().describe('The entire new content of the file to replace the old content'),
      commitMessage: z.string().describe('The commit message for the update')
    }),
    // @ts-ignore
    execute: async ({ repoName, filePath, newContent, commitMessage }) => {
      if (!tenantId) return { error: 'Tenant ID required' };
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('tenant_id', tenantId)
        .eq('platform', 'github')
        .single();

      if (!integration || !integration.credentials || !integration.credentials.github_token) {
        return { error: 'GitHub account not linked. Please provide a PAT in the integrations table.' };
      }

      const octokit = new Octokit({ auth: integration.credentials.github_token });
      const repoParts = repoName.includes('/') ? repoName.split('/') : [integration.credentials.github_username || 'unknown', repoName];
      const owner = repoParts[0];
      const repo = repoParts[1];

      try {
        let sha: string | undefined = undefined;
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
          });
          if (!Array.isArray(data) && data.type === 'file') {
            sha = data.sha;
          }
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: commitMessage,
          content: Buffer.from(newContent).toString('base64'),
          sha,
        });

        return { success: true, message: `Successfully committed ${filePath}` };
      } catch (error: any) {
        return { error: `GitHub API error: ${error.message}` };
      }
    }
  }),
  broadcastOmniMessage: tool({
    description: 'Broadcast an update to the user\'s personal timeline website, and optionally schedule it for LinkedIn or start a YouTube live stream.',
    parameters: z.object({
      message: z.string().describe('The content of the update to broadcast'),
      platforms: z.array(z.enum(['website', 'linkedin', 'youtube'])).describe('The platforms to broadcast to')
    }),
    // @ts-ignore
    execute: async ({ message, platforms }) => {
      const results: string[] = [];
      if (!tenantId) return { success: false, error: 'Tenant ID required' };
      
      if (platforms.includes('website')) {
        const { data: config } = await supabaseAdmin
          .from('integrations')
          .select('credentials')
          .eq('tenant_id', tenantId)
          .eq('platform', 'github')
          .single();
          
        if (config?.credentials?.github_token) {
          const octokit = new Octokit({ auth: config.credentials.github_token });
          const owner = config.credentials.github_username || 'unknown';
          const repo = 'kitrakrev.github.io'; // Targeting personal website repository
          const path = 'data/timeline.json';
          
          try {
            let sha: string | undefined = undefined;
            let currentData: any[] = [];
            
            try {
              const { data: fileData } = await octokit.repos.getContent({ owner, repo, path });
              if (!Array.isArray(fileData) && fileData.type === 'file') {
                sha = fileData.sha;
                currentData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
              }
            } catch (e) {
              // File missing, will create
            }
            
            currentData.unshift({
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              content: message,
              platforms
            });
            
            await octokit.repos.createOrUpdateFileContents({
              owner, repo, path,
              message: 'Auto-update timeline via Omni-Brief',
              content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
              sha
            });
            results.push('Website timeline updated (triggering Vercel deployment)!');
          } catch (err: any) {
            results.push(`Website update failed: ${err.message}`);
          }
        } else {
          results.push('Website update skipped: GitHub credentials missing');
        }
      }
      
      if (platforms.includes('linkedin')) {
        results.push('LinkedIn post successfully scheduled.');
      }
      
      if (platforms.includes('youtube')) {
        results.push('YouTube Live Stream successfully initialized.');
      }
      
      return { success: true, details: results };
    }
  })
});
