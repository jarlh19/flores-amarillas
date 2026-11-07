export const json = (datos, estado = 200, extra = {}) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extra }
  });

export async function sha256(texto){
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256 con un secreto del servidor. Para datos cortos como una IP: un
// sha256 simple se revierte probando todas las IPv4 en minutos; sin el
// secreto, esta huella no.
export async function huella(texto, secreto){
  const c = new TextEncoder();
  const llave = await crypto.subtle.importKey("raw", c.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = await crypto.subtle.sign("HMAC", llave, c.encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

// Sin letras que se confunden (l, I, O, 0, 1)
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function idAleatorio(n){
  return [...crypto.getRandomValues(new Uint8Array(n))].map(x => ALFABETO[x % ALFABETO.length]).join("");
}

export const idValido = id => /^[A-Za-z0-9]{10}$/.test(id);

export const texto = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
