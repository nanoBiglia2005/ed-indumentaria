import { useState } from 'react';
import type { CLIENTES } from '@backend/types';
import { mensajeDetallesPrimero } from '@/api/cliente';
import {
  actualizarClienteFinal,
  clienteDuplicadoDeError,
  crearClienteFinal,
} from '@/api/clientesFinales';
import type { ClienteDuplicado } from '@/api/clientesFinales';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import FormularioCliente from '@/features/ventas/cliente/FormularioCliente';
import type { DatosCliente } from '@/features/ventas/cliente/formatoCliente';
import {
  CLIENTE_VACIO,
  ETIQUETA_CAMPO_DUPLICADO,
  aDatosAPI,
  camposModificados,
  desdeCliente,
  nombreCompleto,
  validarCliente,
  valorCampoDuplicado,
} from '@/features/ventas/cliente/formatoCliente';
import VentasDeCliente from './VentasDeCliente';
import EliminarClienteModal from './modales/EliminarClienteModal';

interface DetalleClienteProps {
  /** Cliente abierto; null cuando se esta creando uno o no hay nada elegido. */
  cliente: CLIENTES | null;
  /** true = formulario vacio para el alta. */
  creando: boolean;
  onCreado: (cliente: CLIENTES) => void;
  onActualizado: (cliente: CLIENTES) => void;
  onEliminado: (cliente: CLIENTES) => void;
  /** Ya existia un cliente con ese dato: se abre ese en vez de crear un duplicado. */
  onAbrirExistente: (cliente: CLIENTES) => void;
  onCancelar: () => void;
}

/**
 * Panel derecho de la pagina Clientes: alta y edicion de un cliente final, mas
 * sus ventas.
 *
 * Usa el MISMO FormularioCliente y la MISMA validarCliente que el alta dentro
 * de una venta: si el ABM validara por su cuenta, un cliente cargado desde aca
 * podria pasar chequeos distintos de los que hace el backend.
 *
 * Lo que si cambia respecto del flujo de venta es que hacer con un dato
 * repetido (dni/telefono/email): alla habia que decidir a quien se le asigna
 * la venta (de ahi ConfirmarClienteModal); aca no hay venta, asi que alcanza
 * con avisar y ofrecer abrir la ficha que ya existe. El mismo aviso (`duplicado`) sirve
 * para el alta (el backend responde `creado: false`, sin lanzar) y para la
 * edicion (el backend tira 409 con el cliente en conflicto adentro del
 * error, `clienteDuplicadoDeError` lo desarma).
 */
