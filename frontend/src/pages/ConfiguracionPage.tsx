import { useEffect, useState } from 'react';
import type { TIPOS_DE_PAGO } from '../../../backend/generated/prisma/client';
import EditRecargoModal from '../EditRecargoModal';
import SectionWrapper from '../SectionWrapper';

function ConfiguracionPage() {
  const [tiposDePago, setTiposDePago] = useState<TIPOS_DE_PAGO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tipoDePagoAEditar, setTipoDePagoAEditar] = useState<TIPOS_DE_PAGO | null>(null);

  const fetchTiposDePago = () => {
    setCargando(true);
    fetch('/api/tipos-de-pago')
      .then((respuesta) => respuesta.json())
      .then((data) => {
        setTiposDePago(data);
        setError(null);
      })
      .catch((error) => {
        console.error('Error al obtener los tipos de pago:', error);
        setError('No se pudieron cargar los medios de pago.');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    fetchTiposDePago();
  }, []);

  const abrirEdicionRecargo = (tipoDePago: TIPOS_DE_PAGO) => {
    setTipoDePagoAEditar(tipoDePago);
    setIsEditModalOpen(true);
  };

  const handleRecargoActualizado = (tipoDePagoActualizado: TIPOS_DE_PAGO) => {
    setTiposDePago((actual) =>
      actual.map((t) =>
        t.id_tipos_de_pago === tipoDePagoActualizado.id_tipos_de_pago ? tipoDePagoActualizado : t
      )
    );
  };

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10'>
        <span className='text-2xl font-semibold text-black mb-5'>Medios de Pago</span>

        {cargando && <span className='text-gray-400'>Cargando medios de pago...</span>}

        {!cargando && error && <span className='text-red-500'>{error}</span>}

        {!cargando && !error && tiposDePago.length === 0 && (
          <span className='text-gray-400'>No hay medios de pago registrados.</span>
        )}

        {!cargando && !error && tiposDePago.length > 0 && (
          <div className='w-full flex flex-wrap gap-4'>
            {tiposDePago.map((tipoDePago) => (
              <div
                key={tipoDePago.id_tipos_de_pago}
                className='w-[200px] hover:shadow-lg transition-all duration-100 ease-in px-4 py-4 border-violet-500 border flex flex-col rounded text-black'
              >
                <span className='text-xl font-semibold truncate' title={tipoDePago.nombre_tipo_de_pago ?? undefined}>
                  {tipoDePago.nombre_tipo_de_pago ?? 'Sin nombre'}
                </span>
                <span className='text-md text-gray-600'>
                  Recargo: {tipoDePago.recargo}
                  {tipoDePago.signo ? '%' : ''}
                </span>
                <div className='px-1'>
                  <button
                    type='button'
                    onClick={() => abrirEdicionRecargo(tipoDePago)}
                    className='border border-violet-400 transition-color duration-100 ease-in hover:bg-violet-400 hover:text-white rounded w-full py-1 text-sm text-center mt-7 cursor-pointer'
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditRecargoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleRecargoActualizado}
        tipoDePago={tipoDePagoAEditar}
      />
    </SectionWrapper>
  );
}

export default ConfiguracionPage;
