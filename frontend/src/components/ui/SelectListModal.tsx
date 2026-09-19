import { useMemo, useState } from 'react';
import type { Opcion } from '@/types/comunes';
import BaseModal from '@/components/ui/BaseModal';
import SearchInput from '@/components/ui/SearchInput';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
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

  useResetAlCambiar(abierto, () => {
    if (abierto) setBusqueda('');
  });

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
          className='w-full px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer'
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
          className='w-full mb-3 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-marca-500 border border-marca-500 rounded hover:bg-marca-50 transition-colors cursor-pointer'
        >
          + {crearLabel}
        </button>
      )}

      {opciones.length === 0 ? (
        <p className='text-sm text-neutro-400 italic'>{emptyMessage}</p>
      ) : opcionesFiltradas.length === 0 ? (
        <p className='text-sm text-neutro-400 italic'>Sin resultados</p>
      ) : (
        <div className='h-80'>
        <ul className='max-h-80 overflow-y-auto overflow-x-hidden divide-y divide-neutro-100 border border-neutro-200 rounded'>
          {opcionesFiltradas.map((opcion) => (
            <li
              key={opcion.id}
              onClick={() => onSelect(opcion)}
              className='px-4 py-2 text-sm text-neutro-600 cursor-pointer hover:bg-neutro-100'
            >
              {busqueda ? resaltarCoincidencia(opcion.nombre, busqueda) : opcion.nombre}
            </li>
          ))}
        </ul>
        </div>
      )}
    </BaseModal>
  );
}
