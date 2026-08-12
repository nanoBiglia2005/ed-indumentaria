import { useState } from 'react';
import type { RemitoConDetalles, RemitoCreado } from '@backend/types';
import { useFetchLista } from '@/hooks/useFetchLista';
import { listarRemitosPendientes } from '@/api/remitos';
import AnularRemitoModal from '@/features/ventas/modales/AnularRemitoModal';
import ListaDeRemitos from '@/features/ventas/ListaDeRemitos';
import MetodoPagoModal from '@/features/ventas/modales/MetodoPagoModal';
import NuevaVentaModal from '@/features/ventas/modales/NuevaVentaModal';
import SectionWrapper from '@/components/layout/SectionWrapper';
import VentaExitosaModal from '@/features/ventas/modales/VentaExitosaModal';

function VentasPage() {
  const {
    datos: pendientes,
    cargando,
    error,
    recargar: fetchPendientes,
  } = useFetchLista(
    listarRemitosPendientes,
    'No se pudieron cargar las ventas pendientes.',
    'Error al obtener las ventas pendientes'
  );

  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
  // Remito recien registrado: se pregunta si se sigue al pago.
  const [ventaRegistrada, setVentaRegistrada] = useState<RemitoCreado | null>(null);
  // Remito que se esta cobrando / anulando.
  const [remitoACobrar, setRemitoACobrar] = useState<RemitoConDetalles | null>(null);
  const [remitoAAnular, setRemitoAAnular] = useState<RemitoConDetalles | null>(null);

  const handleVentaRegistrada = (remito: RemitoCreado) => {
    setIsNuevaVentaOpen(false);
    fetchPendientes();
    setVentaRegistrada(remito);
  };

  const handleSeguirAlPago = (remito: RemitoCreado) => {
    setVentaRegistrada(null);
    setRemitoACobrar(remito);
  };

  // Ya no esta pendiente: sale de la lista y pasa al historial.
  const handleFacturado = () => {
    setRemitoACobrar(null);
    fetchPendientes();
  };

  const handleAnulado = () => {
    setRemitoAAnular(null);
    fetchPendientes();
  };

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0 items-center'>
        <button
          type='button'
          onClick={() => setIsNuevaVentaOpen(true)}
          className='rounded flex items-center text-[25px] w-fit py-2 px-4 text-white font-semibold border cursor-pointer bg-violet-500 hover:bg-violet-600 active:bg-violet-700 transition-color duration-100 ease-in'
        >
          Iniciar Nueva Venta
        </button>

        <span className='text-2xl font-semibold text-black w-full mt-10 mb-4 shrink-0'>
          Ventas Pendientes
        </span>

        <ListaDeRemitos
          remitos={pendientes}
          cargando={cargando}
          error={error}
          textoCargando='Cargando ventas pendientes...'
          textoVacio='No hay ventas pendientes de cobro.'
          anchoCompleto
          onPagar={setRemitoACobrar}
          onAnular={setRemitoAAnular}
        />
      </div>

      <NuevaVentaModal
        abierto={isNuevaVentaOpen}
        onCerrar={() => setIsNuevaVentaOpen(false)}
        onVentaRegistrada={handleVentaRegistrada}
      />

      <VentaExitosaModal
        abierto={ventaRegistrada !== null}
        remito={ventaRegistrada}
        onCerrar={() => setVentaRegistrada(null)}
        onSeguirAlPago={handleSeguirAlPago}
      />

      <MetodoPagoModal
        abierto={remitoACobrar !== null}
        remito={remitoACobrar}
        onCerrar={() => setRemitoACobrar(null)}
        onFacturado={handleFacturado}
      />

      <AnularRemitoModal
        abierto={remitoAAnular !== null}
        remito={remitoAAnular}
        onCerrar={() => setRemitoAAnular(null)}
        onAnulado={handleAnulado}
      />
    </SectionWrapper>
  );
}

export default VentasPage;
