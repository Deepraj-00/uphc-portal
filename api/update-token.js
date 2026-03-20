import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, status, mobile, token_number } = req.body;
  try {
    const { error } = await supabase
      .from('tokens')
      .update({ status })
      .eq('id', id);
    if (error) throw error;

    if (status === 'called' && mobile) {
      await fetch(`https://control.msg91.com/api/v5/flow/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': process.env.MSG91_AUTH_KEY
        },
        body: JSON.stringify({
          flow_id: process.env.MSG91_NOTIFY_FLOW_ID,
          sender: 'UPHCGJ',
          mobiles: `91${mobile}`,
          TOKEN: token_number
        })
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
}