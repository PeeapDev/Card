/**
 * List database triggers
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTriggers() {
  const { data, error } = await supabase.rpc('list_triggers');
  console.log('Triggers:', data, error);
}

listTriggers().catch(console.error);
