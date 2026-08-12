import { useState, useEffect } from 'react';
import type { ARTICULOS } from '@backend/types';
import type { Opcion } from '@/types/comunes';
import BaseModal from '@/components/ui/BaseModal';
import ListaChips from '@/components/ui/ListaChips';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { diferenciaPorId } from '@/utils/relaciones';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';

/**
 * Modal generico para editar una asociacion muchos-a-muchos de un articulo
 * (grupos o colegios/clubes). Fusion de los viejos EditGruposModal y
 * EditClientesModal, que diferian solo en textos y endpoints.
 */
export interface TextosRelacion {
  titulo: string;
  label: string;
  labelAgregar: string;
  textoVacio: string;
  errorSync: string;
}

interface EditRelacionesModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  textos: TextosRelacion;
  /** Todas las opciones asignables. */
  opciones: Opcion[];
  /** Ids asignados hoy al articulo (el caller los saca de la tabla de asociacion). */
  idsAsignados: number[];
  asignar: (idArticulo: number, id: number) => Promise<unknown>;
  quitar: (idArticulo: number, id: number) => Promise<unknown>;
}

export default function EditRelacionesModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  textos,
  opciones,
  idsAsignados,
  asignar,
  quitar,
}: EditRelacionesModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync();

  const [originales, setOriginales] = useState<Opcion[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Opcion[]>([]);

  useEffect(() => {
    if (!abierto || !articulo) return;

    setError(null);

    const asignadas = opciones.filter((opcion) => idsAsignados.includes(opcion.id));
    setOriginales(asignadas);
    setSeleccionadas(asignadas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, articulo]);

  const handleGuardar = () => {
    if (!articulo) return;

    ejecutar(async () => {
      const { aAgregar, aQuitar } = diferenciaPorId(originales, seleccionadas, (o) => o.id);

      const resultados = await Promise.allSettled([
        ...aAgregar.map((opcion) => asignar(articulo.id_articulo, opcion.id)),
        ...aQuitar.map((opcion) => quitar(articulo.id_articulo, opcion.id)),
      ]);

      if (resultados.some((r) => r.status === 'rejected')) {
        throw new Error(textos.errorSync);
      }

      onExito();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={textos.titulo}
      ancho='md'
      permitirDesborde
      error={error ? { titulo: 'Error al editar el articulo', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>{textos.label}</label>
        <div className='mb-3'>
          <InlineFilterDropdown
            label={textos.labelAgregar}
            opciones={opciones.filter((o) => !seleccionadas.some((sel) => sel.id === o.id))}
            selectedId={null}
            onSelect={(id) => {
              const opcion = opciones.find((o) => o.id === id);
              if (opcion) {
                setSeleccionadas((prev) => [...prev, opcion]);
              }
            }}
            onClear={() => {}}
          />
        </div>

        <ListaChips
          items={seleccionadas}
          onQuitar={(id) => setSeleccionadas((prev) => prev.filter((o) => o.id !== id))}
          textoVacio={textos.textoVacio}
        />
      </div>
    </BaseModal>
  );
}
