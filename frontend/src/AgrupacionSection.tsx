import { useState } from 'react';
import type { GRUPOS_DE_VENTA } from '../../backend/generated/prisma/client';
import CrearAgrupacionModal from './CrearAgrupacionModal';
import type { TipoAgrupacion } from './CrearAgrupacionModal';
import EliminarAgrupacionModal from './EliminarAgrupacionModal';

const CANTIDAD_INICIAL = 20;
const CANTIDAD_INCREMENTO = 10;

export interface ItemAgrupacion {
  id: number;
  nombre: string;
  /** Segunda linea de la tarjeta (ej. el grupo de un subgrupo, o Colegio/Club). */
  subtitulo?: string;
  /** Solo subgrupo: para precargar el selector de grupo al editar. */
  idGrupo?: number | null;
  /** Solo colegio/club: para precargar el toggle al editar. */
  tipoCliente?: 1 | 2;
}

interface AgrupacionSectionProps {
  titulo: string;
  tipo: TipoAgrupacion;
  crearLabel: string;
  emptyMessage: string;
  items: ItemAgrupacion[];
  grupos: GRUPOS_DE_VENTA[];
  onRefrescar: () => void;
}

export default function AgrupacionSection({
  titulo,
  tipo,
  crearLabel,
  emptyMessage,
  items,
  grupos,
  onRefrescar,
}: AgrupacionSectionProps) {
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAnterior, setBusquedaAnterior] = useState('');
  const [cantidadVisible, setCantidadVisible] = useState(CANTIDAD_INICIAL);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [itemAEditar, setItemAEditar] = useState<ItemAgrupacion | null>(null);
  const [itemAEliminar, setItemAEliminar] = useState<ItemAgrupacion | null>(null);

  // Al cambiar la busqueda se reinicia la paginacion. Se ajusta durante el
  // render (en vez de en un efecto) para no disparar un re-render extra.
  if (busqueda !== busquedaAnterior) {
    setBusquedaAnterior(busqueda);
    setCantidadVisible(CANTIDAD_INICIAL);
  }

  const itemsFiltrados =
    busqueda.trim() === ''
      ? items
      : items.filter((item) => item.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  const itemsVisibles = itemsFiltrados.slice(0, cantidadVisible);
  const hayMas = itemsFiltrados.length > cantidadVisible;
  const seExpandio = cantidadVisible > CANTIDAD_INICIAL;

  return (
    <div className='mb-10'>
      <div className='flex items-center gap-3 mb-5 flex-wrap'>
        <span className='text-2xl font-semibold text-black'>{titulo}</span>
        <button
          type='button'
          onClick={() => setCrearAbierto(true)}
          className='rounded flex items-center py-1.5 px-3 text-white font-semibold text-sm border cursor-pointer bg-violet-500 hover:bg-violet-600 transition-color duration-100 ease-in'
        >
          + {crearLabel}
        </button>

        <div className='relative ml-auto w-64 flex items-center'>
          <svg
            className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.35 4.35a7.5 7.5 0 0012.3 12.3z'
            />
          </svg>
          <input
            type='text'
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder='Buscar...'
            className='w-full rounded border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm text-gray-700 placeholder:text-gray-400 transition-colors duration-100 ease-in hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
          />
          {busqueda && (
            <button
              type='button'
              onClick={() => setBusqueda('')}
              className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer font-bold text-gray-400 hover:text-violet-600'
            >
              ×
            </button>
          )}
        </div>
      </div>

      {items.length === 0 && <span className='text-gray-400'>{emptyMessage}</span>}

      {items.length > 0 && itemsFiltrados.length === 0 && (
        <span className='text-gray-400 italic'>Sin resultados.</span>
      )}

      {itemsVisibles.length > 0 && (
        <>
          <div className='w-full flex flex-wrap gap-4'>
            {itemsVisibles.map((item) => (
              <div
                key={item.id}
                className='w-[200px] group relative h-fit hover:shadow-lg transition-all duration-100 ease-in px-4 py-4 border-violet-500 border flex flex-col rounded text-black'
              >
                <span className='text-xl font-semibold truncate' title={item.nombre}>
                  {item.nombre}
                </span>
                {item.subtitulo && <span className='text-md text-gray-600'>{item.subtitulo}</span>}

                <div className='px-1 overflow-hidden max-h-0 opacity-0 -translate-y-1 group-hover:max-h-12 group-hover:opacity-100 group-hover:translate-y-0 group-hover:mt-3 transition-all duration-200 ease-in-out flex gap-2'>
                  <button
                    type='button'
                    onClick={() => setItemAEditar(item)}
                    className='flex-1 border transition-color duration-100 ease-in bg-violet-500 hover:bg-violet-600 text-white rounded py-1 text-sm text-center cursor-pointer'
                  >
                    Editar
                  </button>
                  <button
                    type='button'
                    onClick={() => setItemAEliminar(item)}
                    className='flex-1 border transition-color duration-100 ease-in bg-red-500 hover:bg-red-600 text-white rounded py-1 text-sm text-center cursor-pointer'
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {(hayMas || seExpandio) && (
            <div className='mt-4 flex gap-3'>
              {hayMas && (
                <button
                  type='button'
                  onClick={() => setCantidadVisible((actual) => actual + CANTIDAD_INCREMENTO)}
                  className='px-4 py-1.5 text-sm font-medium text-violet-600 border border-violet-600 rounded-md hover:bg-violet-50 transition-colors cursor-pointer'
                >
                  Ver más
                </button>
              )}
              {seExpandio && (
                <button
                  type='button'
                  onClick={() => setCantidadVisible(CANTIDAD_INICIAL)}
                  className='px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer'
                >
                  Ver menos
                </button>
              )}
            </div>
          )}
        </>
      )}

      <CrearAgrupacionModal
        isOpen={crearAbierto || itemAEditar !== null}
        onClose={() => {
          setCrearAbierto(false);
          setItemAEditar(null);
        }}
        onGuardado={() => {
          onRefrescar();
          setCrearAbierto(false);
          setItemAEditar(null);
        }}
        tipo={tipo}
        grupos={grupos}
        edicion={
          itemAEditar
            ? {
                id: itemAEditar.id,
                nombre: itemAEditar.nombre,
                idGrupo: itemAEditar.idGrupo,
                tipoCliente: itemAEditar.tipoCliente,
              }
            : null
        }
      />

      <EliminarAgrupacionModal
        isOpen={itemAEliminar !== null}
        onClose={() => setItemAEliminar(null)}
        onEliminado={() => {
          onRefrescar();
          setItemAEliminar(null);
        }}
        tipo={tipo}
        item={itemAEliminar}
      />
    </div>
  );
}
