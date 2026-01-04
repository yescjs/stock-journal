import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Admin key

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase service role environment variables');
}

// Admin client for server-side operations
export const supabaseAdmin = createClient(
    supabaseUrl || '',
    supabaseServiceKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
