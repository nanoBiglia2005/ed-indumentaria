/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `CLIENTES` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
-- NULL no cuenta como duplicado en un indice UNIQUE de Postgres: varios
-- clientes sin email cargado (email IS NULL) conviven sin problema, la
-- constraint solo se activa entre emails realmente iguales.
CREATE UNIQUE INDEX "clientes_email_key" ON "CLIENTES"("email");
