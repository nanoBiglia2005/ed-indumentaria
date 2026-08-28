/**
 * Orden de talles, compartido por la tabla del wizard de venta y la tabla de
 * Precios. Estaba en features/ventas/agregar-producto/columnasVenta.tsx: se
 * movio aca tal cual al aparecer el segundo uso.
 */

/**
 * Convierte un talle a numero cuando se puede: "1" < "2" < "22" en vez del
 * orden alfabetico ("10" < "2" para un string). No todos los talles son
 * numericos (S, M, L, ...), asi que se conserva el string cuando no se puede.
 */
export function valorOrdenTalle(talle: string | null): string | number | null {
  if (!talle) return null;
  const recortado = talle.trim();
  if (recortado === '') return null;
  const numero = Number(recortado);
  return Number.isNaN(numero) ? recortado : numero;
}

/**
 * Compara dos talles: los numericos entre si por valor, el resto alfabetico y
 * los vacios siempre al final (sin importar la direccion del orden).
 */
export function compararTalles(a: string | null, b: string | null): number {
  const talleA = valorOrdenTalle(a);
  const talleB = valorOrdenTalle(b);
  if (talleA === null && talleB === null) return 0;
  if (talleA === null || talleB === null) return talleA === null ? 1 : -1;
  return typeof talleA === 'number' && typeof talleB === 'number'
    ? talleA - talleB
    : String(talleA).localeCompare(String(talleB));
}
