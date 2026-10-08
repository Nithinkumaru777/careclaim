import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateAdjudicationStream } from '../services/gemini';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { mockPolicies, mockClaims } from '../lib/mockDb';

const router = Router();
router.use(requireAuth);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy' });

router.post('/parse-bill', async (req, res) => {
  if (process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY) {
    // Mock parsing
    return res.json([
      { item_name: "Consultation", cost: 1000, quantity: 1 }
    ]);
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing text' }});

  try {
    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item_name: { type: Type.STRING },
          cost: { type: Type.NUMBER },
          quantity: { type: Type.INTEGER }
        },
        required: ["item_name", "cost", "quantity"]
      }
    };

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: `Extract the bill items from the following text into JSON array of objects with item_name, cost, and quantity.\n\n<text>\n${text}\n</text>`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0
      }
    });

    const items = JSON.parse(response.text || '[]');
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'PARSE_FAILED', message: 'Failed to parse text' }});
  }
});

router.get('/policies/lookup', async (req, res) => {
  const { number } = req.query;
  
  if (process.env.DEMO_MODE === 'true') {
    const policy = mockPolicies.find(p => p.policy_number === number);
    if (policy) return res.json(policy);
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' }});
  }

  const supabase = (req as any).supabase;
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('policy_number', number)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' }});
  }

  res.json(data);
});

router.get('/stats', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const total = mockClaims.length;
    const approved = mockClaims.filter(d => d.status === 'APPROVED' || d.status === 'PARTIAL').length;
    const total_payout = mockClaims.reduce((sum, d) => sum + Number(d.approved_amount || 0), 0);
    const avg_time = mockClaims.filter(d => d.processing_ms).reduce((sum, d) => sum + Number(d.processing_ms), 0) / (total || 1);
    return res.json({
      total_claims: total,
      approval_rate: total ? (approved / total) * 100 : 0,
      total_payout,
      avg_processing_ms: avg_time
    });
  }

  const supabase = (req as any).supabase;
  const { data, error } = await supabase
    .from('claims')
    .select('status, approved_amount, processing_ms')
    .not('status', 'eq', 'PENDING');

  if (error) return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' }});

  const total = data.length;
  const approved = data.filter((d: any) => d.status === 'APPROVED' || d.status === 'PARTIAL').length;
  const total_payout = data.reduce((sum: number, d: any) => sum + Number(d.approved_amount), 0);
  const avg_time = data.filter((d: any) => d.processing_ms).reduce((sum: number, d: any) => sum + Number(d.processing_ms), 0) / (total || 1);

  res.json({
    total_claims: total,
    approval_rate: total ? (approved / total) * 100 : 0,
    total_payout,
    avg_processing_ms: avg_time
  });
});

export default router;
