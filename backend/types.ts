import type { Prisma } from './generated/prisma/client';
import ventas from './shared/ventas.json';
import agrupaciones from './shared/agrupaciones.json';
import barcode from './shared/barcode.json';
import roles from './shared/roles.json';
import precios from './shared/precios.json';
import clientes from './shared/clientes.json';
import metodosPago from './shared/metodosPago.json';
import impresion from './shared/impresion.json';

/**
 * FACHADA de tipos del backend para el frontend.
 *
 * El frontend importa SOLO de este archivo (alias `@backend/types`): los tipos
 * de Prisma se re-exportan desde aca para que ningun componente dependa
 * directo de `generated/prisma` (artefacto gitignoreado que se regenera con
 * `npm run db:sync` / `prisma generate`).
 */
export type {
  ARTICULOS,
  CLIENTES,
  CLIENTES_MAYORISTAS,
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  LINEAS,
  TIPOS_DE_PAGO,
  ARTICULOS_X_CLIENTE,
} from './generated/prisma/client';

/**
 * Grupo "No Asignado". La base lo pone sola en ARTICULOS.id_grupo (default +
 * ON DELETE SET DEFAULT) cuando se elimina el grupo del articulo. No se puede
 * asignar a mano: se filtra de todo selector de asignacion, pero SI se puede
 * elegir en los filtros (FilterDropdown, ColumnFilterModal, PasoGrupo).
 * Fuente unica: shared/agrupaciones.json (el backend CommonJS lo lee via
 * constants/agrupaciones.js).
 */
export const ID_GRUPO_NO_ASIGNADO = agrupaciones.ID_GRUPO_NO_ASIGNADO;

/**
 * Largo maximo del codigo de barra (columna barcode_tail). Fuente unica:
 * shared/barcode.json (el backend CommonJS lo lee via constants/barcode.js).
 */
export const BARCODE_MAX = barcode.BARCODE_MAX;

/**
 * Roles que pueden entrar a la pagina de Precios y ejecutar la actualizacion
 * masiva. El frontend la usa para esconder la seccion; QUIEN DECIDE de verdad
 * es el backend (lib/roles.js sobre la sesion). Fuente unica:
 * shared/roles.json (el backend CommonJS lo lee via constants/roles.js).
 */
export const ROLES_PRECIOS: readonly string[] = roles.ROLES_PRECIOS;

/**
 * Roles que pueden ELEGIR a que impresora va un trabajo (y administrar el
 * registro de impresoras). El resto imprime siempre en la predeterminada
 * global. El frontend la usa para esconder el selector; QUIEN DECIDE de verdad
 * es services/impresoras.js con el rol de la sesion: si un empleado manda
 * `id_impresora` a mano, el backend lo ignora. Fuente unica:
 * shared/impresion.json (el backend CommonJS lo lee via constants/impresion.js).
 */
export const ROLES_ELIGEN_IMPRESORA: readonly string[] = impresion.ROLES_ELIGEN_IMPRESORA;

/** Largo maximo del nombre de una impresora (columna IMPRESORAS.nombre). */
export const NOMBRE_IMPRESORA_MAX = impresion.NOMBRE_IMPRESORA_MAX;

/**
 * Limites de la actualizacion masiva de precios: el input de la pagina y la
 * validacion de routes/precios.js aceptan exactamente lo mismo. Fuente unica:
 * shared/precios.json (el backend CommonJS los lee via constants/precios.js).
 */
export const PRECIO_MAX = precios.PRECIO_MAX;
export const MAX_ARTICULOS_POR_ACTUALIZACION = precios.MAX_ARTICULOS_POR_ACTUALIZACION;

/**
 * Limites del alta de un cliente final (tabla CLIENTES, la minorista): el
 * formulario del frontend limita lo que se puede tipear y routes/venta.js
 * valida exactamente lo mismo. Fuente unica: shared/clientes.json (el backend
 * CommonJS los lee via constants/clientes.js).
 */
