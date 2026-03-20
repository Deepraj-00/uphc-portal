import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile, patient_name, department, symptoms_raw, clinical_tags, urgency } = req.body;

  try {
    const { count } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .eq('department', department);

    const waitMinutes = Math.max(5, (count || 0) * 8);

    const tokenLetter =
      department === 'Maternity'   ? 'M' :
      department === 'Vaccination' ? 'V' :
      department === 'Dental'      ? 'D' :
      department === 'Eye / ENT'   ? 'E' :
      department === 'Lab / Tests' ? 'L' : 'A';

    const { count: totalToday } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true });

    const tokenNumber = `${tokenLetter}-${(totalToday || 0) + 1}`;

    const counter = `${
      tokenLetter === 'A' ? 'OPD' :
      tokenLetter === 'M' ? 'MAT' :
      tokenLetter === 'V' ? 'VAX' :
      tokenLetter === 'D' ? 'DNT' :
      tokenLetter === 'E' ? 'EYE' : 'LAB'
    } ${Math.floor(Math.random() * 3) + 1}`;

    const { data: token, error } = await supabase
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
        counter,
        doctor:         'Dr. Shah'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, token });

  } catch (error) {
    res.status(500).json({ error: 'Booking failed', details: error.message });
  }
}