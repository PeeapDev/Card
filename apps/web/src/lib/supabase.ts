import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallback to hardcoded values
// Note: These are public keys (anon key), safe to include in frontend code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
