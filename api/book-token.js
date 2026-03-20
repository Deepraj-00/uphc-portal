import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile, department, symptoms_raw, clinical_tags, urgency } = req.body;
  try {
    const { count } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .eq('department', department);

    const waitMinutes = Math.max(5, (count || 0) * 8);
    const tokenLetter = department === 'Maternity' ? 'M' :
                        department === 'Vaccination' ? 'V' :
                        department === 'Dental' ? 'D' :
                        department === 'Eye / ENT' ? 'E' :
                        department === 'Lab / Tests' ? 'L' : 'A';
    const { count: totalToday } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true });
    const tokenNumber = `${tokenLetter}-${(totalToday || 0) + 1}`;

    const { data: token, error } = await supabase
      .from('tokens')
      .insert({
        token_number: tokenNumber,
        patient_mobile: mobile,
        department,
        symptoms_raw,
        clinical_tags,
        urgency: urgency || 'yellow',
        wait_minutes: waitMinutes,
        counter: `${tokenLetter === 'A' ? 'OPD' : department.slice(0,3)} ${Math.floor(Math.random() * 3) + 1}`,
        doctor: 'Dr. Shah'
      })
      .select()
      .single();

    if (error) throw error;

    await fetch(`https://control.msg91.com/api/v5/flow/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY
      },
      body: JSON.stringify({
        flow_id: process.env.MSG91_FLOW_ID,
        sender: 'UPHCGJ',
        mobiles: `91${mobile}`,
        TOKEN: tokenNumber,
        DEPT: department,
        WAIT: waitMinutes.toString(),
        COUNTER: token.counter
      })
    });

    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: 'Booking failed', details: error.message });
  }
}