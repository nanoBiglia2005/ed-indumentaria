-- ============================================================
--  Flujo de stock de remitos.
--
--  Invariante que se protege:
--    cant             = disponible para vender.
--    cant_reservada   = vendido pero todavia no cobrado (remito CONFIRMADO).
--    cant + cant_reservada = stock fisico real.
--
--  Estados de REMITOS.id_estado (fuente de verdad: backend/shared/ventas.json,
--  plpgsql no puede leer ese JSON, los IDs quedan literales aca):
--    1 = CONFIRMADO  (pendiente de cobro, reserva stock)
--    2 = FACTURADO   (cobrado, ya no es reserva: se descuenta del fisico)
--    3 = ANULADO     (se cae la reserva, vuelve todo a disponible)
--    4 = DEVUELTO    (solo se llega desde FACTURADO; el fisico vuelve a entrar)
--
--  Reglas:
--   - Mientras un remito esta CONFIRMADO, cada DETALLES_REMITO mueve stock de
--     "cant" a "cant_reservada" (trg_stock_detalle_*). Si el remito ya no esta
--     CONFIRMADO (facturado/anulado/devuelto), esos triggers no hacen nada:
--     los detalles de un remito cerrado no representan una reserva.
--   - El cambio de estado de un REMITO (trg_stock_estado_remito) es el que
--     mueve stock entre "cant" y "cant_reservada" segun la transicion:
--       1->2 (facturar): cant_reservada -= cantidad            (se vendio de verdad)
--       1->3 (anular):   cant += cantidad, cant_reservada -= cantidad  (se libera)
--       2->4 (devolver):  cant += cantidad                      (vuelve al fisico)
--     Cualquier otra transicion de id_estado esta prohibida por la API
--     (routes/remitos.js) y aca se rechaza con RAISE EXCEPTION: en la base
--     rompería el invariante en silencio.
--   - El CASCADE de REMITOS -> DETALLES_REMITO dispara el AFTER DELETE de los
--     detalles, pero para ESE caso (se borra el remito entero) no alcanza:
--     quien dispara el cascade es un trigger interno de la FK que corre DESPUES
--     de borrar la fila de REMITOS, asi que para cuando el AFTER DELETE de
--     DETALLES_REMITO consulta "REMITOS.id_estado" esa fila ya no esta (se
--     comprobo empiricamente: la consulta no encuentra nada y el trigger no
--     hace nada). Por eso liberar la reserva al borrar el remito ENTERO es un
--     trigger aparte, BEFORE DELETE en REMITOS (trg_stock_remito_borrado), que
--     corre antes de que el cascade se dispare y todavia ve los detalles. El
--     AFTER DELETE de DETALLES_REMITO (trg_stock_detalle_delete) sigue
--     cubriendo el caso de borrar una linea suelta de un remito que SIGUE
--     existiendo (no hay endpoint que lo haga hoy, pero es simetrico con
--     insert/update y correcto si alguna vez se agrega).
-- ============================================================

-- Normalizar NULLs previos: no se cambia la nullabilidad de la columna (las
-- migraciones son aditivas y codigo viejo puede seguir escribiendo NULL), los
-- triggers usan COALESCE igual.
UPDATE "ARTICULOS" SET cant_reservada = 0 WHERE cant_reservada IS NULL;

