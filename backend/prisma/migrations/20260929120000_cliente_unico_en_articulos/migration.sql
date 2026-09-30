-- Un articulo pertenece a UN colegio/club (igual que linea, grupo y subgrupo):
-- el vinculo pasa de la tabla ARTICULOS_X_CLIENTE a ARTICULOS.id_cliente.
--
-- ADITIVA: ARTICULOS_X_CLIENTE NO se toca ni se borra. Se elimina en una
-- migracion posterior, una vez que el codigo nuevo esta en produccion.
--
-- Precondicion verificada (solo SELECT) en dev y produccion: ningun articulo
-- tiene mas de un cliente DISTINTO. Las filas repetidas del mismo par
-- articulo-cliente se colapsan; min() alcanza porque hay un unico valor.

ALTER TABLE "ARTICULOS" ADD COLUMN "id_cliente" INTEGER;

UPDATE "ARTICULOS" a
   SET "id_cliente" = ax.id_cliente
  FROM (
    SELECT id_articulo, min(id_cliente) AS id_cliente
      FROM "ARTICULOS_X_CLIENTE"
     GROUP BY id_articulo
  ) ax
 WHERE ax.id_articulo = a.id_articulo;

CREATE INDEX "articulos_id_cliente_idx" ON "ARTICULOS"("id_cliente");

ALTER TABLE "ARTICULOS" ADD CONSTRAINT "articulos_clientes_mayoristas_fk"
  FOREIGN KEY ("id_cliente") REFERENCES "CLIENTES_MAYORISTAS"("id_cliente")
  ON DELETE SET NULL ON UPDATE CASCADE;
