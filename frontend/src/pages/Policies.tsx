import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ShieldAlert } from 'lucide-react';

export function Policies() {
  const navigate = useNavigate();

  const policies = [
    {
      policy_number: 'CC-402',
      plan_name: 'Gold Plus',
      max_coverage_limit: 500000.00,
      copay_percentage: 10.00,
      covered_treatments: ["surgery.general", "room.standard", "medicines.essential", "diagnostics.standard"],
      excluded_treatments: ["cosmetic", "experimental", "supplements"],
    },
    {
      policy_number: 'CC-811',
      plan_name: 'Silver Care',
      max_coverage_limit: 300000.00,
      copay_percentage: 20.00,
      covered_treatments: ["room.standard", "medicines.essential", "diagnostics.standard"],
      excluded_treatments: ["cosmetic", "experimental", "surgery.advanced"],
    }
  ];

  const rateCard = [
    { keyword: 'IV Paracetamol', category: 'medication', max_reasonable_cost: 500.00 },
    { keyword: 'Private Room', category: 'room', max_reasonable_cost: 8000.00 },
    { keyword: 'Appendectomy', category: 'surgery', max_reasonable_cost: 85000.00 },
    { keyword: 'Rhinoplasty', category: 'surgery', max_reasonable_cost: 60000.00 }
  ];

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end border-b border-rule pb-4">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-xs font-mono uppercase text-ink-soft hover:text-pine mb-2">← Back to Dashboard</button>
          <h1 className="text-3xl font-serif text-pine-deep">Policy & Rules Explorer</h1>
          <p className="text-sm text-ink-soft font-mono mt-1">CareClaim Active Coverage Matrix</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-mono text-sm uppercase tracking-widest text-pine-deep border-b border-rule pb-2">Active Policies</h2>
          {policies.map(p => (
            <div key={p.policy_number} className="bg-paper p-5 rounded-lg border border-rule shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-serif text-xl text-pine-deep">{p.plan_name}</span>
                <span className="font-mono bg-bone px-2 py-1 rounded text-xs">{p.policy_number}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 font-mono text-sm border-y border-rule py-3">
                <div><span className="text-ink-soft block text-xs uppercase mb-1">Max Limit</span>₹{p.max_coverage_limit.toLocaleString('en-IN')}</div>
                <div><span className="text-ink-soft block text-xs uppercase mb-1">Copay</span>{p.copay_percentage}%</div>
              </div>
              <div>
                <span className="text-ink-soft block text-xs font-mono uppercase mb-1">Covered</span>
                <div className="flex flex-wrap gap-2">
                  {p.covered_treatments.map(t => <span key={t} className="bg-moss/10 text-moss border border-moss/20 px-2 py-0.5 rounded text-xs">{t}</span>)}
                </div>
              </div>
              <div>
                <span className="text-ink-soft block text-xs font-mono uppercase mb-1">Excluded</span>
                <div className="flex flex-wrap gap-2">
                  {p.excluded_treatments.map(t => <span key={t} className="bg-vermilion/10 text-vermilion border border-vermilion/20 px-2 py-0.5 rounded text-xs">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="font-mono text-sm uppercase tracking-widest text-pine-deep border-b border-rule pb-2">Reference Rate Card</h2>
          <div className="bg-paper rounded-lg border border-rule overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-bone border-b border-rule text-xs uppercase tracking-wider font-mono text-ink-soft">
                <tr>
                  <th className="p-4 font-normal">Keyword</th>
                  <th className="p-4 font-normal">Category</th>
                  <th className="p-4 font-normal text-right">Max Allowed (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rateCard.map(r => (
                  <tr key={r.keyword} className="hover:bg-bone/50">
                    <td className="p-4 font-medium">{r.keyword}</td>
                    <td className="p-4 font-mono text-xs text-ink-soft">{r.category}</td>
                    <td className="p-4 font-mono text-right font-bold text-pine-deep">{r.max_reasonable_cost.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-amber/10 border border-amber/30 rounded text-amber text-sm flex items-start gap-3 mt-4">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <p>If billed amount exceeds the Reference Rate Card limit, the LLM will automatically flag it for unbundling or override it to the max allowed cost.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
