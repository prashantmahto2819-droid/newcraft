// Kruti Dev 010 -> Unicode Devanagari (beta). Table-driven, longest match first; then reorder the i-matra and reph.
const T = {
  "vks": "ओ", "vkS": "औ", "vk": "आ", "bZ": "ई", "b": "इ", "m": "उ", "Å": "ऊ", ",s": "ऐ", ",": "ए", "v": "अ", "_": "ऋ",
  "ks": "ो", "kS": "ौ", "k": "ा", "h": "ी", "q": "ु", "w": "ू", "`": "ृ", "s": "े", "S": "ै", "a": "ं", "¡": "ँ", "%": "ः", "~": "्",
  "[k": "ख", "?k": "घ", ".k": "ण", "Fk": "थ", "/k": "ध", "Hk": "भ", "'k": "श", '"k': "ष",
  "d": "क", "x": "ग", "p": "च", "N": "छ", "t": "ज", ">": "झ", "¥": "ञ", "V": "ट", "B": "ठ", "M": "ड", "<": "ढ", "r": "त", "n": "द", "u": "न", "i": "प", "Q": "फ", "c": "ब", "e": "म", ";": "य", "j": "र", "y": "ल", "o": "व", "l": "स", "g": "ह",
  "D": "क्", "[": "ख्", "X": "ग्", "?": "घ्", "P": "च्", "T": "ज्", "U": "न्", "I": "प्", "C": "ब्", "H": "भ्", "E": "म्", "L": "स्", "Y": "ल्", "O": "व्", "F": "थ्", "R": "त्", "/": "ध्", "'": "श्", '"': "ष्",
  "K": "ज्ञ", "{": "क्ष", "=": "त्र", "J": "श्र", "A": "।", "f": "", "Z": "",
};
const DIG = "०१२३४५६७८९";
const KEYS = Object.keys(T).sort((a, b) => b.length - a.length);
const C = "[क-ह]";
export function krutiToUnicode(src) {
  let out = "", i = 0;
  outer: while (i < src.length) {
    for (const k of KEYS) if (src.startsWith(k, i)) { out += T[k]; i += k.length; continue outer; }
    const ch = src[i++]; out += /[0-9]/.test(ch) ? DIG[+ch] : ch;
  }
  // i-matra: written before the cluster in Kruti, must follow it in Unicode
  out = out.replace(new RegExp(`\\uE000((?:${C}\\u094D)*${C})`, "g"), "$1ि").replace(//g, "ि");
  // reph: Z follows the matra of the consonant it sits on
  out = out.replace(new RegExp(`(${C})([ािीुूृेैोौ]*[ंँ]?)\\uE001`, "g"), "र्$1$2").replace(//g, "र्");
  return out;
}
