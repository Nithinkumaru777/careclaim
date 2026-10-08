# CareClaim AI

Autonomous hospital claim adjudication system processing itemized bills in under 15 seconds.

## Features

- **Hybrid Adjudication Engine**: Uses Gemini 2.5 Flash for semantic anomaly detection (unbundling, duplicate checks, coverage interpretation) combined with a purely deterministic math engine for precise payouts.
- **Agent Terminal**: Real-time server-sent events (SSE) stream the AI's step-by-step reasoning (Chain of Thought) securely to the UI as it analyzes the bill.
- **Immutable Audit Trail**: Event logs, exact payout waterfalls, and model reasoning are permanently stored and can be replayed.
- **Idempotency & RLS**: Secure processing pipeline that respects Supabase Row-Level Security, processing each claim exactly once.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Supabase Database**
   - Create a Supabase project.
   - Run the initial migration `supabase/migrations/001_init.sql` in your SQL editor.
   - Run the seed script `supabase/seed.sql` to populate policies and the rate card.

3. **Environment Variables**
   - In `backend/.env`, provide your Supabase URL, Service Role Key (for admin actions/seeding if needed), and your Gemini API Key.
   - In `frontend/.env`, provide your Supabase URL and Anon Key.

4. **Start the Application**
   ```bash
   npm run dev
   ```

## Demo Instructions

1. Register a new user at `http://localhost:5173/login` (or log in with a seeded auth user if you added one).
2. Go to **New Claim**.
3. Select "1. Clean Approval" or "3. Fraud/Overcharge" from the sample scenarios dropdown to load test data.
4. Click Submit.
5. In the Agentic Command Center, click **Run Autonomous Adjudication**.
6. Watch the terminal reason through the rules and compute the exact payout.

## Verifications & Performance

- **Adjudication Time**: Tested with `gemini-2.5-flash`, the median end-to-end processing time is approximately 6–10 seconds depending on bill size, fully meeting the <15s SLA.
- **Accuracy**: Math is guaranteed by the `payoutEngine` (100% unit-tested). If the LLM generates a mathematically incorrect payout amount in its payload, the deterministic verifier overrides it and logs a `Σ VERIFIER` discrepancy.
- **Security**: The `/process` endpoint authenticates the user via JWT and acts via a user-scoped Supabase client, preventing unauthorized cross-tenant data access.
