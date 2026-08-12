import { useEffect, useMemo, useState } from 'react';
import type { Opcion } from '@/types/comunes';
import BaseModal from '@/components/ui/BaseModal';
import SearchInput from '@/components/ui/SearchInput';
import { normalizarBusqueda, resaltarCoincidencia } from '@/utils/texto';

interface SelectListModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  opciones: Opcion[];
  onSelect: (opcion: Opcion) => void;
  emptyMessage?: string;
  /** Si se pasa, muestra un boton "Crear" entre el buscador y la lista. */
  onCrear?: () => void;
  crearLabel?: string;
}

export default function SelectListModal({
  abierto,
  onCerrar,
  titulo,
  opciones,
  onSelect,
  emptyMessage = 'No hay más opciones disponibles',
  onCrear,
  crearLabel = 'Crear',
}: SelectListModalProps) {
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (abierto) setBusqueda('');
  }, [abierto]);

  const opcionesFiltradas = useMemo(() => {
    if (busqueda === '') return opciones;
    const termino = normalizarBusqueda(busqueda);
    return opciones.filter((opcion) => normalizarBusqueda(opcion.nombre).includes(termino));
  }, [opciones, busqueda]);

  const mostrarBuscador = opciones.length > 0 || Boolean(onCrear);

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      z='z-[60]'
      footer={
        <button
          onClick={onCerrar}
          className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
        >
          Cerrar
        </button>
      }
    >
      {mostrarBuscador && (
        <SearchInput
          valor={busqueda}
          onCambio={setBusqueda}
          claseContenedor='relative mb-3 flex items-center'
        />
      )}

      {onCrear && (
        <button
          type='button'
          onClick={onCrear}
          className='w-full mb-3 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-violet-600 border border-violet-600 rounded-md hover:bg-violet-50 transition-colors cursor-pointer'
        >
          + {crearLabel}
        </button>
      )}

      {opciones.length === 0 ? (
        <p className='text-sm text-gray-400 italic'>{emptyMessage}</p>
      ) : opcionesFiltradas.length === 0 ? (
        <p className='text-sm text-gray-400 italic'>Sin resultados</p>
      ) : (
        <ul className='max-h-60 overflow-y-auto min-h-[600px] overflow-x-hidden divide-y divide-gray-100 border border-gray-200 rounded-md'>
          {opcionesFiltradas.map((opcion) => (
            <li
              key={opcion.id}
              onClick={() => onSelect(opcion)}
              className='px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100'
            >
              {busqueda ? resaltarCoincidencia(opcion.nombre, busqueda) : opcion.nombre}
            </li>
          ))}
        </ul>
      )}
    </BaseModal>
  );
}
