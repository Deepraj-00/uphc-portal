import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile, patient_name, department, symptoms_raw, clinical_tags, urgency } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Count waiting in this department today
    const { count: deptCount } = await sb
      .from('tokens').select('*', { count: 'exact', head: true })
      .eq('status', 'waiting').eq('department', department).eq('token_date', today);

    const waitMinutes = Math.max(5, (deptCount || 0) * 8);

    // Token letter by department
    const tokenLetter =
      department === 'Maternity'   ? 'M' :
      department === 'Vaccination' ? 'V' :
      department === 'Dental'      ? 'D' :
      department === 'Eye / ENT'   ? 'E' :
      department === 'Lab / Tests' ? 'L' : 'A';

    // Count all tokens today for sequential number
    const { count: todayCount } = await sb
      .from('tokens').select('*', { count: 'exact', head: true })
      .eq('token_date', today);

    const tokenNumber = `${tokenLetter}-${(todayCount || 0) + 1}`;

    // Get available doctor for this department
    const { data: doctors } = await sb
      .from('doctors').select('*')
      .eq('department', department).eq('available', true);
    const doctor = doctors && doctors.length > 0
      ? doctors[Math.floor(Math.random() * doctors.length)].name
      : 'Dr. Shah';

    // Get active counter for this department
    const { data: counters } = await sb
      .from('counters').select('*')
      .eq('department', department).eq('active', true);
    const counter = counters && counters.length > 0
      ? counters[Math.floor(Math.random() * counters.length)].name
      : `${tokenLetter === 'A' ? 'OPD' : tokenLetter} 1`;

    const { data: token, error } = await sb
      .from('tokens')
      .insert({
        token_number:   tokenNumber,
        patient_mobile: mobile,
        patient_name:   patient_name || 'Patient',
        department,
        symptoms_raw,
        clinical_tags,
        urgency:        urgency || 'yellow',
        wait_minutes:   waitMinutes,
        counter_name:   counter,
        doctor_name:    doctor,
        token_date:     today,
      })
      .select().single();

    if (error) throw error;
    res.status(200).json({ success: true, token });

  } catch (error) {
    res.status(500).json({ error: 'Booking failed', details: error.message });
  }
}