// Supabase Edge Function: Gemini text helper for Tulika. The API key stays here (secret), never in the browser.
// Deploy: supabase functions deploy ai-text   |   Secret: supabase secrets set GEMINI_API_KEY=...  (optional GEMINI_MODEL, default gemini-flash-latest)
// verify_jwt is ON (default): only signed-in Tulika users can call it.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const TASKS: Record<string, string> = {
  greeting: "You write short, warm, original Hindi (Devanagari) greeting messages for posters and WhatsApp. Reply with 3 distinct options, one per line, no numbering, no quotes, each under 120 characters.",
  caption: "You write catchy social-media captions in Hindi (Devanagari) with 2-3 relevant hashtags. Reply with 3 distinct options, one per line, no numbering.",
  fixocr: "You fix OCR mistakes in Hindi/English text. Keep the meaning and line structure; correct only obvious recognition errors. Reply with the corrected text only.",
  translate: "You translate between Hindi (Devanagari) and English. If the input is Hindi, output English; otherwise output Hindi. Reply with the translation only.",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const key = Deno.env.get("GEMINI_API_KEY"); if (!key) return json({ error: "not_configured" }, 503);
  let body: { task?: string; prompt?: string }; try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const sys = TASKS[body.task || ""]; const prompt = (body.prompt || "").toString().slice(0, 4000);
  if (!sys || !prompt.trim()) return json({ error: "bad_request" }, 400);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  if (!r.ok) return json({ error: "upstream", status: r.status }, 502);
  const j = await r.json(); const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
  return json({ text });
});