-- ------------------------------------------------------------
-- fn_mover_stock: unico punto que escribe ARTICULOS.cant / cant_reservada
-- desde estos triggers. Un solo UPDATE, sin carreras entre las dos columnas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mover_stock(
  p_id_articulo INT,
  p_delta_cant INT,
  p_delta_reservada INT
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_descripcion TEXT;
  v_cant_resultante INT;
BEGIN
  IF p_id_articulo IS NULL OR p_delta_cant IS NULL OR p_delta_reservada IS NULL THEN
    RETURN;
  END IF;

  UPDATE "ARTICULOS"
     SET cant = cant + p_delta_cant,
         cant_reservada = GREATEST(COALESCE(cant_reservada, 0) + p_delta_reservada, 0)
   WHERE id_articulo = p_id_articulo
  RETURNING cant, descripcion INTO v_cant_resultante, v_descripcion;

  IF NOT FOUND THEN
    -- El articulo no existe (pudo haberse borrado): no hay stock que mover.
    RETURN;
  END IF;

  IF v_cant_resultante < 0 THEN
    RAISE EXCEPTION 'No hay stock suficiente de "%": quedan % unidades.',
      COALESCE(v_descripcion, 'Articulo ' || p_id_articulo),
      v_cant_resultante + (-p_delta_cant)
      USING ERRCODE = 'ED001';
  END IF;
END;
$function$
;

-- ------------------------------------------------------------
-- Triggers sobre DETALLES_REMITO: mueven stock SOLO mientras el remito padre
-- esta CONFIRMADO (id_estado = 1). En cualquier otro estado los detalles no
-- representan una reserva activa y el trigger no hace nada.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_stock_detalle_remito()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.id_articulo IS NULL OR NEW.cantidad IS NULL OR NEW.id_remito IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id_estado INTO v_estado FROM "REMITOS" WHERE id_remito = NEW.id_remito;
    IF v_estado = 1 THEN
      PERFORM fn_mover_stock(NEW.id_articulo, -NEW.cantidad, NEW.cantidad);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.id_articulo IS NULL OR OLD.cantidad IS NULL OR OLD.id_remito IS NULL THEN
      RETURN OLD;
    END IF;

    SELECT id_estado INTO v_estado FROM "REMITOS" WHERE id_remito = OLD.id_remito;
    IF v_estado = 1 THEN
      PERFORM fn_mover_stock(OLD.id_articulo, OLD.cantidad, -OLD.cantidad);
    END IF;

    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id_remito IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id_estado INTO v_estado FROM "REMITOS" WHERE id_remito = NEW.id_remito;
    IF v_estado = 1 THEN
      IF OLD.id_articulo IS NOT NULL AND OLD.cantidad IS NOT NULL THEN
        PERFORM fn_mover_stock(OLD.id_articulo, OLD.cantidad, -OLD.cantidad);
      END IF;
      IF NEW.id_articulo IS NOT NULL AND NEW.cantidad IS NOT NULL THEN
        PERFORM fn_mover_stock(NEW.id_articulo, -NEW.cantidad, NEW.cantidad);
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$
;

DROP TRIGGER IF EXISTS trg_stock_detalle_insert ON "DETALLES_REMITO";
CREATE TRIGGER trg_stock_detalle_insert
  AFTER INSERT ON "DETALLES_REMITO"
  FOR EACH ROW EXECUTE FUNCTION public.fn_stock_detalle_remito();

DROP TRIGGER IF EXISTS trg_stock_detalle_delete ON "DETALLES_REMITO";
CREATE TRIGGER trg_stock_detalle_delete
  AFTER DELETE ON "DETALLES_REMITO"
  FOR EACH ROW EXECUTE FUNCTION public.fn_stock_detalle_remito();

DROP TRIGGER IF EXISTS trg_stock_detalle_update ON "DETALLES_REMITO";
CREATE TRIGGER trg_stock_detalle_update
  AFTER UPDATE OF id_articulo, cantidad ON "DETALLES_REMITO"
  FOR EACH ROW EXECUTE FUNCTION public.fn_stock_detalle_remito();

-- ------------------------------------------------------------
-- Trigger sobre REMITOS: mueve stock cuando cambia id_estado, segun la
-- transicion. Las transiciones que hace la API hoy (routes/remitos.js) son
-- 1->2 (facturar), 1->3 (anular) y 2->4 (devolver); cualquier otra se
-- rechaza para no romper el invariante en silencio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_stock_estado_remito()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  d RECORD;
  -- Delta que aplica cada detalle a (cant, cant_reservada) segun la transicion.
  v_delta_cant INT;
  v_delta_reservada INT;
BEGIN
  -- La transicion se valida ANTES de recorrer los detalles: un remito sin
  -- detalles tambien tiene que rechazar un cambio de estado prohibido.
  IF OLD.id_estado = 1 AND NEW.id_estado = 2 THEN
    v_delta_cant := 0;  v_delta_reservada := -1;   -- facturar: se cobra la reserva
  ELSIF OLD.id_estado = 1 AND NEW.id_estado = 3 THEN
    v_delta_cant := 1;  v_delta_reservada := -1;   -- anular: vuelve a disponible
  ELSIF OLD.id_estado = 2 AND NEW.id_estado = 4 THEN
    v_delta_cant := 1;  v_delta_reservada := 0;    -- devolver: reingresa al fisico
  ELSE
    RAISE EXCEPTION 'Transicion de estado de remito no permitida: % -> %.',
      OLD.id_estado, NEW.id_estado
      USING ERRCODE = 'ED002';
  END IF;

  FOR d IN
    SELECT id_articulo, cantidad
      FROM "DETALLES_REMITO"
     WHERE id_remito = NEW.id_remito
       AND id_articulo IS NOT NULL
       AND cantidad IS NOT NULL
  LOOP
    PERFORM fn_mover_stock(
      d.id_articulo,
      v_delta_cant * d.cantidad,
      v_delta_reservada * d.cantidad
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;

DROP TRIGGER IF EXISTS trg_stock_estado_remito ON "REMITOS";
CREATE TRIGGER trg_stock_estado_remito
  AFTER UPDATE OF id_estado ON "REMITOS"
  FOR EACH ROW
  WHEN (OLD.id_estado IS DISTINCT FROM NEW.id_estado)
  EXECUTE FUNCTION public.fn_stock_estado_remito();

-- ------------------------------------------------------------
-- Trigger sobre REMITOS: libera la reserva cuando se borra un remito ENTERO
-- que estaba CONFIRMADO (id_estado = 1). Va BEFORE DELETE, no AFTER, y no en
-- DETALLES_REMITO: ver la nota del encabezado sobre el orden real del
-- cascade. Ningun endpoint borra remitos hoy (routes/remitos.js no expone un
-- DELETE), pero la base lo permite y el invariante tiene que sostenerse
-- igual si alguna vez se usa (o se hace a mano).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_stock_remito_borrado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  d RECORD;
BEGIN
  IF OLD.id_estado = 1 THEN
    FOR d IN
      SELECT id_articulo, cantidad
        FROM "DETALLES_REMITO"
       WHERE id_remito = OLD.id_remito
         AND id_articulo IS NOT NULL
         AND cantidad IS NOT NULL
    LOOP
      PERFORM fn_mover_stock(d.id_articulo, d.cantidad, -d.cantidad);
    END LOOP;
  END IF;

  RETURN OLD;
END;
$function$
;

DROP TRIGGER IF EXISTS trg_stock_remito_borrado ON "REMITOS";
CREATE TRIGGER trg_stock_remito_borrado
  BEFORE DELETE ON "REMITOS"
  FOR EACH ROW EXECUTE FUNCTION public.fn_stock_remito_borrado();
