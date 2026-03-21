import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // 1. Ensure user exists in public.users
  const { data: publicUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!publicUser) {
    await supabaseAdmin.from('users').insert({
      id: user.id,
      email: user.email || '',
    });
  }

  // 2. Ensure tenant exists
  let { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!tenant) {
    const { data: newTenant } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: `${user.user_metadata.full_name || 'User'}'s Workspace`,
        owner_id: user.id,
      })
      .select('id, name')
      .single();
    tenant = newTenant;
  }

  if (!tenant) {
    return <div>Error loading workspace</div>;
  }

  // 3. Ensure discord integration exists based on oauth
  const discordIdentity = user.identities?.find(i => i.provider === 'discord');
  const discordId = discordIdentity?.id;
  
  if (discordId) {
    const { data: existingDiscord } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('platform', 'discord')
      .maybeSingle();
    
    if (!existingDiscord) {
      await supabaseAdmin.from('integrations').insert({
        tenant_id: tenant.id,
        platform: 'discord',
        credentials: { discord_user_id: discordId }
      });
    }
  }

  // Fetch Integrations
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('id, platform, created_at')
    .eq('tenant_id', tenant.id);

  const linkedPlatforms = integrations?.map(i => i.platform) || [];

  // Fetch the latest logs
  const { data: logs } = await supabaseAdmin
    .from('message_logs')
    .select('platform, content, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(10);
    
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Omni-Brief Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to {tenant.name}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md">
            Sign out
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Integrations Section */}
        <section className="col-span-1 bg-card text-card-foreground border border-border p-6 rounded-lg shadow-sm h-fit">
          <h2 className="text-xl font-semibold mb-4">Your Integrations</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white">D</div>
                <span className="font-medium">Discord</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                {linkedPlatforms.includes('discord') ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E01E5A] flex items-center justify-center text-white">S</div>
                <span className="font-medium">Slack</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${linkedPlatforms.includes('slack') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {linkedPlatforms.includes('slack') ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-white">G</div>
                <span className="font-medium">GitHub</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${linkedPlatforms.includes('github') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {linkedPlatforms.includes('github') ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
          <div className="mt-6 text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <strong>Pro Tip:</strong> Use the Briefing Agent to connect your Slack and GitHub accounts conversationally!
          </div>
        </section>

        <div className="col-span-1 md:col-span-2 flex flex-col gap-8">
          <section className="bg-card text-card-foreground border border-border p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            {logs && logs.length > 0 ? (
              <ul className="space-y-4">
                {logs.map((log, idx) => (
                  <li key={idx} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary uppercase text-xs">[{log.platform}]</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{log.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recent messages to display.</p>
            )}
          </section>

          <section className="bg-card text-card-foreground border border-border p-6 rounded-lg shadow-sm flex flex-col min-h-[300px]">
            <h2 className="text-xl font-semibold mb-4">Ask the Briefing Agent</h2>
            <div className="w-full flex-1 border border-border rounded-md p-4 bg-muted/50 mb-4 flex flex-col justify-center items-center">
              <p className="text-sm text-muted-foreground text-center">Chat interface will render here...</p>
              <p className="text-xs text-muted-foreground mt-2 text-center max-w-sm">
                Try asking: "Connect my Slack account", "Summarize my unread messages", or "Update my portfolio timeline!"
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
