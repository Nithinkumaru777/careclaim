import { describe, it, expect } from 'vitest';
import { calculatePayout, LineItem } from '../src/services/payoutEngine';

describe('Payout Engine', () => {
  it('Scenario 1: Clean approval', () => {
    const items: LineItem[] = [
      { index: 0, item_name: 'Room', cost: 120000, quantity: 1, decision: 'COVERED' }
    ];
    const result = calculatePayout(items, 120000, 10, 500000);
    expect(result.status).toBe('APPROVED');
    expect(result.payout).toBe(108000);
    expect(result.copay_amount).toBe(12000);
    expect(result.limit_reduction).toBe(0);
  });

  it('Scenario 2: Partial: cosmetic exclusion', () => {
    const items: LineItem[] = [
      { index: 0, item_name: 'Valid Surgery', cost: 240000, quantity: 1, decision: 'COVERED' },
      { index: 1, item_name: 'Cosmetic', cost: 45000, quantity: 1, decision: 'EXCLUDED' }
    ];
    const result = calculatePayout(items, 285000, 10, 500000);
    expect(result.status).toBe('PARTIAL');
    expect(result.eligible).toBe(240000);
    expect(result.payout).toBe(216000);
  });

  it('Scenario 4: Limit exceeded', () => {
    const items: LineItem[] = [
      { index: 0, item_name: 'Expensive Surgery', cost: 620000, quantity: 1, decision: 'COVERED' }
    ];
    const result = calculatePayout(items, 620000, 10, 500000);
    expect(result.status).toBe('PARTIAL');
    expect(result.eligible).toBe(620000);
    expect(result.after_copay).toBe(558000);
    expect(result.payout).toBe(500000);
    expect(result.limit_reduction).toBe(58000);
  });

  it('All items excluded -> Denied', () => {
    const items: LineItem[] = [
      { index: 0, item_name: 'Cosmetic', cost: 45000, quantity: 1, decision: 'EXCLUDED' }
    ];
    const result = calculatePayout(items, 45000, 10, 500000);
    expect(result.status).toBe('DENIED');
    expect(result.payout).toBe(0);
  });

  it('100% copay', () => {
    const items: LineItem[] = [
      { index: 0, item_name: 'Treatment', cost: 100000, quantity: 1, decision: 'COVERED' }
    ];
    const result = calculatePayout(items, 100000, 100, 500000);
    expect(result.status).toBe('DENIED');
    expect(result.payout).toBe(0);
  });
});
