export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile, otp } = req.body;
  if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required' });
  try {
    const response = await fetch(`https://control.msg91.com/api/v5/otp/verify?mobile=91${mobile}&otp=${otp}&authkey=${process.env.MSG91_AUTH_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.type === 'success') {
      res.status(200).json({ success: true, verified: true });
    } else {
      res.status(400).json({ success: false, verified: false, message: 'Incorrect OTP' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}