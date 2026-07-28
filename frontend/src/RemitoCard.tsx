import { useState } from 'react';
import type { RemitoConDetalles } from '../../backend/types';

// Las fechas de REMITOS son columnas @db.Date, o sea medianoche UTC. Hay que
// leerlas en UTC: con la hora local de Argentina (UTC-3) caerian el dia anterior.
function formatearFecha(fecha: Date | string | null): string {
  if (!fecha) return 'Sin fecha';
  const valor = new Date(fecha);
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
}

interface RemitoCardProps {
  remito: RemitoConDetalles;
  abiertoPorDefecto?: boolean;
}

function RemitoCard({ remito, abiertoPorDefecto = false }: RemitoCardProps) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto);

  // shrink-0: dentro de la lista en columna, si no, las tarjetas se aplastan
  // en vez de dejar scrollear cuando hay muchas ventas.
  return (
    <div className='w-full shrink-0 border border-violet-500 rounded-xl shadow select-none overflow-hidden'>
      <button
        type='button'
        onClick={() => setAbierto((prev) => !prev)}
        className='w-full flex items-center justify-between gap-4 px-5 py-3 cursor-pointer text-left hover:bg-amber-50 transition-color duration-100 ease-in'
      >
        <div className='flex gap-8'>
          <div className='flex flex-col'>
            <span className='text-xs text-gray-400'>Fecha de Emisión</span>
            <span className='text-black font-medium'>{formatearFecha(remito.fecha_de_emision)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-xs text-gray-400'>Fecha de Creación</span>
            <span className='text-black font-medium'>{formatearFecha(remito.fecha_de_creacion)}</span>
          </div>
        </div>
        <div className='flex items-center gap-4 shrink-0'>
          <span className='text-lg font-semibold text-violet-600'>{remito.total_neto ?? 0}$</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ease-in-out ${
              abierto ? 'rotate-180' : ''
            }`}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
          </svg>
        </div>
      </button>

      <div
        className={`overflow-y-auto border-t transition-all duration-200 ease-in-out ${
          abierto ? 'max-h-60 border-black/10' : 'max-h-0 border-transparent'
        }`}
      >
        <div className='px-5 py-2 divide-y divide-black/5'>
          {remito.DETALLES_REMITO.length === 0 ? (
            <p className='text-sm text-gray-400 italic py-2'>Sin artículos</p>
          ) : (
            remito.DETALLES_REMITO.map((detalle) => (
              <div key={detalle.id_detalle} className='flex items-center justify-between gap-3 py-2 text-sm text-black'>
                <span className='truncate'>{detalle.ARTICULOS?.descripcion ?? `Artículo ${detalle.id_articulo}`}</span>
                <div className='flex items-center gap-4 shrink-0 text-gray-600'>
                  <span>x{detalle.cantidad}</span>
                  <span className='font-medium text-black w-16 text-right'>{detalle.precio ?? 0}$</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RemitoCard;
