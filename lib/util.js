export const json = (datos, estado = 200, extra = {}) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extra }
  });

export async function sha256(texto){
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

// Sin letras que se confunden (l, I, O, 0, 1)
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function idAleatorio(n){
  return [...crypto.getRandomValues(new Uint8Array(n))].map(x => ALFABETO[x % ALFABETO.length]).join("");
}

export const idValido = id => /^[A-Za-z0-9]{10}$/.test(id);

export const texto = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
