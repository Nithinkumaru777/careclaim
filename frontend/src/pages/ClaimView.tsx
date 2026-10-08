import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { fetchApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { AgentTerminal } from '../components/AgentTerminal';
import type { TerminalEvent } from '../components/AgentTerminal';
import { PayoutWaterfall } from '../components/PayoutWaterfall';
import { StatusStamp } from '../components/StatusStamp';
import { formatCurrency } from '../lib/format';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function ClaimView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [events, setEvents] = useState<TerminalEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) loadClaim();
  }, [id]);

  const loadClaim = async () => {
    try {
      const data = await fetchApi(`/api/claims/${id}`);
      setClaim(data);
      if (data.ai_reasoning_log) {
        setEvents(data.ai_reasoning_log);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const runAdjudication = async () => {
    if (!claim || claim.status !== 'PENDING') return;
    
    setIsProcessing(true);
    setEvents([]);
    
    let token = localStorage.getItem('mock_token');
    if (!token) {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token || '';
    }

    try {
      await fetchEventSource(`${import.meta.env.VITE_API_BASE_URL}/api/claims/${id}/process`, {
        method: 'POST',
        openWhenHidden: true, // default re-POSTs on tab refocus, which would re-trigger a non-idempotent run
        headers: {
          'Authorization': `Bearer ${token}`
        },
        onmessage(ev) {
          const data = JSON.parse(ev.data);
          if (ev.event === 'result') {
            setClaim(data);
            setIsProcessing(false);
          } else if (ev.event === 'error') {
            toast.error(data.message);
            setIsProcessing(false);
            loadClaim();
          } else {
            // Check if backend provided a relative timestamp, else fallback to 0
            const relTs = data.ts ?? 0;
            setEvents(prev => [...prev, { ts: relTs, event: ev.event as any, data }]);
          }
        },
        onerror(err) {
          toast.error('Connection lost');
          setIsProcessing(false);
          throw err;
        },
        onclose() {
          setIsProcessing(false);
        }
      });
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  if (!claim) return <div className="p-10 text-center font-mono">Loading...</div>;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-3 space-y-6">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-ink-soft hover:text-pine transition-colors font-mono text-xs uppercase tracking-widest mb-2"
        >
          ← Back to Dashboard
        </button>
        <div className="bg-paper p-6 rounded-lg border border-rule">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft border-b border-rule pb-2 mb-4">Claim Intake</h2>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-ink-soft">Patient ID</div>
              <div className="font-medium">{claim.patient_id}</div>
            </div>
            <div>
              <div className="text-ink-soft">Policy</div>
              <div className="font-mono bg-bone px-1 rounded inline-block">{claim.policies?.policy_number}</div>
            </div>
            <div>
              <div className="text-ink-soft">Diagnosis</div>
              <div className="font-mono bg-bone px-1 rounded inline-block">{claim.diagnosis_code}</div>
            </div>
            <div className="border-t border-rule pt-4">
              <div className="text-ink-soft mb-2">Itemized Bill</div>
              <div className="space-y-2">
                {claim.raw_bill_data.map((item: any, i: number) => {
                  const decision = claim.payout_breakdown?.item_decisions?.find((d: any) => d.index === i)?.decision;
                  const isExcluded = decision === 'EXCLUDED';
                  
                  return (
                    <div key={i} className={`flex justify-between font-mono text-xs p-2 rounded border ${isExcluded ? 'bg-vermilion/5 border-vermilion/20 text-vermilion line-through' : 'bg-bone border-transparent'}`}>
                      <span className="truncate pr-2">{item.item_name} (x{item.quantity})</span>
                      <span>{formatCurrency(item.cost * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between font-mono font-bold mt-4 pt-2 border-t border-rule/50">
                <span>Total</span>
                <span>{formatCurrency(claim.total_billed)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Agent Terminal */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif text-pine-deep">AI Adjudication Core</h2>
          {claim.status === 'PENDING' && (
            <button 
              onClick={runAdjudication}
              disabled={isProcessing}
              className="bg-phosphor hover:bg-phosphor/80 text-pine-deep font-bold font-mono text-xs uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(92,255,157,0.3)]"
            >
              {isProcessing ? 'Processing...' : 'Run Autonomous Adjudication'}
            </button>
          )}
        </div>
        
        <AgentTerminal events={events} isProcessing={isProcessing} />
      </div>

      {/* Right: Summary */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-paper p-6 rounded-lg border border-rule h-full shadow-sm flex flex-col">
          <div className="flex justify-between items-start border-b border-rule pb-4 mb-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft">Decision Summary</h2>
            <div className="flex flex-col items-end gap-2">
              <StatusStamp status={claim.status} />
              {(claim.status === 'APPROVED' || claim.status === 'PARTIAL' || claim.status === 'DENIED') && (
                <button onClick={() => window.print()} className="text-[10px] uppercase tracking-widest font-mono text-pine hover:underline">
                  ↓ Download EOB (PDF)
                </button>
              )}
            </div>
          </div>

          <div className="text-center mb-8 relative group">
            <div className="text-ink-soft text-sm mb-1">Approved Payout</div>
            <div className="font-serif text-5xl text-pine-deep tracking-tight flex items-center justify-center gap-2">
              {formatCurrency(claim.approved_amount)}
            </div>
            {(claim.status === 'APPROVED' || claim.status === 'PARTIAL' || claim.status === 'DENIED') && (
              <button 
                onClick={async () => {
                  const newAmount = prompt('Enter manual override payout amount:', claim.approved_amount);
                  if (newAmount && !isNaN(Number(newAmount))) {
                    try {
                      const updated = await fetchApi(`/api/claims/${claim.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ approved_amount: Number(newAmount), status: 'PARTIAL' })
                      });
                      setClaim(updated);
                      toast.success('Payout manually overridden and saved');
                    } catch (err: any) {
                      toast.error('Failed to override: ' + err.message);
                    }
                  }
                }}
                className="opacity-0 group-hover:opacity-100 absolute -right-2 top-0 bg-bone border border-rule px-2 py-1 text-[10px] font-mono text-ink-soft rounded hover:text-pine transition-all"
              >
                OVERRIDE
              </button>
            )}
          </div>

          <div className="flex-1">
            {claim.payout_breakdown && (
              <PayoutWaterfall breakdown={claim.payout_breakdown} />
            )}
            
            {claim.payout_breakdown?.status === 'DENIED' && (
              <div className="mt-8 p-4 bg-vermilion/10 text-vermilion rounded border border-vermilion/20 text-sm">
                <div className="font-bold mb-1">Claim Denied</div>
                {claim.ai_reasoning_log?.filter((e: any) => e.data?.message?.includes('DENIED')).map((e: any, i: number) => (
                  <div key={i}>{e.data.message}</div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/claims/new')}
            className="w-full mt-6 bg-bone hover:bg-pine/5 border border-rule text-pine-deep rounded px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors shadow-sm"
          >
            Process Next Claim →
          </button>
        </div>
      </div>
    </div>
  );
}
