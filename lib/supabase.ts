import { createClient } from '@supabase/supabase-js';

// We use the service_role key to bypass RLS for webhook insertions,
// or use the regular anon key if security policies are configured.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
