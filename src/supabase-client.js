import { createClient } from '@supabase/supabase-js';
window.createSupabaseClient = (url, publishableKey) => createClient(url, publishableKey, {
  realtime: { params: { eventsPerSecond: 20 } }
});
