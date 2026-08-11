import { useCallback, useEffect, useState } from 'react';
import type { RemitoConDetalles, RemitoCreado } from '../../../backend/types';
import AnularRemitoModal from '../AnularRemitoModal';
import MetodoPagoModal from '../MetodoPagoModal';
import NuevaVentaModal from '../NuevaVentaModal';
import RemitoCard from '../RemitoCard';
import SectionWrapper from '../SectionWrapper';
import VentaExitosaModal from '../VentaExitosaModal';

function VentasPage() {
  const [pendientes, setPendientes] = useState<RemitoConDetalles[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
  // Remito recien registrado: se pregunta si se sigue al pago.
  const [ventaRegistrada, setVentaRegistrada] = useState<RemitoCreado | null>(null);
  // Remito que se esta cobrando / anulando.
  const [remitoACobrar, setRemitoACobrar] = useState<RemitoConDetalles | null>(null);
  const [remitoAAnular, setRemitoAAnular] = useState<RemitoConDetalles | null>(null);

  const fetchPendientes = useCallback(() => {
    setCargando(true);
    fetch('/api/remitos/pendientes')
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error('No se pudo obtener el listado de ventas pendientes.');
        return respuesta.json();
      })
      .then((data) => {
        setPendientes(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error al obtener las ventas pendientes:', err);
        setError('No se pudieron cargar las ventas pendientes.');
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    fetchPendientes();
  }, [fetchPendientes]);

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

        {cargando && <span className='text-gray-400 w-full'>Cargando ventas pendientes...</span>}

        {!cargando && error && <span className='text-red-500 w-full'>{error}</span>}

        {!cargando && !error && pendientes.length === 0 && (
          <span className='text-gray-400 w-full'>No hay ventas pendientes de cobro.</span>
        )}

        {!cargando && !error && pendientes.length > 0 && (
          <div className='flex flex-col gap-3 w-full flex-1 min-h-0 overflow-y-auto pr-1 pb-6'>
            {pendientes.map((remito) => (
              <RemitoCard
                key={remito.id_remito}
                remito={remito}
                onPagar={setRemitoACobrar}
                onAnular={setRemitoAAnular}
              />
            ))}
          </div>
        )}
      </div>

      <NuevaVentaModal
        isOpen={isNuevaVentaOpen}
        onClose={() => setIsNuevaVentaOpen(false)}
        onVentaRegistrada={handleVentaRegistrada}
      />

      <VentaExitosaModal
        remito={ventaRegistrada}
        onClose={() => setVentaRegistrada(null)}
        onSeguirAlPago={handleSeguirAlPago}
      />

      <MetodoPagoModal
        remito={remitoACobrar}
        onClose={() => setRemitoACobrar(null)}
        onFacturado={handleFacturado}
      />

      <AnularRemitoModal
        remito={remitoAAnular}
        onClose={() => setRemitoAAnular(null)}
        onAnulado={handleAnulado}
      />
    </SectionWrapper>
  );
}

export default VentasPage;
