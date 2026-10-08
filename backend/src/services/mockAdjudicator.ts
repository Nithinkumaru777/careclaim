import { geminiOutputSchema } from '../schemas/claims';
import { z } from 'zod';

export function mockAdjudicate(billData: any[], policy: any): z.infer<typeof geminiOutputSchema> {
  const decisions = billData.map((item, i) => {
    let decision: 'COVERED' | 'EXCLUDED' = 'COVERED';
    let reason = 'Covered under general policy';
    let matchedRule = 'standard.coverage';
    const flags: Array<'DUPLICATE' | 'OVERPRICED' | 'UNRELATED_TO_DIAGNOSIS' | 'UNBUNDLING' | 'NONE'> = ['NONE'];

    if (item.item_name.toLowerCase().includes('cosmetic')) {
      decision = 'EXCLUDED';
      reason = 'Cosmetic surgery not covered';
      matchedRule = 'exclusion.cosmetic';
    }

    if (item.item_name.toLowerCase().includes('duplicate') || i > 0 && billData.findIndex(x => x.item_name === item.item_name) < i) {
      flags.push('DUPLICATE');
      decision = 'EXCLUDED';
      reason = 'Duplicate billing detected';
    }

    return {
      index: i,
      item_name: item.item_name,
      decision,
      matched_rule: matchedRule,
      reason,
      flags: flags.filter(f => f !== 'NONE').length ? flags.filter(f => f !== 'NONE') : ['NONE'] as any
    };
  });

  const denied_items = decisions.filter(d => d.decision === 'EXCLUDED').map(d => ({ item_name: d.item_name, reason: d.reason }));
  const approved_amount = decisions.filter(d => d.decision === 'COVERED').reduce((sum, d) => sum + billData[d.index].cost * billData[d.index].quantity, 0);

  return {
    chain_of_thought: [
      "[00:00.1] ▸ Extracting bill... " + billData.length + " line items",
      "[00:00.5] ▸ Cross-referencing Policy " + policy.policy_number,
      ...decisions.map(d => `[00:01.${d.index}] ${d.decision === 'COVERED' ? '✓' : '✗'} Item ${d.index} "${d.item_name}" ${d.decision === 'COVERED' ? 'covered' : 'excluded'}: ${d.reason}`)
    ],
    line_decisions: decisions,
    final_status: denied_items.length === billData.length ? 'DENIED' : (denied_items.length > 0 ? 'PARTIAL' : 'APPROVED'),
    approved_amount,
    denied_items
  };
}
