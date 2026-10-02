-- Historial de PDFs de "Imprimir Reporte" (Articulos). Aditiva: tabla y enum
-- nuevos, no toca ARTICULOS. El archivo vive en REPORTES_DIR, fuera del repo.

-- CreateEnum
CREATE TYPE "tipo_reporte" AS ENUM ('produccion_colegio', 'stock_por_talle');

-- CreateTable
CREATE TABLE "REPORTES" (
    "id_reporte" SERIAL NOT NULL,
    "tipo" "tipo_reporte" NOT NULL,
    "id_usuario" INTEGER,
    "fecha_generado" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parametros" JSONB NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "cantidad_filas" INTEGER NOT NULL,

    CONSTRAINT "reportes_pk" PRIMARY KEY ("id_reporte")
);

-- CreateIndex
CREATE INDEX "reportes_fecha_generado_idx" ON "REPORTES"("fecha_generado");

-- AddForeignKey
ALTER TABLE "REPORTES" ADD CONSTRAINT "reportes_usuarios_fk" FOREIGN KEY ("id_usuario") REFERENCES "USUARIOS"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

