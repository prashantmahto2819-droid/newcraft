// Static catalogue: apps and templates. Sizes are in the unit given (px, mm, in, ft).
import { FESTIVAL_TEMPLATES } from "./designs.js";
export const APPS = {
  vector: { color: "#14b8a6", color2: "#0f766e", web: "vector/", exts: ["svg", "vectorcraft", "eps", "ai", "cdr", "dxf"], descKey: "app_vector", name: "Tulika Vector" },
  photo:  { color: "#f43f8e", color2: "#9d174d", web: "photo/",  exts: ["psd", "psb", "pcraft", "png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp"], descKey: "app_photo", name: "Tulika Photo" },
  pdf:    { color: "#f59e0b", color2: "#b45309", web: "pdf/",    exts: ["pdf"], descKey: "app_pdf", name: "Tulika PDF" },
  film:   { color: "#8b5cf6", color2: "#4c1d95", web: "film/",    exts: ["mp4", "mov", "mkv", "webm", "fcproj"], descKey: "app_film", name: "Tulika Film" },
};
export const appForFile = (name) => { const e = (name.split(".").pop() || "").toLowerCase(); return Object.keys(APPS).find((k) => APPS[k].exts.includes(e)); };

const T = (id, cat, hi, en, w, h, unit, app) => ({ id, cat, hi, en, w, h, unit, app });
export const TEMPLATES = [
  T("ig-post", "social", "इंस्टाग्राम पोस्ट", "Instagram post", 1080, 1080, "px", "photo"),
  T("ig-portrait", "social", "इंस्टाग्राम पोर्ट्रेट", "Instagram portrait", 1080, 1350, "px", "photo"),
  T("story", "social", "स्टोरी / रील / WhatsApp स्टेटस", "Story / Reel / WhatsApp status", 1080, 1920, "px", "photo"),
  T("yt-thumb", "social", "YouTube थंबनेल", "YouTube thumbnail", 1280, 720, "px", "photo"),
  T("yt-banner", "social", "YouTube चैनल बैनर", "YouTube channel banner", 2560, 1440, "px", "photo"),
  T("fb-cover", "social", "फेसबुक कवर", "Facebook cover", 820, 312, "px", "photo"),
  T("fb-post", "social", "फेसबुक पोस्ट", "Facebook post", 1200, 630, "px", "photo"),
  T("a4", "print", "A4 पेज", "A4 page", 210, 297, "mm", "vector"),
  T("a5", "print", "A5 फ्लायर", "A5 flyer", 148, 210, "mm", "vector"),
  T("a3", "print", "A3 पोस्टर", "A3 poster", 297, 420, "mm", "vector"),
  T("a2", "print", "A2 पोस्टर", "A2 poster", 420, 594, "mm", "vector"),
  T("dl", "print", "DL पैम्फलेट", "DL pamphlet", 99, 210, "mm", "vector"),
  T("card", "business", "विज़िटिंग कार्ड (भारत)", "Visiting card (India)", 90, 54, "mm", "vector"),
  T("letterhead", "business", "लेटरहेड", "Letterhead", 210, 297, "mm", "vector"),
  T("logo", "business", "लोगो (वर्गाकार)", "Logo (square)", 1000, 1000, "px", "vector"),
  T("id-card", "business", "आईडी कार्ड", "ID card", 54, 86, "mm", "vector"),
  T("envelope", "business", "लिफ़ाफ़ा (DL)", "Envelope (DL)", 220, 110, "mm", "vector"),
  T("flex-3x6", "india", "फ्लेक्स बैनर 3×6 फ़ीट", "Flex banner 3×6 ft", 6, 3, "ft", "vector"),
  T("flex-4x8", "india", "फ्लेक्स बैनर 4×8 फ़ीट", "Flex banner 4×8 ft", 8, 4, "ft", "vector"),
  T("flex-2x3", "india", "फ्लेक्स / स्टैंडी 2×3 फ़ीट", "Flex / standee 2×3 ft", 3, 2, "ft", "vector"),
  T("wedding", "india", "शादी का कार्ड 5×7 इंच", "Wedding card 5×7 in", 5, 7, "in", "vector"),
  T("shok", "india", "शोक पत्र (A5)", "Condolence letter (A5)", 148, 210, "mm", "vector"),
  T("stamp", "india", "रबर स्टैम्प / सील (40 मिमी)", "Rubber stamp / seal (40 mm)", 40, 40, "mm", "vector"),
  T("sticker", "india", "स्टिकर 4×4 इंच", "Sticker 4×4 in", 4, 4, "in", "vector"),
  ...FESTIVAL_TEMPLATES.map(([id, hi, en, w, h]) => T(id, "festival", hi, en, w, h, "px", "photo")),
  T("hd", "video", "फुल HD वीडियो", "Full HD video", 1920, 1080, "px", "film"),
  T("vertical", "video", "वर्टिकल वीडियो", "Vertical video", 1080, 1920, "px", "film"),
  T("4k", "video", "4K वीडियो", "4K video", 3840, 2160, "px", "film"),
];
export const TEMPLATE_CATS = ["festival", "social", "print", "business", "india", "video"];

export const FONTS = ["Noto Sans Devanagari", "Noto Serif Devanagari", "Mukta", "Hind", "Poppins", "Tiro Devanagari Hindi", "Yatra One", "Kalam", "Baloo 2", "Rozha One", "Laila", "Inter", "Playfair Display"];
export const RELEASES_URL = "https://github.com/prashantmahto2819-droid/newcraft/releases";
export const REPO_URL = "https://github.com/prashantmahto2819-droid/newcraft";