export default function DetalleCliente({
  cliente,
  creando,
  onCreado,
  onActualizado,
  onEliminado,
  onAbrirExistente,
  onCancelar,
}: DetalleClienteProps) {
  const inicial = creando || !cliente ? CLIENTE_VACIO : desdeCliente(cliente);

  const [datos, setDatos] = useState<DatosCliente>(inicial);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  // Cliente que ya tenia ese dato repetido (creado:false del alta, o el 409 de la edicion).
  const [duplicado, setDuplicado] = useState<ClienteDuplicado | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo guardar el cliente.'),
  });

  // Una sola clave para los dos disparadores (cambiar de cliente y entrar o
  // salir del alta): con dos useResetAlCambiar separados, pasar de un cliente
  // al alta reseteaba dos veces.
  const clave = creando ? 'nuevo' : cliente?.id_cliente ?? null;

  useResetAlCambiar(clave, () => {
    setDatos(inicial);
    setErrorFormulario(null);
    setDuplicado(null);
    setError(null);
  });

  if (!creando && !cliente) {
    return (
      <div className='flex h-full items-center justify-center p-6 text-center'>
        <p className='text-sm text-neutro-400'>
          Elegí un cliente de la lista para ver y editar sus datos, o creá uno nuevo.
        </p>
      </div>
    );
  }

  // Al editar, los campos distintos de lo guardado quedan en amarillo.
  const modificados = !creando && cliente ? camposModificados(datos, cliente) : undefined;
  const hayCambios = (modificados?.size ?? 0) > 0;

  const handleCambiar = (campo: keyof DatosCliente, valor: string) => {
    setDatos((previos) => ({ ...previos, [campo]: valor }));
    setErrorFormulario(null);
    setDuplicado(null);
  };

  const handleGuardar = () => {
    const problema = validarCliente(datos);
    if (problema) {
      setErrorFormulario(problema);
      return;
    }
    setErrorFormulario(null);

    ejecutar(async () => {
      if (creando) {
        const respuesta = await crearClienteFinal(aDatosAPI(datos));
        // Dato repetido (dni/telefono/email): no se creo nada, decide el usuario.
        if (!respuesta.creado) {
          setDuplicado({ cliente: respuesta.cliente, campo: respuesta.campo ?? 'dni' });
          return;
        }
        onCreado(respuesta.cliente);
        return;
      }

      if (!cliente) return;

      try {
        onActualizado(await actualizarClienteFinal(cliente.id_cliente, aDatosAPI(datos)));
      } catch (err) {
        // Dato repetido de OTRO cliente: se ofrece abrirlo, igual que en el
        // alta. Cualquier otro error sigue de largo y lo muestra el catch
        // generico de `ejecutar`.
        const existente = clienteDuplicadoDeError(err);
        if (!existente) throw err;
        setDuplicado(existente);
      }
    });
  };

  return (
    <div className='p-4 sm:p-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-xl font-semibold text-neutro-900'>
          {creando ? 'Nuevo Cliente' : (cliente && nombreCompleto(cliente)) || 'Cliente'}
        </h2>

        {!creando && cliente && (
          <button
            type='button'
            onClick={() => setEliminando(true)}
            className='rounded border border-red-500 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors duration-100 ease-in hover:bg-red-500 hover:text-white cursor-pointer'
          >
            Eliminar Cliente
          </button>
        )}
      </div>

      <FormularioCliente
        datos={datos}
        onCambiar={handleCambiar}
        modificados={modificados}
        deshabilitado={cargando}
      />

      {duplicado && (
        <div className='mt-4 rounded border border-acento-500 bg-acento-100 p-3 text-sm text-acento-800'>
          <p>
            Ya hay un cliente cargado con el {ETIQUETA_CAMPO_DUPLICADO[duplicado.campo]}{' '}
            {valorCampoDuplicado(duplicado.cliente, duplicado.campo)}:{' '}
            <span className='font-semibold'>{nombreCompleto(duplicado.cliente)}</span>.{' '}
            {creando ? 'No se creó ninguno nuevo.' : 'No se guardaron los cambios.'}
          </p>
          <button
            type='button'
            onClick={() => onAbrirExistente(duplicado.cliente)}
            className='mt-2 rounded bg-marca-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-100 ease-in hover:bg-marca-600 cursor-pointer'
          >
            Abrir ese cliente
          </button>
        </div>
      )}

      {errorFormulario && <p className='mt-3 text-sm text-red-600'>{errorFormulario}</p>}
      {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}

      <div className='mt-5 flex flex-col gap-3 sm:flex-row'>
        <button
          type='button'
          onClick={handleGuardar}
          disabled={cargando || (!creando && !hayCambios)}
          className='rounded bg-marca-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-100 ease-in hover:bg-marca-600 active:bg-marca-700 disabled:bg-marca-400 disabled:cursor-not-allowed cursor-pointer sm:w-48'
        >
          {cargando ? 'Guardando...' : creando ? 'Crear Cliente' : 'Guardar Cambios'}
        </button>

        <button
          type='button'
          onClick={creando ? onCancelar : () => setDatos(inicial)}
          disabled={cargando || (!creando && !hayCambios)}
          className='rounded px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 transition-colors duration-100 ease-in hover:bg-neutro-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sm:w-48'
        >
          {creando ? 'Cancelar' : 'Descartar Cambios'}
        </button>
      </div>

      {!creando && cliente && <VentasDeCliente idCliente={cliente.id_cliente} />}

      <EliminarClienteModal
        abierto={eliminando}
        cliente={cliente}
        onCerrar={() => setEliminando(false)}
        onEliminado={(borrado) => {
          setEliminando(false);
          onEliminado(borrado);
        }}
      />
    </div>
  );
}
