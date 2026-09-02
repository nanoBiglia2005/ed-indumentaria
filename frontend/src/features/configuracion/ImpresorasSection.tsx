import { useState } from 'react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { useImpresoras } from '@/hooks/useImpresoras';
import { asignarMiImpresora } from '@/api/impresoras';
import { colorEstadoImpresora, estadoImpresora, ordenarImpresoras } from '@/utils/impresoras';
import CrearImpresoraModal from './modales/CrearImpresoraModal';
import EditarImpresoraModal from './modales/EditarImpresoraModal';
import type { Impresora } from '@/types/impresoras';

/**
 * Registro de impresoras: alta, edicion y estado de conexion de cada una.
 *
 * El estado se lee cuando se carga la seccion y con el boton "Actualizar":
 * sin polling, porque una impresora se conecta o desconecta pocas veces por dia
 * y una consulta cada pocos segundos no le aporta nada a quien esta vendiendo.
 */
export default function ImpresorasSection() {
  const { impresoras, seleccionada, setSeleccionada, cargando, recargar } = useImpresoras();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Impresora | null>(null);

  const ordenadas = ordenarImpresoras(impresoras);

  const cambiarMiImpresora = (idImpresora: number) => {
    setSeleccionada(idImpresora);
    asignarMiImpresora(idImpresora).catch((err) => {
      console.error('Error al asignar la impresora:', err);
      recargar();
    });
  };

  return (
    <div className='w-full'>
      <div className='mb-5 flex flex-wrap items-center gap-3'>
        <span className='text-2xl font-semibold text-black'>Impresoras</span>

        <button
          type='button'
          onClick={recargar}
          disabled={cargando}
          title='Volver a consultar qué impresoras están conectadas'
          className='flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 transition-colors hover:border-violet-400 hover:text-violet-700 disabled:opacity-50'
        >
          <ArrowsClockwiseIcon size={16} />
          {cargando ? 'Actualizando...' : 'Actualizar estado'}
        </button>

        <button
          type='button'
          onClick={() => setCreando(true)}
          className='ml-auto cursor-pointer rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700'
        >
          Agregar Impresora
        </button>
      </div>

      {cargando && impresoras.length === 0 && (
        <span className='text-gray-400'>Cargando impresoras...</span>
      )}

      {!cargando && impresoras.length === 0 && (
        <div className='rounded border border-dashed border-gray-300 p-6 text-center'>
          <p className='text-gray-600'>Todavía no hay ninguna impresora registrada.</p>
          <p className='mt-1 text-sm text-gray-400'>
            Agregá una por cada PC con impresora del local. Al crearla vas a recibir un token que
            hay que pegar en el archivo <code className='font-mono'>.env</code> de esa PC.
          </p>
        </div>
      )}

      <div className='flex w-full flex-wrap gap-4'>
        {ordenadas.map((impresora) => (
          <div
            key={impresora.id_impresora}
            className={`group relative flex h-fit w-[240px] flex-col rounded border px-4 py-4 text-black transition-all duration-100 ease-in hover:shadow-lg ${
              impresora.activa ? 'border-violet-500' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <span className='truncate text-xl font-semibold' title={impresora.nombre}>
              {impresora.nombre}
            </span>

            <span className='mt-1 flex items-center gap-2 text-sm text-gray-600'>
              <span className={`h-2 w-2 rounded-full ${colorEstadoImpresora(impresora)}`} />
              {estadoImpresora(impresora)}
            </span>

            {impresora.es_predeterminada && (
              <span className='mt-2 w-fit rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'>
                Predeterminada
              </span>
            )}

            {impresora.activa && (
              <label className='mt-3 flex items-center gap-2 text-xs text-gray-600'>
                <input
                  type='radio'
                  name='mi-impresora'
                  checked={seleccionada === impresora.id_impresora}
                  onChange={() => cambiarMiImpresora(impresora.id_impresora)}
                  className='h-3.5 w-3.5 accent-violet-600'
                />
                La mía
              </label>
            )}

            <div className='max-h-0 -translate-y-1 overflow-hidden px-1 opacity-0 transition-all duration-200 ease-in-out group-hover:mt-3 group-hover:max-h-12 group-hover:translate-y-0 group-hover:opacity-100'>
              <button
                type='button'
                onClick={() => setEditando(impresora)}
                className='w-full cursor-pointer rounded border bg-violet-500 py-1 text-center text-sm text-white transition-colors duration-100 ease-in hover:bg-violet-600'
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      <CrearImpresoraModal abierto={creando} onCerrar={() => setCreando(false)} onExito={recargar} />

      <EditarImpresoraModal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        onExito={recargar}
        impresora={editando}
      />
    </div>
  );
}
