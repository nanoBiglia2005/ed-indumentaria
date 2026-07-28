import { useCallback, useEffect, useState } from 'react';
import type { RemitoConDetalles, RemitoCreado } from '../../../backend/types';
import NuevaVentaModal from '../NuevaVentaModal';
import RemitoCard from '../RemitoCard';
import SectionWrapper from '../SectionWrapper';
import VentaExitosaModal from '../VentaExitosaModal';

function VentasPage() {
  const [remitos, setRemitos] = useState<RemitoConDetalles[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
  const [ventaCreada, setVentaCreada] = useState<RemitoCreado | null>(null);

  const fetchRemitos = useCallback(() => {
    setCargando(true);
    fetch('/api/remitos')
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error('No se pudo obtener el listado de ventas.');
        return respuesta.json();
      })
      .then((data) => {
        setRemitos(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error al obtener las ventas:', err);
        setError('No se pudieron cargar las ventas.');
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    fetchRemitos();
  }, [fetchRemitos]);

  const handleVentaCreada = (remito: RemitoCreado) => {
    setIsNuevaVentaOpen(false);
    fetchRemitos();
    setVentaCreada(remito);
  };

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0'>
        <div className='flex items-center justify-between mb-5 shrink-0'>
          <span className='text-2xl font-semibold text-black'>Ventas</span>
          <button
            type='button'
            onClick={() => setIsNuevaVentaOpen(true)}
            className='rounded flex items-center text-xl py-2 px-4 text-white font-semibold border cursor-pointer bg-violet-500 hover:bg-violet-600 active:bg-violet-700 transition-color duration-100 ease-in'
          >
            Nueva Venta
          </button>
        </div>

        {cargando && <span className='text-gray-400'>Cargando ventas...</span>}

        {!cargando && error && <span className='text-red-500'>{error}</span>}

        {!cargando && !error && remitos.length === 0 && (
          <span className='text-gray-400'>No hay ventas registradas.</span>
        )}

        {!cargando && !error && remitos.length > 0 && (
          <div className='flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-1 pb-6'>
            {remitos.map((remito) => (
              <RemitoCard key={remito.id_remito} remito={remito} />
            ))}
          </div>
        )}
      </div>

      <NuevaVentaModal
        isOpen={isNuevaVentaOpen}
        onClose={() => setIsNuevaVentaOpen(false)}
        onVentaCreada={handleVentaCreada}
      />

      <VentaExitosaModal remito={ventaCreada} onClose={() => setVentaCreada(null)} />
    </SectionWrapper>
  );
}

export default VentasPage;
