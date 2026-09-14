import type { CLIENTES } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import ResumenCliente from '@/features/ventas/cliente/ResumenCliente';
import type { CampoCliente, DatosCliente } from '@/features/ventas/cliente/formatoCliente';
import { camposModificados, desdeCliente } from '@/features/ventas/cliente/formatoCliente';

interface ConfirmarClienteModalProps {
  abierto: boolean;
  /** Lo que se cargo en el formulario. */
  datos: DatosCliente | null;
  /**
   * Cliente que YA existe con ese DNI. null = alta limpia (solo hay que
   * confirmar); con valor = hay que decidir que hacer con el que ya esta.
   */
  existente: CLIENTES | null;
  cargando: boolean;
  error: string | null;
  onCerrar: () => void;
  /** Alta limpia: crear el cliente y asignarlo. */
  onCrear: () => void;
  /** DNI repetido: asignar el de la base tal cual esta. */
  onAsignarExistente: () => void;
  /** DNI repetido: pisar los datos de la base con los cargados y asignar. */
  onSobrescribir: () => void;
}

/**
 * Confirmacion del alta del cliente de la venta. Tiene dos caras:
 *
 *  - alta limpia: se muestra lo que se va a guardar y se confirma;
 *  - DNI ya registrado: se muestran lado a lado el cliente de la base y lo
 *    cargado (con las diferencias en amarillo) y se elige entre asignar el
 *    existente, pisarlo, o cancelar.
 *
 * El segundo caso no es un error: el DNI no es unico en la base, asi que la
 * decision es del usuario.
 */
export default function ConfirmarClienteModal({
  abierto,
  datos,
  existente,
  cargando,
  error,
  onCerrar,
  onCrear,
  onAsignarExistente,
  onSobrescribir,
}: ConfirmarClienteModalProps) {
  const esDuplicado = existente !== null;

  // Que campos cambiarian en la base si se elige sobrescribir.
  const diferencias: Set<CampoCliente> =
    datos && existente ? camposModificados(datos, existente) : new Set();

  const claseBotonSecundario =
    'flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60';
  const claseBotonPrincipal =
    'flex-1 px-4 py-2 text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 disabled:cursor-not-allowed transition-colors cursor-pointer';

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo={esDuplicado ? 'Ese DNI ya está registrado' : '¿Crear y asignar este cliente?'}
      claseTitulo='text-lg font-medium leading-6 text-neutro-900 mb-4'
      ancho={esDuplicado ? 'xl' : 'md'}
      z='z-[60]'
      error={error ? { titulo: 'No se pudo guardar el cliente', detalle: error } : null}
      footer={
        <div className='flex w-full flex-col gap-3 sm:flex-row'>
          <button type='button' onClick={onCerrar} disabled={cargando} className={claseBotonSecundario}>
            Cancelar
          </button>

          {esDuplicado ? (
            <>
              <button
                type='button'
                onClick={onAsignarExistente}
                disabled={cargando}
                className='flex-1 px-4 py-2 text-sm font-medium text-marca-600 border border-marca-600 rounded hover:bg-marca-50 transition-colors cursor-pointer disabled:opacity-60'
              >
                Asignar el Existente
              </button>
              <button
                type='button'
                onClick={onSobrescribir}
                disabled={cargando}
                className='flex-1 px-4 py-2 text-sm font-medium text-white bg-acento-500 rounded hover:bg-acento-600 disabled:bg-acento-500/50 disabled:cursor-not-allowed transition-colors cursor-pointer'
              >
                {cargando ? 'Guardando...' : 'Asignar y Sobrescribir'}
              </button>
            </>
          ) : (
            <button type='button' onClick={onCrear} disabled={cargando} className={claseBotonPrincipal}>
              {cargando ? 'Creando...' : 'Crear y Asignar'}
            </button>
          )}
        </div>
      }
    >
      {!datos ? null : esDuplicado ? (
        <div className='flex flex-col gap-4'>
          <p className='text-sm text-neutro-600'>
            Ya hay un cliente registrado con el DNI <span className='font-semibold'>{datos.dni}</span>.
            Elegí si querés usar los datos que ya están en el sistema o pisarlos con los que cargaste.
          </p>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='rounded border border-neutro-200 p-3'>
              <p className='mb-2 text-sm font-semibold text-neutro-600'>En el sistema</p>
              <ResumenCliente datos={desdeCliente(existente)} />
            </div>
            <div className='rounded border border-acento-500 bg-acento-100/40 p-3'>
              <p className='mb-2 text-sm font-semibold text-acento-800'>Lo que cargaste</p>
              <ResumenCliente datos={datos} resaltados={diferencias} />
            </div>
          </div>

          {diferencias.size === 0 && (
            <p className='text-sm italic text-neutro-400'>
              Los datos que cargaste son idénticos a los del sistema.
            </p>
          )}
        </div>
      ) : (
        <div className='rounded border border-neutro-200 p-3'>
          <ResumenCliente datos={datos} />
        </div>
      )}
    </BaseModal>
  );
}
