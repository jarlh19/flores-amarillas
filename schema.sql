-- Regalos creados con "Crear enlace".
-- Las fotos van en otra tabla (una fila por foto) para no pasar el límite de 2 MB por fila de D1.

CREATE TABLE IF NOT EXISTS regalos (
  id     TEXT PRIMARY KEY,     -- lo que va en el enlace: /r/<id>
  datos  TEXT NOT NULL,        -- JSON con de, para, frases y youtube (sin fotos)
  creado INTEGER NOT NULL,     -- milisegundos
  ip     TEXT NOT NULL,        -- HMAC de la IP con IP_SECRETO, solo para el límite por hora; '' pasada la hora
  clave  TEXT NOT NULL         -- hash de la clave para borrar el regalo
);
CREATE INDEX IF NOT EXISTS regalos_ip_creado ON regalos (ip, creado);

CREATE TABLE IF NOT EXISTS fotos (
  regalo TEXT NOT NULL,
  slot   INTEGER NOT NULL,     -- 0 = flor central, 1..6 = frases
  datos  TEXT NOT NULL,        -- data URL de la imagen (JPEG)
  PRIMARY KEY (regalo, slot)
);
