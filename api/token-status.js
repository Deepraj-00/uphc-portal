import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile } = req.query;
  if (!mobile || mobile.length < 10) return res.status(400).json({ error: 'Valid mobile required' });

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await sb
    .from('tokens')
    .select('*')
    .eq('patient_mobile', mobile)
    .eq('token_date', today)
    .not('status', 'in', '("archived","completed","noshow")')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return res.status(200).json({ found: false, message: 'No active token found for today.' });
  }

  // Calculate position in queue
  const { count: position } = await sb
    .from('tokens')
    .select('*', { count: 'exact', head: true })
    .eq('department', data.department)
    .eq('status', 'waiting')
    .eq('token_date', today)
    .lte('created_at', data.created_at);

  res.status(200).json({
    found: true,
    token: {
      token_number: data.token_number,
      department:   data.department,
      status:       data.status,
      wait_minutes: data.wait_minutes,
      counter:      data.counter_name || data.counter,
      doctor:       data.doctor_name  || data.doctor,
      position:     position || 1,
      booked_at:    data.created_at,
    }
  });
}