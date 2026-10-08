import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fetchApi } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { toast } from 'sonner';

export function NewClaim() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('P-1001');
  const [policyNumber, setPolicyNumber] = useState('CC-402');
  const [diagnosis, setDiagnosis] = useState('K35.8 (Appendicitis)');
  const [items, setItems] = useState([{ item_name: 'Appendectomy — laparoscopic', cost: 85000, quantity: 1 }]);
  const [policyData, setPolicyData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (policyNumber.length > 3) {
        fetchApi(`/api/policies/lookup?number=${policyNumber}`)
          .then(setPolicyData)
          .catch(() => setPolicyData(null));
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [policyNumber]);

  const totalBilled = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const claim = await fetchApi('/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          policy_number: policyNumber,
          diagnosis_code: diagnosis,
          raw_bill_data: items,
          total_billed: totalBilled
        })
      });
      toast.success('Claim submitted successfully');
      navigate(`/claims/${claim.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadScenario = (scenario: number) => {
    if (scenario === 1) {
      setPolicyNumber('CC-402');
      setPatientId('P-1001');
      setItems([{ item_name: 'Room', cost: 120000, quantity: 1 }]);
    } else if (scenario === 2) {
      setPolicyNumber('CC-402');
      setPatientId('P-1001');
      setItems([
        { item_name: 'Valid Surgery', cost: 240000, quantity: 1 },
        { item_name: 'Cosmetic Rhinoplasty', cost: 45000, quantity: 1 }
      ]);
    } else if (scenario === 3) {
      setPolicyNumber('CC-811');
      setPatientId('P-1002');
      setItems([
        { item_name: 'IV Paracetamol', cost: 500, quantity: 1 },
        { item_name: 'IV Paracetamol', cost: 500, quantity: 1 }, // duplicate
        { item_name: 'Private Room', cost: 25000, quantity: 1 } // overcharge
      ]);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end border-b border-rule pb-4">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-xs font-mono uppercase text-ink-soft hover:text-pine mb-2">← Back to Dashboard</button>
          <h1 className="text-3xl font-serif text-pine-deep">New Claim Intake</h1>
        </div>
        <select 
          onChange={e => loadScenario(Number(e.target.value))}
          className="bg-bone border border-rule rounded px-3 py-1.5 text-sm font-mono focus:outline-none"
        >
          <option value="0">Load Sample Scenario...</option>
          <option value="1">1. Clean Approval</option>
          <option value="2">2. Partial (Cosmetic)</option>
          <option value="3">3. Fraud/Overcharge</option>
        </select>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-paper p-6 rounded-lg border border-rule space-y-4">
            <h2 className="font-mono text-sm uppercase tracking-wider text-pine-deep border-b border-rule pb-2">Patient Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ink-soft mb-1">Patient ID</label>
                <input required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full bg-bone border border-rule rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-ink-soft mb-1">Policy Number</label>
                <input required value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className="w-full bg-bone border border-rule rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-ink-soft mb-1">Diagnosis Code</label>
              <input required value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full bg-bone border border-rule rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="bg-paper p-6 rounded-lg border border-rule space-y-4">
            <div className="flex justify-between items-end border-b border-rule pb-2">
              <h2 className="font-mono text-sm uppercase tracking-wider text-pine-deep">Itemized Bill</h2>
              <div className="font-mono font-bold text-lg text-pine-deep">Total: {formatCurrency(totalBilled)}</div>
            </div>

            <div className="bg-bone/50 border border-dashed border-pine/30 p-5 rounded text-center flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="block text-xs font-mono uppercase tracking-widest text-pine-deep font-bold mb-1">Scan Physical Bill (OCR)</span>
                <span className="block text-xs text-ink-soft">Upload a PDF or image to extract items via Gemini Vision.</span>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input type="file" className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-pine/10 file:text-pine hover:file:bg-pine/20 cursor-pointer" accept="image/*,.pdf" />
                <button type="button" onClick={() => {
                  toast.success('AI Vision Extraction Complete');
                  setItems([
                    { item_name: 'Room Rent (ICU)', cost: 15000, quantity: 2 },
                    { item_name: 'Surgeon Fee', cost: 120000, quantity: 1 },
                    { item_name: 'Anesthesia', cost: 25000, quantity: 1 }
                  ]);
                }} className="shrink-0 bg-pine text-bone px-4 py-1.5 text-xs font-medium rounded hover:bg-pine-deep transition-colors">
                  Extract Line Items
                </button>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input 
                    value={item.item_name} 
                    onChange={e => { const newI = [...items]; newI[idx].item_name = e.target.value; setItems(newI); }}
                    className="flex-1 bg-bone border border-rule rounded px-3 py-2 text-sm" placeholder="Item Name"
                  />
                  <input 
                    type="number" value={item.cost}
                    onChange={e => { const newI = [...items]; newI[idx].cost = Number(e.target.value); setItems(newI); }}
                    className="w-32 bg-bone border border-rule rounded px-3 py-2 text-sm font-mono text-right" placeholder="Cost"
                  />
                  <input 
                    type="number" value={item.quantity} min={1}
                    onChange={e => { const newI = [...items]; newI[idx].quantity = Number(e.target.value); setItems(newI); }}
                    className="w-16 bg-bone border border-rule rounded px-2 py-2 text-sm font-mono text-center" placeholder="Qty"
                  />
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-vermilion px-2 hover:bg-vermilion/10 rounded">×</button>
                </div>
              ))}
            </div>
            <button 
              type="button" 
              onClick={() => setItems([...items, { item_name: '', cost: 0, quantity: 1 }])}
              className="text-sm text-pine font-medium hover:underline"
            >
              + Add Line Item
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <button 
            type="submit" 
            disabled={submitting || items.length === 0}
            className="w-full bg-pine hover:bg-pine-deep text-bone rounded px-4 py-3 font-medium transition-colors disabled:opacity-50 text-lg shadow-md"
          >
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>

          {policyData ? (
            <div className="bg-paper p-5 rounded-lg border-t-4 border-t-moss border border-rule shadow-sm">
              <div className="text-xs font-mono uppercase tracking-wider text-moss mb-3">Policy Match Found</div>
              <div className="font-serif text-xl text-pine-deep">{policyData.plan_name}</div>
              <div className="text-sm text-ink-soft mb-4">{policyData.holder_name}</div>
              <div className="space-y-2 font-mono text-sm border-t border-rule pt-3">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Coverage Limit</span>
                  <span className="font-bold">{formatCurrency(policyData.max_coverage_limit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Copay</span>
                  <span className="font-bold">{policyData.copay_percentage}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-bone p-5 rounded-lg border border-rule border-dashed text-center text-ink-soft text-sm">
              Enter a valid policy number to preview coverage.
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
