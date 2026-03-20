export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile } = req.body;
  if (!mobile || mobile.length !== 10) return res.status(400).json({ error: 'Invalid mobile number' });
  try {
    const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.type === 'success') {
      res.status(200).json({ success: true, message: 'OTP sent' });
    } else {
      res.status(400).json({ error: 'Failed to send OTP', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}