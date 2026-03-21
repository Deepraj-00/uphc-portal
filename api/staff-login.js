export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const correct = process.env.STAFF_PASSWORD || 'uphc2024';
  if (password === correct) {
    res.status(200).json({ success: true, role: 'staff' });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password' });
  }
}