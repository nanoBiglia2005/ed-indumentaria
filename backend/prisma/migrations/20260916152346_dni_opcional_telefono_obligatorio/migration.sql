/*
  Warnings:

  - Made the column `telefono` on table `CLIENTES` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill manual: clientes viejos (de antes de que telefono fuera
-- obligatorio) que hoy tienen telefono NULL pasan a 0 como placeholder, para
-- que el ALTER COLUMN SET NOT NULL de abajo no falle contra datos reales de
-- produccion. 0 es un valor invalido a proposito (nunca lo va a generar un
-- alta nueva, que exige 1 a TELEFONO_DIGITOS digitos): sirve para detectar a
-- ojo, en un listado, que cliente todavia necesita que le carguen el telefono.
UPDATE "CLIENTES" SET "telefono" = 0 WHERE "telefono" IS NULL;

-- AlterTable
ALTER TABLE "CLIENTES" ALTER COLUMN "dni" DROP NOT NULL,
ALTER COLUMN "telefono" SET NOT NULL;
