import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tbqguhqgmsixtovvrkbe.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicWd1aHFnbXNpeHRvdnZya2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODMwNzAsImV4cCI6MjEwODI1OTA3MH0._uuMHcO0luzOhP2CyCImWHwoOhwsZA_Ebu6TpNcd50Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
