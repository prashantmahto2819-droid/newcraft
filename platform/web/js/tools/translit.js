// Roman -> Devanagari phonetic typing (own rule set, ITRANS-like). Typing "namaste" gives नमस्ते.
// Vowels: a aa/A i ii/ee/I u uu/oo/U e ai o au · Consonants: k kh g gh c ch chh j jh T Th D Dh N t th d dh n p ph b bh m y r l v w s sh Sh h · q z f · R Rh (ड़ ढ़) · gy/jn (ज्ञ)
// Like ITRANS, an unwritten 'a' between consonants makes a conjunct: kya = क्या, but write the a to keep them apart: shubhakaamanaa = शुभकामना. RRi = ऋ.
// M = ं, MM = ँ, H = ः, | = ।, {text} stays as typed.
const MATRA = { RRi: "ृ", aa: "ा", A: "ा", ai: "ै", au: "ौ", ee: "ी", ii: "ी", I: "ी", oo: "ू", uu: "ू", U: "ू", a: "", i: "ि", u: "ु", e: "े", o: "ो" };
const INDEP = { RRi: "ऋ", aa: "आ", A: "आ", ai: "ऐ", au: "औ", ee: "ई", ii: "ई", I: "ई", oo: "ऊ", uu: "ऊ", U: "ऊ", a: "अ", i: "इ", u: "उ", e: "ए", o: "ओ" };
const CONS = { chh: "छ", kh: "ख", gh: "घ", ch: "च", jh: "झ", Th: "ठ", Dh: "ढ", th: "थ", dh: "ध", ph: "फ", bh: "भ", sh: "श", Sh: "ष", Rh: "ढ़", gy: "ज्ञ", jn: "ज्ञ", k: "क", g: "ग", c: "च", j: "ज", T: "ट", D: "ड", N: "ण", t: "त", d: "द", n: "न", p: "प", f: "फ़", b: "ब", m: "म", y: "य", r: "र", l: "ल", v: "व", w: "व", s: "स", h: "ह", q: "क़", z: "ज़", R: "ड़", L: "ळ", x: "क्स" };
const sortKeys = (o) => Object.keys(o).sort((a, b) => b.length - a.length);
const VK = sortKeys(MATRA), CK = sortKeys(CONS), DIG = "०१२३४५६७८९";
export function romanToDevanagari(src, { digits = false } = {}) {
  let out = "", pending = false, i = 0;
  while (i < src.length) {
    if (src[i] === "{") { const j = src.indexOf("}", i); if (j > i) { out += src.slice(i + 1, j); i = j + 1; pending = false; continue; } }
    if (src.startsWith("MM", i)) { out += "ँ"; i += 2; pending = false; continue; }
    if (src[i] === "M") { out += "ं"; i++; pending = false; continue; }
    if (src[i] === "H") { out += "ः"; i++; pending = false; continue; }
    if (src[i] === "|") { out += "।"; i++; pending = false; continue; }
    const v = VK.find((k) => src.startsWith(k, i));
    if (v) { out += pending ? MATRA[v] : INDEP[v]; pending = false; i += v.length; continue; }
    const c = CK.find((k) => src.startsWith(k, i));
    if (c) { out += (pending ? "्" : "") + CONS[c]; pending = true; i += c.length; continue; }
    const ch = src[i++]; out += digits && /[0-9]/.test(ch) ? DIG[+ch] : ch; pending = false;
  }
  return out;
}
