import type { TIPOS_DE_PAGO } from '@backend/types';
import PaymentIcon from '@/components/ui/PaymentIcon';
import { preciosDeArticuloPorMetodo } from '@/utils/precios';
import { formatearPesos } from '@/utils/formato';

interface PreciosPorMetodoProps {
  /** Precio base del articulo. */
  precio: number;
  metodos: TIPOS_DE_PAGO[];
  tamanoIcono?: number;
  tamanoTexto?: string;
  /** Clases del contenedor: por defecto una fila que envuelve. */
  claseContenedor?: string;
}

/**
 * Precio de un articulo con cada metodo de pago, con el icono del metodo a la
 * izquierda. El metodo sin recargo se muestra en gris (es el precio base) y los
 * que tienen recargo en violeta, igual que en Ventas.
 */
export default function PreciosPorMetodo({
  precio,
  metodos,
  tamanoIcono = 20,
  tamanoTexto= 'sm',
  claseContenedor = 'flex flex-wrap items-center gap-x-4 gap-y-1',
}: PreciosPorMetodoProps) {
  if (metodos.length === 0) return null;

  return (
    <div className={claseContenedor}>
      {preciosDeArticuloPorMetodo(precio, metodos).map(({ metodo, precio: precioDelMetodo }) => (
        <span
          key={metodo.id_tipos_de_pago}
          title={`Precio con ${metodo.nombre_tipo_de_pago}${
            metodo.recargo > 0 ? ` (${metodo.recargo}% de recargo)` : ''
          }`}
          className={`flex items-center gap-1 text-${tamanoTexto} font-medium px-3 py-1 ${
            metodo.recargo > 0 ? 'text-violet-600' : 'text-gray-600'
          }`}
        >
          <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={tamanoIcono} />
          {formatearPesos(precioDelMetodo)}
        </span>
      ))}
    </div>
  );
}
