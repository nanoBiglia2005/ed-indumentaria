import { useState } from 'react';
import type { CLIENTES } from '@backend/types';
import SectionWrapper from '@/components/layout/SectionWrapper';
import Notificacion from '@/components/ui/Notificacion';
import { useNotificacion } from '@/hooks/useNotificacion';
import { nombreCompleto } from '@/features/ventas/cliente/formatoCliente';
import ListaClientes from './ListaClientes';
import DetalleCliente from './DetalleCliente';

/**
 * ABM de clientes finales, en dos paneles: a la izquierda el buscador con la
 * lista, a la derecha la ficha del que este abierto (datos + sus ventas).
 *
 * En pantallas chicas no entran los dos, asi que se turnan: la lista es la
 * vista inicial y abrir un cliente la reemplaza por la ficha, con un "Volver"
 * arriba. En md+ conviven, que es como se usa de verdad (PC del local).
 *
 * Toda esta pagina esta gateada a ROLES_HISTORIAL, pero eso es cosmetico: el
 * backend niega igual cada una de las rutas de /api/clientes-finales.
 */
export default function ClientesPage() {
  const [seleccionado, setSeleccionado] = useState<CLIENTES | null>(null);
  const [creando, setCreando] = useState(false);
  // Se incrementa cada vez que la lista quedo vieja (alta, edicion o baja).
  const [recarga, setRecarga] = useState(0);

  const { notificacion, mostrar: mostrarNotificacion } = useNotificacion();

  const recargarLista = () => setRecarga((n) => n + 1);

  const abrirCliente = (cliente: CLIENTES) => {
    setCreando(false);
    setSeleccionado(cliente);
  };

  const handleCreado = (cliente: CLIENTES) => {
    abrirCliente(cliente);
    recargarLista();
    mostrarNotificacion(`Cliente ${nombreCompleto(cliente)} creado.`);
  };

  const handleActualizado = (cliente: CLIENTES) => {
    setSeleccionado(cliente);
    recargarLista();
    mostrarNotificacion('Cambios guardados.');
  };

  const handleEliminado = (cliente: CLIENTES) => {
    setSeleccionado(null);
    setCreando(false);
    recargarLista();
    mostrarNotificacion(`Cliente ${nombreCompleto(cliente)} eliminado.`);
  };

  // Que se ve en pantallas chicas: la ficha tapa la lista mientras haya algo
  // abierto.
  const hayFicha = creando || seleccionado !== null;

  return (
    <SectionWrapper>
      <Notificacion mensaje={notificacion} posicion='pagina' />

      <div className='flex flex-col w-full h-full px-2 sm:px-5 sm:pt-10 pt-6 min-h-0'>
        <div className='mb-5 flex shrink-0 items-center justify-between gap-3'>
          <span className='text-2xl font-semibold text-black'>Clientes</span>

          {hayFicha && (
            <button
              type='button'
              onClick={() => {
                setCreando(false);
                setSeleccionado(null);
              }}
              className='rounded px-3 py-1.5 text-sm font-medium text-neutro-600 bg-neutro-100 transition-colors duration-100 ease-in hover:bg-neutro-200 cursor-pointer md:hidden'
            >
              Volver a la lista
            </button>
          )}
        </div>

        <div className='flex min-h-0 flex-1 gap-4 mb-2'>
          <div
            className={`min-h-0 xl:w-80 md:shrink-0 ${hayFicha ? 'hidden md:block' : 'w-full'}`}
          >
            <ListaClientes
              idSeleccionado={creando ? null : seleccionado?.id_cliente ?? null}
              creando={creando}
              recarga={recarga}
              onSeleccionar={abrirCliente}
              onNuevo={() => {
                setSeleccionado(null);
                setCreando(true);
              }}
            />
          </div>

          <div
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto rounded border border-neutro-200 ${
              hayFicha ? 'block' : 'hidden md:block'
            }`}
          >
            <DetalleCliente
              cliente={seleccionado}
              creando={creando}
              onCreado={handleCreado}
              onActualizado={handleActualizado}
              onEliminado={handleEliminado}
              onAbrirExistente={abrirCliente}
              onCancelar={() => setCreando(false)}
            />
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
