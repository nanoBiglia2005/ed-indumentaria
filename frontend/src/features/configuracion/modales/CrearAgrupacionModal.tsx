import { useState, useEffect } from 'react';
import type { GRUPOS_DE_VENTA, LINEAS } from '@backend/types';
import type { TipoAgrupacion, EdicionAgrupacion } from '@/types/agrupaciones';
import type { Opcion } from '@/types/comunes';
import BaseModal from '@/components/ui/BaseModal';
import SegmentedToggle from '@/components/ui/SegmentedToggle';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import {
  crearGrupo,
  actualizarGrupo,
  crearSubgrupo,
  actualizarSubgrupo,
  crearCliente,
  actualizarCliente,
  crearLinea,
  actualizarLinea,
} from '@/api/agrupaciones';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';

interface CrearAgrupacionModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: (opcion: Opcion) => void;
  tipo: TipoAgrupacion;
  grupos: GRUPOS_DE_VENTA[];
  /** Grupo activo al abrir el modal (si el usuario ya tenia uno filtrado). */
  grupoPreseleccionado?: number | null;
  edicion?: EdicionAgrupacion | null;
  /** Solo tipo 'grupo' en edicion: para el editor de líneas asociadas. */
  lineasDisponibles?: LINEAS[];
}

const TITULOS: Record<TipoAgrupacion, string> = {
  grupo: 'Crear Grupo',
  subgrupo: 'Crear Subgrupo',
  colegio: 'Crear Colegio/Club',
  linea: 'Crear Línea',
};

const TITULOS_EDICION: Record<TipoAgrupacion, string> = {
  grupo: 'Editar Grupo',
  subgrupo: 'Editar Subgrupo',
  colegio: 'Editar Colegio/Club',
  linea: 'Editar Línea',
};

const NOMBRE_MAX: Record<TipoAgrupacion, number> = {
  grupo: 50,
  subgrupo: 30,
  colegio: 30,
  linea: 20,
};

const OPCIONES_TIPO_CLIENTE = [
  { valor: 1, etiqueta: 'Colegio' },
  { valor: 2, etiqueta: 'Club' },
] as const;

export default function CrearAgrupacionModal({
  abierto,
  onCerrar,
  onGuardado,
  tipo,
  grupos,
  grupoPreseleccionado = null,
  edicion = null,
}: CrearAgrupacionModalProps) {
  const [nombre, setNombre] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [tipoCliente, setTipoCliente] = useState<1 | 2>(1);
  const { cargando, error, setError, ejecutar } = useAccionAsync();
  const modoEdicion = edicion !== null;

  useEffect(() => {
    if (!abierto) return;
    setNombre(edicion?.nombre ?? '');
    setGrupoSeleccionado(edicion?.idGrupo ?? grupoPreseleccionado);
    setTipoCliente(edicion?.tipoCliente ?? 1);
    setError(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, tipo, edicion]);

  const maxLength = NOMBRE_MAX[tipo];

  const handleClose = () => {
    if (cargando) return;
    onCerrar();
  };

  // Crea o actualiza el registro segun el tipo y devuelve la Opcion {id, nombre}
  // resultante para que la pagina actualice su lista.
  const guardarRegistro = async (nombreTrimeado: string): Promise<Opcion> => {
    if (tipo === 'grupo') {
      const data = modoEdicion
        ? await actualizarGrupo(edicion!.id, nombreTrimeado)
        : await crearGrupo(nombreTrimeado);
      return { id: data.id_grupo, nombre: data.nombre_grupo ?? nombreTrimeado };
    }
    if (tipo === 'subgrupo') {
      const data = modoEdicion
        ? await actualizarSubgrupo(edicion!.id, nombreTrimeado, grupoSeleccionado!)
        : await crearSubgrupo(nombreTrimeado, grupoSeleccionado!);
      return { id: data.id_subgrupo, nombre: data.nombre_subgrupo };
    }
    if (tipo === 'colegio') {
      const data = modoEdicion
        ? await actualizarCliente(edicion!.id, nombreTrimeado, tipoCliente)
        : await crearCliente(nombreTrimeado, tipoCliente);
      return { id: data.id_cliente, nombre: data.nombre };
    }
    const data = modoEdicion
      ? await actualizarLinea(edicion!.id, nombreTrimeado)
      : await crearLinea(nombreTrimeado);
    return { id: data.id_linea, nombre: data.nombre_linea };
  };

  const handleGuardar = () => {
    const nombreTrimeado = nombre.trim();
    if (nombreTrimeado === '') {
      setError('El nombre es obligatorio.');
      return;
    }
    if (tipo === 'subgrupo' && grupoSeleccionado === null) {
      setError('Elegí un grupo para el subgrupo.');
      return;
    }

    ejecutar(async () => {
      const opcionGuardada = await guardarRegistro(nombreTrimeado);  

      onGuardado(opcionGuardada);
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleClose}
      titulo={modoEdicion ? TITULOS_EDICION[tipo] : TITULOS[tipo]}
      z='z-[70]'
      permitirDesborde
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
            onClick={handleGuardar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
          >
            {cargando ? (modoEdicion ? 'Guardando...' : 'Creando...') : modoEdicion ? 'Guardar' : 'Crear'}
          </button>
        </>
      }
    >
      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre</label>
          <input
            type='text'
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, maxLength))}
            maxLength={maxLength}
            placeholder='Nombre'
            className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
          />
        </div>

        {tipo === 'subgrupo' && (
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Grupo</label>
            <InlineFilterDropdown
              label='Elegir Grupo'
              opciones={grupos.map((g) => ({
                id: g.id_grupo,
                nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}`,
              }))}
              selectedId={grupoSeleccionado}
              onSelect={setGrupoSeleccionado}
              onClear={() => setGrupoSeleccionado(null)}
            />
          </div>
        )}

        {tipo === 'colegio' && (
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Tipo</label>
            <SegmentedToggle<1 | 2>
              valor={tipoCliente}
              opciones={OPCIONES_TIPO_CLIENTE}
              onChange={setTipoCliente}
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
}
