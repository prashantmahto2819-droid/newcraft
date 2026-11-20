// Amount in words: Indian numbering (lakh / crore), English and Hindi.
const EN1 = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"], EN10 = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const HI = ["", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चौवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ", "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर", "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उनासी", "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी", "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे"];
const en2 = (n) => (n < 20 ? EN1[n] : EN10[(n / 10) | 0] + (n % 10 ? " " + EN1[n % 10] : ""));
const en3 = (n) => (n >= 100 ? EN1[(n / 100) | 0] + " Hundred" + (n % 100 ? " " + en2(n % 100) : "") : en2(n));
function split(n) { return [Math.floor(n / 1e7), Math.floor((n % 1e7) / 1e5), Math.floor((n % 1e5) / 1e3), n % 1e3]; }
export function inWordsEn(n) {
  if (n === 0) return "Zero"; const [cr, la, th, rest] = split(n), p = [];
  if (cr) p.push(inWordsEn(cr) + " Crore"); if (la) p.push(en2(la) + " Lakh"); if (th) p.push(en2(th) + " Thousand"); if (rest) p.push(en3(rest)); return p.join(" ");
}
export function inWordsHi(n) {
  if (n === 0) return "शून्य"; const [cr, la, th, rest] = split(n), p = [];
  if (cr) p.push(inWordsHi(cr) + " करोड़"); if (la) p.push(HI[la] + " लाख"); if (th) p.push(HI[th] + " हज़ार");
  if (rest) { const h = (rest / 100) | 0, r = rest % 100; p.push((h ? HI[h] + " सौ" : "") + (h && r ? " " : "") + (r ? HI[r] : "")); } return p.join(" ");
}
// value: string like "123456.50"; returns {en, hi} or null
export function rupeesInWords(value) {
  const m = /^\s*(\d{1,12})(?:\.(\d{1,2}))?\s*$/.exec(String(value).replace(/,/g, "")); if (!m) return null;
  const r = +m[1], p = m[2] ? +(m[2] + "0").slice(0, 2) : 0;
  const en = inWordsEn(r) + " Rupees" + (p ? " and " + en2(p) + " Paise" : "") + " Only", hi = inWordsHi(r) + " रुपये" + (p ? " और " + HI[p] + " पैसे" : "") + " मात्र";
  return { en, hi };
}