export const NOMBRE_MAX = clientes.NOMBRE_MAX;
export const APELLIDO_MAX = clientes.APELLIDO_MAX;
export const DNI_LARGO = clientes.DNI_LARGO;
export const EMAIL_MAX = clientes.EMAIL_MAX;
export const COD_PAIS_DIGITOS = clientes.COD_PAIS_DIGITOS;
export const COD_AREA_DIGITOS = clientes.COD_AREA_DIGITOS;
export const TELEFONO_DIGITOS = clientes.TELEFONO_DIGITOS;

/**
 * ID's de los metodos de pago existentes en el sistema.
 */

export const ID_METODO_TARJETA = metodosPago.TARJETA;
export const ID_METODO_EFECTIVO = metodosPago.EFECTIVO;

/**
 * Importe de algo (un articulo o un remito) con cada metodo de pago,
 * indexado por id_tipos_de_pago.
 *
 * NO se guarda en la base: el backend lo deriva del precio base con el recargo
 * VIGENTE de cada metodo (services/preciosPorMetodo.js), asi que cambiar un
 * recargo en Configuracion se refleja solo en toda la aplicacion.
 */
export type ImportesPorMetodo = Record<number, number>;

/**
 * Relaciones que se incluyen al consultar REMITOS.
 * Debe reflejar el `remitosInclude` que usa el backend en services/remitos.js.
 * (Se duplica a proposito: aca hace falta a nivel de TIPOS, con literales
 * `true` para REMITOSGetPayload; alla es el objeto runtime de Prisma.)
 */
export const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
  CLIENTES: true,
  PAGOS_REMITO: true,
} as const satisfies Prisma.REMITOSInclude;

/**
 * Una linea de DETALLES_REMITO con el precio que tendria con cada metodo de
 * pago. Es el MISMO valor que se sumo para armar `totales_por_metodo` del
 * remito (services/preciosPorMetodo.js): quien muestre el precio de un
 * articulo de un remito ya guardado tiene que leer este campo, nunca volver a
 * aplicar el recargo por su cuenta, o el precio del articulo podria dejar de
 * coincidir con el total.
 */
export type DetalleRemitoConPrecios = Prisma.REMITOSGetPayload<{
  include: typeof remitosInclude;
}>['DETALLES_REMITO'][number] & {
  precios_por_metodo: ImportesPorMetodo;
};

/**
 * Un REMITO (venta) con sus detalles, el cliente final asignado y los pagos con
 * los que se cobro (vacio mientras siga pendiente).
 */
export type RemitoConDetalles = Omit<
  Prisma.REMITOSGetPayload<{ include: typeof remitosInclude }>,
  'DETALLES_REMITO'
> & {
  DETALLES_REMITO: DetalleRemitoConPrecios[];
  /** Cuanto sale cobrarlo con cada metodo de pago. Lo calcula el backend. */
  totales_por_metodo: ImportesPorMetodo;
};

/** Estados de la tabla ESTADOS_REMITOS. Fuente unica: shared/ventas.json
 *  (el backend CommonJS los lee via constants/ventas.js). */
export const ESTADO_CONFIRMADO = ventas.ESTADOS.CONFIRMADO;
export const ESTADO_FACTURADO = ventas.ESTADOS.FACTURADO;
export const ESTADO_ANULADO = ventas.ESTADOS.ANULADO;
export const ESTADO_DEVUELTO = ventas.ESTADOS.DEVUELTO;

/**
 * Respuesta de POST /api/remitos: el remito ya quedo guardado como CONFIRMADO
 * (pendiente de cobro). La venta se registra igual aunque la impresora falle,
 * por eso `impresion.status` viene aparte: 'omitida' es cuando se salteo a
 * proposito con el boton "Sin Imprimir".
 */
export type RemitoCreado = RemitoConDetalles & {
  impresion: { status: 'ok' | 'error' | 'omitida'; message?: string };
};
