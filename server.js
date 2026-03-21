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

app.post('/api/staff-login', (req, res) => {
  const { password } = req.body;
  const correct = process.env.STAFF_PASSWORD || 'uphc2024';
  if (password === correct) res.json({ success: true, role: 'staff' });
  else res.status(401).json({ success: false, message: 'Incorrect password' });
});

app.get('/api/token-status', async (req, res) => {
  const { mobile } = req.query;
  if (!mobile || mobile.length < 10) return res.status(400).json({ error: 'Valid mobile required' });
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data } = await supabase.from('tokens').select('*').eq('patient_mobile', mobile).eq('token_date', today).not('status', 'in', '("archived","completed","noshow")').order('created_at', { ascending: false }).limit(1).single();
    if (!data) return res.json({ found: false, message: 'No active token found.' });
    const { count: position } = await supabase.from('tokens').select('*', { count: 'exact', head: true }).eq('department', data.department).eq('status', 'waiting').eq('token_date', today).lte('created_at', data.created_at);
    res.json({ found: true, token: { token_number: data.token_number, department: data.department, status: data.status, wait_minutes: data.wait_minutes, counter: data.counter_name || data.counter, doctor: data.doctor_name || data.doctor, position: position || 1 } });
  } catch { res.json({ found: false, message: 'No active token found.' }); }
});

app.get('/api/doctors', async (req, res) => {
  const { department } = req.query;
  let q = supabase.from('doctors').select('*').order('name');
  if (department) q = q.eq('department', department);
  const { data } = await q;
  res.json({ doctors: data || [] });
});

app.post('/api/doctors', async (req, res) => {
  const { name, department } = req.body;
  const { data, error } = await supabase.from('doctors').insert({ name, department }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, doctor: data });
});

app.patch('/api/doctors', async (req, res) => {
  const { id, available, name } = req.body;
  const updates = {};
  if (available !== undefined) updates.available = available;
  if (name !== undefined) updates.name = name;
  const { error } = await supabase.from('doctors').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/api/doctors', async (req, res) => {
  const { id } = req.body;
  const { error } = await supabase.from('doctors').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/counters', async (req, res) => {
  const { department } = req.query;
  let q = supabase.from('counters').select('*').order('name');
  if (department) q = q.eq('department', department);
  const { data } = await q;
  res.json({ counters: data || [] });
});

app.post('/api/counters', async (req, res) => {
  const { name, department } = req.body;
  const { data, error } = await supabase.from('counters').insert({ name, department }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, counter: data });
});

app.patch('/api/counters', async (req, res) => {
  const { id, active, name } = req.body;
  const updates = {};
  if (active !== undefined) updates.active = active;
  if (name !== undefined) updates.name = name;
  const { error } = await supabase.from('counters').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/api/counters', async (req, res) => {
  const { id } = req.body;
  const { error } = await supabase.from('counters').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/notes', async (req, res) => {
  const { id, notes, prescription } = req.body;
  const updates = {};
  if (notes !== undefined) updates.notes = notes;
  if (prescription !== undefined) updates.prescription = prescription;
  const { error } = await supabase.from('tokens').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/reset-tokens', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('tokens').update({ status: 'archived' }).lt('token_date', today).in('status', ['waiting', 'called']);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Archived old tokens before ${today}` });
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