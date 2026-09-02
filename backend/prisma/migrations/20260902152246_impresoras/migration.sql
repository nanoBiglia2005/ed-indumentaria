-- AlterTable
ALTER TABLE "USUARIOS" ADD COLUMN     "id_impresora" INTEGER;

-- CreateTable
CREATE TABLE "IMPRESORAS" (
    "id_impresora" SERIAL NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "es_predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impresoras_pk" PRIMARY KEY ("id_impresora")
);

-- CreateIndex
CREATE UNIQUE INDEX "impresoras_nombre_key" ON "IMPRESORAS"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "impresoras_token_hash_key" ON "IMPRESORAS"("token_hash");

-- AddForeignKey
ALTER TABLE "USUARIOS" ADD CONSTRAINT "usuarios_impresoras_fk" FOREIGN KEY ("id_impresora") REFERENCES "IMPRESORAS"("id_impresora") ON DELETE SET NULL ON UPDATE CASCADE;

-- Escrito a mano: Prisma no modela indices parciales.
-- Garantiza que haya UNA sola impresora predeterminada. Se evalua por
-- sentencia, por eso services/impresoras.js hace el clear y el set en una
-- transaccion (fijarPredeterminada): al reves chocarian entre si.
CREATE UNIQUE INDEX "impresoras_predeterminada_unica"
    ON "IMPRESORAS" ("es_predeterminada") WHERE "es_predeterminada";
