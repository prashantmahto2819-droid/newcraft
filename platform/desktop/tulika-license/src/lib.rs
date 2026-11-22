//! Sign-in and device licence check for the Tulika desktop apps.
//!
//! An app calls [`ensure`] once, before it opens its window. The first time, the app gets a short code
//! from the Tulika cloud and opens the dashboard's "Link a device" page in the browser; the user, signed
//! in there (password, magic link or OTP are the dashboard's business), approves the code. From then on
//! this computer is known by a device id and a secret kept in the user's config folder, so nobody signs
//! in again on it. Every start asks the cloud whether the account is still approved and within its plan;
//! without internet the app keeps working for [`OFFLINE_DAYS`] days after the last successful check.
//!
//! Server side: `platform/supabase/migrations/0004_device_licences.sql` and `0005_desktop_device_link.sql`.

use std::collections::hash_map::RandomState;
use std::hash::{BuildHasher, Hasher};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde_json::{json, Value};

/// The Tulika cloud (public values: the same ones the website ships in `config.js`).
const SUPABASE_URL: &str = "https://xgxxgjkdtnrmitrjrzuc.supabase.co";
const ANON_KEY: &str = "sb_publishable_uTDxPFjCgS8faf9wOVpoxg_6j-Jdj7U";
/// Where the user approves a device.
const SITE: &str = "https://tulika.pages.dev/";
/// How long the app runs without reaching the cloud after its last successful check.
pub const OFFLINE_DAYS: u64 = 30;
/// A link code is good for 30 minutes on the server; ask for a new one a little earlier.
const CODE_SECS: u64 = 25 * 60;

