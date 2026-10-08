import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { claimSubmissionSchema, geminiOutputSchema } from '../schemas/claims';
import { generateAdjudicationStream } from '../services/gemini';
import { mockAdjudicate } from '../services/mockAdjudicator';
import { calculatePayout } from '../services/payoutEngine';
import { logger } from '../lib/logger';
import { mockClaims, mockPolicies, mockRateCard } from '../lib/mockDb';

const router = Router();

router.use(requireAuth);

router.post('/', validateBody(claimSubmissionSchema), async (req, res) => {
  const { patient_id, policy_number, diagnosis_code, raw_bill_data, total_billed } = req.body;
  
  if (process.env.DEMO_MODE === 'true') {
    const policy = mockPolicies.find(p => p.policy_number === policy_number);
    if (!policy) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    
    const now = new Date();
    if (new Date(policy.valid_from) > now || new Date(policy.valid_to) < now) {
      return res.status(400).json({ error: { code: 'POLICY_EXPIRED', message: 'Policy is expired or not yet valid' } });
    }

    const calculatedTotal = raw_bill_data.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);
    if (Math.abs(calculatedTotal - total_billed) > 1) {
      return res.status(400).json({ error: { code: 'MATH_ERROR', message: 'total_billed does not match sum of line items' } });
    }
    
    const claim = {
      id: `mock-${Date.now()}`,
      policy_id: policy.id,
      patient_id,
      diagnosis_code,
      raw_bill_data,
      total_billed,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      policies: policy
    };
    mockClaims.unshift(claim);
    return res.status(201).json(claim);
  }

  const supabase = (req as any).supabase;

  // Resolve policy number to policy ID
  const { data: policy, error: policyError } = await supabase
    .from('policies')
    .select('id, valid_from, valid_to')
    .eq('policy_number', policy_number)
    .single();

  if (policyError || !policy) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
  }

  const now = new Date();
  if (new Date(policy.valid_from) > now || new Date(policy.valid_to) < now) {
    return res.status(400).json({ error: { code: 'POLICY_EXPIRED', message: 'Policy is expired or not yet valid' } });
  }

  const calculatedTotal = raw_bill_data.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);
  if (Math.abs(calculatedTotal - total_billed) > 1) {
    return res.status(400).json({ error: { code: 'MATH_ERROR', message: 'total_billed does not match sum of line items' } });
  }

  // Insert claim as PENDING
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      policy_id: policy.id,
      patient_id,
      diagnosis_code,
      raw_bill_data,
      total_billed,
      status: 'PENDING'
    })
    .select()
    .single();

  if (claimError) {
    logger.error({ err: claimError }, 'Error creating claim');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Could not create claim' } });
  }

  res.status(201).json(claim);
});

router.get('/', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    return res.json(mockClaims);
  }

  const supabase = (req as any).supabase;
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Could not fetch claims' } });
  }

  res.json(data);
});

router.get('/:id', async (req, res) => {
  if (process.env.DEMO_MODE === 'true') {
    const claim = mockClaims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Claim not found' } });
    return res.json(claim);
  }

  const supabase = (req as any).supabase;
  const { data, error } = await supabase
    .from('claims')
    .select('*, policies(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Claim not found' } });
  }

  res.json(data);
});

import rateLimit from 'express-rate-limit';

const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many claims processed recently. Please wait.' } }
});

