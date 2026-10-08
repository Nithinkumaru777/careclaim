import Decimal from 'decimal.js';

export interface LineItem {
  index: number;
  item_name: string;
  cost: number;
  quantity: number;
  decision: 'COVERED' | 'EXCLUDED';
}

export interface PayoutResult {
  eligible: number;
  exclusions: number;
  after_copay: number;
  copay_amount: number;
  payout: number;
  limit_reduction: number;
  status: 'APPROVED' | 'PARTIAL' | 'DENIED';
  item_decisions?: LineItem[];
}

export function calculatePayout(
  items: LineItem[],
  totalBilled: number,
  copayPercentage: number,
  maxCoverageLimit: number
): PayoutResult {
  let eligibleDec = new Decimal(0);

  let hasExcluded = false;
  
  for (const item of items) {
    if (item.decision === 'COVERED') {
      const lineCost = new Decimal(item.cost).mul(item.quantity);
      eligibleDec = eligibleDec.plus(lineCost);
    } else {
      hasExcluded = true;
    }
  }

  const billedDec = new Decimal(totalBilled);
  const copayPctDec = new Decimal(copayPercentage).div(100);
  const limitDec = new Decimal(maxCoverageLimit);

  const exclusionsDec = billedDec.minus(eligibleDec);
  
  const copayAmountDec = eligibleDec.mul(copayPctDec);
  const afterCopayDec = eligibleDec.minus(copayAmountDec);

  const payoutDec = Decimal.min(afterCopayDec, limitDec);
  const limitReductionDec = afterCopayDec.minus(payoutDec);

  const payout = payoutDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  const limitReduction = limitReductionDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  let status: 'APPROVED' | 'PARTIAL' | 'DENIED' = 'APPROVED';
  
  if (payout === 0) {
    status = 'DENIED';
  } else if (hasExcluded || limitReduction > 0) {
    status = 'PARTIAL';
  }

  return {
    eligible: eligibleDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    exclusions: exclusionsDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    after_copay: afterCopayDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    copay_amount: copayAmountDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    payout,
    limit_reduction: limitReduction,
    status,
    item_decisions: items
  };
}
