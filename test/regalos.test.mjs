// Pruebas de POST /api/regalos con una D1 falsa que anota cada sentencia.
// Se corren con `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/regalos/index.js";
import { sha256 } from "../lib/util.js";

const IP = "181.65.12.34";

function d1Falsa({ recientes = 0 } = {}){
  const anotadas = [];
  const sentencia = sql => ({
    sql, args: [],
    bind(...args){ this.args = args; return this; },
    async first(){ anotadas.push(this); return { n: recientes }; },
    async run(){ anotadas.push(this); return {}; }
  });
  return {
    anotadas,
    prepare: sql => sentencia(sql),
    async batch(lista){ anotadas.push(...lista); return []; }
  };
}

const pedido = () => new Request("https://regala-flores-amarillas.pages.dev/api/regalos", {
  method: "POST",
  headers: { "Content-Type": "application/json", "CF-Connecting-IP": IP },
  body: JSON.stringify({ de: "Ana", para: "Beto", frases: [{ texto: "Hola", mensaje: "Para ti" }] })
});

const insercion = db => db.anotadas.find(s => s.sql.startsWith("INSERT INTO regalos"));

test("la IP se guarda con el secreto, no con el hash que se puede revertir", async () => {
  const db = d1Falsa();
  const r = await onRequestPost({ request: pedido(), env: { DB: db, IP_SECRETO: "secreto-de-prueba" } });
  assert.equal(r.status, 201);
  const guardada = insercion(db).args[3];
  assert.notEqual(guardada, await sha256("flores:" + IP));
  assert.match(guardada, /^[0-9a-f]{64}$/);
});

test("con otro secreto la misma IP da otra huella", async () => {
  const a = d1Falsa(), b = d1Falsa();
  await onRequestPost({ request: pedido(), env: { DB: a, IP_SECRETO: "uno" } });
  await onRequestPost({ request: pedido(), env: { DB: b, IP_SECRETO: "dos" } });
  assert.notEqual(insercion(a).args[3], insercion(b).args[3]);
});

test("sin secreto configurado no guarda nada y lo dice", async () => {
  const db = d1Falsa();
  const r = await onRequestPost({ request: pedido(), env: { DB: db } });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error: "sin-configurar" });
  assert.equal(insercion(db), undefined);
});

test("borra las huellas de más de una hora, que ya no sirven para el límite", async () => {
  const db = d1Falsa();
  const antes = Date.now();
  await onRequestPost({ request: pedido(), env: { DB: db, IP_SECRETO: "secreto-de-prueba" } });
  const limpieza = db.anotadas.find(s => /^UPDATE regalos SET ip = ''/.test(s.sql));
  assert.ok(limpieza, "falta la limpieza de huellas viejas");
  const corte = limpieza.args[0];
  assert.ok(corte <= antes - 3_600_000 + 1000 && corte >= antes - 3_600_000 - 1000);
});

test("el límite de 60 regalos por hora sigue igual", async () => {
  const db = d1Falsa({ recientes: 60 });
  const r = await onRequestPost({ request: pedido(), env: { DB: db, IP_SECRETO: "secreto-de-prueba" } });
  assert.equal(r.status, 429);
  assert.equal(insercion(db), undefined);
});
