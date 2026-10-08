import { z } from 'zod';

export const claimSubmissionSchema = z.object({
  patient_id: z.string().min(1),
  policy_number: z.string().min(1),
  diagnosis_code: z.string().min(1),
  raw_bill_data: z.array(z.object({
    item_name: z.string().min(1).max(200),
    cost: z.number().positive(),
    quantity: z.number().int().positive().default(1),
  })).min(1).max(200),
  total_billed: z.number().positive(),
});

export const lineDecisionSchema = z.object({
  index: z.number().int().nonnegative(),
  item_name: z.string(),
  decision: z.enum(['COVERED', 'EXCLUDED']),
  matched_rule: z.string(),
  reason: z.string(),
  flags: z.array(z.enum(['DUPLICATE', 'OVERPRICED', 'UNRELATED_TO_DIAGNOSIS', 'UNBUNDLING', 'NONE']))
});

export const geminiOutputSchema = z.object({
  chain_of_thought: z.array(z.string()),
  line_decisions: z.array(lineDecisionSchema),
  final_status: z.enum(['APPROVED', 'PARTIAL', 'DENIED']),
  approved_amount: z.number().nonnegative(),
  denied_items: z.array(z.object({
    item_name: z.string(),
    reason: z.string()
  }))
});
