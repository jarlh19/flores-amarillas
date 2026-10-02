// GET /api/regalos/:id   → el regalo con sus fotos
// DELETE /api/regalos/:id → lo borra (pide la clave en la cabecera X-Clave)
import { json, sha256, idValido } from "../../../lib/util.js";

export async function onRequestGet({ params, env }){
  try {
    const id = String(params.id || "");
    if (!idValido(id)) return json({ error: "no-existe" }, 404);
    const fila = await env.DB.prepare("SELECT datos FROM regalos WHERE id = ?").bind(id).first();
    if (!fila) return json({ error: "no-existe" }, 404);
    const { results } = await env.DB.prepare("SELECT slot, datos FROM fotos WHERE regalo = ?").bind(id).all();
    const foto = s => (results.find(r => r.slot === s) || {}).datos || "";
    const d = JSON.parse(fila.datos);
    return json({
      de: d.de, para: d.para, youtube: d.youtube,
      fotoCentral: foto(0),
      frases: d.frases.map((f, i) => ({ ...f, foto: foto(i + 1) }))
    }, 200, { "Cache-Control": "public, max-age=120" });
  } catch (e){
    return json({ error: "servidor" }, 500);
  }
}

export async function onRequestDelete({ params, env, request }){
  try {
    const id = String(params.id || "");
    if (!idValido(id)) return json({ error: "no-existe" }, 404);
    const fila = await env.DB.prepare("SELECT clave FROM regalos WHERE id = ?").bind(id).first();
    if (!fila) return json({ error: "no-existe" }, 404);
    if (fila.clave !== await sha256(request.headers.get("X-Clave") || "")) return json({ error: "no-autorizado" }, 403);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM fotos WHERE regalo = ?").bind(id),
      env.DB.prepare("DELETE FROM regalos WHERE id = ?").bind(id)
    ]);
    return json({ ok: true });
  } catch (e){
    return json({ error: "servidor" }, 500);
  }
}
