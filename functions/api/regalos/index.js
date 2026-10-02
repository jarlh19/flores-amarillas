// POST /api/regalos: guarda un regalo y devuelve su id y la clave para borrarlo
import { json, sha256, idAleatorio, texto } from "../../../lib/util.js";

const LIMITE_POR_HORA = 60;        // por IP; alto porque en el celular muchos comparten IP
const MAX_CUERPO = 3_500_000;
const MAX_FOTO = 450_000;          // caracteres del data URL (unos 330 KB de JPEG)
const RE_FOTO = /^data:image\/(jpeg|png|webp);base64,/;

export async function onRequestPost({ request, env }){
  try {
    if (Number(request.headers.get("Content-Length") || 0) > MAX_CUERPO) return json({ error: "muy-grande" }, 413);
    let b;
    try { b = await request.json(); } catch { return json({ error: "formato" }, 400); }
    if (!b || typeof b !== "object" || !Array.isArray(b.frases)) return json({ error: "formato" }, 400);

    const frases = b.frases.slice(0, 6).map(f => ({ texto: texto(f && f.texto, 30), mensaje: texto(f && f.mensaje, 500) }));
    let youtube = null;
    if (b.youtube && /^[A-Za-z0-9_-]{11}$/.test(b.youtube.id)){
      youtube = { id: b.youtube.id, inicio: Math.max(0, Math.min(36000, Math.floor(Number(b.youtube.inicio) || 0))) };
    }
    const fotos = [];
    for (const [slot, datos] of Object.entries(b.fotos || {})){
      const s = Number(slot);
      if (!Number.isInteger(s) || s < 0 || s > frases.length) continue;
      if (typeof datos !== "string" || datos.length > MAX_FOTO || !RE_FOTO.test(datos)) return json({ error: "foto" }, 400);
      fotos.push({ slot: s, datos });
    }

    const ip = await sha256("flores:" + (request.headers.get("CF-Connecting-IP") || ""));
    const reciente = await env.DB.prepare("SELECT COUNT(*) AS n FROM regalos WHERE ip = ? AND creado > ?")
      .bind(ip, Date.now() - 3_600_000).first();
    if (reciente && reciente.n >= LIMITE_POR_HORA) return json({ error: "demasiados" }, 429);

    const id = idAleatorio(10), clave = idAleatorio(24);
    const idioma = b.idioma === "en" ? "en" : "es";
    const datos = JSON.stringify({ idioma, de: texto(b.de, 40), para: texto(b.para, 40), frases, youtube });
    const sentencias = [
      env.DB.prepare("INSERT INTO regalos (id, datos, creado, ip, clave) VALUES (?, ?, ?, ?, ?)")
        .bind(id, datos, Date.now(), ip, await sha256(clave))
    ];
    for (const f of fotos){
      sentencias.push(env.DB.prepare("INSERT INTO fotos (regalo, slot, datos) VALUES (?, ?, ?)").bind(id, f.slot, f.datos));
    }
    await env.DB.batch(sentencias);
    return json({ id, clave }, 201);
  } catch (e){
    return json({ error: "servidor" }, 500);
  }
}
