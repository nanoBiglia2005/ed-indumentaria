import { useState } from 'react';
import type { RemitoConDetalles, VentaImpresa } from '../../../backend/types';
import MetodoPagoModal from '../MetodoPagoModal';
import NuevaVentaModal from '../NuevaVentaModal';
import SectionWrapper from '../SectionWrapper';
import VentaExitosaModal from '../VentaExitosaModal';

function VentasPage() {
  // Los tres pasos de una venta: elegir productos -> elegir metodo de pago -> resultado.
  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
  const [ventaPendiente, setVentaPendiente] = useState<VentaImpresa | null>(null);
  const [ventaCreada, setVentaCreada] = useState<RemitoConDetalles | null>(null);

  // Ya se imprimio el ticket pero todavia no hay nada en la base: cierra la
  // seleccion de productos y pasa a elegir como se paga.
  const handleVentaImpresa = (venta: VentaImpresa) => {
    setIsNuevaVentaOpen(false);
    setVentaPendiente(venta);
  };

  const handleVentaCreada = (remito: RemitoConDetalles) => {
    setVentaPendiente(null);
    setVentaCreada(remito);
  };

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0 items-center'>
        <button
            type='button'
            onClick={() => setIsNuevaVentaOpen(true)}
            className='rounded flex items-center text-[25px] w-50 py-2 px-4 text-white font-semibold border cursor-pointer bg-violet-500 hover:bg-violet-600 active:bg-violet-700 transition-color duration-100 ease-in'
          >
            Iniciar Nueva Venta
        </button>
        <span className='text-2xl font-semibold text-black w-full mt-10'>Ventas Pendientes</span>
      </div>

      <NuevaVentaModal
        isOpen={isNuevaVentaOpen}
        onClose={() => setIsNuevaVentaOpen(false)}
        onVentaImpresa={handleVentaImpresa}
      />

      <MetodoPagoModal
        venta={ventaPendiente}
        onClose={() => setVentaPendiente(null)}
        onVentaCreada={handleVentaCreada}
      />

      <VentaExitosaModal remito={ventaCreada} onClose={() => setVentaCreada(null)} />
    </SectionWrapper>
  );
}

export default VentasPage;
