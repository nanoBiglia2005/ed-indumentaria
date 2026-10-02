-- Renombra los valores de tipo_reporte: colegio (con Colegio/Club: planilla de
-- produccion) y general (sin Colegio/Club: stock por talle). RENAME VALUE
-- conserva las filas existentes. La migracion que crea el enum
-- (20260929200000_agrega_tabla_reportes) todavia no se desplego, asi que ningun
-- codigo en produccion usa los nombres viejos.
ALTER TYPE "tipo_reporte" RENAME VALUE 'produccion_colegio' TO 'colegio';
ALTER TYPE "tipo_reporte" RENAME VALUE 'stock_por_talle' TO 'general';
