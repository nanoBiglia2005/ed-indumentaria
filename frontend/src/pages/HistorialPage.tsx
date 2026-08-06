import { useCallback, useEffect, useState } from 'react';
import type { RemitoConDetalles, VentaImpresa } from '../../../backend/types';
import RemitoCard from '../RemitoCard';
import SectionWrapper from '../SectionWrapper';

function HistorialPage() {
  const [remitos, setRemitos] = useState<RemitoConDetalles[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0'>
        <div className='flex items-center justify-between mb-5 shrink-0'>
          <span className='text-2xl font-semibold text-black'>Ventas</span>
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
    </SectionWrapper>
  );
}

export default HistorialPage;
