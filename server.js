import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.post('/api/book-token', async (req, res) => {
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
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: 'Booking failed', details: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'API failed' });
  }
});

app.post('/api/send-otp', (req, res) => {
  res.json({ success: true });
});

app.post('/api/verify-otp', (req, res) => {
  const { otp } = req.body;
  if (otp === '123456') res.json({ success: true, verified: true });
  else res.json({ success: false, verified: false });
});

app.post('/api/update-token', async (req, res) => {
  const { id, status } = req.body;
  try {
    const { error } = await supabase.from('tokens').update({ status }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.listen(3001, () => console.log('API server running on port 3001'));