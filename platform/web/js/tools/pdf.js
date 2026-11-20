// Minimal PDF writer: one JPEG per page. pages: [{jpeg:Uint8Array, w, h (pixels), pw, ph (page size in points), x, y, iw, ih (placement in points)}]
export function jpegsToPdf(pages) {
  const enc = new TextEncoder(), parts = [], off = []; let len = 0;
  const push = (d) => { const u = typeof d === "string" ? enc.encode(d) : d; parts.push(u); len += u.length; };
  const obj = (n, body) => { off[n] = len; push(`${n} 0 obj\n`); push(body); push("\nendobj\n"); };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>"); obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const n = 3 + i * 3, f = (v) => v.toFixed(2);
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(p.pw)} ${f(p.ph)}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    const c = `q ${f(p.iw)} 0 0 ${f(p.ih)} ${f(p.x)} ${f(p.y)} cm /Im0 Do Q`; obj(n + 1, `<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    off[n + 2] = len; push(`${n + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); push(p.jpeg); push("\nendstream\nendobj\n");
  });
  const total = 3 + pages.length * 3, xr = len; let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let n = 1; n < total; n++) x += String(off[n]).padStart(10, "0") + " 00000 n \n";
  push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
  const out = new Uint8Array(len); let p = 0; for (const u of parts) { out.set(u, p); p += u.length; } return new Blob([out], { type: "application/pdf" });
}
export const canvasJpeg = (cv, q = 0.92) => new Promise((r) => cv.toBlob(async (b) => r(new Uint8Array(await b.arrayBuffer())), "image/jpeg", q));
export const loadImg = (file) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
