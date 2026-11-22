// Tiny i18n: t("key") returns the text in the current language (hi or en). Missing keys fall back to English, then the key.
const D = {
  hi: {
    nav_tools: "टूल्स", magic_link: "ईमेल लिंक से लॉगिन", app_name: "तूलिका", tagline: "आपका अपना रचनात्मक ऐप सूट",
    nav_home: "होम", nav_projects: "प्रोजेक्ट", nav_templates: "टेम्पलेट", nav_brand: "ब्रांड किट", nav_downloads: "डाउनलोड", nav_settings: "सेटिंग", nav_admin: "यूज़र और मंज़ूरी", nav_link: "डिवाइस जोड़ें",
    hello: "नमस्ते", hello_sub: "आज क्या बनाना है?", new_project: "नया प्रोजेक्ट", create: "बनाएँ", cancel: "रद्द करें", save: "सेव करें", delete: "हटाएँ", rename: "नाम बदलें", open_app: "ऐप खोलें", download: "डाउनलोड", upload: "फ़ाइल अपलोड", duplicate: "कॉपी बनाएँ",
    recent: "हाल के प्रोजेक्ट", all_projects: "सभी प्रोजेक्ट", see_all: "सब देखें", apps: "ऐप", search_ph: "प्रोजेक्ट खोजें…  ( / )", sort_updated: "हाल में बदले", sort_name: "नाम", sort_size: "साइज़", sort_created: "बनाए गए",
    all: "सभी", favorites: "पसंदीदा", empty_projects: "अभी कोई प्रोजेक्ट नहीं है", empty_projects_sub: "ऊपर 'नया प्रोजेक्ट' दबाइए, या कोई फ़ाइल यहाँ खींचकर छोड़िए।", empty_search: "इस खोज में कुछ नहीं मिला",
    project_name: "प्रोजेक्ट का नाम", choose_app: "कौन सा ऐप?", choose_size: "साइज़ / टेम्पलेट", blank: "खाली (कस्टम)", untitled: "बिना नाम",
    storage: "स्टोरेज", storage_used: "इस्तेमाल", web_app: "वेब", desktop_app: "डेस्कटॉप", soon: "जल्द", open_web: "ब्राउज़र में खोलें", get_desktop: "डेस्कटॉप ऐप",
    app_vector: "वेक्टर चित्र, लोगो, प्रिंट डिज़ाइन", app_photo: "फोटो एडिटिंग, लेयर, मास्क, PSD", app_pdf: "PDF पढ़ना, एडिट, साइन, OCR", app_film: "वीडियो एडिटिंग (डेस्कटॉप)",
    templates_title: "टेम्पलेट और साइज़", templates_sub: "सही साइज़ के साथ प्रोजेक्ट शुरू कीजिए", cat_social: "सोशल मीडिया", cat_print: "प्रिंट", cat_business: "बिज़नेस", cat_india: "भारतीय ज़रूरतें", cat_video: "वीडियो",
    brand_title: "ब्रांड किट", brand_sub: "रंग और फ़ॉन्ट एक जगह रखिए, हर ऐप में वही इस्तेमाल कीजिए", new_kit: "नई किट", kit_name: "किट का नाम", colors: "रंग", fonts: "फ़ॉन्ट", add_color: "रंग जोड़ें", copy: "कॉपी", copied: "कॉपी हो गया", export_css: "CSS निर्यात", export_json: "JSON निर्यात",
    palette_gen: "पैलेट बनाएँ", base_color: "मूल रंग", harmony: "मेल", h_analogous: "पास के रंग", h_complement: "विपरीत", h_triad: "तिकड़ी", h_shades: "हल्का-गहरा", from_image: "फ़ोटो से रंग निकालें", pick_image: "फ़ोटो चुनिए", use_palette: "किट में जोड़ें",
    downloads_title: "डेस्कटॉप ऐप डाउनलोड", downloads_sub: "Windows, Mac और Linux के लिए तेज़ नेटिव ऐप", recommended: "आपके सिस्टम के लिए", all_releases: "सभी वर्ज़न (GitHub)", build_source: "सोर्स से बनाएँ", install_pwa: "यह डैशबोर्ड इंस्टॉल करें", pwa_hint: "फ़ोन या PC पर ऐप की तरह खुलेगा, कुछ हिस्सा ऑफ़लाइन भी चलेगा।",
    settings_title: "सेटिंग", language: "भाषा", theme: "थीम", theme_system: "सिस्टम", theme_light: "लाइट", theme_dark: "डार्क", account: "खाता", signed_in_as: "लॉगिन:", sign_out: "बाहर निकलें", export_data: "मेरा डेटा निर्यात", reset_demo: "डेमो डेटा मिटाएँ", shortcuts: "कीबोर्ड शॉर्टकट", about: "के बारे में",
    mode_demo: "डेमो मोड: डेटा सिर्फ़ इसी ब्राउज़र में रहेगा", mode_cloud: "क्लाउड: Supabase से जुड़ा",
    login_title: "लॉगिन करें", email: "ईमेल", password: "पासवर्ड", sign_in: "लॉगिन", sign_up: "नया खाता", forgot: "पासवर्ड भूल गए?", magic: "ईमेल लिंक से लॉगिन", check_email: "अपना ईमेल देखिए", reset_sent: "रीसेट लिंक भेज दिया गया", signup_done: "खाता बन गया। ईमेल की पुष्टि करें (अगर चालू है)।", try_demo: "बिना लॉगिन आज़माएँ (डेमो)",
    deleted: "हटा दिया", created: "बन गया", saved: "सेव हो गया", uploaded: "अपलोड हो गया", error: "कुछ गड़बड़ हुई", confirm_delete: "क्या आप इसे हमेशा के लिए हटाना चाहते हैं?", too_big_demo: "डेमो मोड में 1.5 MB तक की फ़ाइल रख सकते हैं", offline: "ऑफ़लाइन", updated: "अपडेट", size: "साइज़", app: "ऐप",
    drop_here: "फ़ाइल यहाँ छोड़िए", unknown_type: "यह फ़ाइल किस ऐप की है, पहचान नहीं पाया", help_keys: "/ खोज · n नया · g फिर h/p/t/b/d/s पेज · ? मदद",
    whats_new: "नया क्या है", tip1: "फ़ाइल को सीधे इस पेज पर खींचकर छोड़ दीजिए, प्रोजेक्ट अपने आप बन जाएगा।", tip2: "ब्रांड किट में फ़ोटो से रंग निकाल सकते हैं।", tip3: "टेम्पलेट में फ्लेक्स, विज़िटिंग कार्ड और शोक पत्र के साइज़ मिलेंगे।",
  },
  en: {
    nav_tools: "Tools", magic_link: "Email me a login link", app_name: "Tulika", tagline: "Your own creative app suite",
    nav_home: "Home", nav_projects: "Projects", nav_templates: "Templates", nav_brand: "Brand kits", nav_downloads: "Downloads", nav_settings: "Settings", nav_admin: "Users & approval", nav_link: "Link a device",
    hello: "Hello", hello_sub: "What will you create today?", new_project: "New project", create: "Create", cancel: "Cancel", save: "Save", delete: "Delete", rename: "Rename", open_app: "Open app", download: "Download", upload: "Upload file", duplicate: "Duplicate",
    recent: "Recent projects", all_projects: "All projects", see_all: "See all", apps: "Apps", search_ph: "Search projects…  ( / )", sort_updated: "Recently updated", sort_name: "Name", sort_size: "Size", sort_created: "Created",
    all: "All", favorites: "Favorites", empty_projects: "No projects yet", empty_projects_sub: "Press “New project”, or drag a file onto this page.", empty_search: "Nothing matches this search",
    project_name: "Project name", choose_app: "Which app?", choose_size: "Size / template", blank: "Blank (custom)", untitled: "Untitled",
    storage: "Storage", storage_used: "used", web_app: "Web", desktop_app: "Desktop", soon: "Soon", open_web: "Open in browser", get_desktop: "Desktop app",
    app_vector: "Vector art, logos, print design", app_photo: "Photo editing, layers, masks, PSD", app_pdf: "Read, edit, sign and OCR PDFs", app_film: "Video editing (desktop)",
    templates_title: "Templates & sizes", templates_sub: "Start a project at exactly the right size", cat_social: "Social media", cat_print: "Print", cat_business: "Business", cat_india: "India essentials", cat_video: "Video",
    brand_title: "Brand kits", brand_sub: "Keep colours and fonts in one place and reuse them in every app", new_kit: "New kit", kit_name: "Kit name", colors: "Colours", fonts: "Fonts", add_color: "Add colour", copy: "Copy", copied: "Copied", export_css: "Export CSS", export_json: "Export JSON",
    palette_gen: "Palette generator", base_color: "Base colour", harmony: "Harmony", h_analogous: "Analogous", h_complement: "Complementary", h_triad: "Triad", h_shades: "Shades", from_image: "Pick colours from a photo", pick_image: "Choose photo", use_palette: "Add to kit",
    downloads_title: "Desktop app downloads", downloads_sub: "Fast native apps for Windows, Mac and Linux", recommended: "For your system", all_releases: "All releases (GitHub)", build_source: "Build from source", install_pwa: "Install this dashboard", pwa_hint: "Opens like an app on phone or PC, and partly works offline.",
    settings_title: "Settings", language: "Language", theme: "Theme", theme_system: "System", theme_light: "Light", theme_dark: "Dark", account: "Account", signed_in_as: "Signed in as", sign_out: "Sign out", export_data: "Export my data", reset_demo: "Erase demo data", shortcuts: "Keyboard shortcuts", about: "About",
    mode_demo: "Demo mode: data stays in this browser only", mode_cloud: "Cloud: connected to Supabase",
    login_title: "Sign in", email: "Email", password: "Password", sign_in: "Sign in", sign_up: "Create account", forgot: "Forgot password?", magic: "Email me a login link", check_email: "Check your email", reset_sent: "Reset link sent", signup_done: "Account created. Confirm your email if required.", try_demo: "Try without signing in (demo)",
    deleted: "Deleted", created: "Created", saved: "Saved", uploaded: "Uploaded", error: "Something went wrong", confirm_delete: "Delete this permanently?", too_big_demo: "Demo mode keeps files up to 1.5 MB", offline: "Offline", updated: "Updated", size: "Size", app: "App",
    drop_here: "Drop file here", unknown_type: "Could not tell which app this file belongs to", help_keys: "/ search · n new · g then h/p/t/b/d/s pages · ? help",
    whats_new: "What's new", tip1: "Drag a file onto this page and a project is created for it.", tip2: "Brand kits can pull colours from a photo.", tip3: "Templates include flex banner, visiting card and condolence-letter sizes.",
  },
};
let lang = "hi";
try { lang = localStorage.getItem("tulika-lang") || "hi"; } catch { /* storage blocked */ }
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem("tulika-lang", l); } catch {} document.documentElement.lang = l; }
export const t = (k) => D[lang]?.[k] ?? D.en[k] ?? k;
export const dateFmt = (iso) => new Date(iso).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
export function bytes(n) { if (!n) return "0 B"; const u = ["B", "KB", "MB", "GB"]; const i = Math.min(3, Math.floor(Math.log(n) / Math.log(1024))); return (n / 1024 ** i).toFixed(i ? 1 : 0) + " " + u[i]; }
