// Las cabeceras de seguridad del sitio (public/_headers). La política de
// contenido deja correr solo los scripts que la página trae, por su huella:
// si alguien edita index.html y no regenera las cabeceras, esto falla antes
// de publicar, en vez de dejar el sitio en blanco en producción.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const ruta = new URL("../public/_headers", import.meta.url);
const cabeceras = existsSync(ruta) ? readFileSync(ruta, "utf8") : "";
const politica = (cabeceras.match(/Content-Security-Policy(?:-Report-Only)?: (.+)/) || [])[1] || "";
const directiva = nombre => (politica.split(";").map(d => d.trim()).find(d => d.startsWith(nombre + " ")) || "");

// Lo que el navegador ejecuta en línea: los <script> sin src ni tipo, y el
// código del jardín, que la página mete como script al arrancar. El navegador
// lee el HTML con saltos de línea normalizados a \n, y hashea eso.
function scriptsEnLinea(texto){
  const t = texto.replace(/\r\n?/g, "\n");
  const bloques = [...t.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  return bloques
    .filter(([, attrs = ""]) => !/\bsrc=/.test(attrs) && (!/\btype=/.test(attrs) || /id="codigo-jardin"/.test(attrs)))
    .map(([, , cuerpo]) => cuerpo);
}
const huella = s => "'sha256-" + createHash("sha256").update(s, "utf8").digest("base64") + "'";

test("hay cabeceras para todo el sitio", () => {
  assert.ok(existsSync(ruta), "falta public/_headers");
  assert.match(cabeceras, /^\/\*$/m);
});

test("la política deja correr exactamente los scripts que trae la página", () => {
  const scripts = scriptsEnLinea(html);
  assert.equal(scripts.length, 3, "se esperaban tres scripts en línea");
  for (const s of scripts) assert.ok(directiva("script-src").includes(huella(s)), "falta la huella de un script en línea");
});

test("ningún otro script en línea ni eval", () => {
  assert.ok(directiva("script-src"), "falta script-src");
  assert.doesNotMatch(directiva("script-src"), /'unsafe-inline'|'unsafe-eval'/);
});

test("cierra lo que no usa: objetos, <base> y ser metida en un iframe ajeno", () => {
  assert.equal(directiva("object-src"), "object-src 'none'");
  assert.equal(directiva("base-uri"), "base-uri 'none'");
  assert.equal(directiva("frame-ancestors"), "frame-ancestors 'none'");
});

test("las otras cabeceras", () => {
  assert.match(cabeceras, /X-Content-Type-Options: nosniff/);
  assert.match(cabeceras, /Referrer-Policy: strict-origin-when-cross-origin/);
  assert.match(cabeceras, /Strict-Transport-Security: max-age=\d{8,}/);
});

test("publicar regenera las cabeceras antes de subir", () => {
  const p = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(p.scripts.deploy, /cabeceras\.mjs.*&&.*wrangler pages deploy/);
});
