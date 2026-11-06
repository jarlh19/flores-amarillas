// Escribe public/_headers con las cabeceras de seguridad del sitio.
//
// La política de contenido deja correr solo los scripts en línea que trae
// index.html, por su huella SHA-256, en vez de abrir 'unsafe-inline' a
// cualquiera. Por eso hay que regenerarla cada vez que cambia index.html:
// `npm run deploy` lo hace solo, y test/cabeceras.test.mjs falla si quedó vieja.
//
//   node scripts/cabeceras.mjs            política en modo solo reportar
//   node scripts/cabeceras.mjs --aplicar  política aplicada
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8").replace(/\r\n?/g, "\n");

// Lo que el navegador ejecuta en línea: los <script> sin src ni tipo, y el
// código del jardín (type="text/plain"), que la página mete como script al
// arrancar. El navegador hashea el texto con los saltos de línea ya en \n.
const enLinea = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(([, attrs = ""]) => !/\bsrc=/.test(attrs) && (!/\btype=/.test(attrs) || /id="codigo-jardin"/.test(attrs)))
  .map(([, , cuerpo]) => "'sha256-" + createHash("sha256").update(cuerpo, "utf8").digest("base64") + "'");

const politica = [
  "default-src 'self'",
  // three.js fijo en su versión, y la API de YouTube para la música por enlace.
  "script-src 'self' " + enLinea.join(" ") + " https://cdn.jsdelivr.net/npm/three@0.148.0/ https://www.youtube.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "media-src 'self' data: blob:",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const nombre = process.argv.includes("--aplicar") ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
const texto = [
  "# Generado por scripts/cabeceras.mjs. No editar a mano: se regenera al publicar.",
  "/*",
  `  ${nombre}: ${politica}`,
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Strict-Transport-Security: max-age=31536000",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  ""
].join("\n");

writeFileSync(new URL("../public/_headers", import.meta.url), texto);
console.log(`public/_headers escrito (${nombre}, ${enLinea.length} scripts en línea)`);
