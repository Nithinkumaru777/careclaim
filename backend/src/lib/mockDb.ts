import fs from 'fs';
import path from 'path';

export const mockPolicies = [
  {
    id: 'policy-1',
    patient_id: 'P-1001',
    policy_number: 'CC-402',
    holder_name: 'Rahul Sharma',
    plan_name: 'Gold Plus',
    max_coverage_limit: 500000.00,
    copay_percentage: 10.00,
    covered_treatments: ["surgery.general", "room.standard", "medicines.essential", "diagnostics.standard"],
    excluded_treatments: ["cosmetic", "experimental", "supplements"],
    valid_from: '2023-01-01',
    valid_to: '2030-12-31'
  },
  {
    id: 'policy-2',
    patient_id: 'P-1002',
    policy_number: 'CC-811',
    holder_name: 'Anita Desai',
    plan_name: 'Silver Care',
    max_coverage_limit: 300000.00,
    copay_percentage: 20.00,
    covered_treatments: ["room.standard", "medicines.essential", "diagnostics.standard"],
    excluded_treatments: ["cosmetic", "experimental", "surgery.advanced"],
    valid_from: '2023-01-01',
    valid_to: '2030-12-31'
  }
];

export const mockRateCard = [
  { keyword: 'IV Paracetamol', category: 'medication', max_reasonable_cost: 500.00 },
  { keyword: 'Private Room', category: 'room', max_reasonable_cost: 8000.00 },
  { keyword: 'Appendectomy', category: 'surgery', max_reasonable_cost: 85000.00 },
  { keyword: 'Rhinoplasty', category: 'surgery', max_reasonable_cost: 60000.00 }
];

const DB_FILE = path.join(process.cwd(), 'mock_claims.json');

let _mockClaims: any[] = [];
try {
  if (fs.existsSync(DB_FILE)) {
    _mockClaims = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } else {
    // Seed initial data for a beautiful dashboard
    _mockClaims = [
      {
        id: 'mock-' + Date.now(),
        patient_id: 'P-1001',
        policy_number: 'CC-402',
        diagnosis_code: 'K35.8 (Appendicitis)',
        status: 'APPROVED',
        total_billed: 175000,
        approved_amount: 157500,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        raw_bill_data: [
          { item_name: 'Room Rent (ICU)', cost: 30000, quantity: 2 },
          { item_name: 'Surgeon Fee', cost: 120000, quantity: 1 },
          { item_name: 'Anesthesia', cost: 25000, quantity: 1 }
        ],
        payout_breakdown: {
          eligible: 175000,
          exclusions: 0,
          copay_amount: 17500,
          limit_reduction: 0,
          payout: 157500,
          status: 'APPROVED'
        }
      },
      {
        id: 'mock-' + (Date.now() - 86400000),
        patient_id: 'P-1002',
        policy_number: 'CC-811',
        diagnosis_code: 'J01.90 (Acute sinusitis)',
        status: 'PARTIAL',
        total_billed: 4500,
        approved_amount: 3600,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        raw_bill_data: [
          { item_name: 'Consultation', cost: 1500, quantity: 1 },
          { item_name: 'Medicines', cost: 3000, quantity: 1 }
        ],
        payout_breakdown: {
          eligible: 4500,
          exclusions: 0,
          copay_amount: 900,
          limit_reduction: 0,
          payout: 3600,
          status: 'PARTIAL'
        }
      }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(_mockClaims, null, 2));
  }
} catch (e) {
  console.error("Failed to load mock claims from disk", e);
}

export const mockClaims = new Proxy(_mockClaims, {
  set(target, property, value) {
    target[property as any] = value;
    fs.writeFileSync(DB_FILE, JSON.stringify(target, null, 2));
    return true;
  }
});

const OVERRIDES_FILE = path.join(process.cwd(), 'mock_overrides.json');
let _mockOverrides: any[] = [];
try {
  if (fs.existsSync(OVERRIDES_FILE)) {
    _mockOverrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
  }
} catch (e) {}

export const mockOverrides = new Proxy(_mockOverrides, {
  set(target, property, value) {
    target[property as any] = value;
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(target, null, 2));
    return true;
  }
});
