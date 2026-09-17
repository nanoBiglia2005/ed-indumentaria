/*
  Warnings:

  - A unique constraint covering the columns `[dni]` on the table `CLIENTES` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
-- NULL no cuenta como duplicado en un indice UNIQUE de Postgres: varios
-- clientes sin DNI cargado (dni IS NULL) conviven sin problema, la
-- constraint solo se activa entre DNIs realmente iguales.
CREATE UNIQUE INDEX "clientes_dni_key" ON "CLIENTES"("dni");
