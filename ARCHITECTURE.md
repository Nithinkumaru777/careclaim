# CareClaim AI Architecture

## 1. System Components

```mermaid
flowchart TD
    UI[Frontend (React/Vite)] --> |POST /process| Auth[Auth Middleware]
    Auth --> |User-Scoped Client| DB[(Supabase)]
    Auth --> Pipeline[Adjudication Pipeline]
    
    Pipeline --> Intake[1. Intake Check]
    Intake --> PolicyMatch[2. Policy Match]
    PolicyMatch --> AI[3. AI Reasoning]
    AI --> |Prompt + Bill Data| Gemini[Google Gen AI]
    Gemini --> |Structured JSON| AI
    AI --> Verify[4. Deterministic Verifier]
    Verify --> Decision[5. Decision Commit]
    Decision --> DB
    
    UI -.-> |SSE Stream| Pipeline
```

## 2. Key Design Decisions

1. **Hybrid Deterministic / Generative Adjudication**
   - **Why:** LLMs are excellent at interpreting messy textual hospital bills against complex rule definitions, but they are notoriously unreliable at arithmetic across large bills.
   - **How:** Gemini determines exactly two things: (1) Is this specific line item `COVERED` or `EXCLUDED`, and (2) Does it flag any anomalies (e.g., duplicates)? The deterministic `payoutEngine` consumes these flags to calculate eligible amounts, apply copays, and enforce limits.

2. **Server-Sent Events (SSE) Streaming**
   - **Why:** Adjudication can take 5-15 seconds. Standard polling is inefficient and fake loading spinners erode trust. 
   - **How:** The backend streams events (`stage_start`, `log`, `result`) as they happen. In production, this can be extended to incrementally parse the LLM's `chain_of_thought` to stream reasoning lines as they generate.

3. **User-Scoped Database Clients**
   - **Why:** Backend API routes should not have god-mode access to the database just because they execute server-side.
   - **How:** The backend validates the user's JWT from the `Authorization` header and instantiates a Supabase client configured with that JWT. This ensures Row-Level Security (RLS) is respected in every database query exactly as if the frontend made the call directly.

4. **Zero-Trust Input & Resiliency**
   - Bills pasted by hospitals are treated as untrusted text. The prompt strictly wraps them in `<bill_data>` tags with instructions to ignore embedded directives.
   - For demo fallback, if `DEMO_MODE=true` or no API key is provided, the backend hot-swaps to a keyword-based `mockAdjudicator`, enabling graceful degradation for demonstrations.
