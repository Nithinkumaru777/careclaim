# CareClaim AI Frontend Integration Prompt

> **Instructions for Claude Code / Google Antigravity:**
> Read this prompt carefully. You are tasked with connecting this fully-built React/Vite frontend to an existing backend built by another teammate.

## 1. Context & Setup
- The frontend is located in the `frontend` directory (unzipped from `frontend_ui.zip`).
- It uses React 19, Vite, Tailwind v4, React Router 7, and `motion/react` for animations.
- Start by installing dependencies in the frontend: `npm install` inside the frontend directory.
- Boot the frontend using `npm run dev` to verify it compiles.

## 2. Environment Configuration
The frontend relies on the following environment variables in `.env`:
```env
VITE_SUPABASE_URL=<YOUR_SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_API_BASE_URL=<THE_TEAMMATE_BACKEND_URL>
```
**Task:** Update `VITE_API_BASE_URL` to point to the teammate's backend port (e.g., `http://localhost:5000` or wherever it's running).

## 3. Auth & API Helper Alignment
- The frontend currently uses Supabase Auth via `src/lib/supabase.ts` and attaches the Supabase JWT token to requests in `src/lib/api.ts`.
- **Task:** Verify with the teammate's backend how authentication is handled. If the backend expects a different token structure or cookie-based auth, modify `src/lib/api.ts` `getAuthHeaders()` accordingly.

## 4. Endpoints to Wire Up
The UI components make the following API calls. Review the teammate's backend and remap these routes or modify the frontend's `fetchApi` calls to match the backend's exact route structures and expected payloads.

1. **Dashboard Stats** (`src/pages/Dashboard.tsx`)
   - Current Call: `GET /api/stats`
   - Expected Response: `{ total_claims, approval_rate, total_payout, avg_processing_ms }`
2. **List Claims** (`src/pages/Dashboard.tsx`)
   - Current Call: `GET /api/claims`
   - Expected Response: Array of claim objects `[{ id, created_at, patient_id, total_billed, approved_amount, status }, ...]`
3. **Policy Lookup** (`src/pages/NewClaim.tsx`)
   - Current Call: `GET /api/policies/lookup?number=<POLICY_NUMBER>`
   - Expected Response: Policy details object.
4. **Submit Claim** (`src/pages/NewClaim.tsx`)
   - Current Call: `POST /api/claims`
   - Payload: `{ patient_id, policy_number, diagnosis_code, raw_bill_data, total_billed }`
5. **Get Single Claim** (`src/pages/ClaimView.tsx`)
   - Current Call: `GET /api/claims/:id`
   - Expected Response: Claim object with joined policy details and the `ai_reasoning_log` (if processed).

## 5. Adjudication Streaming (CRITICAL)
The core feature of the UI is the Agent Terminal (`src/pages/ClaimView.tsx`), which consumes Server-Sent Events (SSE) during processing.
- Current Call: `POST /api/claims/:id/process` via `@microsoft/fetch-event-source`.
- Expected SSE Events:
  - `event: stage_start` (UI logs it silently or adds loading states)
  - `event: log`, `data: { message: "Terminal line to display" }` (UI prints this to the green terminal)
  - `event: result`, `data: { ...updatedClaim }` (UI finishes processing and updates the view)
  - `event: error`, `data: { message: "Error msg" }` (UI stops processing and shows a toast)

**Task:** Audit the teammate's `/process` endpoint. Ensure it streams SSE with exact `event:` and `data:` formatting that matches the listener in `src/pages/ClaimView.tsx`. Adjust the frontend `onmessage` handler if the backend emits different event names.

## 6. Execution Gate
Before claiming the task is complete:
1. Both the backend and this frontend must boot without errors.
2. The user must be able to log in, submit a test claim, and click "Run Autonomous Adjudication".
3. The Agent Terminal must successfully stream reasoning logs from the backend and show the final payout waterfall. 
4. Ensure no CORS errors are blocking the connection.
