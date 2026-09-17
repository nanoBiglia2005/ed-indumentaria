import { ESTADO_ANULADO, ESTADO_CONFIRMADO, ESTADO_DEVUELTO, ESTADO_FACTURADO } from '@backend/types';

/**
 * Compartido por RemitoCard (lo muestra) y MedidorAnchosRemitoCard (lo mide):
 * separado en su propio archivo porque un modulo que exporta un componente no
 * puede exportar ademas constantes sueltas (react-refresh/only-export-components).
 */
export const PALABRA_POR_ESTADO: Record<number, string> = {
  [ESTADO_CONFIRMADO]: 'Confirmada',
  [ESTADO_FACTURADO]: 'Paga',
  [ESTADO_ANULADO]: 'Anulada',
  [ESTADO_DEVUELTO]: 'Devuelta',
};

/**
 * Color segun el estado del remito (tabla ESTADOS_REMITOS).
 *
 * Las clases van ENTERAS y no armadas como `'text-' + color`: Tailwind escanea
 * el codigo buscando nombres de clase completos, asi que una clase concatenada
 * no se genera nunca. Si alguna parecia funcionar era de rebote, porque ese
 * mismo texto literal aparecia en otro archivo.
 *
 * Los tres primeros estados usan los tokens del sistema (`marca` / `acento` /
 * `neutro`); `devuelto` se queda en rojo Tailwind literal a proposito: es
 * semantica de perdida, ajena a la identidad de marca, igual que los botones
 * destructivos.
 *
 * Vive aca (y no en RemitoCard.tsx) porque tambien lo usa DetalleRemitoModal:
 * duplicar el objeto significaria que la pill del modal y la de la tarjeta
 * puedan divergir de color.
 */
export type EstiloDeEstado = { borde: string; texto: string; fondo: string };

export const ESTILO_POR_ESTADO: Record<number, EstiloDeEstado> = {
  [ESTADO_CONFIRMADO]: {
    borde: 'border-acento-500',
    texto: 'text-acento-500',
    fondo: 'bg-acento-500',
  },
  [ESTADO_FACTURADO]: {
    borde: 'border-marca-500',
    texto: 'text-marca-500',
    fondo: 'bg-marca-500',
  },
  [ESTADO_ANULADO]: {
    borde: 'border-neutro-600',
    texto: 'text-neutro-600',
    fondo: 'bg-neutro-600',
  },
  [ESTADO_DEVUELTO]: {
    borde: 'border-red-500',
    texto: 'text-red-500',
    fondo: 'bg-red-500',
  },
};

/** Estilo + palabra del estado, con FACTURADO / 'Desconocido' como respaldo. */
export const estiloDeEstado = (id_estado: number | null) => ({
  estilo: ESTILO_POR_ESTADO[id_estado ?? ESTADO_FACTURADO] ?? ESTILO_POR_ESTADO[ESTADO_FACTURADO],
  palabra: PALABRA_POR_ESTADO[id_estado ?? ESTADO_FACTURADO] ?? 'Desconocido',
});

/**
 * Anchos de respaldo (px) de las 6 columnas de valor variable de RemitoCard,
 * hasta que ListaDeRemitos mida los remitos visibles (ver
 * MedidorAnchosRemitoCard). Las claves son las mismas que `filtroKey` en
 * campos.ts (asi el medidor y la barra de filtros no necesitan una tabla de
 * mapeo aparte). codigo/estado/total son los mismos valores que tenian las
 * clases fijas w-30/w-18/w-29 que reemplazaron; cliente/fecha_emision/
 * fecha_creacion son una estimacion razonable (nunca tuvieron clase fija) que
 * solo se usa como flash inicial, antes de la primera medicion real.
 */
export const ANCHOS_REMITO_CARD_POR_DEFECTO = {
  codigo: 120,
  cliente: 140,
  estado: 72,
  fecha_emision: 110,
  fecha_creacion: 110,
  total: 116,
};

/** Ancho (px) final por campo: max(contenido medido, etiqueta del boton). */
export type AnchosRemitoCard = typeof ANCHOS_REMITO_CARD_POR_DEFECTO;
