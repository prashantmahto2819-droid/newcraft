# AI (Gemini) in Tulika
* Browser never holds the key. `platform/supabase/functions/ai-text/index.ts` (Supabase Edge Function) calls Gemini with the secret `GEMINI_API_KEY`; the dashboard calls it via `store.aiText(task, prompt)` (`js/store.js`), UI in `js/views/tools_ai.js`.
* Tasks: greeting, caption, fixocr, translate. Model defaults to the `gemini-flash-latest` alias (override with secret `GEMINI_MODEL`).
* Setup (user): key at https://aistudio.google.com/apikey -> Supabase dashboard > Edge Functions > create `ai-text`, paste the file, keep "Verify JWT" ON -> Edge Functions > Secrets > add `GEMINI_API_KEY`.
* Status: written, NOT tested against the real Gemini API (no network in the authoring sandbox); the dashboard side is tested with a mocked function. Free-tier rate limits apply; add per-user limits before opening to the public.
