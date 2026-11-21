# Vendored third-party libraries (served from our own origin, no CDN)
* `pdf-lib.min.js` — pdf-lib 1.17.1, MIT (LICENSE-pdf-lib.md). Used by PDF merge / organise.
* `pdfjs/` — Mozilla PDF.js (pdfjs-dist 6.2.108), Apache-2.0 (LICENSE-pdfjs.txt); includes its font/cmap/wasm data. Used to render PDF pages (compress, PDF→images).
Update: copy the same files from the npm packages. Keep licence files next to the code.
* `fonts/` — Noto Sans Devanagari (SIL OFL 1.1, Noto Project Authors) and Inter (SIL OFL 1.1), variable TTFs from github.com/google/fonts; licence texts alongside. Served by `@font-face` in css/styles.css (no Google Fonts CDN).
* `ocr/` — tesseract.js-core 7.0.0 (`tesseract-core-simd-lstm.wasm.js`, `tesseract-core-lstm.wasm.js`, Apache-2.0, LICENSE-tesseract.js-core), `hin.traineddata` + `eng.traineddata` from tesseract-ocr/tessdata_fast (Apache-2.0, LICENSE-tessdata_fast, commit 87416418), and `ocr-worker.js` (our glue). Used by the OCR tool.
* `fonts/deco/` — 22 stylish Devanagari display fonts (Kalam, Yatra One, Rozha One, Amita, Sahitya, Modak, Tillana, Khand, Laila, Gotu, Dekko, Arya, Sumana, Karma, Eczar, Halant, Kurale, Sura, Ranga, Amiko, Glegoo, Teko), SIL OFL 1.1, each with its OFL-<name>.txt. `deco.css` holds the @font-face rules; the list for the UI is `js/data/deco_fonts.js`.

## Additional fonts (more/)
57 further families, all SIL OFL 1.1, copied from google/fonts by tools/vendor_fonts.py; licence texts in licenses/OFL-*.txt; CSS in more.css.
