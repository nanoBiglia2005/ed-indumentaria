import type { MetodoPago } from '@backend/types';
import SegmentedToggle from './SegmentedToggle';

const OPCIONES = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
] as const;

interface PaymentToggleProps {
  valor: MetodoPago;
  onChange: (metodo: MetodoPago) => void;
  /** Version chica, para el toggle de cada articulo. */
  compacto?: boolean;
}

export default function PaymentToggle({ valor, onChange, compacto = false }: PaymentToggleProps) {
  return (
    <SegmentedToggle<MetodoPago>
      valor={valor}
      opciones={OPCIONES}
      onChange={onChange}
      compacto={compacto}
    />
  );
}
