// "Link a device": a Tulika desktop app shows a short code and opens this page (#/link?code=XXXX). The signed-in,
// approved user confirms here; the app then starts without ever asking for a password.
import { h, toast } from "../ui.js";
import { getLang } from "../i18n.js";

const L = (hi, en) => (getLang() === "hi" ? hi : en);
const REASONS = {
  not_found: ["यह कोड नहीं मिला या 30 मिनट से पुराना है। ऐप दोबारा खोलकर नया कोड लीजिए।", "This code was not found or is older than 30 minutes. Open the app again for a new code."],
  device_limit: ["इस खाते की डिवाइस सीमा पूरी हो चुकी है। सेटिंग से कोई पुराना डिवाइस हटाइए या एडमिन से सीमा बढ़वाइए।", "This account has reached its device limit. Remove an old device or ask the admin for more."],
  pending: ["खाता अभी मंज़ूर नहीं हुआ है।", "The account is not approved yet."], blocked: ["यह खाता रोका गया है।", "This account is blocked."], expired: ["प्लान की अवधि पूरी हो गई है।", "The plan has ended."],
};

export async function render(ctx) {
  const q = new URLSearchParams((location.hash.split("?")[1] || ""));
  const code = h("input", { id: "linkcode", value: (q.get("code") || "").toUpperCase(), maxlength: 12, style: { textTransform: "uppercase", letterSpacing: "3px", fontSize: "22px", textAlign: "center" }, "aria-label": L("कोड", "Code") });
  const out = h("p", { id: "linkout", style: { minHeight: "24px" } });
  const say = (r) => { out.textContent = r.ok ? L(`हो गया। "${r.name || "डिवाइस"}" जुड़ गया; अब ऐप में OK दबाइए।`, `Done. "${r.name || "Device"}" is linked; now press OK in the app.`) : L(...(REASONS[r.reason] || ["नहीं हो सका।", "Could not do that."])); };
  const go = async () => { try { say(await ctx.store.linkDevice(code.value.trim())); } catch (e) { toast((e && e.message) || "error", "err"); } };
  return h("div.view", h("div.page-head", h("h1", L("डिवाइस जोड़ें", "Link a device"))),
    h("div.card", { style: { maxWidth: "460px", display: "flex", flexDirection: "column", gap: "12px" } },
      h("p", L("Tulika के डेस्कटॉप ऐप में दिख रहा कोड यहाँ लिखिए। जोड़ने के बाद वह कंप्यूटर इसी खाते से चलेगा।", "Enter the code shown in the Tulika desktop app. After linking, that computer runs under this account.")),
      code, h("button.primary", { onclick: go }, L("यह डिवाइस जोड़ें", "Link this device")), out));
}
