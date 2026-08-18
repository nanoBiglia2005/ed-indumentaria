import type { Prisma } from './generated/prisma/client';
import ventas from './shared/ventas.json';
import agrupaciones from './shared/agrupaciones.json';
import barcode from './shared/barcode.json';
import roles from './shared/roles.json';
import precios from './shared/precios.json';
import clientes from './shared/clientes.json';

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
 * Limites y prefijo generico del codigo de barra. El prefijo es el que la base
 * antepone cuando el articulo no tiene header propio, y con el se arma el
 * codigo completo en los dos lados: el frontend para mostrarlo, el backend para
 * filtrarlo y ordenarlo en SQL. Si dejan de coincidir, buscar por codigo deja
 * de encontrar. Fuente unica: shared/barcode.json (el backend CommonJS lo lee
 * via constants/barcode.js).
 */
export const BARCODE_HEADER_GENERICO = barcode.BARCODE_HEADER_GENERICO;
export const BARCODE_HEADER_MAX = barcode.BARCODE_HEADER_MAX;
export const BARCODE_TAIL_MAX = barcode.BARCODE_TAIL_MAX;

/**
 * Roles que pueden entrar a la pagina de Precios y ejecutar la actualizacion
 * masiva. El frontend la usa para esconder la seccion; QUIEN DECIDE de verdad
 * es el backend (lib/roles.js sobre la sesion). Fuente unica:
 * shared/roles.json (el backend CommonJS lo lee via constants/roles.js).
 */
export const ROLES_PRECIOS: readonly string[] = roles.ROLES_PRECIOS;

/**
 * Roles que pueden entrar al ambiente de prueba (las paginas `*Prueba` y las
 * rutas `/api/*-prueba`, donde se arman las funcionalidades nuevas sin tocar
 * las que estan en uso). Igual que arriba: el frontend esconde la seccion, pero
 * QUIEN DECIDE es el backend (lib/roles.js sobre la sesion). Fuente unica:
 * shared/roles.json (el backend CommonJS lo lee via constants/roles.js).
 */
export const ROLES_PRUEBA: readonly string[] = roles.ROLES_PRUEBA;

/**
 * Limites de la actualizacion masiva de precios: el input de la pagina y la
 * validacion de routes/precios.js aceptan exactamente lo mismo. Fuente unica:
 * shared/precios.json (el backend CommonJS los lee via constants/precios.js).
 */
export const PRECIO_MAX = precios.PRECIO_MAX;
export const MAX_ARTICULOS_POR_ACTUALIZACION = precios.MAX_ARTICULOS_POR_ACTUALIZACION;

/**
 * Limites del alta de un cliente final (tabla CLIENTES, la minorista): el
 * formulario del frontend limita lo que se puede tipear y routes/ventaPrueba.js
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
 * Relaciones que se incluyen al consultar REMITOS.
 * Debe reflejar el `remitosInclude` que usa el backend en services/remitos.js.
 * (Se duplica a proposito: aca hace falta a nivel de TIPOS, con literales
 * `true` para REMITOSGetPayload; alla es el objeto runtime de Prisma.)
 */
export const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
} as const satisfies Prisma.REMITOSInclude;

/**
 * Tipo de un REMITO (venta) con sus detalles y articulos ya cargados.
 */
export type RemitoConDetalles = Prisma.REMITOSGetPayload<{
  include: typeof remitosInclude;
}>;

/** Como se paga un articulo de la venta. */
export type MetodoPago = 'efectivo' | 'tarjeta';

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

/**
 * Igual que `remitosInclude` pero con el cliente final del remito
 * (REMITOS.id_cliente -> CLIENTES). Lo usa el flujo de venta de PRUEBA, que es
 * el unico que asigna un cliente; el resto de las rutas sigue con
 * `remitosInclude` para no cambiar lo que ya devuelven.
 */
export const remitosConClienteInclude = {
  ...remitosInclude,
  CLIENTES: true,
} as const satisfies Prisma.REMITOSInclude;

/** Remito con sus detalles Y el cliente final asignado (o null). */
export type RemitoConCliente = Prisma.REMITOSGetPayload<{
  include: typeof remitosConClienteInclude;
}>;

/** Respuesta de POST /api/venta-prueba/remitos. */
export type RemitoCreadoConCliente = RemitoConCliente & {
  impresion: { status: 'ok' | 'error' | 'omitida'; message?: string };
};

/**
 * Una linea de un remito pendiente con sus dos precios posibles, ya redondeados
 * por el backend. El frontend muestra estos valores tal cual: el redondeo vive
 * en un solo lugar. Se identifica por `id_detalle` (la fila de DETALLES_REMITO).
 */
export type ItemPago = {
  id_detalle: number;
  descripcion: string;
  cantidad: number;
  precio_efectivo: number;
  precio_tarjeta: number;
};

/** Respuesta de GET /api/remitos/:id/opciones-pago. */
export type OpcionesDePago = {
  items: ItemPago[];
  recargo_tarjeta: number;
};
