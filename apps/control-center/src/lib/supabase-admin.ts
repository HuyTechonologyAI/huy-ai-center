import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service_role key
// Bypasses RLS for admin operations (embedding ingestion, knowledge management)
// NEVER expose this client to the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
