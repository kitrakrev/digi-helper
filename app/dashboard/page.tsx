import { supabaseAdmin } from '@/lib/supabase';

export default async function DashboardPage() {
  // Mock tenant ID for the purpose of the dashboard shell
  // In a real application, you would get this from the user's session
  const mockTenantId = 'some-uuid-here'; 

  // Fetch the latest logs
  const { data: logs } = await supabaseAdmin
    .from('message_logs')
    .select('platform, content, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Omni-Brief Dashboard</h1>
        <p className="text-muted-foreground mt-2">Your unified communication summary</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-card text-card-foreground border border-border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {logs && logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log, idx) => (
                <li key={idx} className="border-b border-border pb-2 last:border-0">
                  <span className="font-semibold text-primary uppercase text-xs">[{log.platform}]</span>
                  <p className="mt-1 text-sm">{log.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No recent messages to display.</p>
          )}
        </section>

        <section className="bg-card text-card-foreground border border-border p-6 rounded-lg shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-4 w-full text-left">Ask the Briefing Agent</h2>
          <div className="w-full flex-1 border border-border rounded-md p-4 bg-muted/50 mb-4 flex flex-col justify-end">
            <p className="text-xs text-muted-foreground text-center">Chat interface will render here...</p>
          </div>
          <p className="text-sm text-muted-foreground">You can ask the agent to change your UI colors or summarize your data.</p>
        </section>
      </div>
    </div>
  );
}
