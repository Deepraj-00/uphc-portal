import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { department } = req.query;
    let q = sb.from('doctors').select('*').order('name');
    if (department) q = q.eq('department', department);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ doctors: data });
  }
  if (req.method === 'POST') {
    const { name, department } = req.body;
    if (!name || !department) return res.status(400).json({ error: 'Name and department required' });
    const { data, error } = await sb.from('doctors').insert({ name, department }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, doctor: data });
  }
  if (req.method === 'PATCH') {
    const { id, available, name } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });
    const updates = {};
    if (available !== undefined) updates.available = available;
    if (name !== undefined) updates.name = name;
    const { error } = await sb.from('doctors').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });
    const { error } = await sb.from('doctors').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
}