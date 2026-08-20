import { useState } from 'react';
import type { CLIENTES } from '@backend/types';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { actualizarCliente, crearCliente } from '@/api/venta';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import ConfirmarClienteModal from '@/features/ventas/modales/ConfirmarClienteModal';
import QuitarClienteModal from '@/features/ventas/modales/QuitarClienteModal';
import BuscadorClientes from './BuscadorClientes';
import FormularioCliente from './FormularioCliente';
import type { ClienteDeVenta } from './useClienteDeVenta';
import type { DatosCliente } from './formatoCliente';
import { CLIENTE_VACIO, aDatosAPI, nombreCompleto, validarCliente } from './formatoCliente';

interface SeccionClienteProps {
  cliente: ClienteDeVenta;
  /** Mientras se registra la venta no se puede tocar nada. */
  deshabilitado?: boolean;
}

/**
 * Seccion Cliente del alta de venta. Tiene tres estados:
 *
 *  1. sin cliente: buscador + boton "Crear Nuevo Cliente";
 *  2. creando: el formulario vacio, que termina en el modal de confirmacion
 *     (y, si el DNI ya existe, en la decision de asignar / sobrescribir);
 *  3. asignado: el mismo formulario con los datos del cliente, editable. Lo que
 *     se cambie queda en amarillo y se guarda recien al confirmar la venta.
 *
 * El buscador queda visible siempre: cambiar de cliente es reemplazar el
 * asignado, no hay que quitarlo primero.
 */
