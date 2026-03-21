import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Allow GET for cron, POST for manual trigger
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Archive all waiting/called tokens from previous days
    const today = new Date().toISOString().split('T')[0];
    const { error } = await sb
      .from('tokens')
      .update({ status: 'archived' })
      .lt('token_date', today)
      .in('status', ['waiting', 'called']);
    if (error) throw error;
    res.status(200).json({ success: true, message: `Archived old tokens before ${today}` });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed', details: error.message });
  }
}