#[derive(Default)]
struct State {
    device_id: String,
    secret: String,
    /// Unix seconds of the last check the cloud answered with "ok".
    last_ok: u64,
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// `n` random hexadecimal characters from the operating system's hash seeds and the clock.
fn random_hex(n: usize) -> String {
    let mut out = String::new();
    let mut i = 0u64;
    while out.len() < n {
        let mut h = RandomState::new().build_hasher();
        h.write_u64(i);
        h.write_u128(SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
        h.write_u32(std::process::id());
        out.push_str(&format!("{:016x}", h.finish()));
        i += 1;
    }
    out.truncate(n);
    out
}

fn config_dir() -> PathBuf {
    let var = |k: &str| std::env::var_os(k).filter(|v| !v.is_empty()).map(PathBuf::from);
    let base = if cfg!(windows) {
        var("APPDATA")
    } else if cfg!(target_os = "macos") {
        var("HOME").map(|h| h.join("Library").join("Application Support"))
    } else {
        var("XDG_CONFIG_HOME").or_else(|| var("HOME").map(|h| h.join(".config")))
    };
    base.unwrap_or_else(std::env::temp_dir).join("Tulika")
}

fn state_path() -> PathBuf {
    config_dir().join("licence.json")
}

fn load() -> State {
    let v: Value = std::fs::read_to_string(state_path()).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Null);
    let text = |k: &str| v.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    let mut st = State { device_id: text("device_id"), secret: text("secret"), last_ok: v.get("last_ok").and_then(Value::as_u64).unwrap_or(0) };
    if st.device_id.len() < 8 || st.secret.len() < 24 {
        st = State { device_id: format!("desk-{}", random_hex(24)), secret: random_hex(48), last_ok: 0 };
        save(&st);
    }
    st
}

fn save(st: &State) {
    let _ = std::fs::create_dir_all(config_dir());
    let body = json!({ "device_id": st.device_id, "secret": st.secret, "last_ok": st.last_ok });
    let _ = std::fs::write(state_path(), body.to_string());
}

/// Call a cloud function. `Err` means the cloud could not be reached (no internet, server down).
fn rpc(name: &str, args: &Value) -> Result<Value, String> {
    let agent: ureq::Agent = ureq::Agent::config_builder().timeout_global(Some(Duration::from_secs(20))).build().into();
    let url = format!("{SUPABASE_URL}/rest/v1/rpc/{name}");
    let body = args.to_string();
    let mut resp = agent.post(&url).header("apikey", ANON_KEY).header("Content-Type", "application/json").send(body.as_str()).map_err(|e| e.to_string())?;
    let text = resp.body_mut().read_to_string().map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

fn computer_name() -> String {
    let var = |k: &str| std::env::var(k).ok().filter(|v| !v.is_empty());
    var("COMPUTERNAME").or_else(|| var("HOSTNAME")).or_else(|| var("USERNAME")).or_else(|| var("USER")).unwrap_or_else(|| "Computer".into())
}

fn platform() -> &'static str {
    if cfg!(windows) {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn open_in_browser(url: &str) {
    use std::process::Command;
    let _ = if cfg!(windows) {
        Command::new("rundll32").args(["url.dll,FileProtocolHandler", url]).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(url).spawn()
    } else {
        Command::new("xdg-open").arg(url).spawn()
    };
}

/// A message with OK and Cancel; `true` for OK.
fn ask(app: &str, text: &str) -> bool {
    let r = rfd::MessageDialog::new().set_title(app).set_description(text).set_buttons(rfd::MessageButtons::OkCancel).show();
    matches!(r, rfd::MessageDialogResult::Ok | rfd::MessageDialogResult::Yes)
}

fn reason_text(reason: &str) -> &'static str {
    match reason {
        "pending" => "आपका खाता एडमिन की मंज़ूरी का इंतज़ार कर रहा है।\nYour account is waiting for admin approval.",
        "blocked" => "यह खाता रोक दिया गया है। एडमिन से संपर्क कीजिए।\nThis account has been blocked. Please contact the admin.",
        "expired" => "आपके प्लान की अवधि पूरी हो गई है।\nYour plan has ended.",
        "device_limit" => "इस खाते की डिवाइस सीमा पूरी हो चुकी है।\nThis account has reached its device limit.",
        _ => "लाइसेंस की जाँच नहीं हो सकी।\nThe licence could not be checked.",
    }
}

/// Whether this computer may run `app` (e.g. "Tulika Film"). Shows the sign-in steps when needed and
/// returns `false` when the user cancels or the account may not use the app; the caller then exits.
pub fn ensure(app: &str) -> bool {
    let mut st = load();
    // (code, when it was issued) while the user is approving this device in the browser
    let mut code: Option<(String, u64)> = None;
    loop {
        match rpc("device_check", &json!({ "p_device_id": st.device_id, "p_secret": st.secret })) {
            Ok(v) if v.get("ok").and_then(Value::as_bool) == Some(true) => {
                st.last_ok = now();
                save(&st);
                return true;
            }
            Ok(v) => {
                let reason = v.get("reason").and_then(Value::as_str).unwrap_or("");
                if reason != "not_linked" {
                    st.last_ok = 0; // the cloud said no: the offline allowance ends too
                    save(&st);
                    if !ask(app, &format!("{}\n\nOK = फिर जाँचें / check again", reason_text(reason))) {
                        return false;
                    }
                    continue;
                }
                let fresh = code.as_ref().is_some_and(|(_, at)| now().saturating_sub(*at) < CODE_SECS);
                if !fresh {
                    let started = rpc("device_link_start", &json!({ "p_device_id": st.device_id, "p_secret": st.secret, "p_name": computer_name(), "p_platform": platform() }));
                    match started.ok().and_then(|v| v.get("code").and_then(Value::as_str).map(str::to_string)) {
                        Some(c) => {
                            open_in_browser(&format!("{SITE}#/link?code={c}"));
                            code = Some((c, now()));
                        }
                        None => {
                            if !ask(app, "Tulika के सर्वर से जुड़ नहीं सका। इंटरनेट जाँचिए।\nCould not reach the Tulika server. Check the internet.\n\nOK = फिर कोशिश / try again") {
                                return false;
                            }
                            continue;
                        }
                    }
                }
                let shown = code.as_ref().map(|(c, _)| c.as_str()).unwrap_or("");
                let text = format!(
                    "इस कंप्यूटर को अपने Tulika खाते से जोड़िए।\n\n1. ब्राउज़र में खुले पेज पर साइन इन कीजिए (या खोलिए: {SITE}#/link)\n2. यह कोड डालकर \"यह डिवाइस जोड़ें\" दबाइए:\n\n        {shown}\n\n3. फिर यहाँ OK दबाइए।\n\nLink this computer to your Tulika account: sign in on the page that opened, enter the code above, then press OK here."
                );
                if !ask(app, &text) {
                    return false;
                }
            }
            Err(_) => {
                let allowed = st.last_ok > 0 && now().saturating_sub(st.last_ok) < OFFLINE_DAYS * 86_400;
                if allowed {
                    return true;
                }
                if !ask(app, "लाइसेंस जाँचने के लिए इंटरनेट चाहिए।\nAn internet connection is needed to check the licence.\n\nOK = फिर कोशिश / try again") {
                    return false;
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn random_hex_has_the_asked_length_and_differs() {
        let (a, b) = (random_hex(48), random_hex(48));
        assert_eq!(a.len(), 48);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(a, b);
    }
}