router.post('/:id/process', expensiveLimiter, async (req, res) => {
  const claimId = req.params.id;
  let claim: any;
  let supabase: any;

  if (process.env.DEMO_MODE === 'true') {
    claim = mockClaims.find(c => c.id === claimId);
    if (!claim) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Claim not found' } });
    if (claim.status !== 'PENDING') return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Claim is not PENDING' } });
    claim.status = 'PROCESSING';
  } else {
    supabase = (req as any).supabase;
    const { data, error: claimError } = await supabase
      .from('claims')
      .update({ status: 'PROCESSING' })
      .eq('id', claimId)
      .eq('status', 'PENDING')
      .select('*, policies(*)')
      .single();

    if (claimError || !data) {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Claim is not PENDING or does not exist' } });
    }
    claim = data;
  }

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const startTime = Date.now();
  const eventLog: any[] = [];

  const logEvent = (event: string, data: any) => {
    const ts = Date.now() - startTime;
    eventLog.push({ ts, event, data });
    sendEvent(event, { ...data, ts });
  };

  try {
    logEvent('stage_start', { stage: 'INTAKE' });
    logEvent('log', { message: `▸ Extracting bill… ${claim.raw_bill_data.length} line items, ₹${claim.total_billed} billed` });
    
    // Intake gates
    if (claim.patient_id !== claim.policies.patient_id) {
      throw new Error('Patient ID does not match Policy Holder ID');
    }

    logEvent('stage_end', { stage: 'INTAKE' });

    // 2. POLICY MATCH
    logEvent('stage_start', { stage: 'POLICY_MATCH' });
    logEvent('log', { message: `▸ Cross-referencing Policy ${claim.policies.policy_number} (${claim.policies.plan_name}, ${claim.policies.copay_percentage}% copay, limit ₹${claim.policies.max_coverage_limit})` });

    // Fetch rate card for context
    let rateCard;
    if (process.env.DEMO_MODE === 'true') {
      rateCard = mockRateCard;
    } else {
      const { data } = await supabase.from('rate_card').select('*');
      rateCard = data;
    }
    logEvent('stage_end', { stage: 'POLICY_MATCH' });

    // 3. AI REASONING
    logEvent('stage_start', { stage: 'AI_REASONING' });
    
    let aiOutput;
    
    if (process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY) {
      logEvent('log', { message: `▸ DEMO MODE ACTIVE - using mock adjudicator` });
      aiOutput = mockAdjudicate(claim.raw_bill_data, claim.policies);
      for (const step of aiOutput.chain_of_thought) {
        logEvent('log', { message: step });
        await new Promise(r => setTimeout(r, 200)); // Simulate delay
      }
    } else {
      const prompt = `Policy: ${JSON.stringify(claim.policies)}\nRate Card: ${JSON.stringify(rateCard)}\nDiagnosis: ${claim.diagnosis_code}\n\n<bill_data>\n${JSON.stringify(claim.raw_bill_data)}\n</bill_data>`;
      
      const stream = await generateAdjudicationStream(prompt);
      
      let fullJsonString = '';
      for await (const chunk of stream) {
        fullJsonString += chunk.text;
        // In a real app we'd incrementally parse JSON to stream chain_of_thought.
        // For stability here, we will stream logs after full parse or do basic regex extracting.
      }
      
      // Fallback: parse full JSON
      const cleaned = fullJsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      aiOutput = geminiOutputSchema.parse(parsed);

      for (const step of aiOutput.chain_of_thought) {
        logEvent('log', { message: step });
      }
    }

    logEvent('stage_end', { stage: 'AI_REASONING' });

    // 4. VERIFY
    logEvent('stage_start', { stage: 'VERIFY' });
    
    // Strict validation of AI decisions against original bill
    const billLength = claim.raw_bill_data.length;
    const providedIndices = aiOutput.line_decisions.map((d: any) => d.index);
    const uniqueIndices = new Set(providedIndices);

    if (providedIndices.length !== billLength || uniqueIndices.size !== billLength || Math.max(...providedIndices) >= billLength || Math.min(...providedIndices) < 0) {
      throw new Error(`AI returned invalid, duplicate, or missing line item indices (expected ${billLength} unique indices from 0 to ${billLength - 1})`);
    }

    const payoutResult = calculatePayout(
      aiOutput.line_decisions.map((d: any) => ({
        index: d.index,
        item_name: d.item_name,
        cost: claim.raw_bill_data[d.index].cost,
        quantity: claim.raw_bill_data[d.index].quantity,
        decision: d.decision
      })),
      claim.total_billed,
      claim.policies.copay_percentage,
      claim.policies.max_coverage_limit
    );

    let matchMsg = 'matches model';
    if (payoutResult.payout !== aiOutput.approved_amount) {
      matchMsg = 'OVERRIDE: model discrepancy detected';
    }

    logEvent('log', { message: `Σ VERIFIER eligible ₹${payoutResult.eligible} − copay ₹${payoutResult.copay_amount} = ₹${payoutResult.after_copay} ${payoutResult.limit_reduction > 0 ? `(capped to limit: ₹${payoutResult.payout})` : ''} (${matchMsg})` });

    logEvent('stage_end', { stage: 'VERIFY' });

    // 5. DECISION
    logEvent('stage_start', { stage: 'DECISION' });
    
    const processingMs = Date.now() - startTime;
    const updatePayload = {
      status: payoutResult.status,
      approved_amount: payoutResult.payout,
      payout_breakdown: payoutResult,
      ai_reasoning_log: [...eventLog], // snapshot so later logEvent calls don't mutate the persisted log
      model_used: process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY ? 'mock' : (process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
      processing_ms: processingMs,
      processed_at: new Date().toISOString()
    };

    let updatedClaim;
    if (process.env.DEMO_MODE === 'true') {
      const idx = mockClaims.findIndex(c => c.id === claimId);
      mockClaims[idx] = { ...mockClaims[idx], ...updatePayload };
      updatedClaim = mockClaims[idx];
    } else {
      const { data, error: updateError } = await supabase
        .from('claims')
        .update(updatePayload)
        .eq('id', claimId)
        .select()
        .single();
      if (updateError) throw updateError;
      updatedClaim = data;
    }

    sendEvent('result', updatedClaim); // Don't put the result back into eventLog
    res.end();
  } catch (err: any) {
    logger.error({ err }, `Processing error on claim ${claimId}`);
    logEvent('error', { message: err.message || 'Processing failed' });
    
    // Revert to pending
    if (process.env.DEMO_MODE === 'true') {
      const c = mockClaims.find(c => c.id === claimId);
      if (c) c.status = 'PENDING';
    } else {
      await supabase.from('claims').update({ status: 'PENDING' }).eq('id', claimId);
    }
    res.end();
  }
});

import { mockOverrides } from '../lib/mockDb';

router.patch('/:id', async (req, res) => {
  const claimId = req.params.id;
  const { approved_amount, status, reason = 'Manual human override' } = req.body;
  const user = (req as any).user?.id || 'system';
  
  if (process.env.DEMO_MODE === 'true') {
    const idx = mockClaims.findIndex(c => c.id === claimId);
    if (idx !== -1) {
      const oldAmount = mockClaims[idx].approved_amount;
      mockOverrides.push({
        claim_id: claimId,
        user_id: user,
        old_amount: oldAmount,
        new_amount: approved_amount,
        reason,
        created_at: new Date().toISOString()
      });
      mockClaims[idx] = { ...mockClaims[idx], approved_amount, status };
      return res.json(mockClaims[idx]);
    }
    return res.status(404).json({ error: 'Not found' });
  } else {
    const supabase = (req as any).supabase;
    const { data: claim } = await supabase.from('claims').select('approved_amount').eq('id', claimId).single();
    
    await supabase.from('claim_overrides').insert({
      claim_id: claimId,
      user_id: user,
      old_amount: claim?.approved_amount || 0,
      new_amount: approved_amount,
      reason
    });

    const { data, error } = await supabase
      .from('claims')
      .update({ approved_amount, status })
      .eq('id', claimId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }
});

export default router;
