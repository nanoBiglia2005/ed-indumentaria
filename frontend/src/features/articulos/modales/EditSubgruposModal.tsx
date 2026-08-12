import { useState, useEffect, useMemo } from 'react';
import type { ARTICULOS, GRUPOS_DE_VENTA, SUBGRUPOS_DE_VENTA, ARTICULOS_X_GRUPO_VENTA } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { asignarSubgrupo, quitarSubgrupo } from '@/api/articulos';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';

interface EditSubgruposModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  grupos: GRUPOS_DE_VENTA[];
  subgrupos: SUBGRUPOS_DE_VENTA[];
  articulosXGrupo: ARTICULOS_X_GRUPO_VENTA[];
}

export default function EditSubgruposModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  grupos,
  subgrupos,
  articulosXGrupo,
}: EditSubgruposModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync();

  // El articulo solo puede tener un subgrupo por cada grupo al que
  // pertenece: un dropdown de reemplazo por grupo, no una lista libre.
  const gruposDelArticulo = useMemo(() => {
    if (!articulo) return [];
    const idsDeGrupo = new Set(
      articulosXGrupo
        .filter((rel) => rel.id_articulo === articulo.id_articulo)
        .map((rel) => rel.id_grupo_venta)
    );
    return grupos
      .filter((grupo) => idsDeGrupo.has(grupo.id_grupo))
      .sort((a, b) => (a.nombre_grupo ?? '').localeCompare(b.nombre_grupo ?? ''));
  }, [articulo, grupos, articulosXGrupo]);

  const [subgrupoOriginalPorGrupo, setSubgrupoOriginalPorGrupo] = useState<Record<number, number | null>>({});
  const [subgrupoPorGrupo, setSubgrupoPorGrupo] = useState<Record<number, number | null>>({});

  useEffect(() => {
    if (!abierto || !articulo) return;

    setError(null);

    // Si por alguna razon hay mas de una fila para el mismo grupo, se
    // prioriza la que tenga un subgrupo asignado por sobre una vacia (evita
    // que una fila duplicada en null tape el subgrupo real al reabrir).
    const actual: Record<number, number | null> = {};
    for (const rel of articulosXGrupo) {
      if (rel.id_articulo !== articulo.id_articulo) continue;
      const previo = actual[rel.id_grupo_venta];
      if (previo === undefined || (previo === null && rel.id_subgrupo !== null)) {
        actual[rel.id_grupo_venta] = rel.id_subgrupo;
      }
    }

    setSubgrupoOriginalPorGrupo(actual);
    setSubgrupoPorGrupo(actual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, articulo]);

  const handleGuardar = () => {
    if (!articulo) return;

    ejecutar(async () => {
      // Secuencial a proposito (igual que siempre): se intentan TODOS los
      // cambios aunque alguno falle, y recien al final se informa el error.
      const resultados: boolean[] = [];
      for (const grupo of gruposDelArticulo) {
        const original = subgrupoOriginalPorGrupo[grupo.id_grupo] ?? null;
        const nuevo = subgrupoPorGrupo[grupo.id_grupo] ?? null;
        if (nuevo === original) continue;

        if (nuevo !== null) {
          resultados.push(
            await asignarSubgrupo(articulo.id_articulo, nuevo).then(() => true).catch(() => false)
          );
        } else if (original !== null) {
          resultados.push(
            await quitarSubgrupo(articulo.id_articulo, original).then(() => true).catch(() => false)
          );
        }
      }

      if (resultados.some((ok) => !ok)) {
        throw new Error('Hubo un error al actualizar los subgrupos asociados.');
      }

      onExito();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Editar Subgrupos'
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
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Subgrupo por grupo (uno por grupo)
        </label>

        {gruposDelArticulo.length === 0 ? (
          <p className='text-sm text-gray-400 italic'>Asigná el artículo a un grupo primero</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {gruposDelArticulo.map((grupo) => {
              const opcionesDelGrupo = subgrupos
                .filter((s) => s.id_grupo === grupo.id_grupo)
                .map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }));

              return (
                <li key={grupo.id_grupo} className='flex items-center justify-between gap-3'>
                  <span className='text-sm text-gray-700 truncate'>
                    {grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}`}
                  </span>
                  <InlineFilterDropdown
                    label={opcionesDelGrupo.length === 0 ? 'Sin subgrupos' : 'Sin subgrupo'}
                    opciones={opcionesDelGrupo}
                    selectedId={subgrupoPorGrupo[grupo.id_grupo] ?? null}
                    onSelect={(id) =>
                      setSubgrupoPorGrupo((prev) => ({ ...prev, [grupo.id_grupo]: id }))
                    }
                    onClear={() =>
                      setSubgrupoPorGrupo((prev) => ({ ...prev, [grupo.id_grupo]: null }))
                    }
                    disabled={opcionesDelGrupo.length === 0}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BaseModal>
  );
}