export default function SeccionCliente({ cliente, deshabilitado = false }: SeccionClienteProps) {
  const { asignado, borrador, modificados, cambiarCampo, asignar, quitar } = cliente;

  // Alta: borrador propio, para no pisar el del cliente asignado.
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState<DatosCliente>(CLIENTE_VACIO);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  // Paso de confirmacion del alta. `datosAConfirmar` != null = modal abierto.
  const [datosAConfirmar, setDatosAConfirmar] = useState<DatosCliente | null>(null);
  // Cliente que ya tenia ese DNI: cambia el modal a "que hago con este".
  const [duplicado, setDuplicado] = useState<CLIENTES | null>(null);

  const [aQuitar, setAQuitar] = useState<CLIENTES | null>(null);

  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo guardar el cliente.'),
  });

  const cerrarConfirmacion = () => {
    setDatosAConfirmar(null);
    setDuplicado(null);
    setError(null);
  };

  const terminarAsignacion = (elegido: CLIENTES) => {
    asignar(elegido);
    setCreando(false);
    setNuevo(CLIENTE_VACIO);
    setErrorFormulario(null);
    cerrarConfirmacion();
  };

  // "Crear y Asignar" del formulario: valida y abre la confirmacion.
  const handlePedirConfirmacion = () => {
    const problema = validarCliente(nuevo);
    if (problema) {
      setErrorFormulario(problema);
      return;
    }
    setErrorFormulario(null);
    setDuplicado(null);
    setDatosAConfirmar(nuevo);
  };

  const handleCrear = () =>
    ejecutar(async () => {
      if (!datosAConfirmar) return;
      const respuesta = await crearCliente(aDatosAPI(datosAConfirmar));

      // DNI repetido: no se creo nada, decide el usuario.
      if (!respuesta.creado) {
        setDuplicado(respuesta.cliente);
        return;
      }
      terminarAsignacion(respuesta.cliente);
    });

  const handleSobrescribir = () =>
    ejecutar(async () => {
      if (!datosAConfirmar || !duplicado) return;
      const actualizado = await actualizarCliente(duplicado.id_cliente, aDatosAPI(datosAConfirmar));
      terminarAsignacion(actualizado);
    });

  // "Estado inicial" es el buscador + el boton de alta: si se venia de crear
  // un cliente, ese formulario a medio llenar tambien se descarta.
  const handleQuitar = () => {
    quitar();
    setCreando(false);
    setNuevo(CLIENTE_VACIO);
    setErrorFormulario(null);
    setAQuitar(null);
  };

  const claseBotonCaja =
    'px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className='mt-6'>
      <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
        <span className='text-lg font-medium text-gray-700'>Cliente</span>

        {/* Elegir del buscador tambien cierra el alta a medio llenar: el
            cliente de la venta es uno solo. */}
        <BuscadorClientes onSeleccionar={terminarAsignacion} deshabilitado={deshabilitado} />

        {asignado && (
          <div className='flex items-center gap-3 rounded-md bg-violet-600 px-3 py-1.5 text-white'>
            <div className='flex flex-col leading-tight'>
              <span className='text-sm font-semibold'>{nombreCompleto(asignado)}</span>
              <span className='text-xs text-violet-200'>{asignado.dni}</span>
            </div>
            <button
              type='button'
              onClick={() => setAQuitar(asignado)}
              disabled={deshabilitado}
              aria-label='Quitar el cliente de la venta'
              className='font-bold text-violet-200 hover:text-white cursor-pointer disabled:cursor-not-allowed'
            >
              X
            </button>
          </div>
        )}
      </div>

      <div className='mt-3 rounded-md border border-gray-200 p-4'>
        {/* 1. Sin cliente */}
        {!asignado && !creando && (
          <div className='flex h-32 items-center justify-center'>
            <button
              type='button'
              onClick={() => {
                setNuevo(CLIENTE_VACIO);
                setErrorFormulario(null);
                setCreando(true);
              }}
              disabled={deshabilitado}
              className={`${claseBotonCaja} border border-gray-300 text-gray-700 hover:border-violet-500 hover:text-violet-600`}
            >
              Crear Nuevo Cliente
            </button>
          </div>
        )}

        {/* 2. Alta */}
        {!asignado && creando && (
          <div className='flex flex-col gap-4'>
            <FormularioCliente
              datos={nuevo}
              onCambiar={(campo, valor) => {
                setNuevo((prev) => ({ ...prev, [campo]: valor }));
                setErrorFormulario(null);
              }}
              deshabilitado={deshabilitado}
            />

            {errorFormulario && <p className='text-sm text-red-600'>{errorFormulario}</p>}

            <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
              <button
                type='button'
                onClick={() => {
                  setCreando(false);
                  setNuevo(CLIENTE_VACIO);
                  setErrorFormulario(null);
                }}
                disabled={deshabilitado}
                className={`${claseBotonCaja} border border-gray-300 text-gray-700 hover:bg-gray-50 sm:w-48`}
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={handlePedirConfirmacion}
                disabled={deshabilitado}
                className={`${claseBotonCaja} bg-violet-600 text-white hover:bg-violet-700 sm:w-48`}
              >
                Crear y Asignar
              </button>
            </div>
          </div>
        )}

        {/* 3. Asignado: los datos siguen siendo editables. */}
        {asignado && (
          <div className='flex flex-col gap-4'>
            <FormularioCliente
              datos={borrador}
              onCambiar={cambiarCampo}
              modificados={modificados}
              deshabilitado={deshabilitado}
            />

            {modificados.size > 0 && (
              <p className='text-sm text-amber-700'>
                Los campos en amarillo se van a actualizar en el sistema al confirmar la venta.
              </p>
            )}

            <div className='flex justify-center'>
              <button
                type='button'
                onClick={() => setAQuitar(asignado)}
                disabled={deshabilitado}
                className={`${claseBotonCaja} border border-amber-500 text-amber-700 hover:bg-amber-50 sm:w-64`}
              >
                Quitar Asignación
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmarClienteModal
        abierto={datosAConfirmar !== null}
        datos={datosAConfirmar}
        existente={duplicado}
        cargando={cargando}
        error={error}
        onCerrar={cerrarConfirmacion}
        onCrear={handleCrear}
        onAsignarExistente={() => duplicado && terminarAsignacion(duplicado)}
        onSobrescribir={handleSobrescribir}
      />

      <QuitarClienteModal
        abierto={aQuitar !== null}
        cliente={aQuitar}
        onCerrar={() => setAQuitar(null)}
        onQuitar={handleQuitar}
      />
    </div>
  );
}
