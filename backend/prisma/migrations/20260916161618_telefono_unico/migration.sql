/*
  Warnings:

  - A unique constraint covering the columns `[telefono]` on the table `CLIENTES` will be added. If there are existing duplicate values, this will fail.

  OJO: `telefono` es NOT NULL (migracion 20260916152346_dni_opcional_telefono_obligatorio
  le puso 0 como placeholder a los clientes que no lo tenian cargado). Si hay
  mas de un cliente con telefono=0 (o cualquier otro valor repetido) en la
  base donde se aplique esta migracion, esta CREATE UNIQUE INDEX va a fallar
  y hay que resolverlo a mano (mismo mecanismo que se uso para el DNI
  duplicado: `prisma migrate resolve --rolled-back`, arreglar los datos,
  reintentar) antes de poder aplicar el resto de las migraciones pendientes.
*/
-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefono_key" ON "CLIENTES"("telefono");
