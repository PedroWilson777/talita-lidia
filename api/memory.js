import { getMemory, saveMemory } from '../lib/storage.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const memory = await getMemory();
    return res.status(200).json(memory);
  }

  if (req.method === 'POST') {
    const { notes } = req.body;
    if (!Array.isArray(notes)) {
      return res.status(400).json({ error: 'notes deve ser um array' });
    }
    await saveMemory(notes);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
