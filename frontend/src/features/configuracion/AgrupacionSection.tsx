import { useState } from 'react';
import type { GRUPOS_DE_VENTA, LINEAS } from '@backend/types';
import type { TipoAgrupacion } from '@/types/agrupaciones';
import SearchInput from '@/components/ui/SearchInput';
import CrearAgrupacionModal from '@/features/configuracion/modales/CrearAgrupacionModal';
import EliminarAgrupacionModal from '@/features/configuracion/modales/EliminarAgrupacionModal';
import { normalizarBusqueda } from '@/utils/texto';

// Alto de fila (85px: dos botones apilados + padding) x 5 filas visibles;
// con mas registros que eso la lista se scrollea en vez de crecer.
const ALTO_LISTA = 425;

type Orden = 'asc' | 'desc';

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
  /** Solo tipo 'grupo': para el editor de líneas asociadas. */
  lineasDisponibles?: LINEAS[];
}

export default function AgrupacionSection({
  titulo,
  tipo,
  crearLabel,
  emptyMessage,
  items,
  grupos,
  onRefrescar,
  lineasDisponibles,
}: AgrupacionSectionProps) {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('asc');
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [itemAEditar, setItemAEditar] = useState<ItemAgrupacion | null>(null);
  const [itemAEliminar, setItemAEliminar] = useState<ItemAgrupacion | null>(null);

  const itemsFiltrados = (
    busqueda.trim() === ''
      ? items
      : items.filter((item) => normalizarBusqueda(item.nombre).includes(normalizarBusqueda(busqueda)))
  )
    .slice()
    .sort((a, b) => (orden === 'asc' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre)));

  return (
    <div className='mb-10'>
      <div className='flex items-center gap-3 mb-3 flex-wrap'>
        <span className='text-2xl font-semibold text-black'>{titulo}</span>
        <button
          type='button'
          onClick={() => setCrearAbierto(true)}
          className='rounded flex items-center py-1.5 px-3 text-white font-semibold text-sm border cursor-pointer bg-violet-500 hover:bg-violet-600 transition-color duration-100 ease-in'
        >
          + {crearLabel}
        </button>
      </div>

      <div className='flex items-center gap-2 mb-5'>
        <SearchInput
          valor={busqueda}
          onCambio={setBusqueda}
          claseContenedor='relative flex-1 flex items-center'
        />

        <button
          type='button'
          onClick={() => setOrden((actual) => (actual === 'asc' ? 'desc' : 'asc'))}
          title={orden === 'asc' ? 'Orden alfabético ascendente (A-Z)' : 'Orden alfabético descendente (Z-A)'}
          className='shrink-0 flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-sm font-medium text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-colors duration-100 ease-in cursor-pointer'
        >
          {orden === 'asc' ? 'A-Z' : 'Z-A'}
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-150 ease-in ${orden === 'desc' ? 'rotate-180' : ''}`}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
          </svg>
        </button>
      </div>

      {items.length === 0 && <span className='text-gray-400'>{emptyMessage}</span>}

      {items.length > 0 && itemsFiltrados.length === 0 && (
        <span className='text-gray-400 italic'>Sin resultados.</span>
      )}

      {itemsFiltrados.length > 0 && (
        <ul
          className='w-full border border-gray-200 rounded-md divide-y divide-gray-100 overflow-y-auto'
          style={{ maxHeight: ALTO_LISTA }}
        >
          {itemsFiltrados.map((item) => (
            <li
              key={item.id}
              onClick={() => setItemAEditar(item)}
              className='group flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors duration-100 ease-in text-black cursor-pointer'
            >
              <div className='min-w-0'>
                <div className='font-semibold break-words'>{item.nombre}</div>
                {item.subtitulo && <div className='text-sm text-gray-600'>{item.subtitulo}</div>}
              </div>

              <div className='shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in'>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemAEditar(item);
                  }}
                  className='px-3 py-1 border transition-color duration-100 ease-in bg-violet-500 hover:bg-violet-600 text-white rounded text-sm text-center cursor-pointer'
                >
                  Editar
                </button>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemAEliminar(item);
                  }}
                  className='px-3 py-1 border transition-color duration-100 ease-in bg-red-500 hover:bg-red-600 text-white rounded text-sm text-center cursor-pointer'
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CrearAgrupacionModal
        abierto={crearAbierto || itemAEditar !== null}
        onCerrar={() => {
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
        lineasDisponibles={lineasDisponibles}
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
        abierto={itemAEliminar !== null}
        onCerrar={() => setItemAEliminar(null)}
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
