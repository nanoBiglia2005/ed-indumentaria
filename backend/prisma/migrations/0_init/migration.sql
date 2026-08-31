-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."rol_usuario" AS ENUM ('empleado', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "public"."tipo_operacion" AS ENUM ('compra', 'venta', 'X');

-- CreateTable
CREATE TABLE "public"."ARTICULOS" (
    "id_articulo" SERIAL NOT NULL,
    "cant" INTEGER NOT NULL DEFAULT 0,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "barcode_tail" VARCHAR(20),
    "stock_minimo" SMALLINT NOT NULL DEFAULT 0,
    "vigente" BOOLEAN DEFAULT true,
    "id_medida" INTEGER NOT NULL DEFAULT 1,
    "id_proveedor" INTEGER,
    "cant_reservada" INTEGER,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" VARCHAR(70),
    "detalle" VARCHAR(50),
    "barcode_old" VARCHAR(20),
    "talle" VARCHAR(30),
    "id_linea" INTEGER,
    "id_subgrupo" INTEGER,
    "id_grupo" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "articulos_pk" PRIMARY KEY ("id_articulo")
);

-- CreateTable
CREATE TABLE "public"."ARTICULOS_X_CLIENTE" (
    "id_registro" SERIAL NOT NULL,
    "id_articulo" INTEGER NOT NULL,
    "id_cliente" INTEGER NOT NULL,

    CONSTRAINT "articulos_x_cliente_pk" PRIMARY KEY ("id_registro")
);

-- CreateTable
CREATE TABLE "public"."ARTICULOS_X_GRUPO_VENTA" (
    "id_reg" SERIAL NOT NULL,
    "id_articulo" INTEGER NOT NULL,
    "id_grupo_venta" INTEGER NOT NULL,
    "id_subgrupo" INTEGER,

    CONSTRAINT "articulos_x_grupo_venta_pk" PRIMARY KEY ("id_reg")
);

-- CreateTable
CREATE TABLE "public"."CLIENTES" (
    "id_cliente" SERIAL NOT NULL,
    "fecha_alta" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombre" VARCHAR(50) NOT NULL,
    "apellido" VARCHAR(50),
    "dni" VARCHAR(8) NOT NULL,
    "email" VARCHAR(50),
    "telefono" INTEGER,
    "fecha_nacimiento" DATE,
    "cod_pais" SMALLINT DEFAULT 54,
    "cod_area" SMALLINT DEFAULT 11,

    CONSTRAINT "_clientes__pk" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "public"."CLIENTES_MAYORISTAS" (
    "nombre" VARCHAR(30) NOT NULL,
    "telefono" VARCHAR(11),
    "email" VARCHAR(30),
    "razon_social" VARCHAR(20),
    "grupo_venta_exclusivo" INTEGER,
    "id_cliente" SERIAL NOT NULL,

    CONSTRAINT "clientes_alt_pk" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "public"."DETALLES_REMITO" (
    "id_detalle" SERIAL NOT NULL,
    "id_remito" INTEGER,
    "id_articulo" INTEGER,
    "color" VARCHAR(30),
    "medida" VARCHAR(20),
    "observacion" VARCHAR(40),
    "precio" DOUBLE PRECISION,
    "bonificacion" DOUBLE PRECISION,
    "recargo_financiero" DOUBLE PRECISION,
    "cantidad" INTEGER,

    CONSTRAINT "_detalles_remito__pk" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "public"."ESTADOS_REMITOS" (
    "id_estado" SERIAL NOT NULL,
    "nombre_estado" VARCHAR(20),

    CONSTRAINT "_estados_remitos__pk" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "public"."GRUPOS_DE_VENTA" (
    "id_grupo" SERIAL NOT NULL,
    "nombre_grupo" VARCHAR(50) NOT NULL,
    "tipo_grupo" "public"."tipo_operacion",

    CONSTRAINT "grupos_de_venta_pk" PRIMARY KEY ("id_grupo")
);

-- CreateTable
CREATE TABLE "public"."LINEAS" (
    "id_linea" SERIAL NOT NULL,
    "nombre_linea" VARCHAR(20) NOT NULL,

    CONSTRAINT "lineas_pk" PRIMARY KEY ("id_linea")
);

-- CreateTable
CREATE TABLE "public"."MONEDA" (
    "id_moneda" SERIAL NOT NULL,
    "nombre_moneda" VARCHAR(20),
    "cotizacion" DOUBLE PRECISION,

    CONSTRAINT "_moneda__pk" PRIMARY KEY ("id_moneda")
);

-- CreateTable
CREATE TABLE "public"."NUMERO_REMITO" (
    "id_numero_remito" SERIAL NOT NULL,
    "id_sucursal" INTEGER,
    "tipo_comprobante" VARCHAR(20) DEFAULT '"remito"',

    CONSTRAINT "_numero_remito__pk" PRIMARY KEY ("id_numero_remito")
);

-- CreateTable
CREATE TABLE "public"."PAGOS_REMITO" (
    "id_pago" SERIAL NOT NULL,
    "id_remito" INTEGER NOT NULL,
    "id_tipo_de_pago" INTEGER NOT NULL DEFAULT 1,
    "monto_inicial" DOUBLE PRECISION NOT NULL,
    "monto_final" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "_pagos_remito__pk" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "public"."PROVEEDORES" (
    "id_proveedor" SERIAL NOT NULL,
    "entidad" VARCHAR(30),
    "nombre" VARCHAR(30),
    "direccion" VARCHAR(100),
    "cod postal" VARCHAR(20),
    "cuit" VARCHAR(50),
    "telefono" VARCHAR(60),
    "fax" VARCHAR(50),
    "celular" VARCHAR(50),
    "email" VARCHAR(50),
    "contacto" VARCHAR(150),
    "localidad" VARCHAR(50),
    "fecha" TIMESTAMP(6),
    "razon_social" VARCHAR(20),

    CONSTRAINT "_provedores__pk" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "public"."REMITOS" (
    "id_remito" SERIAL NOT NULL,
    "id_sucursal" INTEGER,
    "fecha_de_emision" DATE,
    "fecha_de_creacion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_estado" INTEGER NOT NULL DEFAULT 1,
    "id_cliente" INTEGER,
    "tipo_comprobante" VARCHAR(20) DEFAULT '"remito"',
    "cod_remito_final" INTEGER,
    "id_moneda" INTEGER,
    "total_efectivo" DOUBLE PRECISION NOT NULL,
    "recargo_financiero" DOUBLE PRECISION,
    "bonificaciones" DOUBLE PRECISION,
    "total_final" DOUBLE PRECISION,
    "redondeo" DOUBLE PRECISION,
    "cod_mes" INTEGER NOT NULL DEFAULT (EXTRACT(month FROM now()))::integer,

    CONSTRAINT "_remitos__pk" PRIMARY KEY ("id_remito")
);

-- CreateTable
CREATE TABLE "public"."SUBGRUPOS_DE_VENTA" (
    "id_subgrupo" SERIAL NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "nombre_subgrupo" VARCHAR(30) NOT NULL,

    CONSTRAINT "_subgrupos_de_venta_alt__pk" PRIMARY KEY ("id_subgrupo")
);

-- CreateTable
CREATE TABLE "public"."SUCURSAL" (
    "id_sucursal" SERIAL NOT NULL,
    "nombre_sucursal" VARCHAR(30),

    CONSTRAINT "_sucursal__pk" PRIMARY KEY ("id_sucursal")
);

-- CreateTable
CREATE TABLE "public"."TIPOS_DE_MEDIDA" (
    "id_medida" SERIAL NOT NULL,
    "nombre_tipo" VARCHAR(20),

    CONSTRAINT "_tipos_de_medida__pk" PRIMARY KEY ("id_medida")
);

-- CreateTable
CREATE TABLE "public"."TIPOS_DE_PAGO" (
    "id_tipos_de_pago" SERIAL NOT NULL,
    "nombre_tipo_de_pago" VARCHAR(20) NOT NULL,
    "recargo" DOUBLE PRECISION NOT NULL,
    "signo" BOOLEAN,
    "modificable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "_tipos_de_pago__pk" PRIMARY KEY ("id_tipos_de_pago")
);

-- CreateTable
CREATE TABLE "public"."USUARIOS" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" VARCHAR(20),
    "apellido" VARCHAR(20),
    "email" VARCHAR(255),
    "rol" "public"."rol_usuario",

    CONSTRAINT "usuarios_pk" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "public"."remitos_contador" (
    "cod_mes" TEXT NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "remitos_contador_pkey" PRIMARY KEY ("cod_mes")
);

-- CreateIndex
CREATE UNIQUE INDEX "articulos_barcode_tail_idx" ON "public"."ARTICULOS"("barcode_tail" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."USUARIOS"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS" ADD CONSTRAINT "articulos_grupos_de_venta_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."GRUPOS_DE_VENTA"("id_grupo") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS" ADD CONSTRAINT "articulos_lineas_fk" FOREIGN KEY ("id_linea") REFERENCES "public"."LINEAS"("id_linea") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS" ADD CONSTRAINT "articulos_proveedores_fk" FOREIGN KEY ("id_proveedor") REFERENCES "public"."PROVEEDORES"("id_proveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS" ADD CONSTRAINT "articulos_subgrupos_de_venta_fk" FOREIGN KEY ("id_subgrupo") REFERENCES "public"."SUBGRUPOS_DE_VENTA"("id_subgrupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS" ADD CONSTRAINT "articulos_tipos_de_medida_fk" FOREIGN KEY ("id_medida") REFERENCES "public"."TIPOS_DE_MEDIDA"("id_medida") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS_X_CLIENTE" ADD CONSTRAINT "articulos_x_cliente_articulos_fk" FOREIGN KEY ("id_articulo") REFERENCES "public"."ARTICULOS"("id_articulo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS_X_CLIENTE" ADD CONSTRAINT "articulos_x_cliente_clientes_fk" FOREIGN KEY ("id_cliente") REFERENCES "public"."CLIENTES_MAYORISTAS"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS_X_GRUPO_VENTA" ADD CONSTRAINT "articulos_x_grupo_venta_alt_articulos_fk" FOREIGN KEY ("id_articulo") REFERENCES "public"."ARTICULOS"("id_articulo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS_X_GRUPO_VENTA" ADD CONSTRAINT "articulos_x_grupo_venta_alt_grupos_de_venta_fk" FOREIGN KEY ("id_grupo_venta") REFERENCES "public"."GRUPOS_DE_VENTA"("id_grupo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ARTICULOS_X_GRUPO_VENTA" ADD CONSTRAINT "articulos_x_grupo_venta_alt_subgrupos_de_venta_fk" FOREIGN KEY ("id_subgrupo") REFERENCES "public"."SUBGRUPOS_DE_VENTA"("id_subgrupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CLIENTES_MAYORISTAS" ADD CONSTRAINT "clientes_grupos_de_venta_fk" FOREIGN KEY ("grupo_venta_exclusivo") REFERENCES "public"."GRUPOS_DE_VENTA"("id_grupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DETALLES_REMITO" ADD CONSTRAINT "_detalles_remito__articulos_fk" FOREIGN KEY ("id_articulo") REFERENCES "public"."ARTICULOS"("id_articulo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DETALLES_REMITO" ADD CONSTRAINT "_detalles_remito__remitos_fk" FOREIGN KEY ("id_remito") REFERENCES "public"."REMITOS"("id_remito") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NUMERO_REMITO" ADD CONSTRAINT "_numero_remito__sucursal_fk" FOREIGN KEY ("id_sucursal") REFERENCES "public"."SUCURSAL"("id_sucursal") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PAGOS_REMITO" ADD CONSTRAINT "_pagos_remito__remitos_fk" FOREIGN KEY ("id_remito") REFERENCES "public"."REMITOS"("id_remito") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PAGOS_REMITO" ADD CONSTRAINT "_pagos_remito__tipos_de_pago_fk" FOREIGN KEY ("id_tipo_de_pago") REFERENCES "public"."TIPOS_DE_PAGO"("id_tipos_de_pago") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."REMITOS" ADD CONSTRAINT "_remitos__estados_remitos_fk" FOREIGN KEY ("id_estado") REFERENCES "public"."ESTADOS_REMITOS"("id_estado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."REMITOS" ADD CONSTRAINT "remitos_clientes_fk" FOREIGN KEY ("id_cliente") REFERENCES "public"."CLIENTES"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."REMITOS" ADD CONSTRAINT "remitos_moneda_fk" FOREIGN KEY ("id_moneda") REFERENCES "public"."MONEDA"("id_moneda") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."REMITOS" ADD CONSTRAINT "remitos_sucursal_fk" FOREIGN KEY ("id_sucursal") REFERENCES "public"."SUCURSAL"("id_sucursal") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SUBGRUPOS_DE_VENTA" ADD CONSTRAINT "subgrupos_de_venta_grupos_de_venta_fk" FOREIGN KEY ("id_grupo") REFERENCES "public"."GRUPOS_DE_VENTA"("id_grupo") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
--  Funciones y triggers (Prisma no los modela: van como SQL crudo).
--  Las versiones corregidas son las de la Fase 0.10 del plan de migracion.
-- ============================================================

CREATE OR REPLACE FUNCTION public.asignar_proximo_numero()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.barcode_tail = '-1' THEN
        NEW.barcode_tail := COALESCE((SELECT MAX(barcode_tail::numeric(20)) FROM "ARTICULOS"), 0) + 1;
    END IF;

    RETURN NEW;
END;
$function$
;   -- version 0.10(b)

CREATE OR REPLACE FUNCTION public.fn_generar_cod_remito_final()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_siguiente INTEGER;
BEGIN
    INSERT INTO remitos_contador (cod_mes, ultimo_numero)
    VALUES (NEW.cod_mes, 1)
    ON CONFLICT (cod_mes)
    DO UPDATE SET ultimo_numero = remitos_contador.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_siguiente;

    NEW.cod_remito_final := v_siguiente;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_sellar_fecha_de_emision()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.fecha_de_emision := CURRENT_DATE;
    RETURN NEW;
END;
$function$
; -- version 0.10(c)

CREATE TRIGGER trigger_asignar_numero
  BEFORE INSERT ON "ARTICULOS"
  FOR EACH ROW EXECUTE FUNCTION public.asignar_proximo_numero();

CREATE TRIGGER trg_cod_remito_final
  BEFORE INSERT ON "REMITOS"
  FOR EACH ROW EXECUTE FUNCTION public.fn_generar_cod_remito_final();

CREATE TRIGGER trg_fecha_de_emision
  BEFORE UPDATE ON "REMITOS"
  FOR EACH ROW EXECUTE FUNCTION public.fn_sellar_fecha_de_emision();
