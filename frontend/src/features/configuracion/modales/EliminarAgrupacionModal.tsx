import { useEffect } from 'react';
import type { TipoAgrupacion } from '@/types/agrupaciones';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import {
  eliminarGrupo,
  eliminarSubgrupo,
  eliminarCliente,
  eliminarLinea,
} from '@/api/agrupaciones';

const SEGUNDOS_ESPERA = 5;

const TITULOS: Record<TipoAgrupacion, string> = {
  grupo: 'Eliminar Grupo',
  subgrupo: 'Eliminar Subgrupo',
  colegio: 'Eliminar Colegio/Club',
  linea: 'Eliminar Línea',
};

const NOMBRE_TIPO: Record<TipoAgrupacion, string> = {
  grupo: 'el grupo',
  subgrupo: 'el subgrupo',
  colegio: 'el colegio/club',
  linea: 'la línea',
};

// El grupo cascadea (borra tambien sus subgrupos y las asociaciones de
// articulos), y la linea desasigna (deja sin linea a los articulos que la
// tenian), asi que ameritan una advertencia mas especifica que subgrupo/
// colegio (que directamente fallan si todavia estan en uso).
const ADVERTENCIA: Record<TipoAgrupacion, string> = {
  grupo: 'Esta acción no se puede deshacer. También se eliminarán sus subgrupos y se quitará este grupo de todos los artículos asociados.',
  subgrupo: 'Esta acción no se puede deshacer.',
  colegio: 'Esta acción no se puede deshacer.',
  linea: 'Esta acción no se puede deshacer. Los artículos que tengan esta línea asignada quedarán sin línea.',
};

const ELIMINAR: Record<TipoAgrupacion, (id: number) => Promise<void>> = {
  grupo: eliminarGrupo,
  subgrupo: eliminarSubgrupo,
  colegio: eliminarCliente,
  linea: eliminarLinea,
};

interface EliminarAgrupacionModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onEliminado: () => void;
  tipo: TipoAgrupacion;
  item: { id: number; nombre: string } | null;
}

export default function EliminarAgrupacionModal({
  abierto,
  onCerrar,
  onEliminado,
  tipo,
  item,
}: EliminarAgrupacionModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync();
  const segundosRestantes = useCuentaRegresiva(abierto, SEGUNDOS_ESPERA);

  useEffect(() => {
    if (abierto) setError(null);
  }, [abierto, setError]);

  const handleClose = () => {
    if (cargando) return;
    onCerrar();
  };

  const handleEliminar = () => {
    if (!item || segundosRestantes > 0) return;

    ejecutar(async () => {
      await ELIMINAR[tipo](item.id);
      onEliminado();
      onCerrar();
    });
  };

  const puedeConfirmar = segundosRestantes <= 0;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleClose}
      titulo={TITULOS[tipo]}
      error={error ? { detalle: error } : null}
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={!puedeConfirmar || cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors cursor-pointer'
          >
            {cargando
              ? 'Eliminando...'
              : puedeConfirmar
              ? 'Confirmar Eliminación'
              : `Confirmar Eliminación (${segundosRestantes})`}
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-700'>
        ¿Estás seguro que querés eliminar {NOMBRE_TIPO[tipo]}{' '}
        <span className='font-semibold'>{item?.nombre}</span>? {ADVERTENCIA[tipo]}
      </p>
    </BaseModal>
  );
}
