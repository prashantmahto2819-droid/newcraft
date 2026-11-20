import { h, icon, toast } from "../ui.js";
import { L, field, note, sel } from "./tools_img.js";

const TASKS = [["greeting", L("शुभकामना संदेश लिखिए", "Write greeting messages")], ["caption", L("सोशल मीडिया कैप्शन", "Social media captions")], ["fixocr", L("OCR टेक्स्ट की गलतियाँ ठीक कीजिए", "Fix OCR mistakes")], ["translate", L("हिंदी ↔ English अनुवाद", "Hindi ↔ English translate")]];
const HINT = { greeting: "जैसे: दादाजी के 80वें जन्मदिन के लिए", caption: "जैसे: नई दुकान का उद्घाटन, शनिवार सुबह 10 बजे", fixocr: "OCR से निकला टेक्स्ट यहाँ चिपकाइए", translate: "जो अनुवाद करना है वह लिखिए" };
export const aiError = (e) => (e?.message === "ai_needs_cloud" ? L("AI के लिए क्लाउड मोड (साइन-इन) चाहिए", "AI needs cloud mode (sign in)") : e?.message === "not_configured" ? L("AI अभी चालू नहीं है (GEMINI_API_KEY secret जोड़ना बाक़ी है)", "AI is not set up yet (GEMINI_API_KEY secret missing)") : L("AI जवाब नहीं दे सका, थोड़ी देर बाद कोशिश कीजिए", "AI could not answer, try again shortly"));

export function aiTool() {
  let task = "greeting"; const inp = h("textarea", { rows: 4, placeholder: HINT.greeting }), out = h("div.rows"), go = h("button.primary", icon("wand", 16), L("लिखिए", "Generate"));
  const show = (text) => { out.textContent = ""; const lines = task === "fixocr" || task === "translate" ? [text] : text.split("\n").map((l) => l.trim()).filter(Boolean); lines.forEach((l) => out.append(h("div.row", h("div.grow", h("span", { style: { whiteSpace: "pre-wrap" } }, l)), h("button.icon-btn", { "aria-label": "copy", onclick: async () => { try { await navigator.clipboard.writeText(l); toast(L("कॉपी हो गया", "Copied")); } catch { toast(L("कॉपी नहीं हुआ", "Copy failed"), "err"); } } }, icon("copy", 16))))); };
  go.onclick = async () => {
    const store = window.TULIKA_STORE; if (!inp.value.trim()) return toast(L("पहले कुछ लिखिए", "Write something first"), "err"); go.disabled = true;
    try { show(await store.aiText(task, inp.value)); } catch (e) { console.error(e); toast(aiError(e), "err"); } finally { go.disabled = false; }
  };
  return h("div.form", note(L("Google Gemini से हिंदी में लिखवाइए। चाबी (API key) सर्वर पर सुरक्षित रहती है, ब्राउज़र में नहीं। साइन-इन ज़रूरी है।", "Write Hindi text with Google Gemini. The API key stays on the server, never in the browser. Sign-in required.")),
    field(L("काम", "Task"), sel(TASKS, task, (v) => { task = v; inp.placeholder = HINT[v]; })), field(L("आपका संदेश", "Your input"), inp), go, out);
}
