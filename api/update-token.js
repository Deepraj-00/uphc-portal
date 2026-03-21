import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, status } = req.body;
  if (!id) return res.status(400).json({ error: 'ID required' });
  try {
    const { error } = await sb.from('tokens').update({ status }).eq('id', id);
    if (error) throw error;
    // Trigger wait time recalculation via DB function
    await sb.rpc('recalculate_wait_times');
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
}