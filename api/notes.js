import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, notes, prescription } = req.body;
  if (!id) return res.status(400).json({ error: 'Token ID required' });
  const updates = {};
  if (notes !== undefined) updates.notes = notes;
  if (prescription !== undefined) updates.prescription = prescription;
  const { error } = await sb.from('tokens').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true });
}